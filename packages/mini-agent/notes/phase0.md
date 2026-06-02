# Phase 0:Chat Loop

## 做了什么

`src/index.ts` 里硬编码两轮对话,验证 messages 历史累积 mechanic:
- `openai` SDK + DeepSeek `baseURL=https://api.deepseek.com`(不带 /v1)
- system + user1 → 调 API → push assistant 回 messages → push user2 → 再调 API
- 跑通:浙江省会→杭州市→身份证开头 3301

## 核心认知

LLM API 是 **stateless** 的 — 服务器不记得任何之前的调用。"连续对话"完全由客户端承担:**每次都把完整的 messages 历史再传一次**。三个 role:

- `system`:身份/规则,第一条,只放一次
- `user`:用户输入,自己 push
- `assistant`:模型上轮回复,**必须手动 push 回 messages**,否则下一轮模型看不见自己说过什么

## 踩坑

漏了 push assistant message,但输出看起来是对的 — 因为 `deepseek-v4-flash` 太聪明,看 `[user1, user2]` 自己 chain reasoning 把答案推了出来。**输出正确 ≠ mechanism 正确**。换弱模型或换成"必须依赖模型上一轮回答的问题"就立刻崩。

教训:**永远不要把"输出对"和"实现对"画等号**。
