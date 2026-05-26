'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfile } from '@/lib/store'
import { UserProfile, Identity, FixedSlot } from '@/lib/types'
import { getColor, COLOR_OPTIONS } from '@/lib/colors'

type ParsedProfile = Omit<UserProfile, 'identities' | 'fixedSlots'> & {
  identities: Identity[]
  fixedSlots: FixedSlot[]
  energyNotes?: string
  suggestions?: string
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'describe' | 'review'>('describe')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedProfile | null>(null)
  const [error, setError] = useState('')

  async function parseDescription() {
    if (!description.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parse-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setParsed(data)
      setStep('review')
    } catch (e) {
      setError('解析失败，请重试：' + e)
    } finally {
      setLoading(false)
    }
  }

  function confirm() {
    if (!parsed) return
    const profile: UserProfile = {
      name: parsed.name,
      wakeTime: parsed.wakeTime,
      sleepTime: parsed.sleepTime,
      energyPeak: parsed.energyPeak,
      identities: parsed.identities,
      fixedSlots: parsed.fixedSlots,
    }
    saveProfile(profile)
    router.push('/')
  }

  if (step === 'describe') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-md mx-auto w-full px-5 pt-14 pb-8 flex flex-col flex-1">
          <div className="mb-8">
            <div className="text-4xl mb-3">🐾</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">跟我说说你是谁</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              用自己的话描述一下你的生活——你有哪些身份、目标、什么时候起床、有哪些固定安排…AI 会帮你整理好。
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-1 flex-1 flex flex-col mb-4">
            <textarea
              className="flex-1 w-full p-4 text-sm text-gray-900 placeholder-gray-300 outline-none resize-none rounded-xl leading-relaxed"
              placeholder={`比如：

我叫小林，早上7点起床，晚上11点睡。早上精力最好，适合做需要思考的事，下午会有点困。

工作上我是产品设计师，在做 A 和 B 两个项目，目标是下个月把 A 项目上线。

生活上我一个人住，想养成每天跑步的习惯，还想学做饭。

每周一三五上午10点有例会（1小时），每周五要交周报。

父母在外地，我是独生子女，每个月要给妈妈打一次电话，提醒她吃药。`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ minHeight: '280px' }}
            />
          </div>

          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

          <button
            onClick={parseDescription}
            disabled={loading || !description.trim()}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? 'AI 解析中…' : '✨ AI 帮我整理'}
          </button>
        </div>
      </div>
    )
  }

  if (!parsed) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-5 pt-10 pb-24">
        <button onClick={() => setStep('describe')} className="text-blue-500 text-sm mb-6">← 重新描述</button>

        <h2 className="text-xl font-bold text-gray-900 mb-1">AI 帮你整理出来了</h2>
        <p className="text-gray-500 text-sm mb-6">确认一下，有不对的可以直接改</p>

        {parsed.suggestions && (
          <div className="bg-blue-50 rounded-2xl px-4 py-3 mb-5">
            <p className="text-blue-800 text-sm font-medium">💬 {parsed.suggestions}</p>
          </div>
        )}

        {/* Basic info */}
        <Section title="基本信息">
          <Field label="名字">
            <input
              className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.name}
              onChange={e => setParsed({ ...parsed, name: e.target.value })}
            />
          </Field>
          <Field label="起床">
            <input
              type="time"
              className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.wakeTime}
              onChange={e => setParsed({ ...parsed, wakeTime: e.target.value })}
            />
          </Field>
          <Field label="睡觉">
            <input
              type="time"
              className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.sleepTime}
              onChange={e => setParsed({ ...parsed, sleepTime: e.target.value })}
            />
          </Field>
          <Field label="精力峰值">
            <select
              className="text-sm font-medium text-gray-900 outline-none bg-transparent"
              value={parsed.energyPeak}
              onChange={e => setParsed({ ...parsed, energyPeak: e.target.value as UserProfile['energyPeak'] })}
            >
              <option value="morning">早上</option>
              <option value="afternoon">下午</option>
              <option value="evening">晚上</option>
            </select>
          </Field>
          {parsed.energyNotes && (
            <p className="text-xs text-gray-400 mt-1 px-1">{parsed.energyNotes}</p>
          )}
        </Section>

        {/* Identities */}
        <Section title={`身份（${parsed.identities.length} 个）`}>
          {parsed.identities.map((identity, idx) => {
            const color = getColor(identity.color)
            return (
              <div key={identity.id} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{identity.emoji}</span>
                  <input
                    className="text-sm font-semibold text-gray-900 outline-none bg-transparent flex-1"
                    value={identity.name}
                    onChange={e => {
                      const updated = [...parsed.identities]
                      updated[idx] = { ...identity, name: e.target.value }
                      setParsed({ ...parsed, identities: updated })
                    }}
                  />
                  {/* Color picker */}
                  <div className="flex gap-1">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.key}
                        onClick={() => {
                          const updated = [...parsed.identities]
                          updated[idx] = { ...identity, color: c.key }
                          setParsed({ ...parsed, identities: updated })
                        }}
                        className={`w-4 h-4 rounded-full ${c.bg} border-2 ${identity.color === c.key ? 'border-gray-600' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1 pl-7">
                  {identity.goals.map((goal, gIdx) => (
                    <div key={goal.id} className={`text-xs px-2 py-1.5 rounded-lg ${color.bg} ${color.text}`}>
                      <input
                        className="outline-none bg-transparent w-full font-medium"
                        value={goal.title}
                        onChange={e => {
                          const updatedIdentities = [...parsed.identities]
                          const updatedGoals = [...identity.goals]
                          updatedGoals[gIdx] = { ...goal, title: e.target.value }
                          updatedIdentities[idx] = { ...identity, goals: updatedGoals }
                          setParsed({ ...parsed, identities: updatedIdentities })
                        }}
                      />
                      {goal.frequency && <span className="opacity-60"> · {goal.frequency}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </Section>

        {/* Fixed slots */}
        {parsed.fixedSlots.length > 0 && (
          <Section title={`固定安排（${parsed.fixedSlots.length} 项）`}>
            {parsed.fixedSlots.map((slot, idx) => {
              const identity = parsed.identities.find(i => i.id === slot.identityId)
              return (
                <div key={slot.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-500 min-w-[40px]">{slot.time}</span>
                  <span className="flex-1 text-sm text-gray-900">{slot.title}</span>
                  <span className="text-xs text-gray-400">{slot.duration}min</span>
                  {slot.days.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {slot.days.map(d => `周${DAYS[d]}`).join('/')}
                    </span>
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

        <button
          onClick={confirm}
          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-sm mt-2"
        >
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
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
        {children}
      </div>
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
