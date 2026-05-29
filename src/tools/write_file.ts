// 例子工具:写文件
// category: 'write' —— Phase 2 confirmHook 会拦截,要求用户 y/N 确认

import { z } from 'zod'
import { writeFile } from 'node:fs/promises'
import { registerTool, type Tool } from './registry'

// 参数 schema —— .describe() 写清楚,模型才知道怎么填
const parameters = z.object({
  path: z.string().describe("文件的绝对路径,例如 '/tmp/hello.txt'"),
  content: z.string().describe('要写入文件的文本内容(会覆盖文件原有内容)'),
})

const writeFileTool: Tool<typeof parameters> = {
  name: 'write_file',
  description: '把给定的文本内容写入指定路径的文件(写入会覆盖原内容,需要用户确认)',
  parameters,
  category: 'write',   // ← 关键:声明为写文件类,触发 confirmHook 弹 y/N
  execute: async ({ path, content }) => {
    await writeFile(path, content, 'utf-8')
    return `已写入 ${content.length} 字节到 ${path}`
  },
}

registerTool(writeFileTool)
