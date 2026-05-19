// 例子工具:天气查询(mock,返回假数据,不真调外部 API)

import { z } from 'zod'
import { registerTool, type Tool } from './registry'

// 参数 schema —— .describe() 的内容会进入 JSON Schema,
// 模型靠这些说明决定怎么填参数(给具体例子能减少格式猜错)
const parameters = z.object({
  city: z.string().describe("城市名,例如 '杭州'、'北京'、'Tokyo'"),
})

// mock 数据按城市变化 —— 让 agent 跑 "北京和上海哪里更热" 这种比较问题时,
// 模型才能基于不同温度做出有意义的回答
const mockWeather: Record<string, string> = {
  '北京': '北京当前 18°C,多云',
  '上海': '上海当前 24°C,小雨',
  '杭州': '杭州当前 22°C,晴',
  '广州': '广州当前 28°C,晴,湿度高',
  '深圳': '深圳当前 27°C,多云',
}

const weather: Tool<typeof parameters> = {
  name: 'weather',
  description: '查询指定城市的当前天气情况(温度、天气状况等)',
  parameters,
  execute: async ({ city }) => {
    return mockWeather[city] ?? `${city} 当前 20°C,晴(mock 兜底数据)`
  },
}

registerTool(weather)
