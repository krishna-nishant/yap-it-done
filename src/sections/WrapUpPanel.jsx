import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, CornerDownRight, PartyPopper } from 'lucide-react'
import { EmptyHint } from './TodayPanel'
import { InlineEdit } from '../components/ProjectCard'
import { todayKey, tomorrowKey, fmtTime } from '../lib/dates'
import { PANEL, HIGHLIGHT } from '../lib/theme'

const COLUMN_TONE = {
  emerald: { dot: 'bg-emerald-400', head: 'text-emerald-700 dark:text-emerald-300', ring: 'border-emerald-500/20 bg-emerald-500/[0.05] dark:border-emerald-400/15 dark:bg-emerald-400/[0.04]' },
  amber: { dot: 'bg-amber-400', head: 'text-amber-700 dark:text-amber-300', ring: 'border-amber-500/20 bg-amber-500/[0.05] dark:border-amber-400/15 dark:bg-amber-400/[0.04]' },
  sky: { dot: 'bg-sky-400', head: 'text-sky-700 dark:text-sky-300', ring: 'border-sky-500/20 bg-sky-500/[0.05] dark:border-sky-400/15 dark:bg-sky-400/[0.04]' },
}

function Column({ title, tone, items, empty, renderLead }) {
  const t = COLUMN_TONE[tone]
  return (
    <div className={`flex min-h-[160px] flex-col rounded-2xl border p-3 ${t.ring}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] ${t.head}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
          {title}
        </span>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-2 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{empty}</div>
      ) : (
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.key}
                data-id={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={item.lit ? { opacity: 1, y: 0, scale: [1, 1.03, 1] } : { opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={`flex items-center gap-2 rounded-lg bg-white/60 px-2.5 py-2 text-[13px] dark:bg-white/[0.04] ${item.lit ? HIGHLIGHT : ''}`}
              >
                {renderLead(item)}
                <span className={`flex min-w-0 flex-1 items-center ${item.done ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                  {item.emoji ? <span className="mr-1 shrink-0">{item.emoji}</span> : null}
                  <InlineEdit value={item.title} onSave={item.rename} className="truncate" inputClassName="text-[13px]" />
                </span>
                {item.meta ? <span className="shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{item.meta}</span> : null}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

export default function WrapUpPanel({ state, ops, highlight }) {
  const today = todayKey()
  const tomorrow = tomorrowKey()
  const [closed, setClosed] = useState(null)
  const rename = (id) => (title) => ops.updateTodo?.(id, { title })

  const doneItems = [
    ...state.todos.filter((t) => t.done && t.date === today).map((t) => ({ key: t.id, id: t.id, title: t.title, emoji: t.emoji, done: true, lit: highlight?.has(t.id), rename: rename(t.id) })),
    ...state.events
      .filter((e) => e.done && e.date === today)
      .map((e) => ({ key: e.id, id: e.id, title: e.title, emoji: e.emoji, done: true, meta: e.start ? fmtTime(e.start) : null, lit: highlight?.has(e.id) })),
  ]
  const carryItems = state.todos
    .filter((t) => !t.done && t.date === today)
    .map((t) => ({ key: t.id, id: t.id, title: t.title, emoji: t.emoji, lit: highlight?.has(t.id), meta: t.carriedOver ? 'again' : null, rename: rename(t.id) }))
  const followItems = state.todos
    .filter((t) => t.kind === 'followup' && t.date === tomorrow && !t.done)
    .map((t) => ({ key: t.id, id: t.id, title: t.title, emoji: t.emoji, lit: highlight?.has(t.id), meta: t.person || null, rename: rename(t.id) }))

  const allDone = carryItems.length === 0 && doneItems.length > 0
  const nothing = doneItems.length + carryItems.length + followItems.length === 0
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const close = () => {
    const n = ops.closeDay()
    setClosed(typeof n === 'number' ? n : carryItems.length)
    setTimeout(() => setClosed(null), 3500)
  }

  return (
    <section className={`${PANEL} p-5`}>
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">Wrap up</h2>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{weekday}</span>
      </header>

      {nothing ? (
        <EmptyHint>Nothing to wrap up yet. Plan your day first, then come back tonight.</EmptyHint>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <Column
            title="Done"
            tone="emerald"
            items={doneItems}
            empty="Nothing finished yet"
            renderLead={() => (
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-400">
                <Check size={10} strokeWidth={3} className="text-white dark:text-zinc-950" />
              </span>
            )}
          />
          <Column
            title="Carrying over"
            tone="amber"
            items={carryItems}
            empty="All clear 🎉"
            renderLead={(item) => (
              <button
                type="button"
                onClick={() => ops.toggleTodo(item.id)}
                aria-label="Mark done"
                className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-amber-400 transition-all hover:bg-amber-400/30 active:scale-90"
              />
            )}
          />
          <Column
            title="Follow up tomorrow"
            tone="sky"
            items={followItems}
            empty="No follow-ups"
            renderLead={() => <CornerDownRight size={13} className="shrink-0 text-sky-500 dark:text-sky-300" />}
          />
        </div>
      )}

      <AnimatePresence>
        {allDone ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[13px] text-emerald-800 dark:text-emerald-200"
          >
            <PartyPopper size={15} /> Everything on today’s plate is done. Go touch grass.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-5 flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
          Say: “finished X, didn’t get to Y, follow up with Z”
        </p>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {closed != null ? (
              <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="font-mono text-[11px] text-amber-600 dark:text-amber-300">
                Moved {closed} to tomorrow
              </motion.span>
            ) : null}
          </AnimatePresence>
          <motion.button
            type="button"
            whileHover={carryItems.length ? { scale: 1.03 } : undefined}
            whileTap={carryItems.length ? { scale: 0.97 } : undefined}
            disabled={carryItems.length === 0}
            onClick={close}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-black/10 transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900"
          >
            Close the day <ArrowRight size={14} />
          </motion.button>
        </div>
      </div>
    </section>
  )
}
