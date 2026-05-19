// Phase 1:ReAct agent loop
// 核心:LLM 决定调什么工具 → 本地执行 → 结果回灌 → 再问 LLM → 循环直到没有 tool_calls

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { openai, MODEL } from './llm'
import { getToolsForLLM, callTool } from './tools/registry'

// 副作用 import:触发每个 tool 文件末尾的 registerTool(...)
import './tools/calculator'
import './tools/weather'

const MAX_TURNS = 10

const SYSTEM_PROMPT = `你是一个简洁的助手。需要数学计算或查询天气时,主动调用对应工具,不要凭空回答。回答用中文。`

export async function runAgent(userInput: string): Promise<string> {
  // messages 累积的完整对话历史 —— Phase 0 的延续:LLM 是 stateless 的,每轮要带全部历史
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ]

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // —— 这一轮的 LLM 调用 ——
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: getToolsForLLM(),   // registry 里所有已注册工具的 schema
      stream: false,
    })

    const message = completion.choices[0].message

    // ⭐ 关键:把 assistant message 本身 push 回 messages
    // 注意:即使 message 里有 tool_calls 也要 push(整条 message 包含 content + tool_calls)
    // 否则下一轮模型看不见"我自己上一轮决定调了哪些工具" —— Phase 0 同样的陷阱
    messages.push(message)

    // —— 退出条件:模型没有 tool_calls,说明它认为任务完成了 ——
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? ''
    }

    // —— 有 tool_calls:逐个执行,把结果以 role:'tool' 推回 messages ——
    for (const call of message.tool_calls) {
      // 类型守卫:这里只处理 function 类型(custom 类型 Phase 1 用不到)
      if (call.type !== 'function') continue

      const result = await callTool(call.function.name, call.function.arguments)

      messages.push({
        role: 'tool',
        tool_call_id: call.id,   // ← 必须带,LLM 靠这个把结果对应回它的 tool_call
        content: result,
      })

      // 简单 trace —— Phase 3 时这里会变成更结构化的 transcript / token 统计
      console.log(`  ↳ [tool] ${call.function.name}(${call.function.arguments}) → ${result}`)
    }
    // 进入下一轮,模型看到 tool 结果后会决定:继续调工具 / 给最终答案
  }

  return `[达到最大轮数 ${MAX_TURNS},agent 主动退出]`
}
