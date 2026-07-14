# mini-agent

从零理解 LLM agent 核心概念的学习仓库 —— 不用任何高层框架,手写每个概念。pnpm monorepo,一个学习轨一个包。

## 三个包分别是什么

| 包 | 是什么 |
|---|---|
| [`packages/mini-agent`](./packages/mini-agent) | **主线**:不用框架、从零手写的 agent 核心(Phase 0–7:Tools / Hooks / Context / MCP / Subagent / Skills)。路线图见包内 [`LEARNING.md`](./packages/mini-agent/LEARNING.md)。 |
| [`packages/langchain-lab`](./packages/langchain-lab) | LangChain.js 学习轨 —— 学**生产框架的 API**,与手写核心隔离(独立依赖)。 |
| `packages/langgraph-lab` | LangGraph.js 学习轨 —— **规划中,学到时再建**。 |

> 框架学习轨是和主线**并行、独立**的:手写完核心后再学框架,二者依赖互不污染。

## 运行

```bash
pnpm install                                          # 仓库根,一次装全部包
echo "DEEPSEEK_API_KEY=sk-..." > .env                 # 单份根 .env,所有包共享

pnpm --filter mini-agent    dev "23 * 47 等于多少"     # 跑核心 agent
pnpm --filter langchain-lab dev src/01-chat-models.ts # 跑某个 LangChain demo
pnpm -r typecheck                                     # 所有包 typecheck
```

心智模型一句话:**`--filter <包名>` 选单个包**(包名来自各包 `package.json` 的 `name`),**`-r` 对所有包跑**。密钥只在根 `.env` 写一次,各包脚本用 `--env-file=../../.env` 共用。

## 更多

- **规则 / 架构 / Working mode** → [`AGENTS.md`](./AGENTS.md)(给 AI 协作者的 canonical 项目说明;`CLAUDE.md` 导入它)
- **学习路线图 + 自检** → [`packages/mini-agent/LEARNING.md`](./packages/mini-agent/LEARNING.md) · [`packages/langchain-lab/LEARNING.md`](./packages/langchain-lab/LEARNING.md)
- **各包局部说明 / 进度** → [`packages/mini-agent/README.md`](./packages/mini-agent/README.md) · [`packages/langchain-lab/README.md`](./packages/langchain-lab/README.md)
