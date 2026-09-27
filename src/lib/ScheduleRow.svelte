<script lang="ts">
  import {
    collisionMinutes, desk, liveDelta, liveEnd, liveStart, plannedEnd, recordSessionEnd, signDelta,
    sortedSessions, updateSession
  } from './store'
  import type { ScheduleAdjustment, Session } from './types'
  import { createEventDispatcher } from 'svelte'

  export let session: Session
  export let selectedAdjustmentId: string | null = null

  const dispatch = createEventDispatcher<{ selectAdjustment: string; registered: { id: string | null } }>()

  let actualDraft = ''
  $: if (!actualDraft) actualDraft = session.actualEnd || liveEnd(session)

  $: ordered = sortedSessions($desk)
  $: index = ordered.findIndex(item => item.id === session.id)
  $: adjustment = $desk.adjustments.find(item => item.id === session.adjustmentId)
  $: blocker = adjustment ? $desk.sessions.find(item => item.id === adjustment.blockerSessionId) : undefined
  $: blockedAdjustment = $desk.adjustments.find(item => item.id === session.blockedById)
  $: blockedMinutes = blockedAdjustment?.blocked.find(item => item.sessionId === session.id)?.minutes ?? 0
  $: overlap = adjustment && blocker ? collisionMinutes(session, blocker) : 0
  $: delta = liveDelta(session)
  $: endDelta = session.actualEnd ? (() => { const d = (() => { const [h, m] = session.actualEnd!.split(':'); return Number(h) * 60 + Number(m) })() - (() => { const [h, m] = plannedEnd(session).split(':'); return Number(h) * 60 + Number(m) })(); return d })() : 0

  function adjustmentNumber(item: ScheduleAdjustment): number {
    return $desk.adjustments.findIndex(row => row.id === item.id) + 1
  }
  function registerEnd() {
    if (!actualDraft) return
    const adjustmentId = recordSessionEnd(session.id, actualDraft)
    dispatch('registered', { id: adjustmentId })
  }
  function useNow() {
    actualDraft = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  function useProjectedEnd() { actualDraft = liveEnd(session) }
</script>

<article
  class="rounded-xl border p-3 transition {overlap > 0 ? 'border-red-400 bg-red-50' : session.blockedById ? 'border-amber-400 bg-amber-50/50' : ''} {selectedAdjustmentId && (session.adjustmentId === selectedAdjustmentId || session.blockedById === selectedAdjustmentId) ? 'ring-2 ring-teal-500' : ''}"
>
  <div class="grid gap-3 lg:grid-cols-[56px_minmax(0,1.4fr)_minmax(0,1.2fr)_230px]">
    <div class="flex flex-col items-center gap-1">
      <span class="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-xs font-black text-white">{index + 1}</span>
      {#if session.locked}
        <span class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black text-indigo-800" title="锁定时间点：重排到这里停住">🔒 锁定</span>
      {/if}
      {#if session.isBreak}<span class="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-700">间歇</span>{/if}
    </div>

    <div class="min-w-0">
      <input
        class="focus-ring w-full rounded-lg border px-2 py-2 font-bold"
        value={session.title}
        on:change={event => updateSession(session.id, { title: (event.target as HTMLInputElement).value })}
      />
      <div class="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
        <input
          class="focus-ring w-28 rounded border px-1.5 py-1 text-[11px] text-slate-600"
          value={session.room}
          on:change={event => updateSession(session.id, { room: (event.target as HTMLInputElement).value })}
        />
        {#if !session.isBreak}
          <select
            class="focus-ring rounded border px-1.5 py-1 text-[11px]"
            value={session.speakerId}
            on:change={event => updateSession(session.id, { speakerId: (event.target as HTMLSelectElement).value })}
          >
            <option value="">未指定发言人</option>
            {#each $desk.speakers as speaker}<option value={speaker.id}>{speaker.name}</option>{/each}
          </select>
        {/if}
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-xs">
      <label class="flex items-center gap-1 rounded-lg border bg-white px-2 py-1">
        <span class="text-[10px] font-black text-slate-400">原计划</span>
        <input
          class="focus-ring w-[68px] rounded border-0 bg-transparent px-0 py-0 text-sm font-bold"
          type="time"
          value={session.time}
          on:change={event => updateSession(session.id, { time: (event.target as HTMLInputElement).value })}
        />
      </label>
      <label class="flex items-center gap-1 rounded-lg border bg-white px-2 py-1">
        <input
          class="focus-ring w-12 rounded border-0 bg-transparent px-0 py-0 text-sm font-bold"
          type="number" min="1" max="600"
          value={session.plannedMinutes}
          on:change={event => updateSession(session.id, { plannedMinutes: Math.max(1, Number((event.target as HTMLInputElement).value) || 30) })}
        />
        <span class="text-[10px] font-black text-slate-400">分钟</span>
      </label>
      <div class="rounded-lg border px-2 py-1 text-[11px] {session.liveTime ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-slate-50 text-slate-500'}">
        现场 <strong class="text-sm">{liveStart(session)}</strong>
        {#if session.liveTime && delta !== 0}
          <span class="ml-1 font-black {delta > 0 ? 'text-red-700' : 'text-emerald-700'}">{signDelta(delta)}′</span>
        {/if}
      </div>
      <select
        class="focus-ring rounded-lg border px-2 py-1.5 text-xs"
        value={session.status}
        on:change={event => updateSession(session.id, { status: (event.target as HTMLSelectElement).value as Session['status'] })}
      >
        <option value="upcoming">未开始</option>
        <option value="live">进行中</option>
        <option value="done">已结束</option>
      </select>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white p-2">
      <div class="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
        <span>实际结束登记</span>
        {#if session.actualEnd}
          <span class="{endDelta > 0 ? 'text-red-600' : endDelta < 0 ? 'text-emerald-600' : 'text-slate-500'}">
            {endDelta === 0 ? '准时' : `${signDelta(endDelta)}′`}
          </span>
        {/if}
      </div>
      <div class="flex gap-1">
        <input class="focus-ring w-[76px] rounded border px-1 py-1 text-sm font-bold" type="time" bind:value={actualDraft} />
        <button class="focus-ring rounded bg-slate-900 px-2 py-1 text-[11px] font-black text-white hover:bg-slate-700" on:click={registerEnd}>登记并重排</button>
      </div>
      <div class="mt-1 flex gap-2 text-[10px] text-slate-500">
        <button class="underline" on:click={useNow}>取此刻</button>
        <button class="underline" on:click={useProjectedEnd}>取预计结束 {liveEnd(session)}</button>
      </div>
    </div>
  </div>

  <div class="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold">
    {#if session.isBreak}
      <label class="flex items-center gap-1 rounded bg-white px-2 py-1 text-slate-600">
        <input
          type="checkbox"
          checked={session.locked}
          on:change={event => updateSession(session.id, { locked: (event.target as HTMLInputElement).checked })}
        />锁定为固定时间点（重排停在这一条）
      </label>
    {:else}
      <label class="flex items-center gap-1 rounded bg-white px-2 py-1 text-slate-600">
        <input
          type="checkbox"
          checked={session.isBreak}
          on:change={event => updateSession(session.id, { isBreak: (event.target as HTMLInputElement).checked, speakerId: '' })}
        />标记为午休 / 茶歇
      </label>
      <label class="flex items-center gap-1 rounded bg-white px-2 py-1 text-slate-600">
        <input
          type="checkbox"
          checked={session.locked}
          on:change={event => updateSession(session.id, { locked: (event.target as HTMLInputElement).checked })}
        />锁定时间点
      </label>
    {/if}

    {#if adjustment}
      <button
        class="rounded-full bg-teal-600 px-2 py-1 text-white {selectedAdjustmentId === adjustment.id ? 'ring-2 ring-offset-1' : ''}"
        on:click={() => dispatch('selectAdjustment', adjustment.id)}
      >
        ↻ 调整 #{adjustmentNumber(adjustment)} 重排
      </button>
    {/if}
    {#if blockedAdjustment}
      <button
        class="rounded-full bg-amber-500 px-2 py-1 text-white"
        on:click={() => dispatch('selectAdjustment', blockedAdjustment.id)}
      >
        ⛔ 被调整 #{adjustmentNumber(blockedAdjustment)} 的锁定点挡住（保留原计划 {session.time}，现场链 {signDelta(blockedMinutes)}′）
      </button>
    {/if}
    {#if overlap > 0}
      <span class="rounded-full bg-red-600 px-2 py-1 text-white">⚠ 链条压过「{blocker?.title}」{overlap} 分钟</span>
    {/if}
  </div>
</article>
