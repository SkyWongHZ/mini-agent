# Phase 1:Tools / ReAct

## 做了什么

`src/` 重构成模块化结构:

- `llm.ts`:OpenAI client + MODEL 抽出,集中导出
- `tools/registry.ts`:Tool 类型(zod schema 泛型) + `registerTool` / `getToolsForLLM` / `callTool`
- `tools/calculator.ts`、`tools/weather.ts`:具体工具,文件末尾自注册
- `agent.ts`:**ReAct loop(~50 行)**,maxTurns 防死循环
- `index.ts`:瘦成 CLI 入口,只调 runAgent

依赖:zod v4(`z.toJSONSchema()` 内置),不需要 `zod-to-json-schema`(已成死代码,可删)。

## 核心认知

LLM 的"调用工具"本质上就是**字符串里的一段 JSON 协议**:

```
Round N:  LLM 返回 message.tool_calls = [{ id, name, arguments: JSON string }, ...]
          ↓ 本地执行
          push { role: 'tool', tool_call_id, content: 结果字符串 } 回 messages
Round N+1:同样 messages 再调一次 LLM,模型看到 tool 结果后决定:
          - 再调工具(继续循环)
          - 给最终答案(无 tool_calls,结束循环)
```

四个关键 mechanic:

1. **messages 累积**(Phase 0 的延续):assistant message 整条都要 push 回去,**包括 tool_calls 字段**。下一轮模型才"记得"自己刚刚决定调了哪些工具
2. **tool 结果的 message**:`role: 'tool'`,必须带 `tool_call_id`(LLM 一轮可能 parallel call 多个工具,id 用来配对结果)
3. **退出条件**:模型某轮返回 `message.tool_calls` 为空 → 给最终答案了 → 跳出循环
4. **maxTurns**:防模型死循环反复调工具

## 踩坑

### 1. zod v4 vs zod-to-json-schema 类型不兼容

`zod-to-json-schema` 是为 zod v3 写的,zod v4 改了内部类型导致传入 schema 时 TS 报错。**修复**:用 zod v4 自带的 `z.toJSONSchema(schema)`,这个 npm 依赖就成了死代码。教训:依赖发布周期不一定跟得上主库的大版本。

### 2. Shell glob 展开

`pnpm dev 23 * 47` 里的 `*` 被 shell 解释成通配符,展开成当前目录所有文件名,然后 agent 收到的是 `23 AGENTS.md CLAUDE.md ... 47`。**修复**:加引号 `pnpm dev "23 * 47"`。这不是 agent bug,是 shell 行为 —— 但很容易把人骗到。

### 3. 第一次写时 TS 报错(已 fix)

我最初 messages 的类型用了 `any[]`,跑 typecheck 时 SDK 拒绝。后来改成 `ChatCompletionMessageParam[]` 才过。**教训**:OpenAI SDK 对 messages 类型很严格,角色字段是 literal type,不要用宽 string。

## 自检题答案

**Q:模型怎么知道有哪些工具可调?**

`openai.chat.completions.create` 的 `tools` 参数把所有注册的 schema 传给 LLM。LLM 看 tool 的 `description` 和每个字段的 `.describe()` 决定**什么时候**调、**参数怎么填**。所以 `.describe()` 写得清楚比工具实现还重要。

**Q:`tool_call_id` 干啥用?**

LLM 一轮可以 parallel call 多个工具(比如同时查北京和上海天气),每个 call 有独立 `id`。结果 push 回去时必须带对应 `tool_call_id`,LLM 才知道哪个结果对哪个 call。少这个字段 SDK 会报错。

**Q:tool 内部 throw 会发生什么?**

`callTool` 用 try/catch 把异常包装成 `"Error: ..."` 字符串返回。模型看到 Error 后可以:换参数重试 / 用别的工具 / 道歉。**不要直接抛错让 agent 崩** —— 错误也是 agent 决策的一部分。

## 还没想清楚

1. **多个 tool_calls parallel 时,实际是 sequential 执行的**(`for...of await`)。如果某个 tool 慢,会卡住后面。Phase 3 加 `Promise.all` 并发?
2. **Token 没记录** —— 现在每轮都跑,但不知道一次任务实际花了多少。Phase 3 接 trace 系统时补上。
3. **system prompt 是 hardcoded 的**。Phase 7 Skills 时怎么动态切换?
