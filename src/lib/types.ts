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
  /** 原计划开始时间 HH:mm，重排后保留作对照 */
  time: string
  /** 计划时长（分钟） */
  plannedMinutes: number
  title: string
  speakerId: string
  room: string
  /** 午休、茶歇等固定间歇，无发言人 */
  isBreak: boolean
  /** 锁定时间点：级联重排到这里必须停住 */
  locked: boolean
  status: 'upcoming' | 'live' | 'done'
  /** 现场登记的实际结束时刻 HH:mm */
  actualEnd: string | null
  /** 现场预计开始时刻 HH:mm，null 表示沿用原计划 */
  liveTime: string | null
  /** 最近一次把本场纳入顺延/提前的调整批次 */
  adjustmentId: string | null
  /** 被哪个调整批次的锁定点挡在后面（保留原计划时间） */
  blockedById: string | null
}

export interface BlockedSession {
  sessionId: string
  /** 现场链条走到锁定点时相对原计划的累计偏差（分钟） */
  minutes: number
}

export interface ScheduleAdjustment {
  id: string
  /** 管理员登记实际结束、触发重排的场次 */
  sourceSessionId: string
  actualEnd: string
  createdAt: string
  /** 挡住链条的锁定场次，null 表示一路重排到底 */
  blockerSessionId: string | null
  /** 已按现场时刻重排的场次 id */
  affected: string[]
  /** 被锁定点挡住、仍停在原计划的场次 */
  blocked: BlockedSession[]
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
  adjustments: ScheduleAdjustment[]
  terms: Term[]
  announcements: Announcement[]
  cues: Cue[]
  reminders: Reminder[]
  activeCueId: string
  fontScale: number
  online: boolean
  liveSimulation: boolean
  updatedAt: string
}
