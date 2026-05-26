import { UserProfile, DailyPlan } from './types'

const PROFILE_KEY = 'identity_todos_profile'
const PLANS_KEY = 'identity_todos_plans'

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function getPlan(date: string): DailyPlan | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(`${PLANS_KEY}_${date}`)
  return raw ? JSON.parse(raw) : null
}

export function savePlan(plan: DailyPlan): void {
  localStorage.setItem(`${PLANS_KEY}_${plan.date}`, JSON.stringify(plan))
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const months = d.getMonth() + 1
  const date = d.getDate()
  return `${months}月${date}日 · ${days[d.getDay()]}`
}
