// Tool 注册表 + JSON Schema 生成 + Dispatch + Hook 链编排
// Phase 2 改造:Tool 接口加 category 字段,callTool 内部跑三个 hook 链

import { z } from 'zod'
import {
  runBeforeToolCall,
  runAfterToolCall,
  runOnToolError,
} from '../hooks'

// ─── Tool 类型 ──────────────────────────────────────────────────
// T 是 zod schema 类型,z.infer<T> 自动推出 args 的 TS 类型
export interface Tool<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  description: string
  parameters: T
  execute: (args: z.infer<T>) => Promise<string>

  // Phase 2 新增:权限分类。默认 'safe'。
  // confirmHook 会拦截 'write' / 'bash' 类工具,要求用户 y/N 确认。
  // 详见 docs/phase2-hooks-design.md 的 Q5 决策。
  category?: 'safe' | 'read' | 'write' | 'bash' | 'network'
}

// ─── 全局 registry ──────────────────────────────────────────────
const registry = new Map<string, Tool>()

// 注册工具。同名重复注册抛错,防止意外覆盖。
export function registerTool(tool: Tool): void {
  if (registry.has(tool.name)) {
    throw new Error(`Tool "${tool.name}" already registered`)
  }
  registry.set(tool.name, tool)
}

// 给 hooks 等地方查 tool 元信息用(比如 confirmHook 需要读 tool.category)
export function getTool(name: string): Tool | undefined {
  return registry.get(name)
}

// 转成 OpenAI chat.completions.create 的 tools 参数格式
export function getToolsForLLM() {
  return Array.from(registry.values()).map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.parameters) as Record<string, unknown>,
    },
  }))
}

// ═══════════════════════════════════════════════════════════════
// callTool —— Phase 2 改造后的派发流程
// ═══════════════════════════════════════════════════════════════
//
// 流程:
//   1. 找 tool / 解析 + zod 校验 args
//   2. 跑 beforeToolCall 链(可拒绝 → 短路,走 onToolError 链,返回 Error 字符串)
//   3. tool.execute
//   4a. 成功 → 跑 afterToolCall 链 → 返回 result
//   4b. 抛错 → 跑 onToolError 链 → 返回 Error 字符串
//
// 所有异常都包装成 "Error: ..." 字符串(沿用 Phase 1 约定,让 agent 看见错误自行决策)
export async function callTool(name: string, argsJson: string): Promise<string> {
  const tool = registry.get(name)
  if (!tool) {
    return `Error: tool not found: "${name}"`
  }

  // —— 解析 + 校验 args(放在 hook 链之前,因为 args 错就直接错,与权限无关)——
  let args: unknown
  try {
    const rawArgs = JSON.parse(argsJson)
    args = tool.parameters.parse(rawArgs)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await runOnToolError(name, argsJson, msg)
    return `Error: ${msg}`
  }

  // —— Before chain:任一 hook 拒绝就短路,同时走 onToolError(让 logger 等观察类 hook 看到拒绝)——
  const { blocked, reason, hookName } = await runBeforeToolCall(name, args)
  if (blocked) {
    const errMsg = `denied by ${hookName ?? 'hook'}: ${reason ?? '未说明原因'}`
    await runOnToolError(name, args, errMsg)
    return `Error: ${errMsg}`
  }

  // —— 执行:成功走 after,抛错走 error ——
  try {
    const result = await tool.execute(args)
    await runAfterToolCall(name, args, result)
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await runOnToolError(name, args, msg)
    return `Error: ${msg}`
  }
}
