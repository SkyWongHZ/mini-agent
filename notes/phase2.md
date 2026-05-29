# Phase 2:Permissions + Hooks

## 我写了什么

- **`src/hooks.ts`** — 新建,~155 行
  - `HookInput` / `HookResult` / `Hook` 类型(Claude Code 风格签名)
  - 三组 hook 数组 + 注册 API:`registerBeforeToolCall` / `registerAfterToolCall` / `registerOnToolError`
  - 三个执行函数:`runBeforeToolCall`(短路语义)/ `runAfterToolCall` / `runOnToolError`(都跑,每个 hook try/catch 隔离)
  - 具体 hook:`loggerBefore` / `loggerAfter` / `loggerError`(Map 算耗时)+ `confirmHook`(readline 弹 y/N)
- **`src/tools/registry.ts`** 改造
  - `Tool` 接口加 `category?: 'safe' | 'read' | 'write' | 'bash' | 'network'`
  - 新增 `getTool(name)` 给 hook 反查元信息
  - `callTool` 重写成五段:查 tool → 解析+校验 args → before 链 → execute → after / error 分支
  - 拒绝路径合成 `denied by X` 错误字符串,**也走 onToolError 链**(关键)
- **`src/tools/write_file.ts`** 新增,作为 confirm 机制的"测试靶子"(声明 `category: 'write'`)
- **`src/agent.ts`** 加 `import './hooks'` + `import './tools/write_file'`,删掉 Phase 1 手写的 trace `console.log`(loggerHook 接管)
- **`docs/phase2-hooks-design.md`** 新建,记录 5 个核心决策(Q1-Q5)+ Promise 类比 + 与 Claude Code/Express 对照

## 用自己的话复述这个概念

Hook 的本质是:**在某个固定流程的若干"事件点"留出可注册的回调,业务代码挂上去,流程跑到事件时挨个调**。Phase 1 的 `callTool` 是裸流水线"查→执行→返回",Phase 2 把它切成三个事件点 `before / after / error`,流水线运行时主动通知"现在 before / 我成功了 / 我失败了"。

关键取舍:

- **签名要不要带"我能不能反对"语义?** 选了 Claude Code 风格 `{ decision?: 'block', reason? }`:before 可以否决,after/error 只能观察。理由:权限拒绝是数据流(reason 传给 LLM 让它道歉/重试),不是控制流(throw 让 agent 崩)
- **多 hook 顺序?** 注册顺序 = 执行顺序,零额外 API,Express/Koa/Claude Code 都这么做
- **before 拒绝后续事件还跑吗?** 跑 `onToolError`(把"拒绝"当成"错误"的一种)。logger 挂到三个事件就行,不用在 before 里加 `if (blocked)` 这种污染
- **权限分类放哪儿?** 每个 tool 自己声明 `category`,而不是 hook 名字匹配或单独 policy 文件。"谁最清楚自己的安全级别"放在合适的位置

最大的认知是 **Promise 类比** —— `tool.execute` 像 `new Promise`,`afterToolCall` 像 `.then`,`onToolError` 像 `.catch`,**hook 的 `block` 等价于 `Promise.reject`**。这个结构一旦看出来,设计就稳了:任何 hook 拒绝和 tool 抛错,最终都殊途同归到 `onToolError` 这条 sink。

## 踩坑记录

### 1. "拒绝"该走 error 还是 after?

- **以为**:before 拒绝后什么后续都不触发 —— 既没"执行成"也没"失败",链停在拒绝点
- **实际**:让拒绝合成 synthetic error,走 `onToolError`
- **根本原因**:第一反应按字面语义,但漏了 logger 这种横切关注点的需求。如果三种结局(成功/拒绝/抛错)在 logger 里分别写,就把"结局观察"这个统一抽象拆碎了。把拒绝并到 error,**logger 在 onToolError 里写一次就同时覆盖了拒绝和抛错**

### 2. circular import 让我犹豫

`hooks.ts` 要读 `tool.category` → `import { getTool } from './tools/registry'`;`registry.ts` 又要 `import { runBeforeToolCall } from '../hooks'`。看着是 A → B → A 循环。

- **以为**:循环 import 会让某一端拿到 undefined,得拆个 `types.ts` 出来
- **实际**:ESM 的循环 import 只在"模块顶层立即使用导入值"时才崩;`confirmHook` 内部调 `getTool(toolName)` 是**运行时**调,那时两个模块都加载完了
- **根本原因**:把 import 看成 C 风格的"展开式包含",实际 ESM 是"绑定式引用"。运行时取值,不是加载时拷贝

### 3. side-effect import 是隐式契约

`agent.ts` 顶部一串 `import './tools/...'` 和 `import './hooks'` 看起来是"没用的导入",其实是靠加载时执行 `registerTool(...)` / `registerXxxHook(...)` 填全局注册表。

- **关键认知**:如果 tree-shaking 启用或谁误删一行,工具/hook 就静默消失,LLM 看不到完全不会报错 —— 只会"模型莫名其妙不调这个工具"。Phase 5 接 MCP 时不会有这个隐患(协议层面 `list_tools` 是显式的),in-process 阶段必须警惕

## 自检题答案

**Q:为什么签名选 `(input) => { decision?, reason? }`,而不是"throw 表示拒绝"?**

throw 把"业务拒绝"和"系统错误"混在一起。前者是预期的(用户按 N、policy 禁止),后者是异常(网络挂、bug)。混在一起调用方无法区分,只能 `try/catch` 全部当异常处理 —— 失去 LLM 用 `reason` 重试/道歉的机会,也违背 Phase 1"错误是数据流"的设计。

**Q:为什么 deny 也走 onToolError?**

让"成功 / 拒绝 / 抛错"对 observer hook(logger / 未来的 trace)有**统一通路**。logger 注册到三个事件就完整覆盖一次 tool 调用的生命周期,不用在 before 里加 `if (blocked) console.log(...)` 这种污染。和 Promise 同构(`reject` 和 `throw` 都进 `.catch`)。

**Q:权限分类为什么放在 tool 自声明,而不是单独 policy 文件?**

新加 tool 只改 tool 文件一处(声明 `category: 'write'`),不用同步改 hook 或 policy。**知识放在最熟悉它的位置** —— tool 作者最清楚自己的危险程度。policy 文件那种集中声明,在 Phase 2 没有"admin 覆盖默认"需求时是 YAGNI;Phase 3 / 5 真要再升级到 A + C 混合。

**Q:after / error 链中单个 hook 抛错,会怎样?**

每个 hook 包了独立 try/catch,抛错被吞掉打到 `console.error`,**不影响其他 hook**。理由:observer 是横切的,一个观察者坏了不应该拖死其他观察者。before 链不这么做(那里抛错应被视为决策失败,直接走 onToolError)。

## 还没想清楚的问题

1. **多个 before hook 都想 block 时怎么聚合?** 现在"第一个 block 就赢",reason 用第一个的。如果要"显示所有拒绝原因",得跑完所有 before 再聚合 reason 数组 —— 但这跟 Express 短路语义对不上,纠结。
2. **拒绝时 `hookName` 用 `hook.name || 'anonymous'`**,但匿名 arrow function 全是 anonymous。要不要强制注册时传 name 参数?Phase 3 trace 系统上来时一起想。
3. **confirmHook 每次都 `createInterface(stdin, stdout)`**,一轮里多个 dangerous tool 调用会不会 readline 实例泄漏?目前没遇到,Phase 4 evals 并行时检查。
