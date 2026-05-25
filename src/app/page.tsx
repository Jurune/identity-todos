'use client'

import { useEffect, useState } from 'react'
import { getProfile, getPlan, savePlan, today, formatDate } from '@/lib/store'
import { UserProfile, DailyPlan, ScheduleItem } from '@/lib/types'
import { getColor } from '@/lib/colors'
import Link from 'next/link'

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [noteTarget, setNoteTarget] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const date = today()

  useEffect(() => {
    const p = getProfile()
    setProfile(p)
    if (p) {
      const existing = getPlan(date)
      setPlan(existing)
    }
  }, [date])

  async function generatePlan() {
    if (!profile) return
    setLoading(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, date }),
      })
      const newPlan: DailyPlan = await res.json()
      savePlan(newPlan)
      setPlan(newPlan)
    } catch (e) {
      alert('生成失败：' + e)
    } finally {
      setLoading(false)
    }
  }

  function toggleDone(itemId: string) {
    if (!plan) return
    const updated = {
      ...plan,
      items: plan.items.map(item =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    }
    savePlan(updated)
    setPlan(updated)
  }

  function saveNote(itemId: string) {
    if (!plan) return
    const updated = {
      ...plan,
      items: plan.items.map(item =>
        item.id === itemId ? { ...item, note: noteText } : item
      ),
    }
    savePlan(updated)
    setPlan(updated)
    setNoteTarget(null)
    setNoteText('')
  }

  const doneCount = plan?.items.filter(i => i.done).length ?? 0
  const totalCount = plan?.items.length ?? 0

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🐾</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">还没认识你</h1>
          <p className="text-gray-500 text-sm mb-6">先跟我说说你是谁，我来帮你规划每一天</p>
          <Link href="/setup" className="block w-full bg-gray-900 text-white py-3.5 rounded-2xl font-medium text-sm">
            开始设置
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto pb-24">
        {/* Header */}
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-gray-900">🐾 早上好，{profile.name}</h1>
            <Link href="/setup" className="text-gray-400 text-sm hover:text-gray-600">设置</Link>
          </div>
          <p className="text-gray-500 text-sm">{formatDate(date)}</p>

          {plan && totalCount > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>已完成 {doneCount}/{totalCount}</span>
                {doneCount === totalCount && <span className="text-green-600 font-medium">今天全搞定 🎉</span>}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* AI opening message */}
        {plan?.aiMessage && (
          <div className="mx-5 mb-4 px-4 py-3 bg-blue-50 rounded-2xl">
            <p className="text-blue-800 text-sm font-medium">💬 {plan.aiMessage}</p>
          </div>
        )}

        {/* No plan yet */}
        {!plan && (
          <div className="mx-5 mt-12 flex flex-col items-center text-center">
            <div className="text-5xl mb-4">🗓️</div>
            <p className="text-gray-500 text-sm mb-2">今天的日程还没生成</p>
            <p className="text-gray-400 text-xs mb-8">点下面，我来帮你安排今天</p>
            <button
              onClick={generatePlan}
              disabled={loading}
              className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-medium text-sm disabled:opacity-40 transition-opacity"
            >
              {loading ? '规划中…' : '✨ AI 帮我安排今天'}
            </button>
          </div>
        )}

        {/* Schedule list */}
        {plan && plan.items.length > 0 && (
          <div className="px-5 space-y-2">
            {plan.items.map(item => (
              <ScheduleBlock
                key={item.id}
                item={item}
                profile={profile}
                onToggle={() => toggleDone(item.id)}
                onNote={() => {
                  setNoteTarget(item.id)
                  setNoteText(item.note || '')
                }}
              />
            ))}

            <button
              onClick={generatePlan}
              disabled={loading}
              className="w-full mt-3 py-3.5 rounded-2xl border border-gray-200 text-gray-400 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              {loading ? '重新规划中…' : '↺ 重新规划今天'}
            </button>
          </div>
        )}
      </div>

      {/* Note modal */}
      {noteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50" onClick={() => setNoteTarget(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-3">添加备注</h3>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none outline-none focus:border-gray-400 transition-colors"
              rows={3}
              placeholder="记录一下完成情况、感受…"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setNoteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm"
              >
                取消
              </button>
              <button
                onClick={() => saveNote(noteTarget)}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleBlock({
  item,
  profile,
  onToggle,
  onNote,
}: {
  item: ScheduleItem
  profile: UserProfile
  onToggle: () => void
  onNote: () => void
}) {
  const identity = item.identityId ? profile.identities.find(i => i.id === item.identityId) : null
  const color = identity ? getColor(identity.color) : null

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      item.done ? 'opacity-40' : ''
    } ${color ? color.block : 'bg-white border-gray-100'}`}>
      <div className="flex items-start gap-3">
        {/* Time */}
        <div className="pt-0.5 min-w-[44px]">
          <span className={`text-xs font-bold ${color ? color.text : 'text-gray-400'}`}>{item.time}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-400">{item.duration}分钟</span>
            {identity && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color?.bg} ${color?.text}`}>
                {identity.emoji} {identity.name}
              </span>
            )}
            {item.reason && (
              <span className="text-xs text-gray-400 italic">{item.reason}</span>
            )}
          </div>
          {item.note && (
            <p className="text-xs text-gray-500 mt-2 bg-white/70 rounded-lg px-2.5 py-1.5 leading-relaxed">
              {item.note}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <button
            onClick={onNote}
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors text-sm rounded-lg hover:bg-white/50"
            title="添加备注"
          >
            ✏️
          </button>
          <button
            onClick={onToggle}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              item.done
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {item.done && <span className="text-xs font-bold">✓</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
