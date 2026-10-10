import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react'
import { EventPopover, HoverCard } from './calendar/EventPopover'
import {
  format,
  addDays,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
} from 'date-fns'
import { dayKey, todayKey, fromKey, shiftKey, toMin, fromMin, fmtTime, fmtRange, nowMin } from '../lib/dates'
import { catStyle, PANEL, LABEL, HIGHLIGHT } from '../lib/theme'

const START_HOUR = 7
const END_HOUR = 23
const HOUR_PX = 52
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX
const GLANCE_START = 8 * 60
const GLANCE_END = 22 * 60
const GUTTER = '52px'

const VIEWS = [
  ['day', 'Day'],
  ['3day', '3 days'],
  ['week', 'Week'],
  ['month', 'Month'],
]

const SNAP = 15
const snap = (m) => Math.round(m / SNAP) * SNAP
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
const minToPx = (min) => ((min - START_HOUR * 60) / 60) * HOUR_PX

// Start/end minutes for an event (default 60 min, never zero-length)
function span(e) {
  const s = toMin(e.start)
  let en = toMin(e.end)
  if (en == null || en <= s) en = s + 60
  return { s, en }
}

// Greedy column assignment inside each cluster of overlapping events
function layoutDay(events) {
  const items = events
    .filter((e) => toMin(e.start) != null)
    .map((e) => ({ e, ...span(e) }))
    .sort((a, b) => a.s - b.s || b.en - a.en)

  const out = []
  let cluster = []
  let cols = []
  let clusterEnd = -1
  const flush = () => {
    const n = cols.length
    cluster.forEach((it) => out.push({ ...it, cols: n }))
    cluster = []
    cols = []
    clusterEnd = -1
  }
  for (const it of items) {
    if (cluster.length && it.s >= clusterEnd) flush()
    let col = cols.findIndex((end) => end <= it.s)
    if (col === -1) {
      col = cols.length
      cols.push(it.en)
    } else cols[col] = it.en
    it.col = col
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.en)
  }
  if (cluster.length) flush()
  return out
}

function visibleDays(anchor, view) {
  const a = fromKey(anchor)
  if (view === 'day') return [anchor]
  if (view === '3day') return [0, 1, 2].map((i) => dayKey(addDays(a, i)))
  const start = startOfWeek(a, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)))
}

export default function CalendarPanel({ state, ops, highlight = new Set(), anchor, setAnchor, view, setView }) {
  const today = todayKey()
  const [now, setNow] = useState(nowMin)
  const [openId, setOpenId] = useState(null)
  const scrollerRef = useRef(null)
  const openRef = useRef(null)
  const popRef = useRef(null)
  const colRefs = useRef([])

  useEffect(() => {
    const t = setInterval(() => setNow(nowMin()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Index everything by date once per state change
  const byDate = useMemo(() => {
    const map = {}
    const bucket = (k) => (map[k] ||= { events: [], allDay: [], deadlines: [], followups: [] })
    for (const e of state.events) {
      if (!e.date) continue
      if (toMin(e.start) == null) bucket(e.date).allDay.push(e)
      else bucket(e.date).events.push(e)
    }
    for (const p of state.projects) if (p.deadline && p.status !== 'done') bucket(p.deadline).deadlines.push(p)
    for (const t of state.todos) if (t.kind === 'followup' && t.date) bucket(t.date).followups.push(t)
    return map
  }, [state.events, state.projects, state.todos])

  const days = view === 'month' ? [] : visibleDays(anchor, view)

  // Scroll to ~1h before now whenever the time grid mounts
  useEffect(() => {
    if (view === 'month' || !scrollerRef.current) return
    scrollerRef.current.scrollTop = Math.max(0, minToPx(nowMin() - 60))
  }, [view])

  // Voice changed something: bring the highlighted block into view inside the grid only
  useEffect(() => {
    if (view === 'month' || !highlight.size) return
    const id = setTimeout(() => {
      const scroller = scrollerRef.current
      const el = scroller?.querySelector('[data-hl="true"]')
      if (!scroller || !el) return
      const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      scroller.scrollBy({ top: delta - scroller.clientHeight / 2 + el.offsetHeight / 2, behavior: 'smooth' })
    }, 120)
    return () => clearTimeout(id)
  }, [anchor, highlight, view])

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!openId) return
    const onDown = (e) => {
      if (openRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      setOpenId(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setOpenId(null)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openId])

  const step = (dir) => {
    if (view === 'month') return setAnchor(dayKey(addMonths(fromKey(anchor), dir)))
    setAnchor(shiftKey(anchor, dir * (view === 'day' ? 1 : view === '3day' ? 3 : 7)))
  }

  const anchorDate = fromKey(anchor)
  const showYear = anchorDate.getFullYear() !== new Date().getFullYear()
  const cols = `${GUTTER} repeat(${days.length}, minmax(0, 1fr))`

  return (
    <section className={`${PANEL} p-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
            {format(anchorDate, 'MMMM')}
            {showYear && <span className="ml-2 text-zinc-400">{format(anchorDate, 'yyyy')}</span>}
          </h2>
          <div className="flex items-center gap-1">
            <IconBtn label="Previous" onClick={() => step(-1)}>
              <ChevronLeft size={15} />
            </IconBtn>
            <button
              onClick={() => setAnchor(today)}
              className="rounded-full border border-black/5 px-2.5 py-1 font-mono text-[11px] text-zinc-600 transition hover:bg-black/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Today
            </button>
            <IconBtn label="Next" onClick={() => step(1)}>
              <ChevronRight size={15} />
            </IconBtn>
          </div>
        </div>

        <div className="flex rounded-full border border-black/5 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.04]">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`relative rounded-full px-3 py-1 text-[12px] transition ${
                view === key ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {view === key && (
                <motion.span
                  layoutId="cal-view-pill"
                  className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-white/15"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <GlanceBar events={byDate[today]?.events || []} now={now} />

      {view === 'month' ? (
        <MonthGrid
          anchorDate={anchorDate}
          byDate={byDate}
          today={today}
          highlight={highlight}
          onPick={(key) => {
            setAnchor(key)
            setView('day')
          }}
        />
      ) : (
        <div className="mt-4">
          {/* Column headers */}
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map((key) => {
              const d = fromKey(key)
              const isToday = key === today
              return (
                <div key={key} className="px-2 pb-2">
                  <p className={`${LABEL} !tracking-[0.08em] normal-case`}>{format(d, 'EEE')}</p>
                  <div className="mt-1 h-9">
                    {isToday ? (
                      <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(249,115,22,0.8)]">
                        {format(d, 'd')}
                      </span>
                    ) : (
                      <span className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">{format(d, 'd')}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day row */}
          <div className="grid border-b border-black/5 pb-2 dark:border-white/10" style={{ gridTemplateColumns: cols }}>
            <div className="pt-1 font-mono text-[10px] text-zinc-400">all day</div>
            {days.map((key) => {
              const b = byDate[key]
              return (
                <div key={key} className="min-h-[28px] space-y-1 px-1">
                  <AnimatePresence initial={false}>
                    {b?.deadlines.map((p) => (
                      <AllDayChip key={p.id} id={p.id} title={`${p.name} due`} hl={highlight.has(p.id)} className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200">
                        ⚑ {p.name} due
                      </AllDayChip>
                    ))}
                    {b?.followups.map((t) => (
                      <AllDayChip
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        hl={highlight.has(t.id)}
                        className={`border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 ${t.done ? 'line-through opacity-50' : ''}`}
                      >
                        ↪ {t.title}
                      </AllDayChip>
                    ))}
                    {b?.allDay.map((e) => (
                      <AllDayChip key={e.id} id={e.id} title={e.title} hl={highlight.has(e.id)} className={`${catStyle(e.category).block} ${e.done ? 'line-through opacity-50' : ''}`}>
                        {e.emoji ? `${e.emoji} ` : ''}
                        {e.title}
                      </AllDayChip>
                    ))}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div
            ref={scrollerRef}
            data-lenis-prevent
            className="relative max-h-[560px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="relative grid" style={{ gridTemplateColumns: cols, height: GRID_H }}>
              {/* Hour lines + labels */}
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div key={i} className="pointer-events-none absolute right-0 border-t border-black/[0.05] dark:border-white/[0.06]" style={{ top: i * HOUR_PX, left: GUTTER }} />
              ))}
              <div className="relative">
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) =>
                  i === 0 ? null : (
                    <span key={i} className="absolute left-0 -translate-y-1/2 font-mono text-[10px] text-zinc-400 dark:text-zinc-500" style={{ top: i * HOUR_PX }}>
                      {fmtTime(`${START_HOUR + i}:00`)}
                    </span>
                  ),
                )}
              </div>

              {days.map((key, ci) => {
                const isToday = key === today
                const laid = layoutDay(byDate[key]?.events || [])
                return (
                  <div key={key} ref={(el) => (colRefs.current[ci] = el)} className={`relative border-l border-black/[0.05] dark:border-white/[0.06] ${isToday ? 'bg-orange-500/[0.035] dark:bg-white/[0.025]' : ''}`}>
                    {isToday && now >= START_HOUR * 60 && now <= END_HOUR * 60 && (
                      <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: minToPx(now) }}>
                        <div className="h-px bg-orange-500" />
                        <div className="absolute -left-1 -top-[3.5px] h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.9)]" />
                      </div>
                    )}
                    <AnimatePresence initial={false}>
                      {laid.map((it) => (
                        <EventBlock
                          key={it.e.id}
                          it={it}
                          hl={highlight.has(it.e.id)}
                          open={openId === it.e.id}
                          openRef={openRef}
                          popRef={popRef}
                          onToggle={() => setOpenId((id) => (id === it.e.id ? null : it.e.id))}
                          onClose={() => setOpenId(null)}
                          ops={ops}
                          dayIndex={ci}
                          days={days}
                          colRefs={colRefs}
                          scrollerRef={scrollerRef}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function IconBtn({ label, onClick, children }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {children}
    </button>
  )
}

function GlanceBar({ events, now }) {
  const range = GLANCE_END - GLANCE_START
  const pct = (m) => Math.min(100, Math.max(0, ((m - GLANCE_START) / range) * 100))
  return (
    <div className="mt-4">
      <div className="relative h-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
        {events.map((e) => {
          const { s, en } = span(e)
          if (en <= GLANCE_START || s >= GLANCE_END) return null
          return (
            <motion.div
              key={e.id}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              className={`absolute top-0 h-full origin-left rounded-full ${catStyle(e.category).dot} ${e.done ? 'opacity-35' : ''}`}
              style={{ left: `${pct(s)}%`, width: `${Math.max(1.2, pct(en) - pct(s))}%` }}
            />
          )
        })}
        {now >= GLANCE_START && now <= GLANCE_END && (
          <div className="absolute -top-[3px] h-3 w-[2px] rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]" style={{ left: `${pct(now)}%` }} />
        )}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>8 AM</span>
        <span>today at a glance</span>
        <span>10 PM</span>
      </div>
    </div>
  )
}

function AllDayChip({ id, title, hl, className, children }) {
  return (
    <motion.div
      layout
      data-id={id}
      title={title}
      data-hl={hl ? 'true' : undefined}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, scale: hl ? [1, 1.04, 1] : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: hl ? 0.8 : 0.2 }}
      className={`truncate rounded-lg border px-2 py-1 text-[11px] font-medium ${className} ${hl ? HIGHLIGHT : ''}`}
    >
      {children}
    </motion.div>
  )
}

function EventBlock({ it, hl, open, openRef, popRef, onToggle, onClose, ops, dayIndex, days, colRefs, scrollerRef }) {
  const { e, s, en, col, cols } = it
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const hoverTimer = useRef(null)
  const [drag, setDrag] = useState(null)
  const [hover, setHover] = useState(false)

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  const top = Math.max(0, minToPx(s))
  const bottom = Math.min(GRID_H, minToPx(en))
  const baseHeight = Math.max(28, bottom - top)
  const height = drag?.mode === 'resize' ? Math.max(24, minToPx(drag.en) - top) : baseHeight
  const short = height < 40
  const narrow = cols >= 2
  const style = catStyle(e.category)
  const dur = Math.min(en - s, (END_HOUR - START_HOUR) * 60)

  // Pointer drag: < 4px is a click (opens popover); beyond that it moves (or resizes from the bottom handle)
  const startDrag = (ev, mode) => {
    if (ev.button !== 0) return
    ev.stopPropagation()
    clearTimeout(hoverTimer.current)
    setHover(false)
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
    dragRef.current = { mode, x0: ev.clientX, y0: ev.clientY, scroll0: scrollerRef.current?.scrollTop || 0, moved: false, preview: null }
  }

  const moveDrag = (ev) => {
    const d = dragRef.current
    if (!d) return
    if (!d.moved && Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 4) return
    if (!d.moved) {
      d.moved = true
      if (open) onClose()
    }
    const scroller = scrollerRef.current
    if (scroller) {
      const r = scroller.getBoundingClientRect()
      if (ev.clientY < r.top + 36) scroller.scrollTop -= 12
      else if (ev.clientY > r.bottom - 36) scroller.scrollTop += 12
    }
    const dy = ev.clientY - d.y0 + ((scroller?.scrollTop || 0) - d.scroll0)
    const delta = snap((dy / HOUR_PX) * 60)
    let preview
    if (d.mode === 'move') {
      const ns = clamp(snap(s) + delta, START_HOUR * 60, END_HOUR * 60 - dur)
      const rects = days.map((_, i) => colRefs.current[i]?.getBoundingClientRect())
      let ci = dayIndex
      if (rects.every(Boolean)) {
        ci = rects.findIndex((r) => ev.clientX >= r.left && ev.clientX < r.right)
        if (ci === -1) ci = ev.clientX < rects[0].left ? 0 : rects.length - 1
      }
      const tx = rects[ci] && rects[dayIndex] ? rects[ci].left - rects[dayIndex].left : 0
      preview = { mode: 'move', date: days[ci], s: ns, en: ns + dur, tx, ty: minToPx(ns) - top }
    } else {
      preview = { mode: 'resize', date: e.date, s, en: clamp(snap(en) + delta, s + SNAP, END_HOUR * 60) }
    }
    d.preview = preview
    setDrag(preview)
  }

  const endDrag = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (!d.moved) {
      if (d.mode === 'move') onToggle()
      return
    }
    const p = d.preview
    setDrag(null)
    if (p && (p.date !== e.date || p.s !== s || p.en !== en)) {
      ops.updateEvent?.(e.id, { date: p.date, start: fromMin(p.s), end: fromMin(p.en) })
    }
  }

  const cancelDrag = () => {
    dragRef.current = null
    setDrag(null)
  }

  const onEnter = () => {
    if (dragRef.current) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHover(true), 250)
  }
  const onLeave = () => {
    clearTimeout(hoverTimer.current)
    setHover(false)
  }

  const dragging = Boolean(drag)
  const timeLabel = drag
    ? `${fmtRange(fromMin(drag.s), fromMin(drag.en))}${drag.date !== e.date ? ` · ${format(fromKey(drag.date), 'EEE d')}` : ''}`
    : fmtRange(e.start, e.end)
  const fullTitle = `${e.emoji ? e.emoji + ' ' : ''}${e.title}`

  return (
    <motion.div
      ref={(el) => {
        wrapRef.current = el
        if (open) openRef.current = el
      }}
      data-hl={hl ? 'true' : undefined}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: hl ? [1, 1.03, 1] : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: hl ? 0.9 : 0.22, ease: 'easeOut' }}
      className={`absolute ${dragging ? 'z-50' : open ? 'z-30' : 'z-10'}`}
      style={{ top, height: baseHeight, left: `calc(${(col / cols) * 100}% + 3px)`, width: `calc(${100 / cols}% - 6px)` }}
    >
      <div
        role="button"
        tabIndex={0}
        data-id={e.id}
        title={dragging ? undefined : `${fullTitle} · ${fmtRange(e.start, e.end)}`}
        onPointerDown={(ev) => startDrag(ev, 'move')}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault()
            onToggle()
          }
        }}
        style={{ height, transform: drag?.mode === 'move' ? `translate(${drag.tx}px, ${drag.ty}px)` : undefined }}
        className={`group relative w-full touch-none select-none overflow-hidden rounded-xl border text-left outline-none backdrop-blur-sm transition-[filter,box-shadow] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-orange-400/70 ${
          narrow ? 'px-1.5 py-0.5' : 'px-2 py-1'
        } ${style.block} ${e.done ? 'opacity-50' : ''} ${hl ? HIGHLIGHT : ''} ${open ? 'ring-2 ring-orange-400/70' : ''} ${
          dragging ? 'cursor-grabbing shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] ring-2 ring-orange-400/60' : 'cursor-grab'
        }`}
      >
        {short ? (
          <div className="flex items-baseline gap-1.5">
            <p className={`min-w-0 flex-1 truncate font-medium leading-tight ${narrow ? 'text-[11px]' : 'text-[12px]'} ${e.done ? 'line-through' : ''}`}>
              {e.seriesId && <Repeat size={9} className="-mt-px mr-1 inline opacity-70" />}
              {fullTitle}
            </p>
            {(dragging || !narrow) && <span className="shrink-0 font-mono text-[9.5px] opacity-70">{timeLabel}</span>}
          </div>
        ) : (
          <>
            <p className={`line-clamp-2 break-words font-medium leading-tight ${narrow ? 'text-[11px]' : 'text-[12px]'} ${e.done ? 'line-through' : ''}`}>
              {e.seriesId && <Repeat size={9} className="-mt-px mr-1 inline opacity-70" />}
              {fullTitle}
            </p>
            <p className={`mt-0.5 truncate font-mono opacity-70 ${narrow ? 'text-[9.5px]' : 'text-[10px]'}`}>{timeLabel}</p>
          </>
        )}
        {/* Resize handle */}
        <div
          onPointerDown={(ev) => startDrag(ev, 'resize')}
          className={`absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center pb-0.5 transition ${dragging && drag.mode === 'resize' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <span className="h-[3px] w-6 rounded-full bg-current opacity-40" />
        </div>
      </div>

      <AnimatePresence>
        {open && <EventPopover key="pop" e={e} anchorRef={wrapRef} popRef={popRef} ops={ops} onClose={onClose} />}
        {hover && !open && !dragging && <HoverCard key="hover" e={e} anchorRef={wrapRef} />}
      </AnimatePresence>
    </motion.div>
  )
}

function MonthGrid({ anchorDate, byDate, today, highlight, onPick }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 }),
  })
  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1.5 pb-1.5">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <p key={d} className="px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = dayKey(d)
          const b = byDate[key]
          const chips = [
            ...(b?.events || [])
              .slice()
              .sort((x, y) => toMin(x.start) - toMin(y.start))
              .map((e) => ({ id: e.id, label: `${e.emoji ? e.emoji + ' ' : ''}${e.title}`, cls: catStyle(e.category).block, done: e.done })),
            ...(b?.allDay || []).map((e) => ({ id: e.id, label: `${e.emoji ? e.emoji + ' ' : ''}${e.title}`, cls: catStyle(e.category).block, done: e.done })),
            ...(b?.deadlines || []).map((p) => ({ id: p.id, label: `⚑ ${p.name}`, cls: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200' })),
            ...(b?.followups || []).map((t) => ({ id: t.id, label: `↪ ${t.title}`, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200', done: t.done })),
          ]
          const inMonth = isSameMonth(d, anchorDate)
          const isToday = key === today
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className={`min-h-[92px] rounded-xl border border-black/[0.05] p-1.5 text-left transition hover:border-orange-400/40 hover:bg-orange-500/[0.04] dark:border-white/[0.06] ${
                inMonth ? '' : 'opacity-40'
              } ${isToday ? 'bg-orange-500/[0.05] dark:bg-white/[0.03]' : ''}`}
            >
              {isToday ? (
                <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-[11px] font-semibold text-white">{format(d, 'd')}</span>
              ) : (
                <span className="inline-block px-1 text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{format(d, 'd')}</span>
              )}
              <div className="mt-1 space-y-0.5">
                {chips.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    data-id={c.id}
                    title={c.label}
                    className={`truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${c.cls} ${c.done ? 'line-through opacity-50' : ''} ${
                      highlight.has(c.id) ? HIGHLIGHT : ''
                    }`}
                  >
                    {c.label}
                  </div>
                ))}
                {chips.length > 3 && <p className="px-1 font-mono text-[10px] text-zinc-400">+{chips.length - 3} more</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
