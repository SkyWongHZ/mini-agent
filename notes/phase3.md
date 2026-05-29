# Phase 3:Runtime Context + Trace

## 我写了什么

- **`docs/phase3-context-design.md`** — 新增设计文档,记录 Q1-Q7 决策:结构化返回、预算配置、transcript 事件、tool trace 来源、context 裁剪、预算停止语义。
- **`src/agent.ts`** — `runAgent` 从返回 string 升级为 `{ reply, transcript, stats }`;新增 `maxTurns` / `maxToolCalls` / `maxContextChars`;新增 transcript、stats、trim、budget stop。
- **`src/index.ts`** — CLI 适配新返回值,打印最终回答、简洁 trace 和 stats 汇总。

## 用自己的话复述这个概念

Phase 3A 里的 **context** 不是跨进程记忆,而是单次 agent run 里的工作记忆。LLM 本身是 stateless 的,所以每轮调用都要把当前 `messages[]` 重新发过去。这个数组里有 system、user、assistant、tool result。它决定了模型下一步"记得"什么。

Context 管理解决两个问题:第一,工作记忆不能无限长,所以每轮 LLM 前要按 `maxContextChars` 做粗略预算;第二,agent 不能无限循环,所以要用 `maxTurns` 和 `maxToolCalls` 给流程上边界。预算耗尽不是程序异常,而是 agent orchestrator 的正常停止路径,所以返回中文说明并记录 `budget_stop -> final`。

Trace 是另一条线:它不决定模型看到什么,而是记录这次 run 发生了什么。`transcript` 记录每轮 LLM 调用、tool 调用、裁剪、预算停止和最终回复;`stats` 汇总 turns、LLM 调用次数、tool 调用次数、token usage 和总耗时。这样 Phase 4 evals 不用解析 stdout,可以直接读结构化数据。

这次最关键的裁剪约束是:不能随便删 `messages`。OpenAI-compatible tool calling 要求 assistant 的 `tool_calls` 和后续 `role:"tool"` message 成对存在。裁剪时必须把 `assistant(tool_calls) + 对应 tool messages` 当作原子组一起删,否则下一轮 API 或模型因果链都会出问题。

## 踩坑记录

### 1. `maxContextChars` 太小会让 agent 重复调工具

- **以为**:只要 trim 不留下孤立 `tool` message,就算验证通过。
- **实际**:`maxContextChars:70` 会把上一轮 calculator 的 tool result 一起删掉,模型下一轮看不到结果,于是又调用 calculator,最后靠 `maxTurns=10` 停止。
- **根本原因**:裁剪保证的是消息配对合法,不是任务一定能收敛。context budget 小到只够 system + user 时,模型确实"失忆"了。以后如果要更实用,应该优先保留最新一组 assistant/tool 结果,只裁更旧的 group。

### 2. `tool_calls` 类型不是只有 function

- **以为**:Phase 1 已经只处理 function tool call,trace 里可以直接读 `call.function.name`。
- **实际**:OpenAI SDK v6 的 `ChatCompletionMessageToolCall` 是 union,还可能是 custom tool call。TypeScript 不允许未收窄就访问 `.function`。
- **根本原因**:实现心智停留在当前业务只用 function tool,但 SDK 类型覆盖更宽。最后用 `isFunctionToolCall` 类型守卫,trace 和执行都只处理 function call。

### 3. `Error:` sentinel 只是阶段性约定

- **以为**:只要 `result.startsWith("Error:")`,就能稳定区分 tool 失败。
- **实际**:这是 Phase 1/2 延续的简化约定,正常工具结果也理论上可能以 `Error:` 开头。
- **根本原因**:当前 `callTool` 契约只有 string,没有结构化成功/失败字段。Phase 3A 不改这个契约,先把脆弱性写进设计文档,以后做 error taxonomy 再统一重构。

## 自检题答案

**Q1:这一轮 messages 里每条 message 是谁写进去的?**

- `system`:agent 初始化时写入,固定系统提示。
- `user`:CLI 用户输入写入。
- `assistant`:每轮 LLM 返回后,agent 把整条 assistant message push 回 `messages`,包括可能存在的 `tool_calls`。
- `tool`:本地 `callTool` 执行完后,agent 把 result 以 `role:"tool"`、带 `tool_call_id` 的消息写回。

**Q2:模型为什么决定调用这个 tool?**

模型每轮看到 system prompt、用户请求、可用 tools schema 和已有历史。比如用户要求精确计算,system prompt 要求"需要数学计算时主动调用对应工具",于是模型返回 `tool_calls: calculator(...)`。

**Q3:tool result 是用什么格式回填给模型的?**

回填为:

```ts
{
  role: 'tool',
  tool_call_id: call.id,
  content: result,
}
```

`tool_call_id` 用来把 tool result 对回上一条 assistant message 里的具体 tool call。

**Q4:如果 tool 报错,下一轮模型会看到什么?**

当前 `callTool` 仍返回 string。失败时返回形如 `Error: ...` 的字符串,agent 把它作为 `role:"tool"` 的 `content` 回填。下一轮模型看到的是一个普通 tool result,内容表示错误原因,可以决定道歉、重试或停止。

**Q5:什么时候停止循环?如果模型一直调工具怎么办?**

停止条件有三类:

- LLM 返回没有 function tool calls:正常 final。
- 达到 `maxTurns`:返回 `[达到最大轮数 N,agent 主动退出]`。
- 本轮 tool calls 会超过 `maxToolCalls`:整批不执行,返回 `[达到最大工具调用数 N,agent 主动退出]`。

如果模型一直调工具,最终会被 `maxTurns` 或 `maxToolCalls` 截断。

**Q6:哪些操作需要用户确认?确认逻辑在哪一层?**

Phase 2 的 `confirmHook` 会根据 tool 的 `category` 拦截 `write` / `bash` 类工具。确认逻辑仍在 hook 层,Phase 3 只是把这次调用记录进 transcript,不改变权限机制。

**Q7:上下文太长时丢掉了什么?会不会影响正确性?**

超过 `maxContextChars` 时,agent 删除最旧的 assistant/tool 历史 group,永远保留 system 和原始 user。会影响正确性:如果预算太小,刚拿到的 tool result 也可能被裁掉,模型会重复调用工具或无法完成任务。Phase 3A 的目标是先把这个风险暴露出来并保证消息配对合法,不是做最优裁剪策略。

## 验证记录

- `pnpm typecheck` 通过。
- 普通问答通过:`llm_call -> final`,`toolCalls=0`。
- calculator 单工具通过:`llm_call -> tool_call -> llm_call -> final`,`toolCalls=1`。
- `write_file` 输入 `N` 通过:hook deny 被记录成 `[tool] ✗`,agent 不崩。
- `maxToolCalls:0` 通过:`budget_stop -> final`,没有 LLM/tool 调用。
- `maxToolCalls:1` 通过:模型一轮返回多个 tool calls 时整批不执行,`toolCalls=0`。
- `maxContextChars:70` 通过:触发多次 `trim`,每次删除 `removedMessages:2, removedGroups:1`,没有孤立 tool message;同时观察到预算太小导致重复调用 calculator,最后由 `maxTurns` 停止。

## 还没想清楚的问题

1. **裁剪策略是否应该永远保留最新 assistant/tool group?** 当前是从最旧 group 开始删,但预算过小时会删到只剩 system + user。更实用的策略可能是"保留最近一组结果,哪怕超过预算",但这需要重新定义预算优先级。
2. **`callTool` 是否应该返回结构化结果?** 现在用 `Error:` sentinel 区分成功/失败,简单但脆弱。Phase 4 evals 或后续 error taxonomy 可能需要 `{ ok, result, error }`。
3. **CLI trace 会不会太吵?** Phase 3 为了学习默认打印 trace/stats。以后如果正常使用体验受影响,可以加 `--trace` 开关或环境变量控制。
