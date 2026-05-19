# `pguso/ai-agents-from-scratch` → 本项目 Phase 映射

> **用法**:写代码时**对照查表**,而不是用来抄。
> 标准工作流见 `CLAUDE.md` 的 `## Working mode`:**读 pguso 对应章节的 `CONCEPT.md` → 关 tab → 在 `src/` 自己写**。
> 学习节奏见 `LEARNING.md`。

## 网站还是 repo?**用 repo**

[`agentsfromscratch.com`](https://agentsfromscratch.com) 和 repo 教的是**同一内容**,只是组织方式不同:

- **网站**用主题命名("Function Calling"、"System Prompts"),只更新到第 10 课
- **repo** 每个例子文件夹里的 `CONCEPT.md` 就是**网站对应章节的同一内容**,而且 11 - 14 章只有 repo 有

**结论**:你已经 clone 了 repo,**不要再开网站** — 多个 tab 只增加干扰。直接打开 `CONCEPT.md` 文件读就行。

### 网站章节 ↔ repo 文件夹(给好奇心一个交代)

| 网站章节 | repo 文件夹 |
|---|---|
| Foundation: Basic LLM Interaction | `01_intro` |
| Optional: OpenAI APIs | `02_openai-intro` |
| Specialization: System Prompts | `03_translation`(repo 按 demo 命名 / 网站按概念命名) |
| Reasoning: Reasoning Agents | `04_think` |
| Performance: Parallel Processing | `05_batch` |
| UX: Streaming & Control | `06_coding` |
| Function Calling | `07_simple-agent` |
| Persistent Memory | `08_simple-agent-with-memory` |
| ReAct Pattern | `09_react-agent` |
| Atom of Thought | `10_aot-agent` |
| Phase 2 Overview | (概念性 overview,无对应代码) |
| (网站未收录) | `11_error-handling` |
| (网站未收录) | `12_tree-of-thought` |
| (网站未收录) | `13_graph-of-thought` |
| (网站未收录) | `14_chain-of-thought` |

---

## 14 个例子总览

| 例子 | 用什么模型 | 对应 Phase | 重要度 | 用法 |
|---|---|---|---|---|
| `01_intro` | 本地 node-llama-cpp | Phase 0 | 🟡 | **跳代码**,只读 `CONCEPT.md` 看思路 |
| `02_openai-intro` | OpenAI | Phase 0 | ⭐⭐ | **DeepSeek 改 `baseURL` 即可照抄** |
| `03_translation` | OpenAI | (Phase 0 应用) | ⚪ | 读概念,跳代码 |
| `04_think` | 混合 | Phase 0 → 1 过渡 | 🟡 | 读 CONCEPT,理解 "thinking" 模式 |
| `05_batch` | OpenAI | (优化) | ⚪ | 跳过 |
| `06_coding` | OpenAI | (Phase 1 应用) | 🟡 | 看完 07 / 09 后回来选读 |
| `07_simple-agent` | OpenAI | **Phase 1** | ⭐⭐ | **最重要** — tool dispatch 雏形 |
| `08_simple-agent-with-memory` | OpenAI | **Phase 3** | ⭐ | 概念对照 Context+Trace |
| `09_react-agent` | OpenAI | **Phase 1** | ⭐⭐ | 纯 ReAct 循环,和 07 互补 |
| `10_aot-agent` | OpenAI | (进阶) | ⚪ | 超出 mini-agent 范围 |
| `11_error-handling` | OpenAI | Phase 2 / 3 | 🟡 | 选读 — 错误传播策略 |
| `12_tree-of-thought` | OpenAI | (超纲) | ⚪ | **跳** |
| `13_graph-of-thought` | OpenAI | (超纲) | ⚪ | **跳** |
| `14_chain-of-thought` | OpenAI | (超纲) | ⚪ | **跳** |

> 图例:⭐⭐ 必学 / ⭐ 重要 / 🟡 选读 / ⚪ 跳

---

## 每个 Phase 该读 pguso 哪几节

### Phase 0 — Chat Loop
- 必读:`02_openai-intro/CONCEPT.md`
- 看完关 tab,自己在 `src/index.ts` + `src/llm.ts` 里写一个 ~30 行 chat 循环
- 重点理解:**messages 数组怎么累积、system prompt 放哪一条**
- pguso **没覆盖**:对话历史持久化(可以等以后从 `example/AI-chatbot/` 学)

### Phase 1 — Tools / ReAct
- 必读:`07_simple-agent/CONCEPT.md` + `09_react-agent/CONCEPT.md`
- **重点对比 07 和 09 的差异** — 这正好是"agent loop 该走几轮、何时停"的核心
- 写自己的 `src/tools/registry.ts` + `src/agent.ts`
- 重点理解:**模型返回 tool_calls 时,如何把每个 tool 的执行结果以 `role: 'tool'` 加回 messages**

### Phase 2 — Permissions + Hooks
- ❌ **pguso 没有专门例子** — 这一阶段无从抄
- 自己设计:`hooks: Hook[]` 数组,`callTool` 前后各 `for` 一遍
- 卡住时和 Claude 讨论思路,**别让它写代码**

### Phase 3 — Context + Trace
- 必读:`08_simple-agent-with-memory/CONCEPT.md`
- 选读:`11_error-handling/CONCEPT.md`(失败时怎么记录 trace)
- 注意:pguso 的 memory 偏"无限堆积",**你要加裁剪触发条件**(`messages.length > N` 起步)

### Phase 4 — Evals
- ❌ pguso 没覆盖
- 自己定 5 - 10 条固定任务 + 期望行为,先脚本 + 人工判断
- 至少覆盖:无 tool / 单 tool / 多 tool / tool 报错 / 权限拒绝

### Phase 5 — MCP
- ❌ pguso 没覆盖
- 参考官方:[`modelcontextprotocol/typescript-sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
- 验证工具:MCP Inspector

### Phase 6 — Subagent
- ❌ pguso 没覆盖
- 自己设计:主 agent 多一个 `delegate(name, task)` tool
- 重点:**子 agent 有独立 `messages[]`,只返回最终字符串,不泄漏内部 transcript**

### Phase 7 — Skills(可选)
- ❌ pguso 没覆盖
- 自己设计 provider-agnostic 的 `SKILL.md` loader

---

## 各 Phase 要打开的 CONCEPT.md 路径(复制粘贴用)

每进入一个新 Phase,在编辑器里打开下面这些路径,读完**关掉 tab** 再回 `src/` 写自己的代码:

```bash
# Phase 0 — Chat Loop
example/ai-agents-from-scratch/examples/02_openai-intro/CONCEPT.md

# Phase 1 — Tools / ReAct(两份都看,重点对比 07 和 09 的差异)
example/ai-agents-from-scratch/examples/07_simple-agent/CONCEPT.md
example/ai-agents-from-scratch/examples/09_react-agent/CONCEPT.md

# Phase 2 — Permissions + Hooks
# ❌ pguso 无对应 — 直接和 Claude 讨论 hook 链设计

# Phase 3 — Context + Trace
example/ai-agents-from-scratch/examples/08_simple-agent-with-memory/CONCEPT.md
# 选读(错误处理 / trace 思路):
example/ai-agents-from-scratch/examples/11_error-handling/CONCEPT.md

# Phase 4 — Evals
# ❌ pguso 无对应

# Phase 5 — MCP
# ❌ pguso 无对应 — 看 modelcontextprotocol/typescript-sdk

# Phase 6 — Subagent
# ❌ pguso 无对应

# Phase 7 — Skills(可选)
# ❌ pguso 无对应
```

> 也可以读对应的 `CODE.md`(代码逐行讲解),但 **`CODE.md` 容易让你"看着抄"**,违反 Working mode。建议:**先只读 `CONCEPT.md`**,真的需要看代码再开 `CODE.md`,看完立刻关。

---

## DeepSeek vs OpenAI 的代码差异(几乎可以忽略)

pguso 的 OpenAI 例子改两行就跑你的 DeepSeek:

```js
// pguso 原版
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 你的 DeepSeek 版
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
})
```

模型名:
- pguso 用 `gpt-4o-mini` / `gpt-4o`
- 你用 `deepseek-v4-flash`(默认)/ `deepseek-v4-pro`(复杂任务)
- ⚠️ **不要再写 `deepseek-chat`** — 2026-07-24 停用

Tool calling 格式 1:1 兼容(DeepSeek 支持 OpenAI 的 `tools` 参数 + `tool_calls` 响应)。

---

## 几条翻车提醒

- ⚠️ **不要按 `01 → 14` 顺序看** — 跳读,只看上面标 ⭐⭐ / ⭐ 的
- ⚠️ **不要照抄 pguso 主线的本地模型代码**(`01_intro`),那条路你不走
- ⚠️ **超纲例子(`10, 12, 13, 14`)别因为好奇先看** — Phase 1 - 4 没打牢,看 ToT / GoT 会似懂非懂
- ⚠️ **同时打开 pguso 文件和你 `src/` 的文件是 Working mode 的最大杀手** — 切窗口看,不并排看
