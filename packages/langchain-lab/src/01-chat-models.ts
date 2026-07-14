import { ChatDeepSeek } from '@langchain/deepseek'
import type { AIMessageChunk } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'

const apiKey = process.env.DEEPSEEK_API_KEY
const modelName = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash'
const baseURL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com'

if (!apiKey) {
  throw new Error('缺少 DEEPSEEK_API_KEY，请在仓库根目录的 .env 中配置')
}

const messages = [
  {
    role: 'system' as const,
    content: '你是一名简洁的 TypeScript 助手。',
  },
  {
    role: 'user' as const,
    content: '用一句话解释 Chat Model 和普通字符串补全的区别。',
  },
]

const model = new ChatDeepSeek({
  apiKey,
  model: modelName,
  temperature: 0,
})

function printSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  // 1. invoke() 等待模型生成完毕，返回一个完整的 AIMessage，而不是 string。
  printSection('1. ChatDeepSeek.invoke()')
  const response = await model.invoke(messages)

  console.dir(response, { depth: null })
  console.dir(
    {
      content: response.content,
      contentBlocks: response.contentBlocks,
      usageMetadata: response.usage_metadata,
      responseMetadata: response.response_metadata,
    },
    { depth: null },
  )

  // 2. stream() 返回异步可迭代对象，每一项都是 AIMessageChunk。
  // chunk 不保证对应一个 token；它也可能携带 metadata 或结束信息。
  printSection('2. ChatDeepSeek.stream()')
  const stream = await model.stream(messages)
  let combinedChunk: AIMessageChunk | undefined
  let chunkCount = 0

  for await (const chunk of stream) {
    chunkCount += 1

    console.dir(
      {
        index: chunkCount,
        content: chunk.content,
        contentBlocks: chunk.contentBlocks,
        usageMetadata: chunk.usage_metadata,
        responseMetadata: chunk.response_metadata,
      },
      { depth: null },
    )

    if (chunk.usage_metadata) {
      console.log(`usage_metadata 出现在第 ${chunkCount} 个 chunk`)
    }

    // concat() 不只是拼接文本，还会合并 metadata、tool call chunks 等消息字段。
    combinedChunk = combinedChunk ? combinedChunk.concat(chunk) : chunk
  }

  if (!combinedChunk) {
    throw new Error('流式响应没有返回任何 chunk')
  }

  // 3. UI 可以逐块渲染，但对话历史应保存聚合后的完整消息。
  printSection('3. 合并后的 AIMessageChunk')
  console.dir(
    {
      chunkCount,
      content: combinedChunk.content,
      contentBlocks: combinedChunk.contentBlocks,
      usageMetadata: combinedChunk.usage_metadata,
      responseMetadata: combinedChunk.response_metadata,
    },
    { depth: null },
  )
  console.log(
    '聚合后的 token 统计优先读取 usage_metadata；response_metadata 是 provider-specific 数据，重复出现在多个 chunk 时可能被 concat() 累加。',
  )

  // 4. ChatOpenAI 也实现相同的 Chat Model 接口。这里仍然调用 DeepSeek，
  // 只是改用 OpenAI-compatible client，借此观察“统一接口”和“provider 实现”的边界。
  printSection('4. ChatOpenAI + DeepSeek custom baseURL')
  const compatibleModel = new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0,
    useResponsesApi: false,
    configuration: { baseURL },
  })
  const compatibleResponse = await compatibleModel.invoke(messages)

  console.dir(
    {
      implementation: compatibleModel.constructor.name,
      messageType: compatibleResponse.constructor.name,
      content: compatibleResponse.content,
      contentBlocks: compatibleResponse.contentBlocks,
      additionalKwargs: compatibleResponse.additional_kwargs,
      usageMetadata: compatibleResponse.usage_metadata,
      responseMetadata: compatibleResponse.response_metadata,
    },
    { depth: null },
  )
}

await main()
