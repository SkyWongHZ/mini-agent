# LangChain.js 学习路线

> **目标**：系统走完 LangChain.js v1 的核心抽象，并能把每个框架 API 对应回 `packages/mini-agent` 中已经手写过的底层机制。
>
> **非目标**：穷举 LangChain 生态、搭建生产系统，或在本阶段深入 LangGraph、真实向量数据库和 Agentic RAG。
>
> 进度见 [`README.md`](./README.md)；概念 demo 全部放在 [`src/`](./src/) 下，由 user 手写。

## 与 `packages/mini-agent` 的关系

`packages/mini-agent` 先从零实现 agent，目的是看清 message loop、tool dispatch、权限、context 和协议。

`packages/langchain-lab` 再学习框架，目标反过来：理解 LangChain 如何把已经见过的机制包装成统一接口，而不是重新学习一遍“什么是 agent”。

| 手写实现 | LangChain.js 对应抽象 |
|---|---|
| OpenAI-compatible client 调用 | `ChatDeepSeek` / `ChatOpenAI` 等 Chat Model |
| `messages[]` | `SystemMessage` / `HumanMessage` / `AIMessage` / `ToolMessage` |
| tool schema + implementation | `tool()` |
| 把 tool schema 交给模型 | `.bindTools()` |
| 手写 tool-call 回填 | `AIMessage.tool_calls` + `ToolMessage` |
| 手写 ReAct loop | `createAgent()` |
| 固定数据处理链 | Runnable 的 `.pipe()` |
| 固定检索后生成 | Retriever + Prompt + Chat Model（2-Step RAG） |

## 核心学习原则

1. **先看输入输出类型，再记 API 名字。** 每次 `.invoke()` 都要知道传入什么、返回什么，不能只打印最终字符串。
2. **先手动走通，再使用高阶封装。** Topic 03 手动完成 tool-call 回填后，Topic 06 才使用 `createAgent()`。
3. **一个文件只验证一个核心概念。** 不在 Chat Model demo 里顺手加入 agent、memory 或 RAG。
4. **始终与手写版本对照。** 框架隐藏的代码必须能在 `mini-agent` 中找到概念上的对应物。
5. **只使用当前 v1 文档。** 遇到 `LLMChain`、`ConversationChain`、`getRelevantDocuments()` 等旧 API，先检查 v1 migration guide，不照抄旧教程。

## 版本与资料基线

- Runtime：Node.js 22+、TypeScript、ESM
- Framework：LangChain.js v1
- Chat provider：`@langchain/deepseek` 的 `ChatDeepSeek`
- OpenAI-compatible 对照：`@langchain/openai` + custom `baseURL`
- Schema：Zod
- Run：`tsx` + workspace 根目录 `.env`

依赖的精确版本以 [`package.json`](./package.json) 和根目录 `pnpm-lock.yaml` 为准，不把易过期的 patch 版本写进学习代码。

### 主参考资料

- [LangChain JavaScript overview](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangChain v1 release notes](https://docs.langchain.com/oss/javascript/releases/langchain-v1)
- [LangChain v1 migration guide](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)
- [JavaScript API reference](https://reference.langchain.com/javascript)
- [ChatDeepSeek integration](https://docs.langchain.com/oss/javascript/integrations/chat/deepseek)
- [LangChain docs MCP](https://docs.langchain.com/use-these-docs)

LangChain 版本变化较快。写每个 demo 前，先通过本机 `langchain-docs` MCP 或上述官方文档核对当前 import、方法和返回类型。

## 推荐学习顺序

| Topic | 概念 | 产物 | 验证 |
|---|---|---|---|
| 01 | Chat Models | `src/01-chat-models.ts` | `.invoke()` / `.stream()` 可运行，能解释 `AIMessage` 和 metadata |
| 02 | Messages | `src/02-messages.ts` | 能手动构造多轮消息并解释各种 message 的来源 |
| 03 | Tools | `src/03-tools.ts` | 不用 agent，手动完成一次 tool-call → 执行 → 回填 → 最终回答 |
| 04 | Prompt Templates + Runnables | `src/04-prompts-runnables.ts` | 能解释 `.pipe()` 每一段的输入输出和失败位置 |
| 05 | Structured Output + Output Parsers | `src/05-structured-output-parsers.ts` | 能区分 schema 约束与已有输出转换 |
| 06 | Agents | `src/06-agents.ts` | `createAgent()` 能调一个工具，且能映射回手写 ReAct loop |
| 07 | Retrieval / 最小 2-Step RAG | `src/07-retrieval-rag.ts` | 内存检索后把相关文档交给模型生成一次回答 |

Topic 01–06 必须按顺序完成；Topic 07 在核心学习结束后建立 Retrieval/RAG 的组件地图，不深入真实向量数据库。

## 轻量完成流程

每个 Topic 都按下面的节奏结束：

1. 阅读该 Topic 对应的当前官方文档。
2. user 手写最小 demo，不复制一个完整应用。
3. 实际运行成功，并观察完整对象而不只是最终文本。
4. 运行 `pnpm --filter langchain-lab typecheck`。
5. 用自己的话回答本 Topic 的自检题。
6. AI assistant code review；working run + 连贯的 debug 解释就算通过，不重复考试。
7. 在 [`README.md`](./README.md) 勾选进度，再进入下一个 Topic。

Framework lab 保持轻量：不强制创建 `docs/topicN-*`、`notes/topicN.md` 或 git tag。是否 commit / push 由 user 明确决定。

## 每个 Topic 的最小深度

### Topic 01：Chat Models

阅读：[Models](https://docs.langchain.com/oss/javascript/langchain/models)、[ChatDeepSeek](https://docs.langchain.com/oss/javascript/integrations/chat/deepseek)。

最小内容：

- 用 `ChatDeepSeek` 完成一次 `.invoke()`。
- 用 `.stream()` 消费响应 chunks。
- 检查 `AIMessage.content`、`contentBlocks`、`usage_metadata` 和 `response_metadata`。
- 知道 `ChatDeepSeek` 是 provider implementation，而统一消息/模型接口来自 `@langchain/core`。
- 只做一次 `ChatOpenAI` + custom `baseURL` 对照，不扩展成第二条主线。

完成标准：不仅能打印回答，还能解释普通响应和流式 chunk 的类型、内容与 metadata。

自检：

1. 为什么 `.invoke()` 返回 `AIMessage`，而不是直接返回 `string`？
2. provider integration 和 `@langchain/core` 各自负责什么？
3. 流式 chunks 怎样合并成完整消息？usage 在哪里出现？

### Topic 02：Messages

阅读：[Messages](https://docs.langchain.com/oss/javascript/langchain/messages)。

最小内容：

- 手动构造 `SystemMessage`、`HumanMessage`、`AIMessage`、`ToolMessage`。
- 维护一个最小多轮消息数组，并再次调用模型。
- 区分 `content`、标准化的 `contentBlocks`、tool calls 和 response metadata。
- 观察 LangChain message 与 OpenAI-compatible 原始 message 的对应关系。

完成标准：能指出每条 message 由谁创建、下一轮为什么必须把它带回模型。

自检：

1. `AIMessage` 中哪些字段是模型正文，哪些是 provider metadata？
2. `ToolMessage` 为什么需要匹配具体 tool call？
3. 多轮对话“记住上下文”是模型能力，还是应用重新发送消息的结果？

### Topic 03：Tools 与 Tool Calling

阅读：[Tools](https://docs.langchain.com/oss/javascript/langchain/tools)、[Models: tool calling](https://docs.langchain.com/oss/javascript/langchain/models#tool-calling)。

最小内容：

- 使用 `tool()` + Zod 定义一个无副作用工具。
- 使用 `.bindTools()` 把工具描述交给模型。
- 手动读取 `AIMessage.tool_calls`，找到对应工具并调用 `tool.invoke(toolCall)`，观察返回的 `ToolMessage` 与 `tool_call_id`。
- 把完整历史再次发送给模型，得到最终回答。
- 观察非法参数或 schema 校验失败时发生在哪一层。

本 Topic 禁止使用 `createAgent()`；这里的目的就是看清它之后会隐藏的流程。

完成标准：能独立完成一次完整 tool-call round trip，并与 `mini-agent` 的 registry / dispatch / loop 逐步对应。

自检：

1. `tool()` 同时包装了哪两样东西？
2. `.bindTools()` 会自动执行工具吗？
3. 模型选择工具、本地执行工具、参数校验分别由谁负责？
4. tool call ID 为什么必须原样带回？

### Topic 04：Prompt Templates 与 Runnables

阅读当前 `@langchain/core/prompts` 与 Runnable API reference。

最小内容：

- 使用 `ChatPromptTemplate` 表达固定消息结构。
- 使用 `MessagesPlaceholder` 注入已有消息。
- 用 `.pipe()` 组合 prompt 与 model。
- 分别调用 `.invoke()` 和 `.batch()`，观察每一段的输入输出类型。
- 制造一次输入缺失或模板错误，确认错误来自组合链的哪一段。

完成标准：能解释 Runnable 是数据流组合，不是 agent loop，也不会因为 `.pipe()` 自动获得 ReAct 控制流。

自检：

1. Prompt Template 的输出为什么不是最终模型回答？
2. `A.pipe(B)` 对 A 的输出和 B 的输入有什么要求？
3. Runnable pipeline 与会反复调用工具的 agent loop 有什么根本区别？

### Topic 05：Structured Output 与 Output Parsers

阅读：[Models: structured output](https://docs.langchain.com/oss/javascript/langchain/models#structured-output) 和当前 Output Parser API reference。

最小内容：

- 使用 `.withStructuredOutput()` + Zod 得到类型化对象。
- 使用 `StringOutputParser` 从 `AIMessage` 提取文本。
- 分别观察 schema 成功、schema 失败和普通文本解析。
- 明确 parser 是转换已有输出，structured output 是要求模型按结构生成。

完成标准：能说明两种机制分别工作在哪一层，知道什么时候应该选哪一个。

自检：

1. `.withStructuredOutput()` 与 `StringOutputParser` 为什么不是同一种抽象？
2. TypeScript 静态类型与 Zod 运行时校验分别保证什么？
3. schema 不符合预期时，错误来自模型、provider 还是 parser？如何判断？

### Topic 06：Agents

阅读：[Agents](https://docs.langchain.com/oss/javascript/langchain/agents)、[Streaming](https://docs.langchain.com/oss/javascript/langchain/streaming)。

最小内容：

- 使用 `createAgent()` + 一个简单工具。
- 运行 `.invoke()` 观察最终完整 state，再分别观察 `.stream()` 的 `updates` 和 `messages` 模式（当前官方文档不再把 `values` 列为 Agent streaming 主模式）。
- 检查最终 state 中的完整 messages，而不只看最后一条回答。
- 把一次运行映射回 `mini-agent` 的模型调用、tool dispatch、`ToolMessage` 回填和循环停止。
- 知道 `createAgent()` 内部基于 LangGraph runtime，但本 Topic 不直接使用 LangGraph API。

完成标准：能明确指出 `createAgent()` 替你接管了哪些 orchestration 工作，以及框架输出中哪里还能看到这些步骤。

自检：

1. `createAgent()` 的输入和返回为什么是 state，而不是一条字符串？
2. agent 如何判断继续调用工具还是结束？
3. tool 抛错时，错误由哪一层处理或传播？
4. `.stream()` 展示的是 token、message 还是 state update？你选择了哪一种？

本 Topic 不展开 short-term memory、middleware、human-in-the-loop、guardrails、deployment 和显式 LangGraph 编排。

### Topic 07：Retrieval / 最小 2-Step RAG

阅读：[Retrieval](https://docs.langchain.com/oss/javascript/langchain/retrieval)、[Text splitters](https://docs.langchain.com/oss/javascript/integrations/splitters)、[Embeddings](https://docs.langchain.com/oss/javascript/integrations/embeddings)、[Vector stores](https://docs.langchain.com/oss/javascript/integrations/vectorstores)。

最小内容：

- 直接准备少量 `Document`；理解 Loader 的位置，但不研究第三方 loader 生态。
- 对已有 `Document[]` 使用 `RecursiveCharacterTextSplitter.splitDocuments()` 切块，并确认 metadata 被保留。
- 用一个 embedding provider 理解 `embedDocuments()` / `embedQuery()`。
- 使用 `MemoryVectorStore` 做相似度查询。
- 使用 `vectorStore.asRetriever().invoke(query)` 返回相关 `Document[]`。
- 把检索结果注入 prompt，再调用 Chat Model 完成一次固定的 2-Step RAG。

完成标准：能跑通“文档 → 切块 → 向量化 → 检索 → 生成”，并准确解释每个组件的边界。

自检：

1. Loader、Splitter、Embedding、Vector Store、Retriever 各自负责什么？
2. `embedDocuments()` 与 `embedQuery()` 为什么是两个接口？
3. Vector Store 与 Retriever 为什么不是同一个概念？
4. 2-Step RAG 为什么不需要 Agent？
5. `MemoryVectorStore` 能证明检索链路正确，但不能证明哪些生产属性？

学到本 Topic 时再补 `@langchain/textsplitters`、`@langchain/classic`（仅用于 `MemoryVectorStore`）和选定的 embedding integration；不要安装已废弃的 `@langchain/community`。

本 Topic 不展开真实向量数据库、持久化、索引参数、增量 ingestion、rerank、Agentic RAG 和 retrieval eval。

## 暂缓主题

- Short-term memory / checkpointer
- Middleware / human-in-the-loop / guardrails
- LangSmith tracing、evals 和 deployment
- 直接使用 LangGraph API
- 真实向量数据库与完整知识库系统
- Agentic RAG / Hybrid RAG / rerank / retrieval eval

后续只有出现明确需求时，才为其中某一项单独设计学习路线。

## 全局自检

完成 Topic 01–07 后，应能回答：

1. 每一步 `.invoke()` 的输入和输出类型是什么？
2. 哪些类型来自 `@langchain/core`，哪些实现来自具体 provider package？
3. LangChain message 与 OpenAI-compatible 原始 message 如何对应？
4. Tool schema、模型选择、本地执行、结果回填分别由谁负责？
5. Runnable pipeline 和 agent loop 的控制语义有什么区别？
6. `.withStructuredOutput()` 与 Output Parser 的根本差别是什么？
7. `createAgent()` 替代了 `mini-agent` 中哪些显式代码？
8. Framework 提高了便利性，但隐藏了哪些调试信息和控制点？
9. Retriever 与 Vector Store 的边界是什么？
10. 最小 2-Step RAG 中，检索和生成为什么可以独立验证？
