import { ChatDeepSeek } from '@langchain/deepseek'
import {
  AIMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages'
import { createAgent, tool } from 'langchain'
import { z } from 'zod'

const apiKey = process.env.DEEPSEEK_API_KEY
const modelName = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash'

if (!apiKey) {
  throw new Error('缺少 DEEPSEEK_API_KEY，请在仓库根目录的 .env 中配置')
}

const model = new ChatDeepSeek({
  apiKey,
  model: modelName,
  temperature: 0,
})

function printSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

let executionCount = 0

const orderStatuses: Record<string, string> = {
  'A-100': '已发货，预计明天送达',
  'A-200': '正在仓库打包，预计后天发货',
  'A-300': '已签收，签收人是用户本人',
}

// 与 Topic 03 相同，tool() 包装 schema 和本地实现；区别是这次由 Agent runtime dispatch。
const lookupOrderStatus = tool(
  ({ orderId }) => {
    executionCount += 1

    if (orderId === 'error-demo') {
      throw new Error('模拟订单服务不可用')
    }

    return orderStatuses[orderId] ?? `未找到订单 ${orderId}`
  },
  {
    name: 'lookup_order_status',
    description: '查询指定订单编号的当前物流状态。查询订单时必须使用此工具。',
    schema: z.object({
      orderId: z.string().describe('订单编号，例如 A-100'),
    }),
  },
)

const agent = createAgent({
  model,
  tools: [lookupOrderStatus],
  systemPrompt:
    '凡是查询订单状态，必须调用 lookup_order_status；收到工具结果后用一句话回答，不要猜测，也不要重复调用工具。',
})

function inspectMessage(message: BaseMessage) {
  const fields: Record<string, unknown> = {
    className: message.constructor.name,
    type: message.type,
    text: message.text,
  }

  if (AIMessage.isInstance(message)) {
    fields.toolCalls = message.tool_calls
  }

  if (ToolMessage.isInstance(message)) {
    fields.toolCallId = message.tool_call_id
    fields.status = message.status
  }

  return fields
}

function messagesFromUpdate(value: unknown): BaseMessage[] {
  if (!value || typeof value !== 'object' || !('messages' in value)) {
    return []
  }

  const messages = (value as { messages?: unknown }).messages
  return Array.isArray(messages) ? (messages as BaseMessage[]) : []
}

async function observeInvokeState() {
  printSection('1. agent.invoke()：完整 Agent state')
  const countBefore = executionCount
  const state = await agent.invoke({
    messages: [{ role: 'user', content: '请查询订单 A-100 的状态。' }],
  })
  const messages = state.messages
  const toolRequest = messages.find(
    (message) =>
      AIMessage.isInstance(message) && (message.tool_calls?.length ?? 0) > 0,
  )
  const toolResult = messages.find((message) => ToolMessage.isInstance(message))
  const finalMessage = messages.at(-1)

  if (!toolRequest || !AIMessage.isInstance(toolRequest)) {
    throw new Error('最终 state 中缺少带 tool_calls 的 AIMessage')
  }
  if (!toolResult || !ToolMessage.isInstance(toolResult)) {
    throw new Error('最终 state 中缺少 ToolMessage')
  }
  if (!finalMessage || !AIMessage.isInstance(finalMessage)) {
    throw new Error('最终 state 的最后一条消息不是 AIMessage')
  }

  const requestedCallId = toolRequest.tool_calls?.[0]?.id
  const executionDelta = executionCount - countBefore
  console.dir(
    {
      stateKeys: Object.keys(state),
      messages: messages.map(inspectMessage),
      executionDelta,
      toolCallIdMatches: requestedCallId === toolResult.tool_call_id,
      finalHasNoToolCalls: (finalMessage.tool_calls?.length ?? 0) === 0,
    },
    { depth: null },
  )

  if (executionDelta !== 1) {
    throw new Error(`预期工具执行一次，实际执行 ${executionDelta} 次`)
  }
  if (requestedCallId !== toolResult.tool_call_id) {
    throw new Error('AIMessage tool call ID 与 ToolMessage.tool_call_id 不匹配')
  }
}

async function observeUpdates() {
  printSection("2. agent.stream()：streamMode='updates'")
  const stream = await agent.stream(
    { messages: [{ role: 'user', content: '请查询订单 A-200 的状态。' }] },
    { streamMode: 'updates' },
  )

  let updateIndex = 0
  for await (const update of stream) {
    updateIndex += 1
    const nodes = Object.entries(update as Record<string, unknown>).map(
      ([node, value]) => ({
        node,
        messages: messagesFromUpdate(value).map(inspectMessage),
      }),
    )
    console.dir({ updateIndex, nodes }, { depth: null })
  }
}

async function observeMessageChunks() {
  printSection("3. agent.stream()：streamMode='messages'")
  const stream = await agent.stream(
    { messages: [{ role: 'user', content: '请查询订单 A-300 的状态。' }] },
    { streamMode: 'messages' },
  )

  let chunkIndex = 0
  let printedChunkCount = 0
  for await (const [chunk, metadata] of stream) {
    chunkIndex += 1

    // Topic 01 已观察过 reasoning token；这里保留正文、tool call 和 ToolMessage，
    // 重点观察同一个 messages stream 如何跨越 model/tools 节点。
    const hasVisibleText = typeof chunk.content === 'string' && chunk.content !== ''
    const hasToolCallBlock = chunk.contentBlocks.some(
      (block) => block.type === 'tool_call',
    )
    if (!hasVisibleText && !hasToolCallBlock && !ToolMessage.isInstance(chunk)) {
      continue
    }

    printedChunkCount += 1
    console.dir(
      {
        chunkIndex,
        chunkType: chunk.constructor.name,
        node: metadata.langgraph_node,
        content: chunk.content,
        contentBlocks: chunk.contentBlocks,
      },
      { depth: null },
    )
  }

  console.dir({ totalEvents: chunkIndex, printedChunkCount }, { depth: null })
}

async function observeToolError() {
  printSection('4. 工具运行时错误的默认处理')
  const countBefore = executionCount
  let caughtError: unknown
  let errorState: Awaited<ReturnType<typeof agent.invoke>> | undefined

  try {
    errorState = await agent.invoke({
      messages: [
        {
          role: 'user',
          content: '请调用订单查询工具查询订单 error-demo 的状态。',
        },
      ],
    })
  } catch (error) {
    caughtError = error
  }

  if (caughtError instanceof Error) {
    console.dir(
      {
        outcome: '错误传播到 agent.invoke() 调用者',
        errorType: caughtError.constructor.name,
        message: caughtError.message,
        executionDelta: executionCount - countBefore,
        handledByMiddleware: false,
      },
      { depth: null },
    )
    return
  }

  const messages = errorState?.messages ?? []
  const toolMessages = messages.filter((message) => ToolMessage.isInstance(message))
  const executionDelta = executionCount - countBefore

  console.dir(
    {
      outcome:
        toolMessages.length > 0
          ? 'Agent runtime 将工具异常转换为 ToolMessage，并让模型继续生成最终回答'
          : '工具异常未传播，但 state 中也没有 ToolMessage',
      executionDelta,
      messages: messages.map(inspectMessage),
      handledByMiddleware: false,
      note: '不同版本不保证 ToolMessage.status 固定为 error，应结合内容与运行轨迹判断。',
    },
    { depth: null },
  )

  if (executionDelta !== 1 || toolMessages.length === 0) {
    throw new Error('error-demo 没有形成预期的单次工具执行与 ToolMessage 回填')
  }
}

await observeInvokeState()
await observeUpdates()
await observeMessageChunks()
await observeToolError()
