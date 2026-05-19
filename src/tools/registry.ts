// Tool 注册表 + JSON Schema 生成 + Dispatch

import { z } from 'zod'
// 注:zod v4 起 schema → JSON Schema 内置了,不需要 zod-to-json-schema 依赖

// ─── Tool 类型 ──────────────────────────────────────────────────
// T 是 zod schema 类型,z.infer<T> 自动推出 args 的 TS 类型
export interface Tool<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  description: string
  parameters: T
  execute: (args: z.infer<T>) => Promise<string>
}

// ─── 全局 registry ──────────────────────────────────────────────
const registry = new Map<string, Tool>()

// 注册工具。同名重复注册抛错,防止意外覆盖
export function registerTool(tool: Tool): void {
  if (registry.has(tool.name)) {
    throw new Error(`Tool "${tool.name}" already registered`)
  }
  registry.set(tool.name, tool)
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

// 派发执行 tool。模型给的 argsJson 是 JSON 字符串
// 任何错误(找不到 / JSON 解析失败 / zod 校验失败 / execute 抛错)都包装成
// "Error: ..." 字符串返回,**让模型看到错误,自己决定怎么处理**
export async function callTool(name: string, argsJson: string): Promise<string> {
  const tool = registry.get(name)
  if (!tool) {
    return `Error: tool not found: "${name}"`
  }
  try {
    const rawArgs = JSON.parse(argsJson)
    const args = tool.parameters.parse(rawArgs)
    return await tool.execute(args)
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}
