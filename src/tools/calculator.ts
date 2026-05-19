// 例子工具:计算器
// 支持 +、-、*、/ 四种基本运算

import { z } from 'zod'
import { registerTool, type Tool } from './registry'

// 参数 schema —— .describe() 的内容会进入 JSON Schema,
// 模型靠这些说明决定每个参数怎么填
const parameters = z.object({
  a: z.number().describe('第一个操作数'),
  b: z.number().describe('第二个操作数'),
  operator: z.enum(['+', '-', '*', '/']).describe('运算符:+、-、*、/'),
})

const calculator: Tool<typeof parameters> = {
  name: 'calculator',
  description: '执行两个数字的基本算术运算(加、减、乘、除)',
  parameters,
  execute: async ({ a, b, operator }) => {
    let result: number
    switch (operator) {
      case '+': result = a + b; break
      case '-': result = a - b; break
      case '*': result = a * b; break
      case '/':
        if (b === 0) return 'Error: 除数不能为 0'
        result = a / b
        break
    }
    return `${a} ${operator} ${b} = ${result}`
  },
}

registerTool(calculator)
