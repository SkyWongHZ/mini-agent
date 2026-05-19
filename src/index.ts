import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  let completion
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "浙江的省会是哪里?" }
  ]

  completion=await openai.chat.completions.create({
    messages:messages,
    model: "deepseek-v4-flash",
    stream: false,
  });

  // ⭐ Phase 0 关键:把模型刚才的回答 push 回 messages 数组。
  // 下一轮 API 调用时,模型才能"看到"自己上一轮说过什么 ——
  // 否则模型只看到两条连续的 user message,中间断了一截。
  // Phase 1 的 tool_calls 也是同样的 push-回-messages 模式。
  messages.push({
    role: "assistant",
    content: completion.choices[0].message.content
  })

  messages.push( { role: "user", content: "省会城市身份证开头是多少?" })
  completion=await openai.chat.completions.create({
    messages:messages,
    model: "deepseek-v4-flash",
    stream: false,
  });


  console.log(completion.choices[0].message.content) 