import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Lenis from 'lenis'
import { startOfWeek, isSameMonth } from 'date-fns'

import { usePlanner } from './store/usePlanner'
import { parseWithGemini, geminiConfigured, getUserKey, freeLeft } from './lib/gemini'
import { fallbackParse, inferRepeats } from './lib/instant'
import { summarize } from './lib/apply'
import { buildBrief } from './lib/brief'
import { useReminders } from './lib/useReminders'
import { todayKey, shiftKey, fromKey, dayKey, fmtTime, fmtRange } from './lib/dates'

import Rail from './components/Rail'
import Header from './components/Header'
import TopBar from './components/TopBar'
import CaptureCard from './components/CaptureCard'
import HeardYou from './components/HeardYou'
import Toast from './components/Toast'
import FlyLayer from './components/FlyLayer'
import BriefSheet from './components/BriefSheet'
import KeyModal from './components/KeyModal'
import Onboarding from './components/Onboarding'
import CalendarPanel from './components/CalendarPanel'
import TodayPanel from './sections/TodayPanel'
import DumpPanel from './sections/DumpPanel'
import ProjectsPanel from './sections/ProjectsPanel'
import WrapUpPanel from './sections/WrapUpPanel'

const PANEL_COMPONENTS = { today: TodayPanel, dump: DumpPanel, projects: ProjectsPanel, wrap: WrapUpPanel }

function isVisible(date, anchor, view) {
  if (view === 'month') return isSameMonth(fromKey(date), fromKey(anchor))
  const start = view === 'week' ? dayKey(startOfWeek(fromKey(anchor), { weekStartsOn: 1 })) : anchor
  const days = view === 'day' ? 1 : view === '3day' ? 3 : 7
  return date >= start && date <= shiftKey(start, days - 1)
}

const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

export default function App() {
  const { state, ops, getState } = usePlanner()
  const theme = state.theme || 'dark'
  const [panel, setPanelState] = useState(state.prefs.panel || 'today')
  const [calView, setCalViewState] = useState(state.prefs.calView || '3day')
  const [anchor, setAnchor] = useState(todayKey())
  const [highlight, setHighlight] = useState(() => new Set())
  const [heard, setHeard] = useState(null)
  const [toast, setToast] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [floating, setFloating] = useState(false)
  const [slotHeight, setSlotHeight] = useState(0)
  const [flights, setFlights] = useState([])
  const [brief, setBrief] = useState(null)
  const [keyModal, setKeyModal] = useState(null) // null | 'limit' | 'settings'
  const [offlineMode, setOfflineMode] = useState(false)
  const pendingText = useRef('')
  const reminders = Boolean(state.prefs.reminders)

  const captureRef = useRef(null)
  const slotRef = useRef(null)
  const hlTimer = useRef(null)
  const toastTimer = useRef(null)

  const setPanel = (p) => {
    setPanelState(p)
    ops.setPref('panel', p)
  }
  const setCalView = (v) => {
    setCalViewState(v)
    ops.setPref('calView', v)
  }

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, smoothWheel: true })
    return () => lenis.destroy()
  }, [])

  // Keep the slot's height while the card floats, so the page doesn't jump
  useLayoutEffect(() => {
    const el = slotRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (!floating) setSlotHeight(el.firstElementChild?.offsetHeight || 0)
    })
    ro.observe(el.firstElementChild || el)
    return () => ro.disconnect()
  }, [floating])

  // Float the capture card once its slot scrolls out of view
  useEffect(() => {
    const el = slotRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setFloating(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const showToast = useCallback((text, tone = 'ok', undo = false) => {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, tone, undo })
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6500 : 4500)
  }, [])

  const flash = useCallback((ids) => {
    clearTimeout(hlTimer.current)
    setHighlight(new Set(ids))
    hlTimer.current = setTimeout(() => setHighlight(new Set()), 2800)
  }, [])

  const jumpTo = useCallback(
    (date) => {
      if (!date) return
      setAnchor((a) => (isVisible(date, a, calView) ? a : date))
    },
    [calView],
  )

  const undo = useCallback(() => {
    if (ops.undo()) {
      setHeard(null)
      setHighlight(new Set())
      showToast('Undone. Back to how it was.')
    } else showToast('Nothing to undo.', 'warn')
  }, [ops, showToast])

  // ⌘K focus · ⌘Z undo (when not typing)
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        captureRef.current?.focus()
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        const el = document.activeElement
        if (isTyping(el) && el.value) return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const handleSubmit = useCallback(
    async (text) => {
      setProcessing(true)
      const t0 = performance.now()
      let result
      try {
        if (offlineMode) throw new Error('offline mode')
        result = await parseWithGemini(text, getState())
        if (!result.actions.length) throw new Error('Gemini returned no actions')
        result.source = 'gemini'
      } catch (err) {
        if (err.name === 'NeedKeyError') {
          // Free prompts on the owner's key are used up: ask for the visitor's own key
          pendingText.current = text
          setKeyModal(err.reason || 'limit')
          setProcessing(false)
          return false
        }
        console.warn('[yap] using offline parser:', err.message)
        result = { actions: fallbackParse(text, getState()), ms: Math.round(performance.now() - t0), model: 'offline', source: 'offline' }
      }

      const applied = ops.apply(inferRepeats(text, result.actions))
      setHeard({ id: Date.now(), applied, ms: result.ms, model: result.model, source: result.source, canUndo: true })
      showToast(summarize(applied) + (result.source === 'offline' ? ' (offline guess)' : ''), result.source === 'offline' || applied.some((a) => a.warning) ? 'warn' : 'ok', applied.length > 0)
      flash(applied.flatMap((a) => a.ids || (a.id ? [a.id] : [])))
      jumpTo(applied.find((a) => a.date)?.date)

      // Signature: chips fly from the input to where each item landed
      const r = captureRef.current?.getRect?.()
      if (r) {
        const from = { x: r.left + Math.min(r.width * 0.25, 260), y: r.top + Math.min(r.height / 2, 40) }
        setFlights(
          applied
            .filter((a) => a.id && a.verb !== 'Removed')
            .slice(0, 6)
            .map((a, i) => ({ key: `${Date.now()}-${i}`, id: a.id, kind: a.kind, tone: a.tone, label: a.label.length > 34 ? a.label.slice(0, 32) + '…' : a.label, from })),
        )
      }
      setProcessing(false)
      return true
    },
    [getState, ops, showToast, flash, jumpTo, offlineMode],
  )

  const onChipClick = (a) => {
    const ids = a.ids || (a.id ? [a.id] : [])
    if (ids.length) flash(ids)
    if (a.date) setAnchor((cur) => (isVisible(a.date, cur, calView) ? cur : a.date))
  }

  const onBrief = (mode) => setBrief(buildBrief(getState(), mode))

  const onDemo = () => {
    ops.loadDemo()
    setAnchor(todayKey())
    showToast('Demo data loaded. Try: "Meeting with Krishna at 3:30, fest project is at risk"', 'ok', true)
  }

  // Reminders: browser notification + in-app toast 10 min before each event
  const toggleReminders = async () => {
    if (reminders) {
      ops.setPref('reminders', false)
      return showToast('Reminders off.')
    }
    let permission = 'unsupported'
    if ('Notification' in window) permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    ops.setPref('reminders', true)
    if (permission === 'granted') {
      new Notification('Yap It Done reminders on 🔔', { body: "I'll ping you 10 minutes before each event." })
      showToast("Reminders on. I'll ping you 10 min before each event.")
    } else showToast('Reminders on (in-app only: browser notifications are blocked).', 'warn')
  }
  useReminders(state.events, reminders, (e, mins) => {
    const body = `${fmtRange(e.start, e.end)} · in ${mins} min`
    if ('Notification' in window && Notification.permission === 'granted') new Notification(`${e.emoji || '⏰'} ${e.title}`, { body })
    showToast(`⏰ ${e.title} starts at ${fmtTime(e.start)}, in ${mins} min`, 'warn')
    flash([e.id])
    jumpTo(e.date)
  })

  const badges = useMemo(
    () => ({
      dump: state.ideas.length + state.todos.filter((t) => !t.done && !t.date && !t.projectId).length,
      today: state.todos.filter((t) => !t.done && t.date === todayKey()).length,
    }),
    [state],
  )

  const panelOps = useMemo(
    () => ({
      ...ops,
      closeDay: () => {
        const n = ops.closeDay()
        showToast(n ? `Carried ${n} to tomorrow. Good night!` : 'Nothing to carry. Clean day!', 'ok', n > 0)
        return n
      },
      deleteItem: (id) => {
        ops.deleteItem(id)
        showToast('Deleted.', 'ok', true)
      },
    }),
    [ops, showToast],
  )

  const calendarOps = useMemo(
    () => ({
      ...ops,
      updateEvent: (id, fields) => {
        const clash = ops.updateEvent(id, fields)
        if (clash) showToast(`Heads up: overlaps ${clash.title} (${fmtRange(clash.start, clash.end)})`, 'warn')
        return clash
      },
      deleteItem: (id) => {
        ops.deleteItem(id)
        showToast('Event deleted.', 'ok', true)
      },
      deleteSeries: (seriesId) => {
        ops.deleteSeries(seriesId)
        showToast('Whole series deleted.', 'ok', true)
      },
    }),
    [ops, showToast],
  )

  const isEmpty = !state.events.length && !state.todos.length && !state.projects.length && !state.ideas.length
  const Panel = PANEL_COMPONENTS[panel] || TodayPanel

  return (
    <div className="mx-auto flex max-w-[1320px] gap-6 px-4 pb-40 pt-6 sm:px-6 lg:pb-32 lg:pt-8">
      <Rail panel={panel} setPanel={setPanel} theme={theme} toggleTheme={() => ops.setTheme(theme === 'dark' ? 'light' : 'dark')} badges={badges} />

      <main className="min-w-0 flex-1 space-y-5">
        <TopBar name="Krishna" />
        <Header state={state} onDemo={onDemo} onBrief={onBrief} reminders={reminders} onToggleReminders={toggleReminders} />

        <div ref={slotRef} style={{ minHeight: floating ? slotHeight : undefined }}>
          <CaptureCard ref={captureRef} onSubmit={handleSubmit} processing={processing} projects={state.projects} floating={floating} />
        </div>

        {!geminiConfigured && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            Gemini key missing: add <code className="font-mono">VITE_GEMINI_API_KEY</code> to <code className="font-mono">.env.local</code> and restart. Using the offline parser for now.
          </div>
        )}

        <HeardYou heard={heard} onChipClick={onChipClick} onUndo={undo} />

        <AnimatePresence>
          {isEmpty && !processing && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}>
              <Onboarding onTry={(t) => captureRef.current?.run(t)} onDemo={onDemo} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={panel}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Panel state={state} ops={panelOps} highlight={highlight} />
            </motion.div>
          </AnimatePresence>
          <CalendarPanel state={state} ops={calendarOps} highlight={highlight} anchor={anchor} setAnchor={setAnchor} view={calView} setView={setCalView} />
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-4 text-center text-xs text-zinc-500">
          <span>
            Powered by your voice + <b className="font-semibold text-zinc-800 dark:text-zinc-200">Wispr Flow</b> · Gemini
          </span>
          <span className="opacity-40">·</span>
          <span className="font-mono">⌘K focus · ⌘Z undo</span>
          <span className="opacity-40">·</span>
          <button type="button" onClick={() => setKeyModal('settings')} className="font-mono transition hover:text-zinc-800 dark:hover:text-zinc-200">
            {getUserKey() ? '🔑 using your Gemini key' : offlineMode ? 'offline mode · add key' : `${freeLeft()} free yap${freeLeft() === 1 ? '' : 's'} left`}
          </button>
          <span className="opacity-40">·</span>
          <button type="button" onClick={onDemo} className="font-mono transition hover:text-zinc-800 dark:hover:text-zinc-200">
            load demo
          </button>
          <span className="opacity-40">·</span>
          <ClearButton
            onClear={() => {
              ops.clearAll()
              setHeard(null)
              showToast('Cleared. Fresh start.', 'ok', true)
            }}
          />
        </footer>
      </main>

      <Toast toast={toast} onUndo={undo} raised={floating} />
      <FlyLayer flights={flights} onDone={(key) => setFlights((fs) => fs.filter((f) => f.key !== key))} />
      <BriefSheet brief={brief} onClose={() => setBrief(null)} />
      <KeyModal
        open={Boolean(keyModal)}
        reason={keyModal}
        onClose={() => setKeyModal(null)}
        onSaved={() => {
          setKeyModal(null)
          setOfflineMode(false)
          showToast('Key saved. Yapping on your own key now.')
          const t = pendingText.current
          pendingText.current = ''
          if (t) setTimeout(() => captureRef.current?.run(t), 50)
        }}
        onOffline={() => {
          setKeyModal(null)
          setOfflineMode(true)
          showToast('Offline mode: simple phrases only. Add a key anytime from the footer.', 'warn')
          const t = pendingText.current
          pendingText.current = ''
          if (t) setTimeout(() => captureRef.current?.run(t), 50)
        }}
      />
    </div>
  )
}

// Two-step clear (no blocking confirm dialog)
function ClearButton({ onClear }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      onClick={() => (armed ? (onClear(), setArmed(false)) : setArmed(true))}
      className={`font-mono transition ${armed ? 'text-rose-500' : 'hover:text-zinc-800 dark:hover:text-zinc-200'}`}
    >
      {armed ? 'click again to clear everything' : 'clear all'}
    </button>
  )
}
