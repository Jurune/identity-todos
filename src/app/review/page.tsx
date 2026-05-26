'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getPlan, savePlan, today, formatDate } from '@/lib/store'
import { DailyPlan, UserProfile } from '@/lib/types'
import { getColor } from '@/lib/colors'
import Link from 'next/link'

export default function ReviewPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const date = today()

  useEffect(() => {
    const p = getProfile()
    const pl = getPlan(date)
    if (!p || !pl) { router.push('/'); return }
    setProfile(p)
    setPlan(pl)
    if (pl.review) {
      setMessage(pl.review.userMessage)
      setAiResponse(pl.review.aiResponse)
    }
  }, [date, router])

  async function submit() {
    if (!message.trim() || !profile || !plan) return
    setLoading(true)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, plan, userMessage: message, date }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setAiResponse(data.aiResponse)
      const updated: DailyPlan = {
        ...plan,
        review: {
          userMessage: message,
          aiResponse: data.aiResponse,
          createdAt: new Date().toISOString(),
        },
      }
      savePlan(updated)
      setPlan(updated)
    } catch (e) {
      alert('出错了：' + e)
    } finally {
      setLoading(false)
    }
  }

  if (!profile || !plan) return null

  const doneCount = plan.items.filter(i => i.done).length
  const totalCount = plan.items.length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-gray-50">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-blue-500 text-sm">← 返回</Link>
          <span className="text-xs text-gray-400">{doneCount}/{totalCount} 已完成</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">今日复盘</h1>
        <p className="text-gray-500 text-sm">{formatDate(date)}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-48">
        {/* Today's items */}
        <div className="space-y-1.5 mb-6">
          {plan.items.map(item => {
            const identity = item.identityId ? profile.identities.find(i => i.id === item.identityId) : null
            const color = identity ? getColor(identity.color) : null
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  item.done
                    ? 'opacity-50 ' + (color ? color.block : 'bg-white border-gray-100')
                    : color ? color.block : 'bg-white border-gray-100'
                }`}
              >
                <span className={`text-xs font-bold min-w-[44px] ${color ? color.text : 'text-gray-400'}`}>
                  {item.time}
                </span>
                <span className={`flex-1 text-sm font-medium ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {item.title}
                </span>
                {item.done
                  ? <span className="text-green-500 text-base">✓</span>
                  : <span className="text-gray-200 text-base">○</span>
                }
              </div>
            )
          })}
        </div>

        {/* AI response */}
        {aiResponse && (
          <div className="bg-blue-50 rounded-2xl px-4 py-4 mb-4">
            <p className="text-xs text-blue-400 font-semibold mb-2">🐾 AI 复盘</p>
            <p className="text-blue-900 text-sm leading-relaxed">{aiResponse}</p>
          </div>
        )}
      </div>

      {/* Fixed bottom input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 max-w-md mx-auto">
        {!aiResponse ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              看着上面的计划，跟我说说今天怎么样
            </p>
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none resize-none leading-relaxed placeholder-gray-300 focus:bg-gray-100 transition-colors"
                placeholder="今天PRD评审顺利过了，跑步没做，因为临时加了个会…"
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button
                onClick={submit}
                disabled={loading || !message.trim()}
                className="shrink-0 w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                {loading
                  ? <span className="text-white text-xs">…</span>
                  : <span className="text-white text-base">↑</span>
                }
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => { setAiResponse(''); setMessage('') }}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm"
            >
              重新复盘
            </button>
            <Link
              href="/"
              className="flex-1 py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium text-center"
            >
              完成
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
