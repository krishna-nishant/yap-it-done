import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { TodoRow, EmptyHint, todoHandlers } from './TodayPanel'
import { InlineEdit } from '../components/ProjectCard'
import { todayKey } from '../lib/dates'
import { PANEL, LABEL, HIGHLIGHT, catStyle } from '../lib/theme'

function IdeaRow({ idea, projects, highlight, onDelete, onRename }) {
  const lit = highlight?.has(idea.id)
  const project = idea.projectId ? projects.find((p) => p.id === idea.projectId) : null
  const cat = catStyle(idea.category)
  return (
    <motion.li
      layout
      data-id={idea.id}
      initial={{ opacity: 0, y: 6 }}
      animate={lit ? { opacity: 1, y: 0, scale: [1, 1.02, 1] } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${lit ? HIGHLIGHT : ''}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
      <span className="flex min-w-0 flex-1 items-center text-[14px] text-zinc-800 dark:text-zinc-100">
        {idea.emoji ? <span className="mr-1.5 shrink-0">{idea.emoji}</span> : null}
        <InlineEdit value={idea.title} onSave={onRename ? (title) => onRename(idea.id, title) : undefined} className="truncate" inputClassName="text-[14px]" />
      </span>
      {project ? (
        <span className="max-w-[35%] shrink-0 truncate rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-700 dark:border-indigo-300/25 dark:text-indigo-300">
          {project.name}
        </span>
      ) : idea.category ? (
        <span className={`shrink-0 font-mono text-[10px] lowercase ${cat.text}`}>{idea.category}</span>
      ) : null}
      <button
        type="button"
        onClick={() => onDelete(idea.id)}
        aria-label="Delete idea"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
      >
        <X size={13} />
      </button>
    </motion.li>
  )
}

function Section({ title, count, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="mb-2 flex items-center justify-between">
        <span className={LABEL}>{title}</span>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{count}</span>
      </div>
      {children}
    </div>
  )
}

export default function DumpPanel({ state, ops, highlight }) {
  const today = todayKey()
  const ideas = [...state.ideas].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const someday = state.todos.filter((t) => t.date == null && !t.projectId)
  const upcoming = state.todos.filter((t) => !t.done && t.date && t.date > today).sort((a, b) => a.date.localeCompare(b.date))
  const total = ideas.length + someday.filter((t) => !t.done).length + upcoming.length
  const handlers = todoHandlers(ops)
  const renameIdea = (id, title) => ops.updateIdea?.(id, { title })

  return (
    <section className={`${PANEL} p-5`}>
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">Brain dump</h2>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{total} saved</span>
      </header>

      {total === 0 && someday.length === 0 ? (
        <EmptyHint>Random thoughts land here. Try: “random idea, a fest Instagram countdown”.</EmptyHint>
      ) : (
        <>
          <Section title="Ideas" count={ideas.length}>
            {ideas.length === 0 ? (
              <EmptyHint>No ideas yet. Say “random idea …”.</EmptyHint>
            ) : (
              <ul className="-mx-2.5 space-y-0.5">
                <AnimatePresence initial={false}>
                  {ideas.map((i) => (
                    <IdeaRow key={i.id} idea={i} projects={state.projects} highlight={highlight} onDelete={ops.deleteItem} onRename={renameIdea} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Section>

          {someday.length > 0 ? (
            <Section title="Someday" count={someday.filter((t) => !t.done).length}>
              <ul className="-mx-2.5 space-y-0.5">
                <AnimatePresence initial={false}>
                  {[...someday].sort((a, b) => Number(a.done) - Number(b.done)).map((t) => (
                    <TodoRow key={t.id} todo={t} projects={state.projects} highlight={highlight} {...handlers} />
                  ))}
                </AnimatePresence>
              </ul>
            </Section>
          ) : null}

          {upcoming.length > 0 ? (
            <Section title="Upcoming" count={upcoming.length}>
              <ul className="-mx-2.5 space-y-0.5">
                <AnimatePresence initial={false}>
                  {upcoming.map((t) => (
                    <TodoRow key={t.id} todo={t} projects={state.projects} highlight={highlight} {...handlers} showDay />
                  ))}
                </AnimatePresence>
              </ul>
            </Section>
          ) : null}
        </>
      )}
    </section>
  )
}
