'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfile } from '@/lib/store'
import { UserProfile, Identity, FixedSlot, Goal } from '@/lib/types'
import { getColor, COLOR_OPTIONS } from '@/lib/colors'

type Step = 'describe' | 'coach' | 'review'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type ParsedProfile = Omit<UserProfile, 'identities' | 'fixedSlots'> & {
  identities: Identity[]
  fixedSlots: FixedSlot[]
  energyNotes?: string
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']
const EMOJI_OPTIONS = ['💼', '🏃', '🎨', '📚', '🏠', '❤️', '🌱', '🎵', '🍳', '✈️', '💪', '🧘']

function newId() {
  return Math.random().toString(36).slice(2, 9)
}

function newIdentity(): Identity {
  return { id: newId(), name: '', emoji: '💼', color: 'blue', goals: [] }
}

function newGoal(): Goal {
  return { id: newId(), title: '' }
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('describe')
  const [description, setDescription] = useState('')

  // Coach step
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [coachLoading, setCoachLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Review step
  const [parsed, setParsed] = useState<ParsedProfile | null>(null)
  const [parseLoading, setParseLoading] = useState(false)
  const [error, setError] = useState('')
  const [emojiPickerIdx, setEmojiPickerIdx] = useState<number | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Step 1 → Step 2: 发送初始描述给教练
  async function startCoach() {
    if (!description.trim()) return
    setCoachLoading(true)
    setError('')
    try {
      const firstMessage: ChatMessage = { role: 'user', content: description }
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [firstMessage], initialDescription: description }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([firstMessage, { role: 'assistant', content: data.message }])
      setIsReady(data.isReady)
      setStep('coach')
    } catch (e) {
      setError('连接失败，请重试：' + e)
    } finally {
      setCoachLoading(false)
    }
  }

  // Step 2: 继续对话
  async function sendMessage() {
    if (!input.trim() || coachLoading) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setCoachLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, initialDescription: description }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: 'assistant', content: data.message }])
      setIsReady(data.isReady)
    } catch (e) {
      setError('发送失败：' + e)
    } finally {
      setCoachLoading(false)
    }
  }

  // Step 2 → Step 3: 目标确认，提取结构化数据
  async function extractProfile() {
    setParseLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parse-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, conversation: messages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setParsed(data)
      setStep('review')
    } catch (e) {
      setError('提取失败，请重试：' + e)
    } finally {
      setParseLoading(false)
    }
  }

  // Review helpers
  function addIdentity() {
    if (!parsed) return
    setParsed({ ...parsed, identities: [...parsed.identities, newIdentity()] })
  }
  function removeIdentity(idx: number) {
    if (!parsed) return
    setParsed({ ...parsed, identities: parsed.identities.filter((_, i) => i !== idx) })
  }
  function updateIdentity(idx: number, patch: Partial<Identity>) {
    if (!parsed) return
    setParsed({ ...parsed, identities: parsed.identities.map((id, i) => i === idx ? { ...id, ...patch } : id) })
  }
  function addGoal(identityIdx: number) {
    if (!parsed) return
    const updated = [...parsed.identities]
    updated[identityIdx] = { ...updated[identityIdx], goals: [...updated[identityIdx].goals, newGoal()] }
    setParsed({ ...parsed, identities: updated })
  }
  function removeGoal(identityIdx: number, goalIdx: number) {
    if (!parsed) return
    const updated = [...parsed.identities]
    updated[identityIdx] = { ...updated[identityIdx], goals: updated[identityIdx].goals.filter((_, i) => i !== goalIdx) }
    setParsed({ ...parsed, identities: updated })
  }
  function updateGoal(identityIdx: number, goalIdx: number, patch: Partial<Goal>) {
    if (!parsed) return
    const updated = [...parsed.identities]
    const updatedGoals = updated[identityIdx].goals.map((g, i) => i === goalIdx ? { ...g, ...patch } : g)
    updated[identityIdx] = { ...updated[identityIdx], goals: updatedGoals }
    setParsed({ ...parsed, identities: updated })
  }

  function confirm() {
    if (!parsed) return
    saveProfile({
      name: parsed.name,
      wakeTime: parsed.wakeTime,
      sleepTime: parsed.sleepTime,
      energyPeak: parsed.energyPeak,
      identities: parsed.identities,
      fixedSlots: parsed.fixedSlots,
    })
    router.push('/')
  }

  // ── Step 1: 描述 ──────────────────────────────────────────
  if (step === 'describe') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-md mx-auto w-full px-5 pt-14 pb-8 flex flex-col flex-1">
          <div className="mb-8">
            <div className="text-4xl mb-3">🐾</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">跟我说说你是谁</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              用自己的话描述你的生活——身份、目标、作息、固定安排都可以说。我们会一起把目标想清楚，再开始规划。
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-1 flex-1 flex flex-col mb-4">
            <textarea
              className="flex-1 w-full p-4 text-sm text-gray-900 placeholder-gray-300 outline-none resize-none rounded-xl leading-relaxed"
              placeholder={`比如：

我叫小林，早上7点起床，晚上11点睡。早上精力最好。

工作上我是产品设计师，在做 A 和 B 两个项目，目标是下个月把 A 项目上线。

生活上想养成每天跑步的习惯，还想学做饭。

每周一三五上午10点有例会（1小时）。`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ minHeight: '260px' }}
            />
          </div>

          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

          <button
            onClick={startCoach}
            disabled={coachLoading || !description.trim()}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-sm disabled:opacity-40 transition-opacity"
          >
            {coachLoading ? 'AI 分析中…' : '开始 →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: 对话打磨 ──────────────────────────────────────
  if (step === 'coach') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-md mx-auto w-full flex flex-col h-screen">
          {/* Header */}
          <div className="px-5 pt-10 pb-4 shrink-0">
            <button onClick={() => setStep('describe')} className="text-blue-500 text-sm mb-4">← 重新描述</button>
            <h2 className="text-lg font-bold text-gray-900">目标对话</h2>
            <p className="text-gray-400 text-xs mt-0.5">和 AI 一起把目标想清楚，再生成你的档案</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-lg mr-2 mt-1 shrink-0">🐾</span>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {coachLoading && (
              <div className="flex justify-start">
                <span className="text-lg mr-2 mt-1">🐾</span>
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          {/* 目标确认按钮 */}
          {isReady && !coachLoading && (
            <div className="px-5 pb-3 shrink-0">
              <button
                onClick={extractProfile}
                disabled={parseLoading}
                className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-medium text-sm disabled:opacity-40 transition-opacity"
              >
                {parseLoading ? '生成档案中…' : '✅ 目标确认，生成我的档案'}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-5 pb-8 pt-2 shrink-0 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:border-gray-400 transition-colors leading-relaxed"
                placeholder="回复…"
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={sendMessage}
                disabled={coachLoading || !input.trim()}
                className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13V3M3 8l5-5 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            {!isReady && (
              <button
                onClick={extractProfile}
                disabled={parseLoading}
                className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-gray-400 text-xs disabled:opacity-40 hover:bg-gray-100 transition-colors"
              >
                {parseLoading ? '生成中…' : '跳过，直接生成档案'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: 确认档案 ──────────────────────────────────────
  if (!parsed) return null

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setEmojiPickerIdx(null)}>
      <div className="max-w-md mx-auto px-5 pt-10 pb-24">
        <button onClick={() => setStep('coach')} className="text-blue-500 text-sm mb-6">← 返回对话</button>

        <h2 className="text-xl font-bold text-gray-900 mb-1">确认你的档案</h2>
        <p className="text-gray-500 text-sm mb-6">可以直接编辑，随时添加或删除</p>

        {/* Basic info */}
        <Section title="基本信息">
          <Field label="名字">
            <input
              className="text-sm font-medium text-gray-900 outline-none bg-transparent text-right"
              value={parsed.name}
              placeholder="你的名字"
              onChange={e => setParsed({ ...parsed, name: e.target.value })}
            />
          </Field>
          <Field label="起床">
            <input type="time" className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.wakeTime} onChange={e => setParsed({ ...parsed, wakeTime: e.target.value })} />
          </Field>
          <Field label="睡觉">
            <input type="time" className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.sleepTime} onChange={e => setParsed({ ...parsed, sleepTime: e.target.value })} />
          </Field>
          <Field label="精力峰值">
            <select className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.energyPeak} onChange={e => setParsed({ ...parsed, energyPeak: e.target.value as UserProfile['energyPeak'] })}>
              <option value="morning">早上</option>
              <option value="afternoon">下午</option>
              <option value="evening">晚上</option>
            </select>
          </Field>
        </Section>

        {/* Identities */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              身份（{parsed.identities.length} 个）
            </h3>
            <button onClick={addIdentity} className="text-xs text-blue-500 font-medium hover:text-blue-700">
              + 添加身份
            </button>
          </div>

          {parsed.identities.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center">
              <p className="text-gray-400 text-sm">还没有身份</p>
              <p className="text-gray-300 text-xs mt-1">点右上角添加</p>
            </div>
          )}

          <div className="space-y-3">
            {parsed.identities.map((identity, idx) => {
              const color = getColor(identity.color)
              return (
                <div key={identity.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setEmojiPickerIdx(emojiPickerIdx === idx ? null : idx)}
                        className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        {identity.emoji}
                      </button>
                      {emojiPickerIdx === idx && (
                        <div className="absolute top-10 left-0 z-10 bg-white rounded-2xl shadow-lg border border-gray-100 p-2 grid grid-cols-6 gap-1 w-48">
                          {EMOJI_OPTIONS.map(e => (
                            <button key={e} onClick={() => { updateIdentity(idx, { emoji: e }); setEmojiPickerIdx(null) }}
                              className="text-lg w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      className="flex-1 text-sm font-semibold text-gray-900 outline-none bg-transparent"
                      value={identity.name} placeholder="身份名称"
                      onChange={e => updateIdentity(idx, { name: e.target.value })}
                    />
                    <button onClick={() => removeIdentity(idx)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                  </div>

                  <div className="flex gap-1.5 mb-3 pl-1">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.key} onClick={() => updateIdentity(idx, { color: c.key })}
                        className={`w-5 h-5 rounded-full ${c.bg} border-2 transition-all ${identity.color === c.key ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                      />
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    {identity.goals.map((goal, gIdx) => (
                      <div key={goal.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${color.bg}`}>
                        <input
                          className={`flex-1 text-xs font-medium outline-none bg-transparent ${color.text}`}
                          value={goal.title} placeholder="目标描述"
                          onChange={e => updateGoal(idx, gIdx, { title: e.target.value })}
                        />
                        <button onClick={() => removeGoal(idx, gIdx)}
                          className={`${color.text} opacity-50 hover:opacity-100 transition-opacity text-base leading-none`}>×</button>
                      </div>
                    ))}
                    <button onClick={() => addGoal(idx)}
                      className={`w-full text-xs py-1.5 rounded-xl border border-dashed ${color.border} ${color.text} opacity-60 hover:opacity-100 transition-opacity`}>
                      + 添加目标
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Fixed slots */}
        {parsed.fixedSlots.length > 0 && (
          <Section title={`固定安排（${parsed.fixedSlots.length} 项）`}>
            {parsed.fixedSlots.map(slot => {
              const identity = parsed.identities.find(i => i.id === slot.identityId)
              return (
                <div key={slot.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-500 min-w-[40px]">{slot.time}</span>
                  <span className="flex-1 text-sm text-gray-900">{slot.title}</span>
                  <span className="text-xs text-gray-400">{slot.duration}min</span>
                  {slot.days.length > 0 && (
                    <span className="text-xs text-gray-400">{slot.days.map(d => `周${DAYS[d]}`).join('/')}</span>
                  )}
                  {identity && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${getColor(identity.color).bg} ${getColor(identity.color).text}`}>
                      {identity.emoji}
                    </span>
                  )}
                </div>
              )
            })}
          </Section>
        )}

        <button onClick={confirm} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-sm mt-2">
          确认，开始规划 →
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 min-w-[56px]">{label}</span>
      {children}
    </div>
  )
}
