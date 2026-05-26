import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const { description, conversation } = await req.json() as {
      description: string
      conversation?: Array<{ role: string; content: string }>
    }

    const conversationSummary = conversation && conversation.length > 0
      ? `\n\n用户和目标教练的对话记录：\n${conversation.map(m => `${m.role === 'user' ? '用户' : '教练'}：${m.content}`).join('\n')}`
      : ''

    const prompt = `你是一个人生规划助手，根据用户的描述和与目标教练的对话，提取最终确认的结构化个人信息。

用户最初的描述：
"""
${description}
"""
${conversationSummary}

请根据以上所有信息（以对话中最新确认的内容为准），提取结构化数据，只返回 JSON：
{
  "name": "用户名字（如果没有就用'我'）",
  "wakeTime": "起床时间 HH:MM",
  "sleepTime": "睡觉时间 HH:MM",
  "energyPeak": "morning / afternoon / evening 之一",
  "energyNotes": "精力规律简短描述，10字以内",
  "identities": [
    {
      "id": "英文小写唯一ID，如 designer、parent",
      "name": "身份名称",
      "emoji": "合适的 emoji",
      "color": "green/blue/orange/pink/purple/teal 之一",
      "goals": [
        {
          "id": "goal_1",
          "title": "经过对话打磨后的具体可执行目标"
        }
      ]
    }
  ],
  "fixedSlots": [
    {
      "id": "slot_1",
      "title": "固定安排名称",
      "time": "HH:MM",
      "duration": 60,
      "identityId": "对应身份ID",
      "days": [1, 3, 5]
    }
  ]
}

提取原则：
- 以对话中最终确认的目标为准，忽略被否定或修改过的旧版本
- 身份不要拆得太细，合并相关的
- 固定安排只提取明确说了时间的
- 只返回 JSON，不要其他文字`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 没有返回有效的 JSON')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
