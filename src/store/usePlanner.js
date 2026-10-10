import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyActions, findClash } from '../lib/apply'
import { demoState } from '../lib/demo'
import { todayKey, tomorrowKey } from '../lib/dates'
import { STATUS_ORDER } from '../lib/theme'

export const STORAGE_KEY = 'yap-it-done:v1'
const EMPTY = { events: [], todos: [], projects: [], ideas: [], prefs: {} }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved) return { ...EMPTY }
    return {
      events: Array.isArray(saved.events) ? saved.events : [],
      todos: Array.isArray(saved.todos) ? saved.todos : [],
      projects: Array.isArray(saved.projects) ? saved.projects : [],
      ideas: Array.isArray(saved.ideas) ? saved.ideas : [],
      prefs: saved.prefs && typeof saved.prefs === 'object' ? saved.prefs : {},
      theme: saved.theme,
    }
  } catch {
    return { ...EMPTY }
  }
}

export function usePlanner() {
  const [state, setState] = useState(load)
  const ref = useRef(state)
  const history = useRef([]) // data snapshots for undo

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [state])

  // Synchronous commit so callers get results back immediately
  const commit = useCallback((fn) => {
    const next = fn(ref.current)
    ref.current = next
    setState(next)
    return next
  }, [])

  const snapshot = useCallback(() => {
    const { events, todos, projects, ideas } = ref.current
    history.current.push({ events, todos, projects, ideas })
    if (history.current.length > 30) history.current.shift()
  }, [])

  const ops = useMemo(() => {
    const mapCol = (col, id, f) => (s) => ({ ...s, [col]: s[col].map((x) => (x.id === id ? f(x) : x)) })
    return {
      canUndo: () => history.current.length > 0,
      undo() {
        const snap = history.current.pop()
        if (!snap) return false
        commit((s) => ({ ...s, ...snap }))
        return true
      },
      // Returns the event it now clashes with (or null)
      updateEvent(id, fields) {
        const next = commit(mapCol('events', id, (e) => ({ ...e, ...fields })))
        const ev = next.events.find((e) => e.id === id)
        return ev ? findClash(next, ev) : null
      },
      updateTodo: (id, fields) => commit(mapCol('todos', id, (t) => ({ ...t, ...fields, ...(fields.date !== undefined && fields.date !== t.date ? { carriedOver: false } : {}) }))),
      updateIdea: (id, fields) => commit(mapCol('ideas', id, (i) => ({ ...i, ...fields }))),
      updateProject: (id, fields) => commit(mapCol('projects', id, (p) => ({ ...p, ...fields }))),
      deleteSeries(seriesId) {
        if (!seriesId) return
        snapshot()
        commit((s) => ({ ...s, events: s.events.filter((e) => e.seriesId !== seriesId) }))
      },
      apply(actions) {
        snapshot()
        let applied = []
        commit((s) => {
          const r = applyActions(s, actions)
          applied = r.applied
          return r.state
        })
        return applied
      },
      toggleTodo: (id) => commit(mapCol('todos', id, (t) => ({ ...t, done: !t.done, doneAt: t.done ? null : Date.now() }))),
      toggleEvent: (id) => commit(mapCol('events', id, (e) => ({ ...e, done: !e.done }))),
      moveEventTomorrow: (id) => commit(mapCol('events', id, (e) => ({ ...e, date: tomorrowKey() }))),
      cycleProject: (id) =>
        commit(mapCol('projects', id, (p) => ({ ...p, status: STATUS_ORDER[(STATUS_ORDER.indexOf(p.status) + 1) % STATUS_ORDER.length] }))),
      deleteItem: (id) =>
        snapshot() ||
        commit((s) => ({
          ...s,
          events: s.events.filter((x) => x.id !== id),
          todos: s.todos.filter((x) => x.id !== id),
          ideas: s.ideas.filter((x) => x.id !== id),
          projects: s.projects.filter((x) => x.id !== id),
        })),
      closeDay() {
        const today = todayKey()
        const tomorrow = tomorrowKey()
        const open = ref.current.todos.filter((t) => !t.done && t.date === today)
        if (open.length) snapshot()
        commit((s) => ({ ...s, todos: s.todos.map((t) => (!t.done && t.date === today ? { ...t, date: tomorrow, carriedOver: true } : t)) }))
        return open.length
      },
      loadDemo: () => snapshot() || commit((s) => ({ ...s, ...demoState() })),
      clearAll: () => snapshot() || commit((s) => ({ ...EMPTY, prefs: s.prefs, theme: s.theme })),
      setTheme: (theme) => commit((s) => ({ ...s, theme })),
      setPref: (key, value) => commit((s) => ({ ...s, prefs: { ...s.prefs, [key]: value } })),
    }
  }, [commit, snapshot])

  const getState = useCallback(() => ref.current, [])

  return { state, ops, getState }
}
