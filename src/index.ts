// CLI 入口:读命令行参数,调 agent,打印最终回复
// Phase 0 的硬编码两轮已用 git tag phase0-done 保存,可 `git show phase0-done:src/index.ts` 回看

import { runAgent } from './agent'

const userInput = process.argv.slice(2).join(' ').trim()

if (!userInput) {
  console.error('Usage: pnpm dev "你的问题"')
  process.exit(1)
}

console.log(`\nUser: ${userInput}\n`)
const reply = await runAgent(userInput)
console.log(`\nAgent: ${reply}`)
