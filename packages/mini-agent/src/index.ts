// CLI 入口:读命令行参数,调 agent,打印最终回复
// Phase 0 的硬编码两轮已用 git tag phase0-done 保存,可 `git show phase0-done:src/index.ts` 回看

import { runAgent, type TranscriptEvent } from './agent'

const userInput = process.argv.slice(2).join(' ').trim()

if (!userInput) {
  console.error('Usage: pnpm dev "你的问题"')
  process.exit(1)
}

console.log(`\nUser: ${userInput}\n`)
const result = await runAgent(userInput)

console.log(`\nAgent: ${result.reply}`)
printTrace(result.transcript)
console.log(
  `\nStats: turns=${result.stats.turns}, llmCalls=${result.stats.llmCalls}, ` +
  `toolCalls=${result.stats.toolCalls}, tokens=${formatTokens(result.stats.tokens)}, ` +
  `elapsed=${result.stats.elapsedMs}ms`,
)

function printTrace(transcript: TranscriptEvent[]): void {
  console.log('\nTrace:')

  for (const event of transcript) {
    switch (event.type) {
      case 'llm_call': {
        const toolNames = event.toolCalls.map(call => call.name).join(', ') || 'none'
        console.log(
          `  [llm ${event.turn}] ${event.elapsedMs}ms tokens=${formatTokens(event.usage)} ` +
          `tools=${toolNames} content="${truncate(event.content ?? '')}"`,
        )
        break
      }
      case 'tool_call': {
        const args = truncate(JSON.stringify(event.args))
        if (typeof event.error === 'string') {
          console.log(`  [tool] ✗ ${event.toolName}(${args}) ${event.elapsedMs}ms ${truncate(event.error)}`)
        } else {
          console.log(`  [tool] ✓ ${event.toolName}(${args}) ${event.elapsedMs}ms ${truncate(event.result)}`)
        }
        break
      }
      case 'trim':
        console.log(
          `  [trim] ${event.beforeChars} -> ${event.afterChars} chars, ` +
          `removed ${event.removedGroups} groups / ${event.removedMessages} messages`,
        )
        break
      case 'budget_stop':
        console.log(`  [budget] ${event.reason}: ${event.message}`)
        break
      case 'final':
        console.log(`  [final] ${truncate(event.reply)}`)
        break
    }
  }
}

function truncate(value: string, max = 100): string {
  return value.length > max ? value.slice(0, max) + '…' : value
}

function formatTokens(tokens: { input: number | null; output: number | null; total: number | null }): string {
  return `in=${tokens.input ?? 'n/a'},out=${tokens.output ?? 'n/a'},total=${tokens.total ?? 'n/a'}`
}
