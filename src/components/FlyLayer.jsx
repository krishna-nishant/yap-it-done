import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { TONE_DOT } from '../lib/theme'

const RAIL_FOR = { idea: 'dump', project: 'projects', todo: 'today', event: 'today' }

function visibleCenter(el) {
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null
  return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 }
}

function findTarget(f) {
  if (f.id) {
    for (const el of document.querySelectorAll(`[data-id="${CSS.escape(f.id)}"]`)) {
      const c = visibleCenter(el)
      if (c) return c
    }
  }
  for (const el of document.querySelectorAll(`[data-rail="${RAIL_FOR[f.kind] || 'today'}"]`)) {
    const c = visibleCenter(el)
    if (c) return c
  }
  return { x: window.innerWidth / 2, y: window.innerHeight - 40 }
}

function Flight({ f, index, onDone }) {
  const [to, setTo] = useState(null)

  useEffect(() => {
    // Wait for the new item to render (and the calendar to jump) before measuring
    const t = setTimeout(() => setTo(findTarget(f)), 160 + index * 110)
    return () => clearTimeout(t)
  }, [f, index])

  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.7 }}
      animate={to ? { x: to.x, y: to.y, opacity: [1, 1, 0], scale: [1, 0.9, 0.55] } : { x: f.from.x + index * 14, y: f.from.y - 18, opacity: 1, scale: 1 }}
      transition={
        to
          ? { x: { duration: 0.8, ease: [0.6, 0, 0.3, 1] }, y: { duration: 0.8, ease: [0.55, -0.35, 0.65, 1] }, opacity: { duration: 0.8, times: [0, 0.8, 1] }, scale: { duration: 0.8 } }
          : { type: 'spring', stiffness: 420, damping: 26 }
      }
      onAnimationComplete={() => to && onDone(f.key)}
    >
      <div className="flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-orange-400/50 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-[0_8px_30px_-6px_rgba(251,146,60,0.6)] dark:bg-zinc-900 dark:text-white">
        <span className={`size-1.5 rounded-full ${TONE_DOT[f.tone] || TONE_DOT.zinc}`} />
        {f.label}
      </div>
    </motion.div>
  )
}

// Chips that fly from the input into the section / calendar slot where each item landed.
export default function FlyLayer({ flights, onDone }) {
  if (!flights.length) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {flights.map((f, i) => (
        <Flight key={f.key} f={f} index={i} onDone={onDone} />
      ))}
    </div>,
    document.body,
  )
}
