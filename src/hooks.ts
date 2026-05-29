// Phase 2:Pre/Post Tool Call Hooks + Permissions
//
// ──────────────────────────────────────────────────────────────
// 设计决策(已锁定,基于 Q1 - Q5 讨论)
// ──────────────────────────────────────────────────────────────
//
// Q1 Hook 签名      :Claude Code 风格 —— 返回 { decision, reason } 或 void
// Q2 多 hook 顺序   :按 registerXxx 调用顺序
// Q3 拒绝传播       :短路 + 触发 onToolError(类 Promise 错误流)
// Q4 拒绝可见性     :agent 看到 "Error: denied by <hook>: <reason>" 字符串
// Q5 权限位置       :tool 自声明 category 字段,confirmHook 内部维护 NEEDS_CONFIRM
//
// ──────────────────────────────────────────────────────────────
// API 契约 —— 你要实现的接口
// ──────────────────────────────────────────────────────────────

export interface HookInput {
  toolName: string
  args: unknown             // 模型给的、经 zod 校验后的参数
  result?: string           // 仅 afterToolCall 有
  error?: string            // 仅 onToolError 有(包含 deny 和 tool 抛错)
}

export interface HookResult {
  decision?: 'block'        // 仅 beforeToolCall 中,hook 可以 block
  reason?: string
}

export type Hook = (input: HookInput) => Promise<HookResult | void>

// ── TODO 1:三个事件的 hook 数组 ──
// 声明三个数组:beforeToolCallHooks / afterToolCallHooks / onToolErrorHooks

// ── TODO 2:三个 register 函数 ──
// export function registerBeforeToolCall(hook: Hook): void
// export function registerAfterToolCall(hook: Hook): void
// export function registerOnToolError(hook: Hook): void

// ── TODO 3:三个执行函数(供 registry.ts 调用) ──
//
// runBeforeToolCall(toolName, args): Promise<{ blocked: boolean; reason?: string }>
//   - 按注册顺序依次跑 beforeToolCallHooks
//   - 任一 hook 返回 { decision: 'block' } → **立即停链**,返回 { blocked: true, reason }
//   - 全跑完无 block → 返回 { blocked: false }
//
// runAfterToolCall(toolName, args, result): Promise<void>
//   - 按顺序跑 afterToolCallHooks,只观察,不影响结果
//   - 一个 hook 抛错不应影响后面的(用 try/catch 包裹每个 hook)
//
// runOnToolError(toolName, args, error): Promise<void>
//   - 同 after,只观察


// ══════════════════════════════════════════════════════════════
// 你接下来还要改的其他文件
// ══════════════════════════════════════════════════════════════
//
// ── 1. src/tools/registry.ts ──
//
// (a) Tool 接口加 category 字段:
//
//     interface Tool<T> {
//       ...
//       category?: 'safe' | 'read' | 'write' | 'bash' | 'network'  // 默认 'safe'
//     }
//
// (b) callTool 改造(伪代码):
//
//     async function callTool(name, argsJson) {
//       const tool = registry.get(name)
//       if (!tool) return `Error: tool not found: ${name}`
//
//       // 解析 + 校验 args(原有逻辑)
//       const args = tool.parameters.parse(JSON.parse(argsJson))
//
//       // ── 新增:before ──
//       const { blocked, reason } = await runBeforeToolCall(name, args)
//       if (blocked) {
//         const err = `denied by hook: ${reason ?? '未说明'}`
//         await runOnToolError(name, args, err)
//         return `Error: ${err}`
//       }
//
//       // 执行 + 走 after / error
//       try {
//         const result = await tool.execute(args)
//         await runAfterToolCall(name, args, result)
//         return result
//       } catch (err) {
//         const msg = err instanceof Error ? err.message : String(err)
//         await runOnToolError(name, args, msg)
//         return `Error: ${msg}`
//       }
//     }
//
// ── 2. src/tools/write_file.ts(新建)──
//
//     - zod schema: { path: string.describe(...), content: string.describe(...) }
//     - execute 用 node:fs/promises.writeFile
//     - category: 'write'(声明它危险,触发 confirmHook)
//     - 末尾 registerTool(...)
//
// ── 3. 两个具体 hook 实现(可以放本文件末尾,或新建 src/hooks/ 子目录)──
//
// (a) loggerHook —— 注册到三个事件:
//     before:  "[tool] → calling X({args})"
//     after :  "[tool] ✓ X → {result}  (Yms)"     ← 用 Date.now() 算耗时
//     error :  "[tool] ✗ X failed: {error}"
//
// (b) confirmHook —— 只注册到 beforeToolCall:
//     - 拿到 tool 的 category(通过 toolName 查 registry 拿)
//     - 如果在 NEEDS_CONFIRM = new Set(['write', 'bash']) 里:
//         用 node:readline 从 stdin 读一行 → 用户答 'y' 才放行
//         不是 'y' 返回 { decision: 'block', reason: '用户拒绝' }
//     - safe / read / network → 直接 return(放行)
//
// ── 4. src/agent.ts 顶部加 import 触发副作用 ──
//
//     import './hooks'              // 触发 logger + confirm 注册
//     import './tools/write_file'   // 触发 write_file 注册
//
//
// ══════════════════════════════════════════════════════════════
// 验证清单(全过 = Phase 2 通关)
// ══════════════════════════════════════════════════════════════
//
// [ ] pnpm dev "23 * 47"                → logger 输出 before+after,行为不变
// [ ] pnpm dev "把 hello 写到 /tmp/x.txt" → 模型调 write_file → confirm 弹 "[y/N]"
// [ ] 输 y                                → 文件真写入,模型说"已完成",ls -la /tmp/x.txt ✓
// [ ] 输 N                                → 模型说"用户拒绝",**不崩溃**,文件不存在
// [ ] N 拒绝时,logger 的 onToolError 也触发 "[tool] ✗ write_file failed: denied by ..."
// [ ] tool 内部抛错(可以临时让 calculator 除以 0 抛错来测)→ onToolError 触发,agent 收到 Error 字符串
