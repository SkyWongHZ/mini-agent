# Mini-Agent

A from-scratch Node.js / TypeScript learning project for understanding LLM agent fundamentals.

This is the canonical project brief for AI coding agents. Claude Code imports this file from `CLAUDE.md`.

## What this project is

**Goal**: deeply understand the core concepts of LLM agents — **Tools, Hooks, MCP, Subagent, Skills** — by implementing each one from scratch, no high-level frameworks.

**Non-goal**: building a production-ready framework. Production tooling (LangChain / LangGraph / Claude Agent SDK / OpenAI Agents SDK) is **intentionally avoided** at this stage.

See [`LEARNING.md`](./LEARNING.md) for the full learning path and rationale.

## Hard constraints — read before coding

1. **DO NOT introduce LangChain, LangGraph, or any agent-framework SDK.** That defeats the learning purpose. Allowed deps for the core loop are only: `openai` (pointed at DeepSeek for now), `zod`, `zod-to-json-schema`, `dotenv`, `tsx`, `typescript`. MCP SDK is added only at Phase 5.
2. **Implementations stay readable in one sitting.** Resist clever abstractions; small files, plain functions. The whole agent loop should fit in ~50 lines.
3. **Every concept is built before its abstraction is used.** Example: implement hook behavior with a `for (const hook of hooks)` loop before reaching for any event emitter / middleware lib.
4. **Don't merge phases.** Finish Phase N + verify before starting Phase N+1.

## Working mode (AI assistant × user)

Deliberate split to maximize learning per typed line. Future AI assistant sessions: **respect this strictly.**

**User types by hand** — concept code, DO NOT offer to write these:
- Agent loop / ReAct mechanics
- Tool registry, schema generation, dispatch
- Hook chain (`preToolCall` / `postToolCall`)
- Permission checks
- MCP server / client wiring (Phase 5)
- Context-window management (Phase 3)

**AI assistant writes** — engineering ceremony, fine to scaffold without asking:
- `package.json`, `tsconfig.json`, `.gitignore`
- `.env` / dotenv loading
- CLI argument parsing, output formatting, error printing
- Type-declaration boilerplate, basic logging helpers

**Joint** — AI assistant as senior pair, not author:
- Debugging when user is stuck
- Code review after user has written + run something
- Answering "why does this work" questions *without* rewriting the user's code

### Per-phase workflow

**During the phase (writing the concept code):**

1. Read the matching example in [`pguso/ai-agents-from-scratch`](https://github.com/pguso/ai-agents-from-scratch) — see [`docs/pguso-mapping.md`](./docs/pguso-mapping.md) for the per-phase reading list
2. Close that tab
3. **If the phase has non-trivial design choices** (no pguso reference, or multiple competing approaches): work through them with the AI assistant Q&A-style **before coding**, then write `docs/phaseN-<topic>-design.md` capturing alternatives + rationale. See [`docs/phase2-hooks-design.md`](./docs/phase2-hooks-design.md) as the canonical example. This is the **"why we did it this way"** record for future-you and future AI sessions — preserves design intent even when source code evolves.
4. Write the concept code here, no peeking
5. When stuck → ask the AI assistant focused questions (**not** "write it for me")
6. Once it runs → AI assistant code-reviews

**Closing ritual (do all four before starting Phase N+1):**

7. Answer the relevant self-check questions in [`LEARNING.md`](./LEARNING.md) (oral / mental is fine — write down only what you couldn't answer)
8. Write `notes/phaseN.md` — this is the **real deliverable** of each phase, source code is the side product
9. Update the progress table in [`src/README.md`](./src/README.md) — mark ✅, fill in notes filename + tag name
10. Commit + tag the snapshot, push to remote:
   ```bash
   git add . && git commit -m "Phase N: <one-line summary>"
   git tag phaseN-done
   git push                    # 提交跟着上去
   git push origin --tags      # ⚠️ 默认 push 不带 tag,必须显式推
   ```
   Later you can `git show phaseN-done:<file>` or `git diff phaseN-done phase(N+1)-done -- src/` to see what changed.

**Why this split**: letting the AI assistant write the concept code is the same anti-pattern as using LangChain — it hides exactly the mechanics the user is trying to internalize. The closing ritual ensures each milestone is recoverable and your understanding is recorded.

## Tech stack

| | |
|---|---|
| Runtime | Node 20+ |
| Language | TypeScript |
| LLM | DeepSeek `deepseek-v4-flash` (current; `deepseek-v4-pro` for harder tasks) → Claude / GPT (later) |
| LLM SDK | `openai` npm with `baseURL=https://api.deepseek.com` |
| Tool schema | `zod` + `zod-to-json-schema` |
| Run | `pnpm tsx src/index.ts "..."` |

## Project layout

```
mini-agent/
├── AGENTS.md                       # this file — canonical agent-facing brief
├── CLAUDE.md                       # Claude Code wrapper importing AGENTS.md
├── LEARNING.md                     # learning rationale + 8-phase roadmap (Chinese)
├── docs/                           # reference cheatsheets + per-phase design docs
│   ├── pguso-mapping.md            #   pguso example → Phase lookup table
│   └── phaseN-<topic>-design.md    #   design rationale for phases with non-trivial decisions
│                                   #   (e.g. phase2-hooks-design.md)
├── notes/                          # user's per-phase reflection notes
│   └── README.md                   #   writing template
├── example/                        # standalone reference projects (NOT the main CLI)
│   ├── AI-chatbot/                 #   Vue + Koa + MongoDB chatbot — future "deployment target"
│   └── ai-agents-from-scratch/     #   pguso's repo, cloned for reference (see docs/pguso-mapping.md)
├── .env                            # DEEPSEEK_API_KEY=... (gitignored)
├── package.json                    # CLI agent deps
├── tsconfig.json
└── src/                            # ⭐ Phase 0 - 7 implementation lives here
    ├── README.md                   #   progress checklist + working-mode reminder
    ├── index.ts                    #   CLI entry
    ├── llm.ts                      #   OpenAI client with DeepSeek baseURL
    ├── agent.ts                    #   ReAct loop (~50 lines, from Phase 1)
    ├── hooks.ts                    #   (Phase 2) pre/post tool hooks
    └── tools/
        ├── registry.ts             #   Tool type + registry + JSON-schema gen
        └── *.ts                    #   individual tools
```

> `example/AI-chatbot/` and `example/ai-agents-from-scratch/` are **independent** projects sitting alongside the CLI. The root `package.json` is for the CLI only — do not turn `example/*` into npm workspaces. Treat them as read-only references unless explicitly working on them.

## Phased plan (summary — full version in [`LEARNING.md`](./LEARNING.md))

0. **Chat Loop** — `messages[]` history, no tools yet; confirm round-trip mechanics
1. **Tools / ReAct** — tool registry + 2-3 tools + bounded loop
2. **Permissions + Hooks** — `preToolCall` / `postToolCall`; logger + confirm + read/write/bash permission scaffolding
3. **Context + Trace** — `maxTurns` / `maxToolCalls`, transcript, history trimming
4. **Evals** — 5-10 fixed tasks covering: no-tool, single-tool, multi-tool, tool error, permission denial
5. **MCP** — refactor tools into a standalone MCP server (stdio)
6. **Subagent** — main agent delegates to role-specific sub-agents (research / code / review)
7. **Skills** *(optional)* — provider-agnostic `SKILL.md` loader first; vendor SDK later

> **Hard rule**: finish + verify Phase N before starting Phase N+1. Each phase has self-check questions in `LEARNING.md` — answer them before moving on.

## Running (once Phase 1 is implemented)

```bash
pnpm install
echo "DEEPSEEK_API_KEY=sk-..." > .env
pnpm tsx src/index.ts "23 * 47 是多少"
```

> Note: DeepSeek's legacy model names `deepseek-chat` / `deepseek-reasoner` will be retired on 2026-07-24. Use `deepseek-v4-flash` / `deepseek-v4-pro` in any new code.

## Canonical reference repo

[`pguso/ai-agents-from-scratch`](https://github.com/pguso/ai-agents-from-scratch) (⭐ 3.5k) + companion site [agentsfromscratch.com](https://agentsfromscratch.com) — JavaScript, framework-free, 14 progressive examples that map cleanly onto our phases (LLM basics → tools → memory → ReAct → advanced reasoning). Use it as the "follow-along" reference; this repo re-implements the same ideas in TypeScript with DeepSeek.
