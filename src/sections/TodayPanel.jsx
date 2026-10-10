import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, CalendarClock, CalendarPlus } from 'lucide-react'
import ProjectCard, { InlineEdit } from '../components/ProjectCard'
import { todayKey, tomorrowKey, relDay } from '../lib/dates'
import { openInGoogleCalendar } from '../lib/gcal'
import { PANEL, LABEL, HIGHLIGHT } from '../lib/theme'

const PRIORITY = { 'at-risk': 0, blocked: 1, 'on-track': 2, done: 3 }

// Shared wiring so every panel's todo rows behave the same
export const todoHandlers = (ops) => ({
  onToggle: ops.toggleTodo,
  onDelete: ops.deleteItem,
  onRename: (id, title) => ops.updateTodo?.(id, { title }),
  onRetime: (id, date) => ops.updateTodo?.(id, { date }),
})

export const projectHandlers = (ops) => ({
  onCycle: ops.cycleProject,
  onRename: (id, name) => ops.updateProject?.(id, { name }),
  onDeadline: (id, deadline) => ops.updateProject?.(id, { deadline }),
})

const ICON_BTN =
  'grid h-6 w-6 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-black/[0.05] hover:text-zinc-700 focus-visible:opacity-100 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100'

// Tiny popover: Today / Tomorrow / Someday / pick a date
export function RetimeMenu({ date, onPick, open, setOpen }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  const pick = (d) => {
    onPick(d)
    setOpen(false)
  }
  const options = [
    { label: 'Today', value: todayKey() },
    { label: 'Tomorrow', value: tomorrowKey() },
    { label: 'Someday', value: null },
  ]

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Move to another day"
        aria-label="Move to another day"
        className={`${ICON_BTN} ${open ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <CalendarClock size={13} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-40 mt-1.5 w-44 origin-top-right rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-black/40"
          >
            {options.map((o) => {
              const active = (date ?? null) === o.value
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => pick(o.value)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                >
                  {o.label}
                  {active ? <Check size={12} className="text-orange-500" /> : null}
                </button>
              )
            })}
            <div className="my-1 h-px bg-black/5 dark:bg-white/10" />
            <label className="block px-2.5 pb-1 pt-0.5">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">Pick a date</span>
              <input
                type="date"
                defaultValue={date || ''}
                onChange={(e) => e.target.value && pick(e.target.value)}
                className="w-full rounded-md border border-black/10 bg-transparent px-1.5 py-1 font-mono text-[12px] text-zinc-700 outline-none focus:border-orange-400/60 dark:border-white/10 dark:text-zinc-200 dark:[color-scheme:dark]"
              />
            </label>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// Round checkbox row shared by Today and Dump.
export function TodoRow({ todo, projects = [], highlight, onToggle, onDelete, onRename, onRetime, showDay = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const project = todo.projectId ? projects.find((p) => p.id === todo.projectId) : null
  const lit = highlight?.has(todo.id)
  const doneFill = 'border-emerald-400 bg-emerald-400'

  let tag = null
  if (project) {
    tag = <span className="truncate rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-700 dark:border-indigo-300/25 dark:text-indigo-300">{project.name}</span>
  } else if (todo.carriedOver) {
    tag = <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-700 dark:border-amber-300/25 dark:text-amber-300">carried over</span>
  } else if (todo.kind === 'followup') {
    tag = <span className="rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-700 dark:border-sky-300/25 dark:text-sky-300">follow-up</span>
  }

  return (
    <motion.li
      layout
      data-id={todo.id}
      initial={{ opacity: 0, y: 6 }}
      animate={lit ? { opacity: 1, y: 0, scale: [1, 1.02, 1] } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${menuOpen ? 'z-30' : ''} ${lit ? HIGHLIGHT : ''}`}
    >
      <button
        type="button"
        onClick={() => onToggle?.(todo.id)}
        aria-label={todo.done ? 'Mark not done' : 'Mark done'}
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-all active:scale-90 ${
          todo.done ? doneFill : 'border-zinc-400 hover:border-emerald-400 dark:border-zinc-500'
        }`}
      >
        <AnimatePresence>
          {todo.done ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
              <Check size={11} strokeWidth={3} className="text-white dark:text-zinc-950" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>
      <span
        className={`flex min-w-0 flex-1 items-center text-[14px] transition-colors ${
          todo.done ? 'text-zinc-400 line-through decoration-zinc-400/60 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-100'
        }`}
      >
        {todo.emoji ? <span className="mr-1.5 shrink-0">{todo.emoji}</span> : null}
        <InlineEdit value={todo.title} onSave={onRename ? (title) => onRename(todo.id, title) : undefined} className="truncate" inputClassName="text-[14px]" />
      </span>
      {showDay && todo.date ? <span className="shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{relDay(todo.date)}</span> : null}
      {tag ? <span className="max-w-[35%] shrink-0">{tag}</span> : null}
      <div className="flex shrink-0 items-center">
        {todo.date && !todo.done ? (
          <button
            type="button"
            onClick={() => openInGoogleCalendar({ title: `${todo.emoji ? todo.emoji + ' ' : ''}${todo.title}`, date: todo.date })}
            title="Add to Google Calendar"
            aria-label="Add to Google Calendar"
            className={`${ICON_BTN} opacity-0 group-hover:opacity-100`}
          >
            <CalendarPlus size={13} />
          </button>
        ) : null}
        {onRetime && !todo.done ? <RetimeMenu date={todo.date} onPick={(d) => onRetime(todo.id, d)} open={menuOpen} setOpen={setMenuOpen} /> : null}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(todo.id)}
            aria-label="Delete"
            title="Delete"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
    </motion.li>
  )
}

export function EmptyHint({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-center font-mono text-[12px] text-zinc-500 dark:border-white/10 dark:text-zinc-400"
    >
      {children}
    </motion.div>
  )
}

export default function TodayPanel({ state, ops, highlight }) {
  const today = todayKey()
  const todays = state.todos.filter((t) => t.date === today)
  const open = todays.filter((t) => !t.done)
  const done = todays.filter((t) => t.done)
  const projects = state.projects
    .filter((p) => p.status !== 'done')
    .sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9))
    .slice(0, 4)
  const handlers = todoHandlers(ops)
  const pHandlers = projectHandlers(ops)

  return (
    <section className={`${PANEL} p-5`}>
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">On your plate</h2>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
          {done.length} of {todays.length} done
        </span>
      </header>

      {todays.length === 0 ? (
        <EmptyHint>Nothing yet. Just start yapping.</EmptyHint>
      ) : (
        <ul className="-mx-2.5 space-y-0.5">
          <AnimatePresence initial={false}>
            {[...open, ...done].map((t) => (
              <TodoRow key={t.id} todo={t} projects={state.projects} highlight={highlight} {...handlers} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <span className={LABEL}>Projects</span>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{state.projects.filter((p) => p.status !== 'done').length}</span>
      </div>
      {projects.length === 0 ? (
        <EmptyHint>Say “new project … due Friday” to start one.</EmptyHint>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} todos={state.todos} highlight={highlight} {...pHandlers} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
