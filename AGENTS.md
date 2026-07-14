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

- **Respect [Working mode](#working-mode-ai-assistant--user) strictly.** In `packages/mini-agent`, the user writes concept code and the AI writes scaffolding; **never** offer to write the agent loop / tool registry / hook chain / MCP wiring / context manager / subagent dispatcher. Framework labs use the separate two-stage workflow defined below and in their package README.
- **Don't over-quiz once understanding is demonstrated.** A working run + a coherent debug story = they got it. Move on, don't ask "do you understand X" three different ways.
- **Be terse.** No trailing recaps ("to summarize..."), no "let me know if..." sign-offs, no emojis unless explicitly asked.
- **Don't auto-commit.** Show the diff, summarize what changed, wait for explicit "commit" or "push" from the user.

### Cold-start read order

1. **This file (`AGENTS.md`)** — project rules, Working mode, package boundaries, hard constraints

Then branch by the package in scope:

- **`packages/mini-agent` task**
  1. Latest `packages/mini-agent/notes/phaseN.md` — what's verified + current mental model + open questions
  2. Latest `packages/mini-agent/docs/phaseN-<topic>-design.md` — frozen design rationale + verification checklist
  3. `packages/mini-agent/README.md` — progress table (the source of truth for the current phase)
  4. `packages/mini-agent/src/*.ts` — read the intentionally dense inline comments before suggesting changes
- **`packages/langchain-lab` task**
  1. `packages/langchain-lab/README.md` — progress table (the source of truth for the current Topic)
  2. `packages/langchain-lab/LEARNING.md` — roadmap, depth boundaries, completion criteria, self-checks
  3. `packages/langchain-lab/package.json` — installed LangChain v1 integrations
  4. Existing `packages/langchain-lab/src/*.ts` — staged concept demos; read their TODOs and implementation state before acting

### Where things live

| | |
|---|---|
| Per-phase design decisions | `packages/mini-agent/docs/phaseN-<topic>-design.md` — mandatory each phase (see workflow below) |
| Per-phase reflections /踩坑 | `packages/mini-agent/notes/phaseN.md` |
| "What's done" source of truth | progress table in `packages/mini-agent/README.md` |
| Follow-along reference repo | `packages/mini-agent/example/ai-agents-from-scratch/` + `packages/mini-agent/docs/pguso-mapping.md` |

### Current state

> Update this paragraph at the end of each closing ritual.

**Most recent**: Phase 3A — Runtime Context + Trace. Design in [`packages/mini-agent/docs/phase3-context-design.md`](./packages/mini-agent/docs/phase3-context-design.md) (Q1-Q7 + review 补充:AgentStats 字段、字符预算口径、budget_stop/final 语义、toolCalls 计数). Notes in [`packages/mini-agent/notes/phase3.md`](./packages/mini-agent/notes/phase3.md). Verified manually: `pnpm typecheck`, no-tool 问答, calculator 单工具, write_file 拒绝, `maxToolCalls` 预算, `maxContextChars` trim。Phase 3A 只做单次 run 内的 runtime context;长期记忆 / `saveMemory` / memory 持久化留到后续独立阶段。

**Next up**: Phase 5 — MCP(**Client / Host 为主线**:用官方 SDK 写 client,外接一个现成的 stdio server,如官方 filesystem server,通过协议发现并调用它的工具,喂回 agent loop)。**Phase 4 — Evals 主动跳过**,理由见 [`packages/mini-agent/notes/phase4-skipped.md`](./packages/mini-agent/notes/phase4-skipped.md):eval 是工程方法不是能力构造块,当前没有回归测试的实际痛点,等真需要时再补;跳过不影响 Phase 5/6。Phase 3 的 `{ reply, transcript, stats }` 结构保留,以后接 eval 随时能用。

## What this project is

**Goal**: deeply understand the core concepts of LLM agents — **Tools, Hooks, MCP, Subagent, Skills** — by implementing each one from scratch, no high-level frameworks.

**Non-goal**: building a production-ready framework. Production tooling (LangChain / LangGraph / Claude Agent SDK / OpenAI Agents SDK) is **intentionally avoided in the from-scratch core** (`packages/mini-agent`). Studying those frameworks' APIs as a *separate* exercise happens in the parallel `packages/*-lab` track — see [Framework learning track](#framework-learning-track-parallel-monorepo-packages).

See [`packages/mini-agent/LEARNING.md`](./packages/mini-agent/LEARNING.md) for the full learning path and rationale.

## Hard constraints — read before coding

1. **DO NOT introduce LangChain, LangGraph, or any agent-framework SDK *into `packages/mini-agent`*.** That defeats the learning purpose. Allowed deps for the core loop are only: `openai` (pointed at DeepSeek for now), `zod`, `zod-to-json-schema`, `dotenv`, `tsx`, `typescript`. MCP SDK is added only at Phase 5.
   - **Carve-out**: learning the production frameworks themselves happens in the **separate** packages `packages/langchain-lab` / `packages/langgraph-lab` (see [Framework learning track](#framework-learning-track-parallel-monorepo-packages)). Those are exempt from this rule — but they are isolated sandboxes: `packages/mini-agent` **must never import** them, and their deps must never leak into the core package.
2. **Implementations stay readable in one sitting.** Resist clever abstractions; small files, plain functions. The whole agent loop should fit in ~50 lines.
3. **Every concept is built before its abstraction is used.** Example: implement hook behavior with a `for (const hook of hooks)` loop before reaching for any event emitter / middleware lib.
4. **Don't merge phases.** Finish Phase N + verify before starting Phase N+1.

## Working mode (AI assistant × user)

The from-scratch core and framework labs intentionally use different collaboration modes. Future AI assistant sessions: **respect this strictly.**

### From-scratch core (`packages/mini-agent`)

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

### Framework labs (`packages/*-lab`)

Framework API demos use a two-stage workflow:

1. **Requirements stage** — the AI creates or updates the Topic file with configuration/scaffolding and detailed TODO comments describing the API calls, observations, questions, and completion criteria. It does not implement the TODOs yet.
2. **Implementation stage** — after the user has reviewed the comments, clarified the mental model, and explicitly asks to implement, the AI may complete the concept demo, run it, typecheck it, and explain how the observed behavior maps to the framework abstraction.

Do not skip directly from a new Topic to a finished demo unless the user explicitly asks to skip the requirements stage. The user may still choose to implement any TODO personally. This exception applies only to framework labs; the `packages/mini-agent` hand-written core rules above remain unchanged.

### Per-phase workflow (`packages/mini-agent` only)

The workflow below applies only to the from-scratch core. Framework labs use their package-level `LEARNING.md` roadmap + `README.md` progress table and do not require per-Topic design docs or notes.

**During the phase (writing the concept code):**

1. Read the matching example in [`pguso/ai-agents-from-scratch`](https://github.com/pguso/ai-agents-from-scratch) — see [`packages/mini-agent/docs/pguso-mapping.md`](./packages/mini-agent/docs/pguso-mapping.md) for the per-phase reading list
2. Close that tab
3. **Write a design doc before coding — every phase, mandatory.** Work through design choices with the AI assistant Q&A-style first, then write `packages/mini-agent/docs/phaseN-<topic>-design.md` capturing alternatives considered, the decision, and *why*. See [`packages/mini-agent/docs/phase2-hooks-design.md`](./packages/mini-agent/docs/phase2-hooks-design.md) as the canonical example. For phases that closely follow pguso with no real choices, still write a short doc that says "followed pguso XX, no alternatives considered" — the discipline of producing one per phase matters. **This doc + the `packages/mini-agent/notes/phaseN.md` from the closing ritual are how each phase is anchored in the repo (we don't use git tags anymore — see step 10).**
4. Write the concept code here, no peeking
5. When stuck → ask the AI assistant focused questions (**not** "write it for me")
6. Once it runs → AI assistant code-reviews

**Closing ritual (do all four before starting Phase N+1):**

7. Answer the relevant self-check questions in [`packages/mini-agent/LEARNING.md`](./packages/mini-agent/LEARNING.md) (oral / mental is fine — write down only what you couldn't answer)
8. Write `packages/mini-agent/notes/phaseN.md` — reflection notes on what was built and learned. Together with the design doc from step 3, **this is the real per-phase deliverable; source code is the side product**.
9. Update the progress table in [`packages/mini-agent/README.md`](./packages/mini-agent/README.md) — mark ✅, link to the design doc + notes
10. Commit + push:
    ```bash
    git add . && git commit -m "Phase N: <one-line summary>"
    git push
    ```

> **Why no git tags?** From Phase 2 onward we anchor each phase via `packages/mini-agent/docs/phaseN-*.md` + `packages/mini-agent/notes/phaseN.md` instead. They live in the repo as plain files (survive forever, searchable, reviewable in PRs) and avoid the `git push --tags` footgun. Existing `phase0-done` / `phase1-done` tags are kept as-is — no need to delete or backfill new ones.

**Why this split**: in the from-scratch core, letting the AI assistant write the concept code would hide exactly the mechanics the user is trying to internalize. The per-phase design doc + notes ensure each milestone is recoverable and understanding is recorded. Framework labs study public APIs rather than rebuilding those mechanics, so they use the two-stage workflow above.

## Tech stack

| | |
|---|---|
| Runtime | Node 20+ |
| Language | TypeScript |
| LLM | DeepSeek `deepseek-v4-flash` (current; `deepseek-v4-pro` for harder tasks) → Claude / GPT (later) |
| LLM SDK | `openai` npm with `baseURL=https://api.deepseek.com` |
| Tool schema | `zod` + `zod-to-json-schema` |
| Workspace | pnpm monorepo — core in `packages/mini-agent`, framework labs in `packages/*-lab` |
| Run | `pnpm --filter mini-agent dev "..."` (from repo root) |

## Project layout

```
mini-agent/                         # pnpm workspace root (private, no app code)
├── AGENTS.md                       # this file — canonical agent-facing brief (stays at root *)
├── CLAUDE.md                       # Claude Code wrapper importing AGENTS.md (stays at root *)
├── README.md                       # thin GitHub front door → points here + LEARNING.md
├── pnpm-workspace.yaml             # packages: ['packages/*']
├── package.json                    # workspace root: shared devDeps (tsx/tsc) + -r scripts only
├── tsconfig.base.json              # shared compiler options; each package extends this
├── .env                            # DEEPSEEK_API_KEY=... (gitignored; shared by all packages)
└── packages/                       # ⭐ all app code + each track's own docs live here
    ├── mini-agent/                 #   ⭐ Phase 0 - 7 from-scratch core (self-contained)
    │   ├── README.md               #     progress checklist + working-mode reminder
    │   ├── LEARNING.md             #     learning rationale + 8-phase roadmap (Chinese)
    │   ├── package.json            #     core deps only: openai, zod, zod-to-json-schema, dotenv
    │   ├── tsconfig.json
    │   ├── docs/                   #     per-phase design docs + pguso-mapping.md
    │   ├── notes/                  #     per-phase reflection notes (+ README template)
    │   ├── example/                #     standalone reference repos (gitignored, own git history)
    │   │   ├── AI-chatbot/         #       Vue + Koa + MongoDB chatbot — future "deployment target"
    │   │   └── ai-agents-from-scratch/  #  pguso's repo, cloned for reference
    │   └── src/
    │       ├── index.ts            #     CLI entry
    │       ├── llm.ts              #     OpenAI client with DeepSeek baseURL
    │       ├── agent.ts            #     ReAct loop (~50 lines, from Phase 1)
    │       ├── hooks.ts            #     (Phase 2) pre/post tool hooks
    │       └── tools/              #     registry.ts + individual tools
    ├── langchain-lab/              #   LangChain.js learning track (own @langchain/* deps)
    │   ├── README.md               #     progress table + run instructions
    │   ├── LEARNING.md             #     v1 topic roadmap + self-check questions
    │   └── src/                    #     staged Topic demos: AI writes TODOs, then implements after user confirmation
    └── langgraph-lab/              #   (built when the user reaches it — same shape)
```

> *\* Why AGENTS.md / CLAUDE.md stay at root* while all the mini-agent learning material moved into the package: they are the **workspace-wide canonical brief** (they also govern the framework labs), and Claude Code / Codex discover them from the repo root, with `CLAUDE.md` importing `@AGENTS.md`. Everything that is *mini-agent-specific* (roadmap / design docs / notes / reference repos) lives under `packages/mini-agent/`.
>
> `packages/mini-agent/example/*` are **independent** projects (own git history), gitignored, NOT workspace packages — the workspace glob is `packages/*` (matches `langchain-lab`, `langgraph-lab`, `mini-agent`, not the nested `example/*`). Treat them as read-only references.

### Framework learning track (parallel monorepo packages)

`packages/langchain-lab` (and later `packages/langgraph-lab`) are a **separate, parallel** learning track from the 8-phase from-scratch plan — added after the core was hand-written, to study the production frameworks' APIs. They are **independent packages** with their own `package.json` and dependency graph, so framework deps never touch `packages/mini-agent`. Framework labs keep a package-level `LEARNING.md` roadmap + `README.md` progress table, but do not copy the core package's per-phase `docs/` + `notes/` ritual. They follow the two-stage requirements-then-implementation workflow: the AI first writes detailed TODO comments, then implements only after the user reviews them and explicitly requests implementation. `langchain` first, `langgraph` later, kept in separate packages so the two are never confused.

## Phased plan (summary — full version in [`packages/mini-agent/LEARNING.md`](./packages/mini-agent/LEARNING.md))

0. **Chat Loop** — `messages[]` history, no tools yet; confirm round-trip mechanics
1. **Tools / ReAct** — tool registry + 2-3 tools + bounded loop
2. **Permissions + Hooks** — `preToolCall` / `postToolCall`; logger + confirm + read/write/bash permission scaffolding
3. **Context + Trace** — `maxTurns` / `maxToolCalls`, transcript, history trimming
4. **Evals** — 5-10 fixed tasks covering: no-tool, single-tool, multi-tool, tool error, permission denial
5. **MCP** — MCP Client / Host: connect to an existing stdio server (e.g. the official filesystem server), discover its tools over the protocol, and call them from the agent loop
6. **Subagent** — main agent delegates to role-specific sub-agents (research / code / review)
7. **Skills** *(optional)* — provider-agnostic `SKILL.md` loader first; vendor SDK later

> **Hard rule**: finish + verify Phase N before starting Phase N+1. Each phase has self-check questions in `packages/mini-agent/LEARNING.md` — answer them before moving on.

## Running (once Phase 1 is implemented)

```bash
pnpm install                                   # from repo root — installs all packages
echo "DEEPSEEK_API_KEY=sk-..." > .env          # single root .env, shared by all packages
pnpm --filter mini-agent dev "23 * 47 是多少"   # core agent (script injects ../../.env)
```

> Note: DeepSeek's legacy model names `deepseek-chat` / `deepseek-reasoner` will be retired on 2026-07-24. Use `deepseek-v4-flash` / `deepseek-v4-pro` in any new code.

## Canonical reference repo

[`pguso/ai-agents-from-scratch`](https://github.com/pguso/ai-agents-from-scratch) (⭐ 3.5k) + companion site [agentsfromscratch.com](https://agentsfromscratch.com) — JavaScript, framework-free, 14 progressive examples that map cleanly onto our phases (LLM basics → tools → memory → ReAct → advanced reasoning). Use it as the "follow-along" reference; this repo re-implements the same ideas in TypeScript with DeepSeek.
