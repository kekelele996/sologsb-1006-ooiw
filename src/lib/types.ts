export type CueStatus = 'pending' | 'confirmed' | 'followup'
export type TabId = 'live' | 'backstage' | 'terms' | 'offline'

export interface Speaker {
  id: string
  name: string
  title: string
  language: string
  color: string
}

export interface Session {
  id: string
  order: number
  /** 原计划开始时刻 HH:mm，重排后仍保留作对照 */
  time: string
  /** 登记的计划时长（分钟） */
  durationMinutes: number
  title: string
  speakerId: string
  room: string
  status: 'upcoming' | 'live' | 'done'
  /** 午休 / 茶歇等固定休息时段：重排到这里必须停止 */
  isBreak: boolean
  /** 时间锁定的场次：不允许被自动顺延，重排到这里停止 */
  locked: boolean
  /** 现场实际 / 预计开始时刻，null 表示仍按原计划 */
  liveStart: string | null
  /** 现场实际结束时刻；未结束的场次为 null（结束时刻由顺延推算） */
  liveEnd: string | null
}

/** 一次“按实际结束重排”的留痕，重开页面后仍可沿这条记录查看现场预计时间、锁定点与受影响场次 */
export interface ScheduleAdjustment {
  id: string
  createdAt: string
  anchorSessionId: string
  anchorTitle: string
  actualEnd: string
  plannedEnd: string
  /** 相对该场原计划结束的偏差：正为超时，负为提前 */
  deltaMinutes: number
  /** 顺延链条撞到的午休 / 锁定场次 */
  blockerSessionId: string | null
  blockerTitle: string | null
  blockerIsBreak: boolean
  /** 顺延到达锁定点时仍超出的分钟数（<=0 表示没有挤压） */
  overflowMinutes: number
  /** 本次被移动的场次及其当时的现场预计时间 */
  shifted: { id: string; title: string; liveStart: string; liveEnd: string }[]
  /** 锁定点本身及其后无法移动、保持原计划的安排 */
  blocked: { id: string; title: string; plannedStart: string }[]
}

export interface Term {
  id: string
  source: string
  target: string
  note: string
  speakerId: string
  priority: 'normal' | 'high'
}

export interface Announcement {
  id: string
  level: 'info' | 'warning' | 'urgent'
  text: string
  visibleOnStage: boolean
  createdAt: string
}

export interface Cue {
  id: string
  speakerId: string
  text: string
  receivedAt: number
  status: CueStatus
  manual: boolean
  offline: boolean
  delaySeconds: number
  duplicateOf: string | null
  followupText: string
  tags: string[]
}

export interface Reminder {
  id: string
  termId: string
  cueId: string
  target: string
  createdAt: number
  acknowledged: boolean
}

export interface DeskState {
  speakers: Speaker[]
  sessions: Session[]
  terms: Term[]
  announcements: Announcement[]
  cues: Cue[]
  reminders: Reminder[]
  activeCueId: string
  fontScale: number
  online: boolean
  liveSimulation: boolean
  adjustments: ScheduleAdjustment[]
  updatedAt: string
}
