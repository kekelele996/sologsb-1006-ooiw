import type { Session } from './types'

/** HH:mm -> 当日分钟数 */
export function toMinutes(hhmm: string): number {
  const [hour, minute] = hhmm.split(':').map(Number)
  return (hour || 0) * 60 + (minute || 0)
}

/** 当日分钟数 -> HH:mm（支持超过 24:00，顺延到次日时仍可显示） */
export function toHHMM(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

export function addMinutes(hhmm: string, minutes: number): string {
  return toHHMM(toMinutes(hhmm) + minutes)
}

export function diffMinutes(from: string, to: string): number {
  return toMinutes(to) - toMinutes(from)
}

export function isHardAnchor(session: Session): boolean {
  return session.isBreak || session.locked
}

export function plannedStart(session: Session): string {
  return session.time
}

export function plannedEnd(session: Session): string {
  return addMinutes(session.time, session.durationMinutes)
}

/** 现场预计/实际开始：只认显式登记或重排写入的值，否则沿用原计划（保证“恢复原计划”可对照） */
export function liveStart(session: Session, _sessions: Session[] = []): string {
  return session.liveStart ?? session.time
}

/** 现场预计/实际结束：午休与锁定场次固定在原计划结束，其余按计划时长推算 */
export function liveEnd(session: Session, sessions: Session[]): string {
  if (session.liveEnd) return session.liveEnd
  if (isHardAnchor(session)) return plannedEnd(session)
  return addMinutes(liveStart(session, sessions), session.durationMinutes)
}

export function sortedSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || a.order - b.order)
}

export interface ShiftResult {
  /** 被移动场次的预计时间（不含锚点本身） */
  shifted: { id: string; liveStart: string; liveEnd: string }[]
  /** 撞到的硬锚点（午休/锁定），无则 null */
  blockerId: string | null
  /** 顺延到达锁定点时仍超出的分钟数；<= 0 表示不挤压 */
  overflowMinutes: number
  /** 硬锚点及其后保持原计划的场次 */
  blockedIds: string[]
}

/**
 * 以某场实际结束时刻为锚点，重排其后还没开始的场次。
 * 遇午休或锁定场次即停：链条停在该条，它及其后的场次保持原计划。
 */
export function reschedule(
  sessions: Session[],
  anchorId: string,
  actualEnd: string
): ShiftResult {
  const ordered = sortedSessions(sessions)
  const anchorIndex = ordered.findIndex(item => item.id === anchorId)
  const updates = new Map<string, { liveStart: string | null; liveEnd: string | null }>()
  const shifted: ShiftResult['shifted'] = []
  const blockedIds: string[] = []
  let blockerId: string | null = null
  let overflowMinutes = 0

  if (anchorIndex < 0) return { shifted, blockerId, overflowMinutes, blockedIds }

  let cursor = toMinutes(actualEnd)

  for (let i = anchorIndex + 1; i < ordered.length; i++) {
    const session = ordered[i]

    // 午休或锁定时间：链条停在这一条，它挡住后面所有安排
    if (isHardAnchor(session)) {
      blockerId = session.id
      const plannedBegin = toMinutes(session.time)
      overflowMinutes = cursor - plannedBegin
      for (let j = i; j < ordered.length; j++) {
        const blocked = ordered[j]
        blockedIds.push(blocked.id)
        // 不覆盖已登记的现场开始（如锁定场已开始），其余清回原计划对照
        if (!blocked.liveStart && !blocked.liveEnd) {
          updates.set(blocked.id, { liveStart: null, liveEnd: null })
        }
      }
      break
    }

    // 已结束且登记过真实结束的场次：尊重现场事实，把它当作新的固定起点
    if (session.status === 'done' && session.liveEnd) {
      cursor = toMinutes(session.liveEnd)
      continue
    }

    const start = cursor
    const end = start + session.durationMinutes
    cursor = end
    updates.set(session.id, { liveStart: toHHMM(start), liveEnd: toHHMM(end) })
    shifted.push({ id: session.id, liveStart: toHHMM(start), liveEnd: toHHMM(end) })
  }

  for (const [id, patch] of updates) {
    const target = sessions.find(item => item.id === id)
    if (target) Object.assign(target, patch)
  }

  return { shifted, blockerId, overflowMinutes, blockedIds }
}
