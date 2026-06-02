# Phase 4:Evals —— 主动跳过

> 这不是漏做,是有意识地跳过。记录在此,方便未来的我 / 未来的 AI 会话知道这里发生了什么。

## 决定

跳过 Phase 4(Evals),直接进 Phase 5(MCP)。

## 为什么跳

1. **eval 不是 agent 的能力构造块,是工程方法。** Tools / Hooks / MCP / Subagent 是"agent 能做什么";eval 是"怎么确认 agent 没坏"。前者不做就没有 agent,后者更像把我已经熟悉的"软件测试"迁移到"被测对象不确定(LLM 每次措辞不同)"这个新场景。
2. **当前没有回归测试的实际痛点。** eval 的价值在"改 prompt / 换模型 / 大重构后,快速确认没把已跑通的功能搞坏"。现在阶段还没到反复重构的程度,纸上理解 eval 比较空,缺体感。
3. **不影响后续阶段。** Phase 4 不是 Phase 5/6 的前置依赖,跳过它照样能动手 MCP / Subagent。

## 已经理解到的概念(留个底,以后回来做最小版时直接用)

讲到概念 5 / 6 前停了,前面几个概念已经清楚:

1. **eval = 针对 agent 的自动化测试集**。把"手动敲命令 + 肉眼判断"固化成代码,一键全跑、自动报哪条挂。
2. **LLM 非确定性**:同一输入 reply 措辞每次不同。断言不能用 `=== 精确字符串`(会 flaky),要改成"满足特征"。
3. **三种证据**:`stats`(汇总数字,确定性最高)> `transcript`(事件流水账,确定性高)> `reply`(最终文本,确定性最低,只做宽松子串)。过程特征比结果特征可靠。
4. **一条 eval 的代码形态**:`task = { name, input, options?, check(result) => string[] }`;runner 就是个 for 循环跑 `runAgent` + `check`。无需 jest / DSL / 新依赖。
5.(未讲完)两个难点:① 权限拒绝这条会卡键盘(`confirmHook` 读真实 stdin),需要留个"接缝"注入假答案;② 要不要花钱跑真实 API(最小版直接真跑即可,record-replay 是规模大了才上的过度设计)。

## 以后想做的话

- Phase 3 的 `runAgent` 已经返回 `{ reply, transcript, stats }`,eval 的证据是现成的,接起来很快。
- 做就做**最小版**:5~6 条 task 覆盖无 tool / 单 tool / 多 tool / tool error / 权限拒绝,半天的事,别按生产标准(record-replay、CI、覆盖度)做。
- 第一件要解决的工程问题是 `confirmHook` 的 stdin 接缝(见上面难点①)。
