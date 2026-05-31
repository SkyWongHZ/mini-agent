# Mini-Agent

A from-scratch Node.js / TypeScript learning project for understanding LLM agent fundamentals.

This is the canonical project brief for AI coding agents. Claude Code imports this file from `CLAUDE.md`.

## For the AI assistant picking this up

If you're a new AI session (Codex, Claude, whatever) opening this repo, internalize these before doing anything else.

### User profile

- Senior Node.js / TypeScript developer. Comfortable with the language, tooling, and engineering practice.
- **New to LLM agent fundamentals** — this entire repo exists to learn them. Treat unfamiliarity with agent concepts as expected, but **don't underestimate engineering skill**.
- **Does not use Python.** Don't reach for Python references, pseudocode, or "in Python you'd...". Stay in the JS/TS ecosystem.
- Writes notes and asks questions in Chinese. Match Chinese in explanations, commit messages, and notes; English in code and identifiers is fine.

### Behavioral norms

- **Respect [Working mode](#working-mode-ai-assistant--user) strictly.** User writes concept code, you write scaffolding. **Never** offer to write the agent loop / tool registry / hook chain / MCP wiring / context manager / subagent dispatcher — even if the user seems stuck. When in doubt, ask focused questions; don't write the thing being studied.
- **Don't over-quiz once understanding is demonstrated.** A working run + a coherent debug story = they got it. Move on, don't ask "do you understand X" three different ways.
- **Be terse.** No trailing recaps ("to summarize..."), no "let me know if..." sign-offs, no emojis unless explicitly asked.
- **Don't auto-commit.** Show the diff, summarize what changed, wait for explicit "commit" or "push" from the user.

### Cold-start read order

1. **This file (`AGENTS.md`)** — project rules, Working mode, phased plan, hard constraints
2. **Latest `notes/phaseN.md`** — what's verified + the user's current mental model + open questions
3. **Latest `docs/phaseN-<topic>-design.md`** — frozen design rationale + verification checklist (the canonical "why" record)
4. **`src/README.md`** — progress table (the source of truth for "what phase are we on")
5. **`src/*.ts`** — inline comments are intentionally dense; read them before suggesting changes

### Where things live

| | |
|---|---|
| Per-phase design decisions | `docs/phaseN-<topic>-design.md` — mandatory each phase (see workflow below) |
| Per-phase reflections /踩坑 | `notes/phaseN.md` |
| "What's done" source of truth | progress table in `src/README.md` |
| Follow-along reference repo | `example/ai-agents-from-scratch/` + `docs/pguso-mapping.md` |

### Current state

> Update this paragraph at the end of each closing ritual.

**Most recent**: Phase 3A — Runtime Context + Trace. Design in [`docs/phase3-context-design.md`](./docs/phase3-context-design.md) (Q1-Q7 + review 补充:AgentStats 字段、字符预算口径、budget_stop/final 语义、toolCalls 计数). Notes in [`notes/phase3.md`](./notes/phase3.md). Verified manually: `pnpm typecheck`, no-tool 问答, calculator 单工具, write_file 拒绝, `maxToolCalls` 预算, `maxContextChars` trim。Phase 3A 只做单次 run 内的 runtime context;长期记忆 / `saveMemory` / memory 持久化留到后续独立阶段。

**Next up**: Phase 5 — MCP(**Client / Host 为主线**:用官方 SDK 写 client,外接一个现成的 stdio server,如官方 filesystem server,通过协议发现并调用它的工具,喂回 agent loop)。**Phase 4 — Evals 主动跳过**,理由见 [`notes/phase4-skipped.md`](./notes/phase4-skipped.md):eval 是工程方法不是能力构造块,当前没有回归测试的实际痛点,等真需要时再补;跳过不影响 Phase 5/6。Phase 3 的 `{ reply, transcript, stats }` 结构保留,以后接 eval 随时能用。

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
3. **Write a design doc before coding — every phase, mandatory.** Work through design choices with the AI assistant Q&A-style first, then write `docs/phaseN-<topic>-design.md` capturing alternatives considered, the decision, and *why*. See [`docs/phase2-hooks-design.md`](./docs/phase2-hooks-design.md) as the canonical example. For phases that closely follow pguso with no real choices, still write a short doc that says "followed pguso XX, no alternatives considered" — the discipline of producing one per phase matters. **This doc + the `notes/phaseN.md` from the closing ritual are how each phase is anchored in the repo (we don't use git tags anymore — see step 10).**
4. Write the concept code here, no peeking
5. When stuck → ask the AI assistant focused questions (**not** "write it for me")
6. Once it runs → AI assistant code-reviews

**Closing ritual (do all four before starting Phase N+1):**

7. Answer the relevant self-check questions in [`LEARNING.md`](./LEARNING.md) (oral / mental is fine — write down only what you couldn't answer)
8. Write `notes/phaseN.md` — reflection notes on what was built and learned. Together with the design doc from step 3, **this is the real per-phase deliverable; source code is the side product**.
9. Update the progress table in [`src/README.md`](./src/README.md) — mark ✅, link to the design doc + notes
10. Commit + push:
    ```bash
    git add . && git commit -m "Phase N: <one-line summary>"
    git push
    ```

> **Why no git tags?** From Phase 2 onward we anchor each phase via `docs/phaseN-*.md` + `notes/phaseN.md` instead. They live in the repo as plain files (survive forever, searchable, reviewable in PRs) and avoid the `git push --tags` footgun. Existing `phase0-done` / `phase1-done` tags are kept as-is — no need to delete or backfill new ones.

**Why this split**: letting the AI assistant write the concept code is the same anti-pattern as using LangChain — it hides exactly the mechanics the user is trying to internalize. The per-phase design doc + notes ensure each milestone is recoverable and your understanding is recorded.

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
5. **MCP** — MCP Client / Host: connect to an existing stdio server (e.g. the official filesystem server), discover its tools over the protocol, and call them from the agent loop
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
