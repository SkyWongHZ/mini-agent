// Phase 2:Pre/Post Tool Call Hooks + Permissions
// 设计决策完整记录见 docs/phase2-hooks-design.md(Q1-Q5)

import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { getTool } from './tools/registry'

// ═══════════════════════════════════════════════════════════════
// 类型(Q1:Claude Code 风格签名)
// ═══════════════════════════════════════════════════════════════

export interface HookInput {
  toolName: string
  args: unknown
  result?: string           // 仅 afterToolCall 有
  error?: string            // 仅 onToolError 有(含 deny 和 tool 抛错)
}

export interface HookResult {
  decision?: 'block'        // 仅 beforeToolCall 中,hook 可以 block
  reason?: string
}

export type Hook = (input: HookInput) => Promise<HookResult | void>

// ═══════════════════════════════════════════════════════════════
// 注册表 + register API(Q2:注册顺序就是执行顺序)
// ═══════════════════════════════════════════════════════════════

const beforeToolCallHooks: Hook[] = []
const afterToolCallHooks: Hook[] = []
const onToolErrorHooks: Hook[] = []

export function registerBeforeToolCall(hook: Hook): void {
  beforeToolCallHooks.push(hook)
}

export function registerAfterToolCall(hook: Hook): void {
  afterToolCallHooks.push(hook)
}

export function registerOnToolError(hook: Hook): void {
  onToolErrorHooks.push(hook)
}

// ═══════════════════════════════════════════════════════════════
// 执行函数(给 registry.callTool 调用)
// ═══════════════════════════════════════════════════════════════

// Q3 决策:**短路** — 任一 hook 返回 { decision: 'block' } 立即停链
export async function runBeforeToolCall(
  toolName: string,
  args: unknown,
): Promise<{ blocked: boolean; reason?: string; hookName?: string }> {
  for (const hook of beforeToolCallHooks) {
    const result = await hook({ toolName, args })
    if (result?.decision === 'block') {
      return {
        blocked: true,
        reason: result.reason,
        hookName: hook.name || 'anonymous',
      }
    }
  }
  return { blocked: false }
}

// after / onError:都跑,各自独立(单 hook 抛错不影响其他 hook)
export async function runAfterToolCall(
  toolName: string,
  args: unknown,
  result: string,
): Promise<void> {
  for (const hook of afterToolCallHooks) {
    try {
      await hook({ toolName, args, result })
    } catch (err) {
      console.error(`[hook] afterToolCall "${hook.name || 'anonymous'}" threw:`, err)
    }
  }
}

export async function runOnToolError(
  toolName: string,
  args: unknown,
  error: string,
): Promise<void> {
  for (const hook of onToolErrorHooks) {
    try {
      await hook({ toolName, args, error })
    } catch (err) {
      console.error(`[hook] onToolError "${hook.name || 'anonymous'}" threw:`, err)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 具体 hook 实现 + 注册
// ═══════════════════════════════════════════════════════════════

// loggerHook —— 注册到 before / after / onError 三个事件,提供完整 trace
// 用一个 Map 记录每次 tool 调用开始时间,在 after/error 中算耗时
const toolStartTimes = new Map<string, number>()

const loggerBefore: Hook = async ({ toolName, args }) => {
  toolStartTimes.set(toolName, Date.now())
  console.log(`  ↳ [tool] → calling ${toolName}(${JSON.stringify(args)})`)
}

const loggerAfter: Hook = async ({ toolName, result }) => {
  const start = toolStartTimes.get(toolName)
  const elapsed = start ? Date.now() - start : 0
  toolStartTimes.delete(toolName)
  const shown = result && result.length > 80 ? result.slice(0, 80) + '…' : result
  console.log(`  ↳ [tool] ✓ ${toolName} → ${shown}  (${elapsed}ms)`)
}

const loggerError: Hook = async ({ toolName, error }) => {
  const start = toolStartTimes.get(toolName)
  const elapsed = start ? Date.now() - start : 0
  toolStartTimes.delete(toolName)
  console.log(`  ↳ [tool] ✗ ${toolName} failed: ${error}  (${elapsed}ms)`)
}

// confirmHook —— 只注册到 beforeToolCall
// 读 tool.category(Q5 决策),write/bash 类工具弹 y/N
const NEEDS_CONFIRM = new Set<string>(['write', 'bash'])

const confirmHook: Hook = async ({ toolName, args }) => {
  const tool = getTool(toolName)
  if (!tool?.category || !NEEDS_CONFIRM.has(tool.category)) {
    return  // safe / read / network / 未声明 → 直接放行
  }

  // dangerous → 弹 y/N
  const rl = createInterface({ input: stdin, output: stdout })
  const answer = await rl.question(
    `\n⚠️  即将执行 [${tool.category}] 类工具 ${toolName}(${JSON.stringify(args)}) ?  [y/N] `,
  )
  rl.close()

  if (answer.trim().toLowerCase() !== 'y') {
    return { decision: 'block', reason: '用户拒绝执行' }
  }
  // y → 放行
}

// 注册顺序约定:logger.before 先(看到调用) → confirm 后(决策放行/拒绝)
// 拒绝时 logger.before 已经打印过 "→ calling",然后 onToolError 链触发 loggerError 打印 "✗ failed"
// → 用户看到完整 trace
registerBeforeToolCall(loggerBefore)
registerBeforeToolCall(confirmHook)
registerAfterToolCall(loggerAfter)
registerOnToolError(loggerError)
