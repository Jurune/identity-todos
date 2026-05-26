import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json() as { description: string }

    const prompt = `你是一个个人助理，帮用户从自然语言描述中提取结构化的个人信息。

用户的描述：
"""
${description}
"""

请从中提取以下信息，以 JSON 格式返回：
{
  "name": "用户名字（如果没有就用'我'）",
  "wakeTime": "起床时间 HH:MM（如果没提到就推测一个合理的）",
  "sleepTime": "睡觉时间 HH:MM（如果没提到就推测一个合理的）",
  "energyPeak": "精力最佳时段，只能是 morning / afternoon / evening 之一",
  "energyNotes": "对精力规律的简短描述，10字以内",
  "identities": [
    {
      "id": "用英文小写单词生成唯一ID，如 designer、parent",
      "name": "身份名称",
      "emoji": "一个合适的 emoji",
      "color": "从 green/blue/orange/pink/purple/teal 中选一个",
      "goals": [
        {
          "id": "goal_1",
          "title": "目标描述",
          "frequency": "每天/每周/一次性（如果有）",
          "notes": "补充说明（如果有）"
        }
      ]
    }
  ],
  "fixedSlots": [
    {
      "id": "slot_1",
      "title": "固定安排名称",
      "time": "HH:MM",
      "duration": 分钟数,
      "identityId": "对应的身份ID",
      "days": [1,3,5] // 0=周日 1=周一 ... 6=周六，空数组=每天
    }
  ],
  "suggestions": "给用户的一句话建议，轻松语气，说说你觉得他/她的生活节奏怎么样，15字以内"
}

提取原则：
- 用户没提到的信息，根据上下文合理推断
- 身份要真实反映用户的生活角色
- 固定安排只提取明确说了时间的事项
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
