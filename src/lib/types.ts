export interface Identity {
  id: string
  name: string
  emoji: string
  color: string // tailwind color key: 'green' | 'blue' | 'orange' | 'pink' | 'purple'
  goals: Goal[]
}

export interface Goal {
  id: string
  title: string
  frequency?: string // '每天' | '每周' | '一次性'
  notes?: string
}

export interface FixedSlot {
  id: string
  title: string
  time: string // 'HH:MM'
  duration: number // minutes
  identityId: string
  days: number[] // 0=Sun 1=Mon ... 6=Sat, empty = every day
}

export interface UserProfile {
  name: string
  wakeTime: string // 'HH:MM'
  sleepTime: string // 'HH:MM'
  energyPeak: 'morning' | 'afternoon' | 'evening'
  identities: Identity[]
  fixedSlots: FixedSlot[]
}

export interface ScheduleItem {
  id: string
  time: string // 'HH:MM'
  duration: number // minutes
  title: string
  identityId?: string
  reason?: string // why AI scheduled this
  done: boolean
  note?: string
  isFixed: boolean
}

export interface DailyPlan {
  date: string // 'YYYY-MM-DD'
  items: ScheduleItem[]
  aiMessage?: string // opening message from AI
  generatedAt: string
  review?: DailyReview
}

export interface DailyReview {
  userMessage: string
  aiResponse: string
  createdAt: string
}
