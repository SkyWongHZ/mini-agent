# `langchain-lab/src` — LangChain.js 学习轨

与 `packages/mini-agent`(从零手写)是**互补但相反**的两件事:这里学的是**生产框架 LangChain.js 的 API**,不再追求从零造轮子。

## 谁写代码?

沿用仓库 Working mode:**概念代码(各 demo)由 user 手写**,Claude 只搭包/配置/脚手架。下面每个主题一个文件,自己逐个建、逐个填。

## 学习顺序(每个建一个 `NN-topic.ts`)

| # | 主题 | 关键类型 / 入口 |
|---|---|---|
| 01 | Chat models | `ChatOpenAI`(`configuration.baseURL` 指 DeepSeek) |
| 02 | Messages | `HumanMessage` / `AIMessage` / `SystemMessage` / `ToolMessage` |
| 03 | Tools | `tool()` + `zod` schema,`.bindTools()` |
| 04 | Prompt templates | `ChatPromptTemplate` / `MessagesPlaceholder` |
| 05 | Retrievers | vector store + retriever(见下方 embeddings 备注) |
| 06 | Output parsers | `StringOutputParser` / structured output |

## 接 DeepSeek

和 `mini-agent/src/llm.ts` 同思路——OpenAI 兼容端点:

```ts
new ChatOpenAI({
  model: "deepseek-v4-flash",
  configuration: { baseURL: "https://api.deepseek.com" },
  apiKey: process.env.DEEPSEEK_API_KEY,
})
```

> 备选:`@langchain/deepseek` 的 `ChatDeepSeek`(需另装该包)。

## 运行

密钥写在**仓库根的 `.env`**(`DEEPSEEK_API_KEY=...`,已 gitignore);脚本用 `--env-file=../../.env` 注入,无需在本包再放 `.env`。

```bash
# 在仓库根执行,pnpm 会把文件路径追加给 tsx
pnpm --filter langchain-lab dev src/01-chat-models.ts
pnpm --filter langchain-lab typecheck
```

## ⚠️ 05 Retrievers 的 embeddings 待定

DeepSeek 可能不提供 embeddings 端点。学到 05 时再定方案:本地/HF embedding,或临时用 OpenAI embeddings。届时按需补依赖,不在初始脚手架里预装。
