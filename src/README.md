# `src/` — mini-agent CLI 实现

Phase 0 - 7 的代码**全部在这里**增量构造。

## 谁在这里写代码?

按 `CLAUDE.md` 的 `## Working mode` 协议:

| 谁 | 写什么 |
|---|---|
| **你(user)** | agent loop / tool registry / hook 链 / permission 检查 / MCP 协议 / context 管理 等 — **所有概念代码** |
| **Claude** | `package.json` / `tsconfig.json` / `.env` 加载 / CLI 参数解析 / 错误打印 等 — **纯脚手架** |

> 如果你发现 Claude 在 `src/` 下写了 agent 概念代码,那是违反了 Working mode,提醒它停下。

## 计划文件结构

```
src/
├── index.ts        # CLI 入口
├── llm.ts          # OpenAI-compatible client(指向 DeepSeek)
├── agent.ts        # Phase 1 起:ReAct 循环(~50 行)
├── hooks.ts        # Phase 2 起:pre/post tool hooks
└── tools/
    ├── registry.ts # Tool 类型 + 注册表 + JSON Schema 生成
    └── *.ts        # 各 tool 实现
```

## 当前进度

每完成一个 phase:勾选 + 写 `notes/phaseN.md` + `docs/phaseN-<topic>-design.md`,然后 commit & push。

| | Phase | 设计文档 | 笔记 |
|---|---|---|---|
| ✅ | Phase 0 — Chat Loop | — (跟随 pguso) | `notes/phase0.md` |
| ✅ | Phase 1 — Tools / ReAct | — (跟随 pguso) | `notes/phase1.md` |
| ✅ | Phase 2 — Permissions + Hooks | `docs/phase2-hooks-design.md` | `notes/phase2.md` |
| ✅ | Phase 3 — Context + Trace | `docs/phase3-context-design.md` | `notes/phase3.md` |
| ⏭ | Phase 4 — Evals | | |
| ⏭ | Phase 5 — MCP | | |
| ⏭ | Phase 6 — Subagent | | |
| ⏭ | Phase 7 — Skills(可选) | | |

## 回看历史 phase 代码

Phase 2 起,**每阶段的「设计文档 + 笔记」就是阶段快照** —— 它们以普通文件留在 repo 里,永远在。要看当时代码,直接走 commit 历史:

```bash
# 看 Phase N 完成时的所有 commit
git log --oneline --grep="^Phase 2"

# 对比两个 phase 之间 src/ 的全部变化(<sha-A> 为 Phase N 收尾 commit)
git diff <sha-A> <sha-B> -- src/
```

> Phase 0 / 1 仍有遗留 tag `phase0-done` / `phase1-done`,`git show phase0-done:src/index.ts` 等还能用。Phase 2 起不再新打 tag(避免 `git push --tags` 的脚枪)。

## 推送到远程(GitHub)

```bash
git push   # commit 跟着上去就好,不再有 tag 要推
```

Repo: https://github.com/SkyWongHZ/mini-agent

## 运行

```bash
pnpm install
echo "DEEPSEEK_API_KEY=sk-..." > .env
pnpm dev "23 * 47 等于多少"      # 注意带引号,否则 shell 会展开 *
pnpm dev "北京天气怎么样"
```
