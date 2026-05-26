import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { UserProfile, ScheduleItem, DailyPlan } from '@/lib/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

function buildPrompt(profile: UserProfile, date: string): string {
  const d = new Date(date + 'T00:00:00')
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const dayName = days[d.getDay()]
  const dayOfWeek = d.getDay()

  const identitiesText = profile.identities.map(identity => {
    const goalsText = identity.goals.map(g =>
      `  - ${g.title}${g.frequency ? `（${g.frequency}）` : ''}${g.notes ? `：${g.notes}` : ''}`
    ).join('\n')
    return `【${identity.emoji} ${identity.name}】\n${goalsText || '  （暂无具体目标）'}`
  }).join('\n\n')

  const fixedSlotsToday = profile.fixedSlots.filter(slot => {
    if (slot.days.length === 0) return true
    return slot.days.includes(dayOfWeek)
  })

  const fixedText = fixedSlotsToday.length > 0
    ? fixedSlotsToday.map(s => {
        const identity = profile.identities.find(i => i.id === s.identityId)
        return `  - ${s.time} ${s.title}（${s.duration}分钟）${identity ? ` [${identity.emoji}${identity.name}]` : ''}`
      }).join('\n')
    : '  无固定安排'

  const energyMap = { morning: '早上精力最好，适合深度工作', afternoon: '下午状态最佳', evening: '晚上效率更高' }

  return `你是${profile.name}的个人日程规划 AI。你深入了解她/他的生活、目标和习惯。今天你需要帮她/他安排好今天的一天。

今天是：${date}（${dayName}）

基本信息：
- 起床时间：${profile.wakeTime}
- 睡觉时间：${profile.sleepTime}
- 精力规律：${energyMap[profile.energyPeak]}

身份和目标：
${identitiesText}

今天的固定安排：
${fixedText}

---

规划要求：
1. 基于以上信息，安排一个真实可执行的今日日程
2. 固定安排必须保留在原时间
3. 根据精力规律安排深度工作（精力好时做重要事）
4. 每天总事务不超过 7 个，留有空白
5. 每个有活跃目标的身份今天至少推进一件事（如果时间允许）
6. 不要排太满，留有弹性

请以 JSON 格式返回，格式如下：
{
  "message": "一句话，用轻松的语气告诉${profile.name}今天的节奏是什么感觉（20字以内）",
  "items": [
    {
      "time": "HH:MM",
      "duration": 分钟数,
      "title": "事务名称（带 emoji）",
      "identityId": "身份ID或null",
      "reason": "一句话说明为什么这个时间做这件事（可选，10字以内）",
      "isFixed": true或false
    }
  ]
}

身份ID列表：
${profile.identities.map(i => `- ${i.id}: ${i.emoji}${i.name}`).join('\n')}

只返回 JSON，不要有其他文字。`
}

export async function POST(req: NextRequest) {
  try {
    const { profile, date } = await req.json() as { profile: UserProfile; date: string }

    const prompt = buildPrompt(profile, date)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 没有返回有效的 JSON')

    const parsed = JSON.parse(jsonMatch[0])

    const items: ScheduleItem[] = parsed.items.map((item: {
      time: string
      duration: number
      title: string
      identityId?: string
      reason?: string
      isFixed?: boolean
    }, idx: number) => ({
      id: `item_${idx}_${Date.now()}`,
      time: item.time,
      duration: item.duration,
      title: item.title,
      identityId: item.identityId || undefined,
      reason: item.reason,
      done: false,
      isFixed: item.isFixed || false,
    }))

    const plan: DailyPlan = {
      date,
      items,
      aiMessage: parsed.message,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(plan)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
