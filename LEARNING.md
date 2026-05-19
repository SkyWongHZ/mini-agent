# Mini-Agent 学习路线

> 目标:通过**自己从零实现**来吃透 agent 的核心概念 — Tools、Hooks、MCP、Subagent、Skills,以及它们怎么串起来。
> **非目标**:产出一个能商用的 agent 框架。
>
> **执行节奏与人机协作分工见 [`CLAUDE.md`](./CLAUDE.md) 的 `## Working mode` 段。** 本文档讲"学什么",CLAUDE.md 讲"怎么协作"。
>
> 当前判断:Claude Code 给的主线方向可以采纳,但需要按 2026 年的模型/API 现状做几处修正:
> 1. DeepSeek 新项目不要再默认写 `deepseek-chat`,改用 `deepseek-v4-flash` 起步
> 2. Phase 1 拆成 chat loop 与 tool loop 两步,避免一开始混太多概念
> 3. 在 MCP / Subagent 前补上 permissions、context、evals,这些是 coding agent 真正会踩坑的地方

## 核心理念:不上现成框架

现阶段刻意**避开** LangChain / LangGraph / Claude Agent SDK / OpenAI Agents SDK 这类高阶抽象。原因:

1. **会同时学两套东西** — agent 概念 + 框架自己的抽象(Runnable / Graph / State 等)。出 bug 时分不清是哪边的问题
2. **框架会把关键细节藏起来** — tool call 怎么和 messages 拼回去、tool 结果如何变下一轮 input、循环何时终止,框架一行 `.invoke()` 就过了
3. **没自己写过最朴素版本,看 SDK 设计会觉得"概念太多记不住";写过之后,看 SDK 文档会觉得"这就是我那版加了点便利而已"**

原则:**能用 50 行自己写明白的事,不要用框架的 500 行抽象去理解它。**

注意:这里禁止的是**高阶 agent 框架**。`openai` npm 这种薄 SDK 只是 HTTP client 包装,可以用;真正要手写的是 message loop、tool dispatch、hook 调度、上下文管理这些机制。

## 主要参考资料

### 跟着抄(主线)
- **[pguso/ai-agents-from-scratch](https://github.com/pguso/ai-agents-from-scratch)** (⭐ 3.5k) + 配套站点 [agentsfromscratch.com](https://agentsfromscratch.com)
  - JavaScript,明确 "no frameworks, no black boxes" — 与本仓库理念一致
  - 14 个递进示例:LLM 基础调用 → function calling(tools)→ persistent memory → ReAct → Tree / Graph / Chain of Thought
  - 与本学习路线几乎逐阶段对得上:前几例 = Phase 0 / 1,memory 例子 = Phase 3,ToT / GoT 等后期进阶可选看
  - 是 JS 不是 TS — 跟着抄时不必加类型,等落地到本仓库再补 TypeScript 注解
  - **每章对应到本路线哪个 Phase 的速查表见 [`docs/pguso-mapping.md`](./docs/pguso-mapping.md)** — 写代码时边查边用

### 概念对照(读,不抄代码)
- **[Hello-Agents](https://github.com/datawhalechina/Hello-Agents)** — Python 版概念教程,只取思想
- **[Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)** — 必读,Workflow vs Agent 的本质区别
- **[anthropic-cookbook/patterns/agents](https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents)** — Python,但 README 概念部分值得看

### API / 协议参考(只查接口,不照搬框架)
- **[DeepSeek API Docs](https://api-docs.deepseek.com/)** — 当前模型名、OpenAI 兼容调用、Tool Calls
- **[modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)** — 阶段 5 MCP 时使用
- **MCP Inspector** — 阶段 5 验证 MCP server 是否能列出工具

### 后期再看(现阶段不碰)
- [langchain-ai/agents-from-scratch-ts](https://github.com/langchain-ai/agents-from-scratch-ts) — 等理解概念后再用框架
- [anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) — 切到 Claude 时
- [openai/openai-agents-js](https://github.com/openai/openai-agents-js) — 切到 GPT 时

## 推荐学习顺序

| 阶段 | 概念 | 产物 | 验证 |
|---|---|---|---|
| 0 | **Chat Loop(消息循环)** | `llm.ts` + CLI + `messages[]` 历史 | 能连续对话,能看懂每轮 request/response |
| 1 | **Tools / ReAct(函数调用)** | tool registry + 2-3 个 tool + 最小循环 | 模型能调对工具回答复合问题;循环有最大步数 |
| 2 | **Permissions + Hooks(权限与生命周期)** | `preToolCall` / `postToolCall` + logger + confirm | 写文件/执行命令等危险工具会被权限 hook 拦住 |
| 3 | **Context + Trace(上下文与可观测性)** | 简单 transcript、token/轮数预算、历史裁剪或摘要 | 长一点的任务不会无限堆 messages;失败时能复盘 |
| 4 | **Evals(最小评测)** | 5-10 条固定任务 + 期望行为检查 | 每次改 loop / tool / prompt 后能发现退化 |
| 5 | **MCP(工具协议)** | 把 tools 重构为 MCP server,通过 stdio 调 | MCP Inspector 能列出工具;agent 行为不变 |
| 6 | **Subagent(多 agent)** | 主 agent 派发任务给 role-specific subagents | 复合任务能被正确路由,子 agent 输出可追踪 |
| 7 | **Skills(可选)** | 先做 provider-agnostic `SKILL.md` loader,以后再接 Claude/GPT SDK | skill 能改变 agent 行为,且不依赖特定厂商 SDK |

## 现阶段技术选型(可调整)

- **语言**:TypeScript + Node 20+
- **LLM**:DeepSeek `deepseek-v4-flash` 起步(OpenAI 兼容、便宜),复杂任务再试 `deepseek-v4-pro`,后期切 Claude / GPT
- **SDK**:`openai` npm + `baseURL=https://api.deepseek.com`(切 GPT 几乎零改动)
- **校验**:`zod` + `zod-to-json-schema`(给模型的 tool JSON Schema)
- **运行**:`tsx`(不折腾 build)

注意:DeepSeek 旧模型名 `deepseek-chat` / `deepseek-reasoner` 当前只是兼容别名,官方说明会在 2026-07-24 停用;新代码不要把它们写进默认配置。

## 每阶段最小产物

### Phase 0:Chat Loop
- `package.json` / `tsconfig.json`
- `src/index.ts`:读取 CLI 参数,打印模型回复
- `src/llm.ts`:封装 OpenAI-compatible client
- 先不要实现 tool,只确认 message history 如何传入下一轮

### Phase 1:Tools / ReAct
- `src/tools/registry.ts`:统一 tool 类型、schema、dispatch
- 至少 2-3 个工具:如 `calculator`、`read_file`、`list_files`
- 写 5 - 10 行 system prompt 给 agent 设角色 + 工具使用规则 — **先别套复杂 ReAct prompt 模板**;模型 90% 调不对工具的原因都是 system prompt 没写好
- agent loop 必须显式处理:
  - 模型返回 tool call
  - 本地执行 tool
  - tool result 放回 messages
  - 下一轮继续
  - 达到最大步数后停止

### Phase 2:Permissions + Hooks
- `preToolCall` / `postToolCall` 用普通数组和 `for` 循环实现
- 至少实现:
  - logger hook
  - confirm hook
  - read/write/bash 三类权限的雏形
- 目标是理解 coding agent 的安全边界,不是做完整沙箱

### Phase 3:Context + Trace
- 每轮保存可读 transcript
- 给 agent loop 加 `maxTurns` / `maxToolCalls`
- 触发裁剪:先用简单阈值(如 `messages.length > N` 或粗略 char 数),后期再换成 token 计数 + 摘要
- 记录 tool 输入、输出、耗时、错误
- 每次 LLM 调用记 input / output token 数 + 耗时,任务结束时汇总输出(为 Phase 4 evals 提供数据;也方便看 DeepSeek 实际花了多少)

### Phase 4:Evals
- 建一个最小任务集,不要一开始追求复杂 benchmark
- 至少覆盖:
  - 不需要 tool 的普通问答
  - 需要一个 tool 的任务
  - 需要多个 tool 串起来的任务
  - tool 报错后的恢复
  - 权限被拒绝后的回答
- 评测可以先是脚本 + 人工检查 transcript,后面再做自动断言

### Phase 5:MCP
- 先保证 Phase 1-4 的本地 tools 行为稳定
- 再把 tools 搬到 MCP server
- agent 通过 MCP client 调工具,外部行为应尽量不变

### Phase 6:Subagent
- 不要一开始做复杂多 agent 协作
- 先做主 agent 调一个子 agent,比如:
  - `research-agent`:只读资料、总结
  - `code-agent`:只改代码
  - `review-agent`:只做 review
- **subagent 有独立的 `messages[]` 上下文**,只把最终字符串 / JSON 返回给主 agent — **不把内部 transcript 泄漏给主 agent**
- 重点观察:权限是否随子任务收窄、错误如何冒泡、token 预算如何切分

### Phase 7:Skills
- 先做最小版:读取 `skills/<name>/SKILL.md`,拼进 system prompt 或 agent config
- 等理解了 skill loader 的本质,再看 Claude Skills / OpenAI Agents SDK 的封装

## 给 review 这份文档的模型

如果你在 review 这份学习路线,请重点检查:

1. **从零实现 vs 直接上框架**的取舍是否合理 — 有没有更好的中间路径?
2. **学习顺序**(Chat Loop → Tools → Hooks/Permissions → Context/Trace → Evals → MCP → Subagent → Skills)是否合理 — 有没有应该提前或推迟的?
3. **主推荐 [pguso/ai-agents-from-scratch](https://github.com/pguso/ai-agents-from-scratch)**(⭐ 3.5k)是否真的是最佳的"跟着抄"选择 — 有没有更新/更适合的资源(尤其 2025 - 2026 年期间出现的)?
4. **DeepSeek 起步**会不会因为模型 tool calling 能力问题影响学习体验?是否应该一开始就用 Claude / GPT?
5. 有没有遗漏的**关键概念**应该加进学习路线?
6. 每个阶段的**验证方式**是否足以证明"概念真的学懂了"?

## 判断是否学懂

每个阶段结束时,不要只看代码能跑,还要能回答这些问题:

1. 这一轮 messages 里每条 message 是谁写进去的?
2. 模型为什么决定调用这个 tool?
3. tool result 是用什么格式回填给模型的?
4. 如果 tool 报错,下一轮模型会看到什么?
5. 什么时候停止循环?如果模型一直调工具怎么办?
6. 哪些操作需要用户确认?确认逻辑在哪一层?
7. 上下文太长时丢掉了什么?会不会影响正确性?
