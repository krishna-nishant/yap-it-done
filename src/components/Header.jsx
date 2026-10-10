import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, ChevronDown, Sun, Moon, Clock, Bell, BellOff } from 'lucide-react'
import SplitText from './SplitText'
import MagneticButton from './MagneticButton'
import { todayKey, toMin, fmtTime, nowMin } from '../lib/dates'

function Chip({ dot, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[13px] text-zinc-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
      {dot && <span className={`size-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  )
}

export function dayStats(state) {
  const today = todayKey()
  const events = state.events.filter((e) => e.date === today && !e.done)
  const todos = state.todos.filter((t) => t.date === today && !t.done)
  const risky = state.projects.filter((p) => p.status === 'at-risk' || p.status === 'blocked')
  const timed = events.filter((e) => e.start)
  const lastEnd = timed.reduce((m, e) => Math.max(m, toMin(e.end || e.start) ?? 0), 0)
  const free = !timed.length ? 'Free all day' : lastEnd <= nowMin() ? 'Free now' : `Free after ${fmtTime(`${String(Math.floor(lastEnd / 60)).padStart(2, '0')}:${String(lastEnd % 60).padStart(2, '0')}`)}`
  return { events, todos, risky, free }
}

const BRIEFS = [
  { mode: 'now', label: 'Rest of today', hint: 'What’s still pending', icon: Clock },
  { mode: 'morning', label: 'Morning brief', hint: 'Plan for the whole day', icon: Sun },
  { mode: 'evening', label: 'Evening wrap', hint: 'Done, carry over, tomorrow', icon: Moon },
]

function BriefButton({ onBrief }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex">
      <MagneticButton
        onClick={() => onBrief('now')}
        className="inline-flex items-center gap-2 rounded-l-xl bg-zinc-900 py-2 pl-4 pr-3 text-sm font-medium text-white shadow-lg shadow-black/20 dark:bg-white dark:text-zinc-900"
      >
        <Volume2 className="size-4" /> Brief me
      </MagneticButton>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose brief"
        className="rounded-r-xl border-l border-white/15 bg-zinc-900 px-2 text-white dark:border-zinc-900/15 dark:bg-white dark:text-zinc-900"
      >
        <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
          >
            {BRIEFS.map(({ mode, label, hint, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOpen(false)
                  onBrief(mode)
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-300">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
                  <span className="block text-xs text-zinc-500">{hint}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Header({ state, onDemo, onBrief, reminders, onToggleReminders }) {
  const stats = useMemo(() => dayStats(state), [state])
  const dateLine = `${format(new Date(), 'EEEE, d MMMM')}.`
  const tagline = new Date().getHours() >= 19 ? 'Wrap it up.' : 'Start yapping.'

  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-serif text-[44px] leading-[1.02] tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          <SplitText text={dateLine} className="block" />
          <SplitText text={tagline} delay={0.35} className="block pr-2 italic text-orange-500 drop-shadow-[0_0_24px_rgba(251,146,60,0.35)] dark:text-orange-400" />
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip dot="bg-indigo-400">
            <b className="font-semibold text-zinc-900 dark:text-white">{stats.events.length}</b> events
          </Chip>
          <Chip dot="bg-amber-400">
            <b className="font-semibold text-zinc-900 dark:text-white">{stats.todos.length}</b> to-dos
          </Chip>
          <Chip dot="bg-rose-400">
            <b className="font-semibold text-zinc-900 dark:text-white">{stats.risky.length}</b> project{stats.risky.length === 1 ? '' : 's'} at risk
          </Chip>
          <Chip>
            <span className="font-medium text-zinc-900 dark:text-white">{stats.free}</span>
          </Chip>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleReminders}
          title={reminders ? 'Reminders on: ping 10 min before events' : 'Turn on reminders'}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm backdrop-blur transition ${reminders ? 'border-orange-400/50 bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'border-black/10 bg-white/50 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/10'}`}
        >
          {reminders ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          <span className="hidden sm:inline">{reminders ? 'Reminders on' : 'Reminders'}</span>
        </button>
        <BriefButton onBrief={onBrief} />
      </div>
    </header>
  )
}
