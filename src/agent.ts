// Phase 3A:Runtime Context + Trace
// Phase 1 的 ReAct loop 仍是核心;本阶段给它加 run-local transcript、预算和 context 裁剪

import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions'
import { openai, MODEL } from './llm'
import { getToolsForLLM, callTool } from './tools/registry'

// 副作用 import:触发每个 tool 文件末尾的 registerTool(...)
import './tools/calculator'
import './tools/weather'
import './tools/write_file'    // Phase 2 新增:危险工具(category: 'write')
import './hooks'                // Phase 2 新增:触发 logger + confirm hook 注册

const DEFAULT_MAX_TURNS = 10
const DEFAULT_MAX_TOOL_CALLS = 20
const DEFAULT_MAX_CONTEXT_CHARS = 12000

const SYSTEM_PROMPT = `你是一个简洁的助手。需要数学计算或查询天气时,主动调用对应工具,不要凭空回答。回答用中文。`

export interface AgentOptions {
  maxTurns?: number
  maxToolCalls?: number
  maxContextChars?: number
}

export interface AgentRunResult {
  reply: string
  transcript: TranscriptEvent[]
  stats: AgentStats
}

export interface AgentStats {
  turns: number
  llmCalls: number
  toolCalls: number
  tokens: {
    input: number | null
    output: number | null
    total: number | null
  }
  elapsedMs: number
}

export type TranscriptEvent =
  | {
      type: 'llm_call'
      turn: number
      elapsedMs: number
      usage: TokenUsage
      content: string | null
      toolCalls: Array<{
        id: string
        name: string
        arguments: string
      }>
    }
  | {
      type: 'tool_call'
      toolName: string
      args: unknown | null
      elapsedMs: number
      result: string
      error?: never
    }
  | {
      type: 'tool_call'
      toolName: string
      args: unknown | null
      elapsedMs: number
      error: string
      result?: never
    }
  | {
      type: 'trim'
      beforeChars: number
      afterChars: number
      removedMessages: number
      removedGroups: number
    }
  | {
      type: 'budget_stop'
      reason: 'max_turns' | 'max_tool_calls'
      message: string
    }
  | {
      type: 'final'
      reply: string
    }

interface TokenUsage {
  input: number | null
  output: number | null
  total: number | null
}

interface NormalizedOptions {
  maxTurns: number
  maxToolCalls: number
  maxContextChars: number
}

export async function runAgent(
  userInput: string,
  options: AgentOptions = {},
): Promise<AgentRunResult> {
  const startedAt = Date.now()
  const config = normalizeOptions(options)
  const transcript: TranscriptEvent[] = []
  const stats: AgentStats = {
    turns: 0,
    llmCalls: 0,
    toolCalls: 0,
    tokens: { input: null, output: null, total: null },
    elapsedMs: 0,
  }

  // messages 累积的完整对话历史 —— Phase 0 的延续:LLM 是 stateless 的,每轮要带全部历史
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ]

  const finish = (reply: string): AgentRunResult => {
    transcript.push({ type: 'final', reply })
    stats.elapsedMs = Date.now() - startedAt
    return { reply, transcript, stats }
  }

  const stopForBudget = (
    reason: 'max_turns' | 'max_tool_calls',
    message: string,
  ): AgentRunResult => {
    transcript.push({ type: 'budget_stop', reason, message })
    return finish(message)
  }

  if (config.maxTurns === 0) {
    return stopForBudget('max_turns', `[达到最大轮数 ${config.maxTurns},agent 主动退出]`)
  }

  if (config.maxToolCalls === 0) {
    return stopForBudget('max_tool_calls', `[达到最大工具调用数 ${config.maxToolCalls},agent 主动退出]`)
  }

  for (let turn = 0; turn < config.maxTurns; turn++) {
    const trimEvent = trimMessagesToBudget(messages, config.maxContextChars)
    if (trimEvent) {
      transcript.push(trimEvent)
    }

    // —— 这一轮的 LLM 调用 ——
    const llmStartedAt = Date.now()
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: getToolsForLLM(),   // registry 里所有已注册工具的 schema
      stream: false,
    })
    const llmElapsedMs = Date.now() - llmStartedAt
    const usage = normalizeUsage(completion.usage)
    addUsage(stats, usage)
    stats.llmCalls += 1
    stats.turns += 1

    const message = completion.choices[0].message
    const toolCalls = message.tool_calls ?? []
    const functionToolCalls = toolCalls.filter(isFunctionToolCall)

    transcript.push({
      type: 'llm_call',
      turn: turn + 1,
      elapsedMs: llmElapsedMs,
      usage,
      content: message.content ?? null,
      toolCalls: functionToolCalls.map(call => ({
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments,
      })),
    })

    // ⭐ 关键:把 assistant message 本身 push 回 messages
    // 注意:即使 message 里有 tool_calls 也要 push(整条 message 包含 content + tool_calls)
    // 否则下一轮模型看不见"我自己上一轮决定调了哪些工具" —— Phase 0 同样的陷阱
    messages.push(message)

    // —— 退出条件:模型没有 tool_calls,说明它认为任务完成了 ——
    if (functionToolCalls.length === 0) {
      return finish(message.content ?? '')
    }

    if (stats.toolCalls + functionToolCalls.length > config.maxToolCalls) {
      return stopForBudget(
        'max_tool_calls',
        `[达到最大工具调用数 ${config.maxToolCalls},agent 主动退出]`,
      )
    }

    // —— 有 tool_calls:逐个执行,把结果以 role:'tool' 推回 messages ——
    for (const call of functionToolCalls) {
      const toolStartedAt = Date.now()
      const { args, parseError } = parseToolArgsForTranscript(call.function.arguments)
      stats.toolCalls += 1
      const result = await callTool(call.function.name, call.function.arguments)
      const toolElapsedMs = Date.now() - toolStartedAt

      if (result.startsWith('Error:')) {
        transcript.push({
          type: 'tool_call',
          toolName: call.function.name,
          args,
          elapsedMs: toolElapsedMs,
          error: parseError ?? result,
        })
      } else {
        transcript.push({
          type: 'tool_call',
          toolName: call.function.name,
          args,
          elapsedMs: toolElapsedMs,
          result,
        })
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,   // ← 必须带,LLM 靠这个把结果对应回它的 tool_call
        content: result,
      })
      // 注:Phase 1 时这里有 console.log 手动 trace,
      // Phase 2 之后 loggerHook 接管,所以删掉避免重复输出
    }
    // 进入下一轮,模型看到 tool 结果后会决定:继续调工具 / 给最终答案
  }

  return stopForBudget('max_turns', `[达到最大轮数 ${config.maxTurns},agent 主动退出]`)
}

function isFunctionToolCall(
  call: ChatCompletionMessageToolCall,
): call is ChatCompletionMessageFunctionToolCall {
  return call.type === 'function'
}

function normalizeOptions(options: AgentOptions): NormalizedOptions {
  return {
    maxTurns: normalizeZeroAllowed(options.maxTurns, DEFAULT_MAX_TURNS),
    maxToolCalls: normalizeZeroAllowed(options.maxToolCalls, DEFAULT_MAX_TOOL_CALLS),
    maxContextChars: normalizePositive(options.maxContextChars, DEFAULT_MAX_CONTEXT_CHARS),
  }
}

function normalizeZeroAllowed(value: number | undefined, fallback: number): number {
  if (value === 0) return 0
  if (value === undefined || !Number.isFinite(value) || value < 0) return fallback
  return Math.floor(value)
}

function normalizePositive(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback
  return Math.floor(value)
}

function normalizeUsage(usage: {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
} | null | undefined): TokenUsage {
  return {
    input: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
    output: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null,
    total: typeof usage?.total_tokens === 'number' ? usage.total_tokens : null,
  }
}

function addUsage(stats: AgentStats, usage: TokenUsage): void {
  stats.tokens.input = addNullable(stats.tokens.input, usage.input)
  stats.tokens.output = addNullable(stats.tokens.output, usage.output)
  stats.tokens.total = addNullable(stats.tokens.total, usage.total)
}

function addNullable(current: number | null, next: number | null): number | null {
  if (next === null) return current
  return current === null ? next : current + next
}

function parseToolArgsForTranscript(argsJson: string): {
  args: unknown | null
  parseError?: string
} {
  try {
    return { args: JSON.parse(argsJson) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { args: null, parseError: `invalid JSON: ${message}` }
  }
}

function trimMessagesToBudget(
  messages: ChatCompletionMessageParam[],
  maxContextChars: number,
): Extract<TranscriptEvent, { type: 'trim' }> | null {
  const beforeChars = countMessageChars(messages)
  if (beforeChars <= maxContextChars) return null

  let removedMessages = 0
  let removedGroups = 0

  while (countMessageChars(messages) > maxContextChars) {
    const group = findOldestTrimGroup(messages)
    if (!group) break

    removedMessages += group.end - group.start
    removedGroups += 1
    messages.splice(group.start, group.end - group.start)
  }

  return {
    type: 'trim',
    beforeChars,
    afterChars: countMessageChars(messages),
    removedMessages,
    removedGroups,
  }
}

function countMessageChars(messages: ChatCompletionMessageParam[]): number {
  return messages.reduce((sum, message) => {
    return sum + (typeof message.content === 'string' ? message.content.length : 0)
  }, 0)
}

function findOldestTrimGroup(
  messages: ChatCompletionMessageParam[],
): { start: number; end: number } | null {
  if (messages.length <= 2) return null

  const start = 2
  const first = messages[start]

  if (first.role === 'assistant' && hasToolCalls(first)) {
    const ids = new Set(first.tool_calls.map(call => call.id))
    let end = start + 1

    while (end < messages.length && messages[end].role === 'tool') {
      const toolCallId = (messages[end] as { tool_call_id?: string }).tool_call_id
      if (!toolCallId || !ids.has(toolCallId)) break
      end += 1
    }

    return { start, end }
  }

  return { start, end: start + 1 }
}

function hasToolCalls(
  message: ChatCompletionMessageParam,
): message is ChatCompletionMessageParam & {
  role: 'assistant'
  tool_calls: Array<{ id: string }>
} {
  return (
    message.role === 'assistant' &&
    Array.isArray((message as { tool_calls?: unknown }).tool_calls) &&
    (message as { tool_calls: unknown[] }).tool_calls.length > 0
  )
}
