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

每完成一个 phase:勾选 + 写 `notes/phaseN.md` + `git tag phaseN-done`。

| | Phase | 笔记 | Git tag |
|---|---|---|---|
| ✅ | Phase 0 — Chat Loop | `notes/phase0.md` | `phase0-done` |
| ✅ | Phase 1 — Tools / ReAct | `notes/phase1.md` | `phase1-done` |
| ⏭ | Phase 2 — Permissions + Hooks | | |
| ⏭ | Phase 3 — Context + Trace | | |
| ⏭ | Phase 4 — Evals | | |
| ⏭ | Phase 5 — MCP | | |
| ⏭ | Phase 6 — Subagent | | |
| ⏭ | Phase 7 — Skills(可选) | | |

## 回看历史 phase 代码

每个 phase 完成时 commit + tag,可以随时回去看当时的样子或对比演进:

```bash
# 看某个 phase 完成时的某个文件
git show phase0-done:src/index.ts
git show phase1-done:src/agent.ts

# 对比两个 phase 之间 src/ 的全部变化
git diff phase0-done phase1-done -- src/

# 临时切回某个 phase(只读地浏览)
git checkout phase0-done
# 看完回到主线
git checkout master   # 或 main,看你默认分支
```

如果某个 phase 想"重做"(比如 Phase 1 写得不满意,想 fresh start):
```bash
git reset --hard phase0-done    # ⚠️ 会丢失 Phase 1 之后的未 commit 改动
```

## 运行

```bash
pnpm install
echo "DEEPSEEK_API_KEY=sk-..." > .env
pnpm dev "23 * 47 等于多少"      # 注意带引号,否则 shell 会展开 *
pnpm dev "北京天气怎么样"
```
