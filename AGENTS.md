# Mini-Agent GPT Review Guide

This file is for GPT / Codex-style agents reviewing or editing this project.
`CLAUDE.md` is the Claude-facing project brief; treat it as the source of
truth for the project's learning goals and constraints.

## Project intent

Mini-Agent is a from-scratch Node.js / TypeScript learning project for
understanding LLM agent fundamentals:

- Tools
- Hooks
- MCP
- Subagents
- Skills

The goal is learning by implementation, not building a production framework.

## Non-negotiable constraints

1. Do not introduce LangChain, LangGraph, OpenAI Agents SDK, Claude Agent SDK,
   or any other high-level agent framework while the project is in the
   from-scratch learning phases.
2. Keep implementations small enough to read in one sitting. Prefer plain
   functions and direct control flow over abstraction layers.
3. Build each concept before wrapping it in an abstraction. For example,
   implement hooks with a simple `for (const hook of hooks)` loop before using
   middleware, event emitters, or plugin systems.
4. Do not merge phases. Finish and verify Phase N before starting Phase N+1.
5. Keep the core agent loop simple. The target shape is a minimal ReAct loop,
   not a reusable framework.

## Current project state

At the time this guide was written, the repository contains documentation only:

- `CLAUDE.md` - Claude-facing project brief and planned layout.
- `LEARNING.md` - Chinese learning roadmap and rationale.

If source files, `package.json`, or tests are added later, inspect the actual
state before reviewing. Do not assume the planned layout already exists.

## Planned technical direction

- Runtime: Node 20+
- Language: TypeScript
- Package manager: pnpm
- Initial LLM: DeepSeek `deepseek-chat`
- SDK shape: `openai` npm package with `baseURL=https://api.deepseek.com`
- Tool schema: `zod` + `zod-to-json-schema`
- Initial run command: `pnpm tsx src/index.ts "..."`

Allowed early dependencies for the core loop are intentionally narrow:

- `openai`
- `zod`
- `zod-to-json-schema`
- `dotenv`
- `tsx`
- `typescript`

The MCP TypeScript SDK should only appear when Phase 3 begins.

## Review priorities

When reviewing this project, prioritize:

1. Whether the learning sequence is coherent:
   Tools -> Hooks -> MCP -> Subagent -> Skills.
2. Whether the implementation still teaches the underlying mechanism instead of
   hiding it behind framework-style abstractions.
3. Whether each phase has a concrete verification method that proves the concept
   works.
4. Whether the DeepSeek/OpenAI-compatible setup is simple enough for learning and
   does not distort tool-calling behavior.
5. Whether file structure, naming, and examples remain understandable for a
   learner reading the project from scratch.

If asked to review current external resources, model choices, SDK behavior, or
2025-2026 recommendations, verify them against current sources instead of relying
only on memory.

## Expected review style

Give feedback in Chinese unless the user asks otherwise.

Lead with actionable findings, ordered by severity. For each finding, include:

- File and line reference when possible.
- The specific risk or confusion.
- A concrete suggested fix.

After findings, include open questions or assumptions. Keep summaries short.
If there are no blocking issues, say that clearly and identify any remaining
test or verification gaps.

## Editing guidance

If you edit the project:

- Prefer the existing documentation tone: direct, learning-oriented, and
  explicit about tradeoffs.
- Keep Markdown readable and concise.
- Do not add production-framework patterns just to make the design look mature.
- Do not add dependencies without explaining why they fit the current phase.
- Do not create future phase code before earlier phases are implemented and
  verified.

## Verification guidance

Before claiming a phase is complete, verify it with the smallest meaningful
command or manual run. Once implementation exists, expected checks should look
roughly like:

```bash
pnpm install
pnpm tsx src/index.ts "23 * 47 是多少"
```

If the project later adds scripts such as `typecheck`, `lint`, or `test`, run the
relevant script after changes and report the result.
