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

## 当前进度(每完成一个 phase 勾选 + 在 `notes/phaseN.md` 写复盘)

- [ ] Phase 0 — Chat Loop
- [ ] Phase 1 — Tools / ReAct
- [ ] Phase 2 — Permissions + Hooks
- [ ] Phase 3 — Context + Trace
- [ ] Phase 4 — Evals
- [ ] Phase 5 — MCP
- [ ] Phase 6 — Subagent
- [ ] Phase 7 — Skills(可选)

## 运行(Phase 0 跑通后)

```bash
pnpm install
echo "DEEPSEEK_API_KEY=sk-..." > .env
pnpm tsx src/index.ts "你好"
```
