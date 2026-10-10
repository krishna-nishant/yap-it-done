import { AnimatePresence, motion } from 'framer-motion'
import ProjectCard from '../components/ProjectCard'
import { EmptyHint, projectHandlers } from './TodayPanel'
import { PANEL, LABEL } from '../lib/theme'

const PRIORITY = { 'at-risk': 0, blocked: 1, 'on-track': 2, done: 3 }

export default function ProjectsPanel({ state, ops, highlight }) {
  const active = state.projects
    .filter((p) => p.status !== 'done')
    .sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9) || (a.deadline || '9999').localeCompare(b.deadline || '9999'))
  const done = state.projects.filter((p) => p.status === 'done')
  const handlers = projectHandlers(ops)

  return (
    <section className={`${PANEL} p-5`}>
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">Projects</h2>
        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
          {active.length} active{done.length ? ` · ${done.length} done` : ''}
        </span>
      </header>

      {state.projects.length === 0 ? (
        <EmptyHint>Try: “New project Hackathon pitch due Friday”</EmptyHint>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {active.map((p) => (
              <ProjectCard key={p.id} project={p} todos={state.todos} highlight={highlight} {...handlers} onDelete={ops.deleteItem} expanded />
            ))}
          </AnimatePresence>
          {done.length > 0 ? (
            <motion.div layout className="pt-3">
              <div className={`${LABEL} mb-2`}>Shipped</div>
              <div className="space-y-2.5 opacity-60">
                <AnimatePresence initial={false}>
                  {done.map((p) => (
                    <ProjectCard key={p.id} project={p} todos={state.todos} highlight={highlight} {...handlers} onDelete={ops.deleteItem} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </div>
      )}
    </section>
  )
}
