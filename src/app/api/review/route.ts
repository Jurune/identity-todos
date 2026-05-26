import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { DailyPlan, UserProfile } from '@/lib/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const { profile, plan, userMessage, date } = await req.json() as {
      profile: UserProfile
      plan: DailyPlan
      userMessage: string
      date: string
    }

    const d = new Date(date + 'T00:00:00')
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dayName = days[d.getDay()]

    const plannedItems = plan.items.map(item => {
      const identity = profile.identities.find(i => i.id === item.identityId)
      return `  - ${item.time} ${item.title}${identity ? ` [${identity.emoji}${identity.name}]` : ''} → ${item.done ? '已完成' : '未完成'}`
    }).join('\n')

    const prompt = `你是${profile.name}的个人 AI 助理。今天是 ${date}（${dayName}），${profile.name}做完了今日复盘。

今天的计划：
${plannedItems}

${profile.name}说：
"${userMessage}"

请根据计划完成情况和${profile.name}说的话，做一个简短的今日复盘回应。要求：
- 语气像一个真正了解她/他的朋友，温暖但不矫情
- 指出哪些目标有实质推进，哪些没有，以及你理解的原因
- 如果有事情被跳过，不批评，只是理解
- 最后一句话说明明天规划时你会注意什么
- 总共不超过 120 字
- 不要用列表或标题，就是一段话`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ aiResponse: text })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
