import { ChatDeepSeek } from '@langchain/deepseek'
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
  type ToolCall,
} from '@langchain/core/messages'
import { ToolInputParsingException } from '@langchain/core/tools'
import { tool } from 'langchain'
import { z } from 'zod'

const apiKey = process.env.DEEPSEEK_API_KEY
const modelName = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash'

if (!apiKey) {
  throw new Error('缺少 DEEPSEEK_API_KEY，请在仓库根目录的 .env 中配置')
}

function printSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

let executionCount = 0

const calculatorSchema = z.object({
  operation: z.enum(['add', 'multiply']).describe('要执行的运算'),
  a: z.number().describe('第一个数字'),
  b: z.number().describe('第二个数字'),
})

// tool() 同时包装两部分：给模型看的 name/description/schema，以及本地执行函数。
// 这是一个无副作用计算工具，便于只观察 tool calling 协议本身。
const calculator = tool(
  ({ operation, a, b }) => {
    executionCount += 1

    switch (operation) {
      case 'add':
        return String(a + b)
      case 'multiply':
        return String(a * b)
    }
  },
  {
    name: 'calculator',
    description: '执行两个数字的加法或乘法；需要精确计算时使用。',
    schema: calculatorSchema,
    verboseParsingErrors: true,
  },
)

const tools = [calculator]

const model = new ChatDeepSeek({
  apiKey,
  model: modelName,
  temperature: 0,
})

// bindTools() 只把工具定义交给模型；它不会替应用执行本地函数。
const modelWithTools = model.bindTools(tools)

function findTool(name: string) {
  const selectedTool = tools.find((candidate) => candidate.name === name)

  if (!selectedTool) {
    throw new Error(`模型请求了未注册工具：${name}`)
  }

  return selectedTool
}

async function runToolRoundTrip() {
  const messages: BaseMessage[] = [
    new SystemMessage(
      '需要计算时必须调用 calculator；收到工具结果后，用一句话回答用户，不要再次调用工具。',
    ),
    new HumanMessage('请使用 calculator 计算 23 × 47，并告诉我结果。'),
  ]

  printSection('1. tool() 创建的工具')
  console.dir(
    {
      name: calculator.name,
      description: calculator.description,
      schema: {
        operation: {
          type: 'enum',
          values: calculatorSchema.shape.operation.options,
          description: calculatorSchema.shape.operation.description,
        },
        a: {
          type: 'number',
          description: calculatorSchema.shape.a.description,
        },
        b: {
          type: 'number',
          description: calculatorSchema.shape.b.description,
        },
      },
    },
    { depth: 3 },
  )

  printSection('2. bindTools() 后由模型选择工具')
  const toolRequestMessage = await modelWithTools.invoke(messages)
  const toolCalls = toolRequestMessage.tool_calls ?? []
  messages.push(toolRequestMessage)

  console.dir(
    {
      messageType: toolRequestMessage.constructor.name,
      content: toolRequestMessage.content,
      toolCalls,
    },
    { depth: null },
  )

  if (!toolCalls.length) {
    throw new Error('模型没有生成 tool call；请检查模型是否支持工具调用')
  }

  printSection('3. 应用手动 dispatch、执行并回填 ToolMessage')
  for (const toolCall of toolCalls) {
    const selectedTool = findTool(toolCall.name)
    const toolMessage = await selectedTool.invoke(toolCall)

    if (!ToolMessage.isInstance(toolMessage)) {
      throw new Error('传入完整 ToolCall 时，预期 tool.invoke() 返回 ToolMessage')
    }

    messages.push(toolMessage)
    console.dir(
      {
        requestedTool: toolCall.name,
        requestedArgs: toolCall.args,
        toolCallId: toolCall.id,
        resultMessageType: toolMessage.constructor.name,
        resultContent: toolMessage.content,
        resultToolCallId: toolMessage.tool_call_id,
        idMatches: toolMessage.tool_call_id === toolCall.id,
      },
      { depth: null },
    )
  }

  printSection('4. 完整历史回填模型，生成最终回答')
  const finalMessage = await modelWithTools.invoke(messages)
  const finalToolCalls = finalMessage.tool_calls ?? []
  messages.push(finalMessage)

  console.dir(
    {
      content: finalMessage.content,
      toolCalls: finalToolCalls,
      historyTypes: messages.map((message) => message.constructor.name),
    },
    { depth: null },
  )

  if (finalToolCalls.length) {
    throw new Error('模型再次请求了工具；本 Topic 只演示一次手动 round trip，不实现 agent loop')
  }
}

async function observeInvalidArguments() {
  printSection('5. 非法参数在 schema 校验层失败')

  const invalidToolCall: ToolCall = {
    type: 'tool_call',
    id: 'invalid-tool-call-demo',
    name: calculator.name,
    args: {
      operation: 'multiply',
      a: '不是数字',
      b: 47,
    },
  }
  const countBeforeInvalidCall = executionCount

  try {
    await calculator.invoke(invalidToolCall)
    throw new Error('预期非法参数触发校验错误，但调用意外成功')
  } catch (error) {
    if (!(error instanceof ToolInputParsingException)) {
      throw error
    }

    console.dir(
      {
        errorType: error.constructor.name,
        message: error.message,
        executionCountBefore: countBeforeInvalidCall,
        executionCountAfter: executionCount,
        implementationExecuted: executionCount !== countBeforeInvalidCall,
      },
      { depth: null },
    )
  }
}

await runToolRoundTrip()
await observeInvalidArguments()
