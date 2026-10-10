import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

// 16×12 pixel cat. O outline · W fur · P pink · E eye · S shine · N nose · M mouth
const OPEN = [
  '.O............O.',
  '.OO..........OO.',
  '.OPO........OPO.',
  '.OPPOOOOOOOOPPO.',
  'OWWWWWWWWWWWWWWO',
  'OWWWWWWWWWWWWWWO',
  'OWWSEWWWWWWSEWWO',
  'OWWEEWWWWWWEEWWO',
  'OWPPWWWNNWWWPPWO',
  'OWWWWWMWWMWWWWWO',
  '.OWWWWWWWWWWWWO.',
  '..OOOOOOOOOOOO..',
]
const CLOSED = OPEN.map((row, i) => (i === 6 ? row.replace(/[SE]/g, 'W') : row))

const COLORS = { O: '#7c2d12', W: '#fdba74', P: '#f9a8d4', E: '#1c1917', S: '#ffffff', N: '#ec4899', M: '#7c2d12' }
const LINES = ['meow!', 'yap it!', 'purr~', 'nyaa', 'done?', '♥']

function PixelCat({ blinking }) {
  const grid = blinking ? CLOSED : OPEN
  return (
    <svg viewBox="0 0 16 12" width="48" height="36" shapeRendering="crispEdges" aria-hidden="true">
      {grid.flatMap((row, y) =>
        [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[c]} />)),
      )}
    </svg>
  )
}

function Cat() {
  const [blinking, setBlinking] = useState(false)
  const [hop, setHop] = useState(0)
  const [bubble, setBubble] = useState(null)
  const timers = useRef([])

  const blink = (ms = 170) => {
    setBlinking(true)
    timers.current.push(setTimeout(() => setBlinking(false), ms))
  }

  // Idle blinks every few seconds
  useEffect(() => {
    let t
    const loop = () => {
      t = setTimeout(() => {
        blink()
        loop()
      }, 2600 + Math.random() * 3000)
    }
    loop()
    const pending = timers.current
    return () => {
      clearTimeout(t)
      pending.forEach(clearTimeout)
    }
  }, [])

  const onTap = () => {
    blink(220)
    timers.current.push(setTimeout(() => blink(140), 380))
    setHop((h) => h + 1)
    setBubble({ id: Date.now(), text: LINES[Math.floor(Math.random() * LINES.length)] })
    timers.current.push(setTimeout(() => setBubble(null), 1300))
  }

  return (
    <button type="button" onClick={onTap} className="relative cursor-pointer select-none" aria-label="Pet the cat" title="Pet me">
      <AnimatePresence>
        {bubble && (
          <motion.span
            key={bubble.id}
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, y: -14 }}
            className="absolute -top-7 right-0 whitespace-nowrap border-2 border-orange-900 bg-white px-1.5 py-0.5 font-pixel text-[10px] text-orange-900 shadow-[2px_2px_0_#7c2d12] dark:bg-orange-50"
          >
            {bubble.text}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.div
        key={hop}
        animate={hop ? { y: [0, -8, 0, -3, 0], rotate: [0, -6, 4, 0] } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        whileHover={{ rotate: -4 }}
        className="drop-shadow-[0_3px_0_rgba(124,45,18,0.25)]"
      >
        <PixelCat blinking={blinking} />
      </motion.div>
    </button>
  )
}

export default function TopBar({ name = 'Krishna' }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-block size-2.5 bg-orange-500 shadow-[2px_2px_0_#7c2d12]" />
        <span className="font-pixel text-sm uppercase tracking-wider text-zinc-800 dark:text-zinc-100">{name}</span>
        <span className="hidden font-mono text-[11px] text-zinc-500 sm:inline">· yap it done</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="border-2 border-zinc-900/80 bg-white/70 px-2 py-0.5 font-pixel text-xs uppercase text-zinc-800 shadow-[2px_2px_0_rgba(24,24,27,0.8)] dark:border-orange-200/80 dark:bg-white/5 dark:text-orange-100 dark:shadow-[2px_2px_0_rgba(254,215,170,0.6)]">
          {format(new Date(), 'EEEE')}
        </span>
        <Cat />
      </div>
    </div>
  )
}
