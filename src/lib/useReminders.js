import { useEffect, useRef } from 'react'
import { todayKey, toMin, nowMin } from './dates'

// Every 20s: ping once for each of today's events starting within the next 10 minutes.
export function useReminders(events, enabled, onRemind) {
  const notified = useRef(new Set())
  const latest = useRef({ events, onRemind })
  latest.current = { events, onRemind }

  useEffect(() => {
    if (!enabled) return
    const check = () => {
      const today = todayKey()
      const now = nowMin()
      for (const e of latest.current.events) {
        if (e.done || e.date !== today || !e.start) continue
        const mins = toMin(e.start) - now
        const key = `${e.id}@${e.date}T${e.start}`
        if (mins > 0 && mins <= 10 && !notified.current.has(key)) {
          notified.current.add(key)
          latest.current.onRemind(e, mins)
        }
      }
    }
    check()
    const t = setInterval(check, 20000)
    return () => clearInterval(t)
  }, [enabled])
}
