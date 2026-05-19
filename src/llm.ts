// LLM client — OpenAI-compatible,指向 DeepSeek
// 其他模块从这里 import { openai, MODEL } 使用

import 'dotenv/config'
import OpenAI from 'openai'

export const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

export const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash'
