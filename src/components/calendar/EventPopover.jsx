import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Check, Undo2, ArrowRight, Trash2, X, Pencil, CalendarPlus, Download, Repeat } from 'lucide-react'
import { fmtRange, relDay, toMin, fromMin, isTime, isDate } from '../../lib/dates'
import { openInGoogleCalendar, downloadIcs } from '../../lib/gcal'

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

// Fixed-position placement next to an anchor rect: right, else left, else below/above. Clamped to the viewport.
function place(a, w, h) {
  const M = 8
  const G = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left
  let top
  if (a.right + G + w <= vw - M) {
    left = a.right + G
    top = a.top
  } else if (a.left - G - w >= M) {
    left = a.left - G - w
    top = a.top
  } else {
    left = clamp(a.left, M, vw - w - M)
    top = a.bottom + G
    if (top + h > vh - M) top = a.top - G - h
  }
  return { left, top: clamp(top, M, Math.max(M, vh - h - M)) }
}

// Keeps a portal element glued to its anchor through page/grid scrolls and resizes.
function usePlacement(anchorRef, popRef, deps) {
  const [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    const update = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      if (!a) return
      const w = popRef.current?.offsetWidth || 256
      const h = popRef.current?.offsetHeight || 220
      setPos(place(a, w, h))
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return pos
}

const gcalItem = (e) => ({
  title: `${e.emoji ? e.emoji + ' ' : ''}${e.title}`,
  date: e.date,
  start: e.start,
  end: e.end,
  details: [e.person && `With ${e.person}`, e.category && `Category: ${e.category}`, 'Added from Yap It Done 🎙️'].filter(Boolean).join('\n'),
})

export function EventPopover({ e, anchorRef, popRef, ops, onClose }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({ title: e.title, date: e.date, start: e.start || '', end: e.end || '' }))
  const pos = usePlacement(anchorRef, popRef, [editing, e.date, e.start, e.end])

  const startEdit = () => {
    setForm({ title: e.title, date: e.date, start: e.start || '', end: e.end || '' })
    setEditing(true)
  }

  const save = () => {
    const title = form.title.trim() || e.title
    const date = isDate(form.date) ? form.date : e.date
    let start = isTime(form.start) ? form.start : null
    let end = start && isTime(form.end) ? form.end : null
    if (start && (!end || toMin(end) <= toMin(start))) end = fromMin(toMin(start) + 60)
    ops.updateEvent?.(e.id, { title, date, start, end })
    setEditing(false)
  }

  const onKeyDown = (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault()
      ev.stopPropagation()
      setEditing(false)
    }
  }

  const input =
    'w-full rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1.5 text-[13px] text-zinc-900 outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-50'

  return createPortal(
    <motion.div
      ref={popRef}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.16 }}
      style={{ position: 'fixed', left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className="z-[60] w-64 rounded-2xl border border-black/10 bg-white/95 p-3.5 font-sans text-zinc-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-50"
    >
      {editing ? (
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            save()
          }}
          onKeyDown={onKeyDown}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Edit event</p>
            <button type="button" onClick={() => setEditing(false)} aria-label="Cancel edit" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <X size={14} />
            </button>
          </div>
          <input autoFocus className={input} value={form.title} onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))} placeholder="Title" aria-label="Title" />
          <input type="date" className={input} value={form.date} onChange={(ev) => setForm((f) => ({ ...f, date: ev.target.value }))} aria-label="Date" />
          <div className="flex items-center gap-1.5">
            <input type="time" className={input} value={form.start} onChange={(ev) => setForm((f) => ({ ...f, start: ev.target.value }))} aria-label="Start" />
            <span className="text-zinc-400">–</span>
            <input type="time" className={input} value={form.end} onChange={(ev) => setForm((f) => ({ ...f, end: ev.target.value }))} aria-label="End" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="font-mono text-[10px] text-zinc-400">↵ save · esc cancel</p>
            <div className="flex gap-1.5">
              <PopBtn type="button" onClick={() => setEditing(false)}>
                Cancel
              </PopBtn>
              <PopBtn type="submit" primary>
                <Check size={12} /> Save
              </PopBtn>
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <button onClick={startEdit} className="flex-1 text-left text-[14px] font-semibold leading-snug hover:text-orange-600 dark:hover:text-orange-300" title="Click to edit">
              {e.emoji ? `${e.emoji} ` : ''}
              <span className={e.done ? 'line-through opacity-60' : ''}>{e.title}</span>
            </button>
            <button onClick={startEdit} aria-label="Edit" className="mt-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <Pencil size={13} />
            </button>
            <button onClick={onClose} aria-label="Close" className="mt-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <X size={14} />
            </button>
          </div>
          <p className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            {cap(relDay(e.date))}
            {e.start ? ` · ${fmtRange(e.start, e.end)}` : ' · all day'}
            {e.category ? ` · ${e.category}` : ''}
          </p>
          {e.seriesId && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-700 dark:text-violet-300">
              <Repeat size={10} /> Repeats {e.repeatLabel || 'weekly'}
            </span>
          )}
          {e.person && (
            <div className="mt-2.5 flex items-center gap-2 text-[13px]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-[10px] font-semibold text-white">{e.person[0].toUpperCase()}</span>
              {e.person}
            </div>
          )}
          <div className="mt-3 flex gap-1.5">
            <PopBtn
              primary
              onClick={() => {
                ops.toggleEvent(e.id)
                onClose()
              }}
            >
              {e.done ? <Undo2 size={12} /> : <Check size={12} />}
              {e.done ? 'Undo' : 'Done'}
            </PopBtn>
            <PopBtn
              onClick={() => {
                ops.moveEventTomorrow(e.id)
                onClose()
              }}
            >
              <ArrowRight size={12} />
              Tomorrow
            </PopBtn>
            <PopBtn
              danger
              aria-label="Delete"
              onClick={() => {
                ops.deleteItem(e.id)
                onClose()
              }}
            >
              <Trash2 size={12} />
            </PopBtn>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <PopBtn onClick={() => openInGoogleCalendar(gcalItem(e))}>
              <CalendarPlus size={12} />
              Google Calendar
            </PopBtn>
            <PopBtn onClick={() => downloadIcs(gcalItem(e))} aria-label="Download .ics">
              <Download size={12} />
              .ics
            </PopBtn>
          </div>
          {e.seriesId && (
            <button
              onClick={() => {
                ops.deleteSeries?.(e.seriesId)
                onClose()
              }}
              className="mt-2 w-full rounded-lg px-2 py-1 text-left font-mono text-[11px] text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300"
            >
              Delete whole series
            </button>
          )}
        </>
      )}
    </motion.div>,
    document.body,
  )
}

export function HoverCard({ e, anchorRef }) {
  const ref = useRef(null)
  const pos = usePlacement(anchorRef, ref, [e.id])
  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{ position: 'fixed', left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
      className="pointer-events-none z-[55] w-56 rounded-xl border border-black/10 bg-white/95 px-3 py-2.5 font-sans text-zinc-900 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-50"
    >
      <p className={`text-[13px] font-semibold leading-snug ${e.done ? 'line-through opacity-60' : ''}`}>
        {e.emoji ? `${e.emoji} ` : ''}
        {e.title}
      </p>
      <p className="mt-1 font-mono text-[10.5px] text-zinc-500 dark:text-zinc-400">
        {cap(relDay(e.date))} · {e.start ? fmtRange(e.start, e.end) : 'all day'}
        {e.category ? ` · ${e.category}` : ''}
      </p>
      {(e.person || e.seriesId) && (
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-zinc-600 dark:text-zinc-300">
          {e.person && <span>With {e.person}</span>}
          {e.seriesId && (
            <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300">
              <Repeat size={10} /> {e.repeatLabel || 'Repeats'}
            </span>
          )}
        </p>
      )}
      <p className="mt-1.5 font-mono text-[10px] text-zinc-400">click to open · drag to move</p>
    </motion.div>,
    document.body,
  )
}

export function PopBtn({ primary, danger, children, type = 'button', ...props }) {
  const tone = primary
    ? 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
    : danger
      ? 'border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300'
      : 'border border-black/10 text-zinc-700 hover:bg-black/5 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/10'
  return (
    <button type={type} {...props} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${tone}`}>
      {children}
    </button>
  )
}
