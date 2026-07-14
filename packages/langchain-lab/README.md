# `packages/langchain-lab` — LangChain.js v1 学习轨

这个包用于学习生产框架 LangChain.js 的核心 API，并把框架抽象与 [`packages/mini-agent`](../mini-agent/) 中已经手写过的机制逐一对照。

- 完整路线与自检题：[`LEARNING.md`](./LEARNING.md)
- 概念 demo：[`src/`](./src/)
- 当前依赖：[`package.json`](./package.json)

## 谁写代码？

| 谁 | 写什么 |
|---|---|
| **AI assistant（需求阶段）** | 创建 Topic 文件，补齐配置/脚手架和详细 TODO 注释；先不实现概念代码 |
| **user** | 阅读 TODO、理清 API 与抽象关系，可以提问或选择亲手实现 |
| **AI assistant（实现阶段）** | user 明确要求实现后，完成 demo、实际运行、typecheck、解释结果并 code review |

### 两阶段协作流程

1. 开始 Topic 时，AI 先依据最新官方文档写清需求注释、观察项、自检问题和完成标准，不实现 TODO。
2. user 阅读注释并理清思路；中间可以继续讨论 API、数据结构和设计边界。
3. user 明确说“实现”后，AI 可以完成该 Topic 的概念 demo，并执行运行验证与 typecheck。
4. user 也可以选择自己实现，AI 负责调试和 review。

除非 user 明确要求跳过需求阶段，否则不要在第一次进入新 Topic 时直接交付完整实现。此规则只适用于 framework lab，不改变 `packages/mini-agent` 核心代码必须由 user 手写的约定。

## 当前进度

完成一个 Topic 后：实际运行 → `typecheck` → 回答自检题 → code review → 在这里勾选。

| 状态 | Topic | Demo | 核心验证 |
|---|---|---|---|
| ✅ | Scaffold — LangChain.js v1 | `package.json` / `tsconfig.json` | v1 依赖隔离在本包，空包可 typecheck |
| ✅ | 01 — Chat Models | `src/01-chat-models.ts` | `.invoke()` / `.stream()` 与 `AIMessage` |
| ✅ | 02 — Messages | `src/02-messages.ts` | 多轮 message 与 metadata |
| ✅ | 03 — Tools | `src/03-tools.ts` | 手动 tool-call 完整回填 |
| ✅ | 04 — Prompt Templates + Runnables | `src/04-prompts-runnables.ts` | `.pipe()` 的输入输出组合 |
| ✅ | 05 — Structured Output + Parsers | `src/05-structured-output-parsers.ts` | schema 约束与 output 转换 |
| ✅ | 06 — Agents | `src/06-agents.ts` | `createAgent()` 与手写 loop 对照 |
| ⏭ | 07 — Retrieval / 2-Step RAG | `src/07-retrieval-rag.ts` | 内存检索后生成最小闭环 |

Framework lab 不强制创建每阶段 design doc、notes 或 tag；路线与理由以 [`LEARNING.md`](./LEARNING.md) 为准，完成状态以本表为准。

## 计划文件结构

```text
packages/langchain-lab/
├── README.md
├── LEARNING.md
├── package.json
├── tsconfig.json
└── src/
    ├── README.md
    ├── 01-chat-models.ts
    ├── 02-messages.ts
    ├── 03-tools.ts
    ├── 04-prompts-runnables.ts
    ├── 05-structured-output-parsers.ts
    ├── 06-agents.ts
    └── 07-retrieval-rag.ts
```

文件按进度逐个创建；第一个 demo 写好后即可删除 `src/_placeholder.ts`。

## 运行

仓库根目录 `.env`：

```dotenv
DEEPSEEK_API_KEY=sk-...
```

从 workspace 根目录运行：

```bash
pnpm --filter langchain-lab dev src/01-chat-models.ts
pnpm --filter langchain-lab typecheck
```
