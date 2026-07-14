import { ChatDeepSeek } from '@langchain/deepseek'
import { AIMessage, type BaseMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
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
  // DeepSeek V4 的 thinking mode 不能与 withStructuredOutput() 强制的 tool_choice 同用。
  // modelKwargs 会透传到 OpenAI-compatible 请求体；这里只为本 Topic 关闭 thinking。
  modelKwargs: {
    thinking: { type: 'disabled' },
  },
})

function printSection(title: string) {
  console.log(`\n=== ${title} ===`)
}

// Zod 同时提供运行时 schema 和由 schema 推导出的 TypeScript 类型。
const articleSummarySchema = z.object({
  title: z.string().describe('原文的简短标题'),
  keyPoints: z
    .array(z.string())
    .min(2)
    .describe('至少两条、不重复的关键信息'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('提取结果的置信度，范围从 0 到 1'),
})

type ArticleSummary = z.infer<typeof articleSummarySchema>

function inspectRawMessage(message: BaseMessage) {
  const fields: Record<string, unknown> = {
    className: message.constructor.name,
    content: message.content,
    contentBlocks: message.contentBlocks,
    responseMetadata: message.response_metadata,
  }

  if (AIMessage.isInstance(message)) {
    fields.toolCalls = message.tool_calls
    fields.usageMetadata = message.usage_metadata
  }

  return fields
}

async function main() {
  const sourceText = [
    'LangChain 的 Runnable 为模型、Prompt 和 Output Parser 提供统一的 invoke、stream 与 batch 接口。',
    'Runnable 可以通过 pipe 形成固定的数据处理链，但它不会自行选择工具或产生循环控制流。',
    'Agent 才会根据模型输出动态决定是否调用工具并继续执行。',
  ].join('\n')

  // 1. ChatDeepSeek 用 functionCalling 实现 structured output；它会强制模型返回
  // 符合 schema 的结构，随后由 Zod 在本地解析并校验。
  printSection('1. withStructuredOutput()：原始消息与结构化结果')
  const structuredModel = model.withStructuredOutput(articleSummarySchema, {
    name: 'ArticleSummary',
    includeRaw: true,
  })

  let structuredResult: Awaited<ReturnType<typeof structuredModel.invoke>>
  try {
    structuredResult = await structuredModel.invoke(
      `从以下文本提取摘要，不要补充文本之外的信息：\n\n${sourceText}`,
    )
  } catch (error) {
    // 对当前安装版本而言，真实的 provider 失败或结构化解析/校验失败会直接抛出，
    // 而不是作为 includeRaw 结果中的 parsing_error 字段返回。
    if (error instanceof Error) {
      console.dir(
        {
          errorType: error.constructor.name,
          message: error.message,
          failedStage: 'provider 请求或 structured-output 解析/校验',
        },
        { depth: null },
      )
    }
    throw error
  }

  const parsedSummary: ArticleSummary = structuredResult.parsed
  const parsedValidation = articleSummarySchema.safeParse(parsedSummary)
  console.dir(
    {
      raw: inspectRawMessage(structuredResult.raw),
      parsed: parsedSummary,
      parsedValidationSuccess: parsedValidation.success,
      note: '当前 ChatDeepSeek 实现使用 functionCalling；raw AIMessage 因而可能带有内部结构化 tool call。',
    },
    { depth: null },
  )

  // 2. 用人工输入稳定地演示 Zod 运行时失败，不依赖模型是否愿意输出非法结构。
  printSection('2. Zod.safeParse()：确定性的 schema 失败')
  const invalidCandidate = {
    title: '只有一条要点且置信度不是数字',
    keyPoints: ['只有一项'],
    confidence: 'high',
  }
  const invalidValidation = articleSummarySchema.safeParse(invalidCandidate)
  console.dir(
    invalidValidation.success
      ? { success: true, data: invalidValidation.data }
      : {
          success: false,
          flattenedErrors: invalidValidation.error.flatten(),
        },
    { depth: null },
  )

  // 3. StringOutputParser 只转换已经存在的消息；这里的 model.invoke 是唯一一次普通模型调用。
  printSection('3. StringOutputParser：AIMessage -> string')
  const plainResponse = await model.invoke('用一句话解释 Output Parser 的作用。')
  const textParser = new StringOutputParser()
  const parsedText = await textParser.invoke(plainResponse)
  const manualMessageText = await textParser.invoke(
    new AIMessage('这是无需模型调用的手动 AIMessage。'),
  )
  console.dir(
    {
      inputType: plainResponse.constructor.name,
      outputType: typeof parsedText,
      parsedText,
      manualMessageText,
      note: '两次 parser.invoke 都没有调用模型；parser 不校验 title/keyPoints/confidence。',
    },
    { depth: null },
  )

  printSection('4. 两种抽象的边界')
  console.table([
    {
      abstraction: 'withStructuredOutput(schema)',
      modelCall: '会调用模型',
      output: 'ArticleSummary（对象）',
      responsibility: '要求并验证模型返回的业务结构',
    },
    {
      abstraction: 'StringOutputParser',
      modelCall: '不会调用模型',
      output: 'string',
      responsibility: '从已有 AIMessage / 文本提取字符串',
    },
  ])
}

await main()
