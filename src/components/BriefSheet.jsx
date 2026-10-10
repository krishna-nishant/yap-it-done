import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, Square, Volume2, Sun, Moon, Clock } from 'lucide-react'

function pickVoice() {
  const vs = window.speechSynthesis?.getVoices() || []
  return (
    vs.find((v) => /en-IN/i.test(v.lang) && /google|natural|neural|premium|enhanced/i.test(v.name)) ||
    vs.find((v) => /Google UK English Female|Google US English/i.test(v.name)) ||
    vs.find((v) => /en-IN/i.test(v.lang)) ||
    vs.find((v) => /Samantha|Ava|Allison|Karen|Daniel/i.test(v.name)) ||
    vs.find((v) => v.lang?.startsWith('en')) ||
    null
  )
}

const ICONS = { 'Morning brief': Sun, 'Evening wrap': Moon, 'Rest of today': Clock }

// Full-screen brief: speaks sentence by sentence and highlights the one being read.
export default function BriefSheet({ brief, onClose }) {
  const [active, setActive] = useState(-1)
  const [speaking, setSpeaking] = useState(false)
  const runId = useRef(0)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = () => {
    if (!brief || !canSpeak) return
    const id = ++runId.current
    speechSynthesis.cancel()
    const voice = pickVoice()
    brief.sentences.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      if (voice) u.voice = voice
      u.rate = 1.04
      u.pitch = 1
      u.onstart = () => runId.current === id && setActive(i)
      if (i === brief.sentences.length - 1) u.onend = () => runId.current === id && (setSpeaking(false), setActive(-1))
      u.onerror = () => runId.current === id && setSpeaking(false)
      speechSynthesis.speak(u)
    })
    setSpeaking(true)
  }

  const stop = () => {
    runId.current++
    if (canSpeak) speechSynthesis.cancel()
    setSpeaking(false)
    setActive(-1)
  }

  useEffect(() => {
    if (!brief) return
    // Voices load async in Chrome
    const start = () => speak()
    if (canSpeak && !speechSynthesis.getVoices().length) {
      speechSynthesis.addEventListener('voiceschanged', start, { once: true })
      const t = setTimeout(start, 400)
      return () => {
        clearTimeout(t)
        speechSynthesis.removeEventListener('voiceschanged', start)
        stop()
      }
    }
    start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief])

  useEffect(() => {
    if (!brief) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [brief, onClose])

  const Icon = ICONS[brief?.title] || Volume2

  return (
    <AnimatePresence>
      {brief && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-lenis-prevent
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glow-card relative w-full max-w-2xl rounded-[32px] bg-white/90 p-7 shadow-2xl sm:p-9 dark:bg-[#170e14]/95"
          >
            <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-zinc-500 transition hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">
              <X className="size-4" />
            </button>

            <div className="mb-6 flex items-center gap-4">
              <motion.div
                className={`orb ${speaking ? 'is-fast' : ''} size-14 shrink-0 rounded-full`}
                animate={{ scale: speaking ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 0.9, repeat: speaking ? Infinity : 0 }}
              />
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">
                  <Icon className="size-3.5" /> {speaking ? 'Speaking' : 'Your brief'}
                </div>
                <h2 className="font-serif text-4xl leading-tight text-zinc-900 dark:text-zinc-50">{brief.title}</h2>
              </div>
            </div>

            <div className="thin-scrollbar max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {brief.sentences.map((text, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: active === -1 || active === i ? 1 : 0.35, y: 0 }}
                  transition={{ delay: active === -1 ? 0.05 * i : 0, duration: 0.3 }}
                  className={`text-lg leading-relaxed transition-colors sm:text-xl ${active === i ? 'text-zinc-950 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}
                >
                  {active === i && <span className="mr-2 inline-block size-2 -translate-y-0.5 rounded-full bg-orange-500" />}
                  {text}
                </motion.p>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-black/5 pt-5 dark:border-white/10">
              <span className="font-mono text-[11px] text-zinc-500">{canSpeak ? 'Esc to close' : 'Speech not supported in this browser'}</span>
              {canSpeak && (
                <div className="flex gap-2">
                  <button type="button" onClick={speak} className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
                    <RotateCcw className="size-4" /> Replay
                  </button>
                  {speaking && (
                    <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900">
                      <Square className="size-3.5 fill-current" /> Stop
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
