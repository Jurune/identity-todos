import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL,
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, initialDescription } = await req.json() as {
      messages: ChatMessage[]
      initialDescription: string
    }

    const systemPrompt = `你是一个目标教练，帮用户在设置人生目标之前想清楚自己真正想要什么。

用户最初的描述：
"""
${initialDescription}
"""

你的任务：
1. 分析用户描述中的目标，找出问题：太模糊、缺衡量标准、身份太多精力不够、目标之间有冲突等
2. 通过对话帮用户打磨目标，直到目标清晰、可执行、符合实际精力
3. 当你觉得目标已经足够清晰时，在回复末尾加上这一行（单独一行）：[GOALS_READY]

对话原则：
- 每次只聚焦一个问题，不要一次抛出太多问题
- 直接说出你的判断，不要绕弯子
- 语气像一个了解你的朋友，真诚但不客套
- 不要重复用户说过的话，直接给观点
- 如果用户说"就这样了"或"确认"，也可以结束对话加上 [GOALS_READY]`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const isReady = text.includes('[GOALS_READY]')
    const cleanText = text.replace('[GOALS_READY]', '').trim()

    return NextResponse.json({ message: cleanText, isReady })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
