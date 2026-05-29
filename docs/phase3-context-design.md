# Phase 3A:Runtime Context + Trace 设计清单

> 这份文档只锁定 Phase 3A 的设计决策和验收标准。具体 context 管理代码由 user 手写;AI assistant 只做设计讨论、review 和脚手架协助。

## 背景与目标

Phase 2 已经让 tool 调用具备 hook 生命周期和权限确认,但 agent 运行本身仍然缺少三类能力:

- **预算控制**:只有 `MAX_TURNS`,还没有 `maxToolCalls` / context 字符预算。
- **可复盘 transcript**:当前 logger 只打印到终端,没有 run-local 的结构化事件。
- **上下文裁剪**:`messages[]` 只增不减,长任务会持续膨胀。

Phase 3A 只做 **runtime context**:本次 `runAgent(...)` 内的 messages、预算、裁剪、trace、usage 汇总。长期记忆不在本阶段做。

---

## Q1:Phase 3 的 Context 边界是什么?

| 选项 | 行为 |
|---|---|
| **A(选)** | Runtime context:只管理本次 run 的 `messages` / 预算 / 裁剪 / transcript |
| B | Runtime context + long-term memory |
| C | 只做 trace,不做裁剪 |

**选 A 的理由**:

1. Agent 最基础的 context 不是长期记忆,而是模型每轮实际看到的 `messages[]`。
2. 长期记忆会额外引入 `saveMemory` tool、JSON 持久化、去重、冲突更新、隐私和检索相关性,会把两个概念混在一起。
3. Phase 4 evals 需要先有稳定 transcript,否则失败时无法判断是 tool、LLM、权限还是裁剪问题。
4. pguso `08_simple-agent-with-memory` 主要讲 long-term semantic memory,可以作为后续阶段参考,但不直接搬进 Phase 3A。

**阶段拆分**:

- Phase 3A:Runtime Context + Trace
- 未来 Phase 3B 或 Phase 7 前:Long-term Memory

---

## Q2:`runAgent` 返回值怎么设计?

| 选项 | 返回值 |
|---|---|
| A | 保持 `Promise<string>` |
| **B(选)** | `Promise<{ reply, transcript, stats }>` |
| C | 加可选参数,按模式返回不同形态 |

**选 B 的理由**:

1. CLI 能继续打印最终回复,Phase 4 evals 也能直接读取结构化 trace。
2. transcript/stats 不依赖 `console.log`,测试更稳定。
3. 接口变化显式,比"有时 string、有时 object"更容易理解。

最终契约:

```ts
runAgent(userInput, options?) -> Promise<AgentRunResult>

AgentRunResult:
- reply:string
- transcript:TranscriptEvent[]
- stats:AgentStats
```

`AgentStats` 最小字段:

| 字段 | 含义 |
|---|---|
| `turns` | 已完成的 LLM 轮数 |
| `llmCalls` | 实际发起的 LLM 调用次数 |
| `toolCalls` | 进入 `callTool` 的调用次数 |
| `tokens.input` | 已知 input tokens 累加;全部缺失时为 `null` |
| `tokens.output` | 已知 output tokens 累加;全部缺失时为 `null` |
| `tokens.total` | 已知 total tokens 累加;全部缺失时为 `null` |
| `elapsedMs` | 整个 `runAgent` 从开始到结束的耗时 |

usage 累加规则:DeepSeek/OpenAI 返回的 `usage` 字段可能缺失。缺失时不按 0 累加,而是跳过;某个 token 字段整次 run 都没拿到时,最终保留 `null`。

---

## Q3:预算配置放在哪里?

| 选项 | 机制 |
|---|---|
| A | 只用模块常量 |
| **B(选)** | `runAgent(input, options?)` 覆盖默认值 |
| C | 只用环境变量 |

**选 B 的理由**:

1. 默认值让 CLI 简单可用。
2. options 让 Phase 4 evals 可以传很小的预算,稳定触发 `maxToolCalls` / trim 分支。
3. 环境变量适合部署配置,但本项目当前重点是学习和本地验证。

默认值:

| 配置 | 默认值 |
|---|---:|
| `maxTurns` | `10` |
| `maxToolCalls` | `20` |
| `maxContextChars` | `12000` |

`maxContextChars = 12000` 是故意压小的学习默认值,目的是让 trim 在日常 run 里可观察;生产或长任务场景应通过 `runAgent(input, options)` 覆盖。

边界值约定:

- `maxTurns = 0` 或 `maxToolCalls = 0` 视为预算已耗尽,直接 `budget_stop`。
- 负数、`NaN`、`undefined` 等无效值按"未传"处理,使用默认值。
- `maxContextChars <= 0` 或无效值也按"未传"处理,使用默认值。

---

## Q4:Transcript 记录什么形态?

| 选项 | 形态 |
|---|---|
| **A(选)** | 结构化事件数组 |
| B | 纯文本日志 |
| C | 每轮完整 messages 快照 |

**选 A 的理由**:

1. 结构化事件既能格式化给人看,也能给 Phase 4 evals 做断言。
2. 纯文本日志适合肉眼看,但不适合稳定测试。
3. 完整快照最可复盘,但体积大,且容易和裁剪逻辑互相干扰。

事件类型至少包含:

- `llm_call`:turn、elapsedMs、usage、assistant content、tool_calls
- `tool_call`:toolName、args、result 或 error、elapsedMs
- `trim`:beforeChars、afterChars、removedMessages、removedGroups
- `budget_stop`:reason(`max_turns` / `max_tool_calls`)、message
- `final`:reply

**内容保留策略**:transcript 内存里保存完整内容;CLI 打印时再截断。

`tool_call.args` 记录 parsed object。若模型给出的 arguments 不是合法 JSON,则记录 `args: null`,并把 parse 失败信息放到该 `tool_call` 的 `error` 字段。

LLM 调用本身 throw(网络、401、限流、5xx 等)时,不写 transcript,直接向上抛。本阶段不做 retry,也不合成 fake event。

---

## Q5:Tool trace 从哪里采集?

| 选项 | 机制 |
|---|---|
| **A(选)** | 在 `agent.ts` 里局部包裹 `callTool` 前后 |
| B | 新增全局 trace hook |
| C | 改 `callTool` 返回对象 |

**选 A 的理由**:

1. transcript 是 run-local 状态,放在 agent 局部对象里不会和多次 run 串状态。
2. 不污染 Phase 2 的全局 hook 注册表,也不需要设计 trace sink 生命周期。
3. 保持 `callTool(name,argsJson):Promise<string>` 契约不变。

约定:

- `result.startsWith("Error:")` 视为 tool error。
- 无论成功/错误,都记录一条 `tool_call` event。
- Phase 2 logger 仍然可以照常打印;Phase 3 transcript 是另一条结构化通路。

`result.startsWith("Error:")` 是 Phase 1/2 继承下来的 sentinel 约定,已知脆弱(真实 tool 的正常返回也可能刚好以 `Error:` 开头)。Phase 3A 先不改,以后做 tool error taxonomy 时统一重构。

Phase 2 hook logger 和 Phase 3 transcript 是两条并行通路,默认都开:logger 给人看(stdout 实时观察),transcript 给程序看(Phase 4 evals 的输入)。两者数据冗余是预期的,不要合并;各自的耗时 timer 也不强求完全一致。

---

## Q6:Context 裁剪怎么做?

| 选项 | 触发条件 |
|---|---|
| **A(选)** | 粗略字符预算 |
| B | messages 条数 |
| C | 真实 token 计数 |

**选 A 的理由**:

1. 字符数比消息条数更接近 context 压力。
2. 不需要引入 tokenizer 或供应商绑定。
3. DeepSeek/OpenAI usage 是 LLM 调用后才知道,不能作为调用前裁剪的唯一依据。

字符数计算口径:`messages` 里每条 message 的 `content` 字符串长度相加,不含 JSON envelope、role、tool_call_id、tool_calls 等 metadata。这是简化近似,不追求精确。

裁剪时机:每次 LLM 调用前。

裁剪规则:

1. 永远保留 system message 和原始 user message。
2. 把 `assistant(tool_calls)` + 对应 `tool` messages 当成一个原子 group。
3. 只移除最旧的完整 assistant/tool group,不能留下孤立 `tool` message。
4. 如果只剩 system + user 仍然超过预算,记录 `trim` event 但继续发送。

关键坑:OpenAI-compatible chat message 对 tool calling 有配对约束。删掉 assistant 的 `tool_calls` 但留下 `role:"tool"` message,或反过来,都会破坏上下文因果链。

---

## Q7:预算耗尽怎么停?

| 选项 | 行为 |
|---|---|
| **A(选)** | 直接返回中文停止说明,记录 `budget_stop` |
| B | 把预算错误塞回模型,让 LLM 再解释 |
| C | 抛异常 |

**选 A 的理由**:

1. 预算耗尽是 agent orchestrator 的决定,不是 tool 结果。
2. 直接返回最可控,不会为了说明预算又消耗一轮 LLM。
3. 符合 Phase 1/2 "错误作为数据流给最终用户"的方向,但不让 agent 崩。

`maxToolCalls` 计数单位:每个实际 tool call 算 1 次。

更精确地说:**每个进入 `callTool` 的 call 都算 1 次**,不论结果是成功、tool 抛错、hook deny,还是 args JSON parse 失败。这样可以避免"一直拒绝或一直传错参数就不消耗预算"的漏洞。

预检查规则:如果本轮 assistant message 返回的 `tool_calls.length` 会超过剩余额度,整批不执行,直接停止。这样不会出现"同一轮前几个工具执行了、后几个因为预算被截断"的半批状态。

预算停止时仍然追加一条 `final` event,且 `final.reply` 等于预算停止的中文说明。这样 Phase 4 evals 可以稳定假设 transcript 最后一条事件是 `final`。

---

## 与 pguso 08 的关系

pguso `08_simple-agent-with-memory` 的核心是:

1. 启动时从 JSON 加载 memory。
2. 格式化 memory summary 注入 system prompt。
3. 暴露 `saveMemory` function/tool 给模型主动保存事实。

Phase 3A 不采用这套实现,只借一个模式:**把 agent 状态集中管理,再格式化给模型或人看**。

长期记忆以后单独设计,届时可以重新讨论:

- memory 文件格式
- `saveMemory` tool schema
- duplicate/update 规则
- memory summary 注入 system prompt 的位置
- 哪些内容不应该保存

---

## 验证清单

验证方式是 user 手跑以下 case 目测 + `pnpm typecheck`。本阶段不引入 jest / vitest / `node --test` 等测试框架;eval 化验证留到 Phase 4。

- [x] `pnpm typecheck`
- [x] 普通问答:无 tool,返回 reply,stats 至少有 1 次 LLM call,无 tool event
- [x] 单工具:数学计算,transcript 包含 `llm_call -> tool_call -> llm_call -> final`
- [x] 权限拒绝:`write_file` 输入 `N`,tool event 标记 error,agent 不崩
- [x] `maxToolCalls`:传小 options 触发预算停止,且不执行超额 tool
- [x] `maxContextChars`:传小预算触发 trim,确认不会留下孤立 `tool` message
- [x] CLI 输出:最终回答、简洁 trace、token/耗时汇总都可读

## 本阶段不做

- 长期记忆 / `saveMemory` / `memory.json`
- LLM retry
- 错误 taxonomy
- transcript 文件落盘
- token-level tokenizer
- `tool_calls` 并发执行:沿用 Phase 1 的 `for...of await` 串行执行。并发会引入 transcript 事件顺序和资源竞争问题,以后单独讨论。
