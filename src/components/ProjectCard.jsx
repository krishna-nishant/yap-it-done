import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { daysLeft, relDay } from '../lib/dates'
import { STATUS, HIGHLIGHT } from '../lib/theme'

// Click-to-rename text. Enter/blur saves, Esc cancels, empty = no change.
export function InlineEdit({ value, onSave, className = '', inputClassName = '', children, title = 'Click to rename' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const inputRef = useRef(null)
  const cancelled = useRef(false)

  useEffect(() => {
    if (!editing) return
    cancelled.current = false
    setDraft(value || '')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [editing, value])

  const commit = () => {
    if (cancelled.current) return
    const v = draft.trim()
    setEditing(false)
    if (v && v !== value) onSave?.(v)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancelled.current = true
            setEditing(false)
          }
        }}
        className={`w-full min-w-0 border-b border-orange-400/60 bg-transparent outline-none ${inputClassName}`}
        aria-label="Rename"
      />
    )
  }

  return (
    <span
      role={onSave ? 'button' : undefined}
      tabIndex={onSave ? 0 : undefined}
      title={onSave ? title : undefined}
      onClick={(e) => {
        if (!onSave) return
        e.stopPropagation()
        setEditing(true)
      }}
      onKeyDown={(e) => {
        if (onSave && e.key === 'Enter') {
          e.preventDefault()
          setEditing(true)
        }
      }}
      className={`${onSave ? 'cursor-text decoration-orange-400/50 decoration-dotted underline-offset-4 hover:underline' : ''} ${className}`}
    >
      {children ?? value}
    </span>
  )
}

function Ring({ pct, color }) {
  const size = 44
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-black/[0.07] dark:stroke-white/[0.08]" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-medium text-zinc-700 dark:text-zinc-200">{pct}%</span>
    </div>
  )
}

function deadlineText(deadline) {
  const d = daysLeft(deadline)
  if (d == null) return null
  if (d < 0) return `Overdue by ${-d} day${d === -1 ? '' : 's'}`
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  return `${d} days left`
}

// Deadline label that turns into a native date picker on click.
function DeadlineEdit({ deadline, onChange }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!editing) return
    ref.current?.focus()
    try {
      ref.current?.showPicker?.()
    } catch {
      /* picker needs a user gesture in some browsers; focus is enough */
    }
  }, [editing])

  const label = deadlineText(deadline)
  if (!onChange) return label ? <span className="shrink-0">{label}</span> : null

  if (editing) {
    return (
      <input
        ref={ref}
        type="date"
        defaultValue={deadline || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          onChange(e.target.value || null)
          setEditing(false)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        className="shrink-0 rounded-md border border-orange-400/50 bg-transparent px-1 font-mono text-[11px] text-zinc-700 outline-none dark:text-zinc-200 dark:[color-scheme:dark]"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      title="Click to change deadline"
      className={`shrink-0 rounded px-0.5 -mx-0.5 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-300 ${label ? '' : 'italic opacity-70'}`}
    >
      {label || 'Set deadline'}
    </button>
  )
}

export default function ProjectCard({ project, todos = [], highlight, onCycle, onDelete, onRename, onDeadline, expanded = false }) {
  const tasks = todos.filter((t) => t.projectId === project.id)
  const doneCount = tasks.filter((t) => t.done).length
  const pct = project.status === 'done' ? 100 : tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const status = STATUS[project.status] || STATUS['on-track']
  const overdue = project.status !== 'done' && (daysLeft(project.deadline) ?? 0) < 0
  const lit = highlight?.has(project.id)

  const rest = project.note || (tasks.length ? `${doneCount} of ${tasks.length} tasks` : '')
  const hasDeadlinePart = Boolean(onDeadline || deadlineText(project.deadline))

  const openFirst = [...tasks].sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <motion.div
      layout
      data-id={project.id}
      initial={{ opacity: 0, y: 8 }}
      animate={lit ? { opacity: 1, y: 0, scale: [1, 1.015, 1] } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative rounded-2xl border p-3.5 transition-colors ${
        overdue
          ? 'border-rose-500/25 bg-rose-500/[0.06] dark:border-rose-400/20 dark:bg-rose-400/[0.06]'
          : 'border-black/5 bg-white/50 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]'
      } ${lit ? HIGHLIGHT : ''}`}
    >
      <div className="flex items-center gap-3">
        <Ring pct={pct} color={status.ring} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
            {project.emoji ? <span className="mr-1.5 shrink-0">{project.emoji}</span> : null}
            <InlineEdit
              value={project.name}
              onSave={onRename ? (name) => onRename(project.id, name) : undefined}
              className="truncate"
              inputClassName="text-[15px] font-medium"
            />
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            <DeadlineEdit deadline={project.deadline} onChange={onDeadline ? (d) => onDeadline(project.id, d) : undefined} />
            {hasDeadlinePart && rest ? <span className="shrink-0 opacity-50">·</span> : null}
            {rest ? <span className="min-w-0 truncate">{rest}</span> : null}
            {!hasDeadlinePart && !rest ? <span>No deadline yet</span> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCycle?.(project.id)}
          title="Click to change status"
          className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-transform hover:scale-105 active:scale-95 ${status.pill}`}
        >
          {status.label}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            title="Delete project"
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-black/10 bg-white text-zinc-500 opacity-0 shadow-sm transition-opacity hover:text-rose-500 group-hover:opacity-100 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-400"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      {expanded && openFirst.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-black/5 pt-3 dark:border-white/10">
          <AnimatePresence initial={false}>
            {openFirst.map((t) => (
              <motion.li
                key={t.id}
                data-id={t.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                className="flex items-center gap-2 text-[13px]"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.done ? 'bg-emerald-400' : 'bg-zinc-400 dark:bg-zinc-500'}`} />
                <span className={`min-w-0 flex-1 truncate ${t.done ? 'text-zinc-400 line-through dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-200'}`}>
                  {t.emoji ? `${t.emoji} ` : ''}
                  {t.title}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{t.date ? relDay(t.date) : 'someday'}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
      {expanded && openFirst.length === 0 ? (
        <div className="mt-3 border-t border-black/5 pt-3 font-mono text-[11px] text-zinc-400 dark:border-white/10 dark:text-zinc-500">
          No tasks yet. Mention “{project.name}” when you yap.
        </div>
      ) : null}
    </motion.div>
  )
}
