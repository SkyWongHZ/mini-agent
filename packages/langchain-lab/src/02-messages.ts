import { ChatDeepSeek } from '@langchain/deepseek'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from 'langchain'

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

function inspectMessage(message: BaseMessage) {
  const fields: Record<string, unknown> = {
    className: message.constructor.name,
    type: message.type,
    id: message.id,
    name: message.name,
    content: message.content,
    contentBlocks: message.contentBlocks,
    additionalKwargs: message.additional_kwargs,
    responseMetadata: message.response_metadata,
  }

  if (AIMessage.isInstance(message)) {
    fields.toolCalls = message.tool_calls
    fields.usageMetadata = message.usage_metadata
  }

  if (ToolMessage.isInstance(message)) {
    fields.toolCallId = message.tool_call_id
    fields.status = message.status
    fields.artifact = message.artifact
  }

  return fields
}

// 这个函数只用于观察四种 LangChain Message 与 OpenAI-compatible role 的概念映射，
// 不是 LangChain 针对各 provider 的完整内部 serializer。
function toOpenAICompatible(message: BaseMessage) {
  if (SystemMessage.isInstance(message)) {
    return { role: 'system', content: message.content }
  }

  if (HumanMessage.isInstance(message)) {
    return { role: 'user', content: message.content, name: message.name }
  }

  if (AIMessage.isInstance(message)) {
    const toolCalls = (message.tool_calls ?? []).map((toolCall) => ({
      id: toolCall.id,
      type: 'function',
      function: {
        name: toolCall.name,
        arguments: JSON.stringify(toolCall.args),
      },
    }))

    return {
      role: 'assistant',
      content: message.content,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    }
  }

  if (ToolMessage.isInstance(message)) {
    return {
      role: 'tool',
      content: message.content,
      tool_call_id: message.tool_call_id,
      name: message.name,
    }
  }

  throw new Error(`本示例尚未处理消息类型：${message.type}`)
}

async function main() {
  // 1. 手动构造四种消息。手动 AIMessage 只是模拟已有历史，不代表模型真的生成过它。
  printSection('1. 手动构造四种核心 Message')
  const systemMessage = new SystemMessage('你是一名简洁的用户档案助手。')
  const humanMessage = new HumanMessage({
    content: '请查询用户 42 的档案。',
    id: 'human-demo-1',
    name: 'sky',
  })
  const manualAIMessage = new AIMessage({
    content: '好的，我会查询用户档案。',
    id: 'ai-demo-1',
  })

  const toolCallId = 'call-demo-profile-1'
  const toolCallingAIMessage = new AIMessage({
    content: '',
    tool_calls: [
      {
        id: toolCallId,
        name: 'lookup_profile',
        args: { userId: '42' },
        type: 'tool_call',
      },
    ],
  })
  const toolMessage = new ToolMessage({
    content: '用户 42 的临时代号是蓝鲸。',
    name: 'lookup_profile',
    tool_call_id: toolCallId,
    status: 'success',
    artifact: {
      userId: '42',
      internalSource: 'topic-02-demo',
      rawProfile: { temporaryCodeName: '蓝鲸' },
    },
  })

  const manuallyCreatedMessages: BaseMessage[] = [
    systemMessage,
    humanMessage,
    manualAIMessage,
    toolCallingAIMessage,
    toolMessage,
  ]

  for (const message of manuallyCreatedMessages) {
    console.dir(inspectMessage(message), { depth: null })
  }

  console.log(
    `tool call id 是否匹配：${toolCallingAIMessage.tool_calls?.[0]?.id === toolMessage.tool_call_id}`,
  )

  // 2. 真正的多轮对话：每次调用都是无状态请求，应用负责维护并重新发送 history。
  printSection('2. 两次模型调用形成多轮对话')
  const history: BaseMessage[] = [
    new SystemMessage('记住用户在当前对话中提供的信息，并简洁回答。'),
    new HumanMessage('我的临时代号是蓝鲸，请确认你记住了。'),
  ]

  const firstResponse = await model.invoke(history)
  history.push(firstResponse)
  history.push(new HumanMessage('我刚才告诉你的临时代号是什么？只回答代号。'))

  // 第二次请求发送的是 System/Human/AI/Human 完整历史，而不是只有最后一个问题。
  const secondResponse = await model.invoke(history)
  history.push(secondResponse)

  console.dir(
    {
      firstResponse: firstResponse.content,
      secondResponse: secondResponse.content,
      historyLength: history.length,
    },
    { depth: null },
  )

  const creators = ['应用', '应用', '模型', '应用', '模型']
  console.dir(
    history.map((message, index) => ({
      index: index + 1,
      creator: creators[index],
      type: message.type,
      text: message.text,
    })),
    { depth: null },
  )

  // 3. AIMessage 正文、标准化内容和 metadata 属于不同层次。
  printSection('3. 拆解第二次调用返回的 AIMessage')
  console.dir(inspectMessage(secondResponse), { depth: null })
  console.log(
    'content/contentBlocks 是回答内容；usage_metadata 是标准化用量；additional_kwargs/response_metadata 是 provider-specific 信息。',
  )

  // 4. role 投影只用于理解对应关系；artifact 不会被放入发给模型的 tool message。
  printSection('4. OpenAI-compatible role 映射')
  const roleMappingExample = [
    systemMessage,
    humanMessage,
    toolCallingAIMessage,
    toolMessage,
  ].map(toOpenAICompatible)
  console.dir(roleMappingExample, { depth: null })
}

await main()
