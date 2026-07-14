import { ChatDeepSeek } from '@langchain/deepseek'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from '@langchain/core/messages'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

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

// ChatPromptTemplate 的输入是一个变量对象；输出是 PromptValue，内部保存组装好的 messages。
const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一名 TypeScript 助手。请用 {style} 风格回答。'],
  new MessagesPlaceholder('history'),
  ['human', '{question}'],
])

const history: BaseMessage[] = [
  new HumanMessage('我正在学习 LangChain.js，主要使用 TypeScript。'),
  new AIMessage('好的，我会用简洁的 TypeScript 示例协助你学习。'),
]

const input = {
  style: '简洁、分点',
  history,
  question: 'Prompt Template 和普通字符串拼接有什么区别？',
}

function inspectAIMessage(message: AIMessage) {
  return {
    className: message.constructor.name,
    content: message.content,
    contentBlocks: message.contentBlocks,
    usageMetadata: message.usage_metadata,
    responseMetadata: message.response_metadata,
  }
}

async function main() {
  // 1. 单独执行 prompt，只观察变量替换与 MessagesPlaceholder 的消息组装。
  printSection('1. ChatPromptTemplate.invoke() -> PromptValue')
  const promptValue = await prompt.invoke(input)
  console.dir(
    {
      promptType: prompt.constructor.name,
      promptValueType: promptValue.constructor.name,
      messages: promptValue.messages.map((message, index) => ({
        index: index + 1,
        type: message.type,
        text: message.text,
      })),
    },
    { depth: null },
  )

  // 2. 手动执行 prompt -> model，能明确看到 PromptValue 不是最终回答。
  printSection('2. 手动 prompt -> model')
  const directResponse = await model.invoke(promptValue)
  console.dir(inspectAIMessage(directResponse), { depth: null })

  // 3. pipe() 将 PromptValue 输出接到 ChatDeepSeek 输入；它不提供任何循环或工具执行。
  printSection('3. prompt.pipe(model).invoke()')
  const chain = prompt.pipe(model)
  const pipedResponse = await chain.invoke(input)
  console.dir(
    {
      chainType: chain.constructor.name,
      response: inspectAIMessage(pipedResponse),
    },
    { depth: null },
  )

  // 4. batch() 的输入仍是同一种变量对象，输出按输入顺序组成 AIMessage[]。
  printSection('4. chain.batch()')
  const batchInputs = [
    {
      style: '一句话',
      history,
      question: 'Runnable 在这里负责什么？',
    },
    {
      style: '一句话',
      history,
      question: '为什么 .pipe() 不等于 Agent？',
    },
  ]
  const batchResponses = await chain.batch(batchInputs, { maxConcurrency: 2 })
  console.dir(
    batchResponses.map((message, index) => ({
      index,
      question: batchInputs[index]?.question,
      ...inspectAIMessage(message),
    })),
    { depth: null },
  )

  // 5. 故意漏掉 question；模型没有参与，这个错误来自 prompt 的变量格式化。
  printSection('5. 缺失变量：Prompt 格式化阶段失败')
  try {
    await prompt.invoke({ style: input.style, history: input.history })
    throw new Error('预期缺少 question 时抛出错误，但 prompt.invoke() 意外成功')
  } catch (error) {
    if (error instanceof Error) {
      console.dir(
        {
          errorType: error.constructor.name,
          message: error.message,
          failedStage: 'ChatPromptTemplate.invoke()，模型尚未调用',
        },
        { depth: null },
      )
    } else {
      throw error
    }
  }
}

await main()
