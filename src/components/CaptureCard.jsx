import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CornerDownLeft } from 'lucide-react'
import { instantGuess } from '../lib/instant'

const SUGGESTIONS = ['Coffee with Riya at 4', 'Finished the report', 'Kal 9 baje gym', "I'm running 30 min late", 'Gym every Mon, Wed, Fri at 7am']

// floating = header scrolled away: the card becomes a compact Spotlight-style bar pinned to the bottom.
const CaptureCard = forwardRef(function CaptureCard({ onSubmit, processing, projects, floating }, ref) {
  const [text, setText] = useState('')
  const taRef = useRef(null)
  const rootRef = useRef(null)
  const textRef = useRef('')
  textRef.current = text

  const submit = async (value = textRef.current) => {
    const t = value.trim()
    if (!t || processing) return
    setText(t)
    const ok = await onSubmit(t)
    if (ok) setText('')
    requestAnimationFrame(() => taRef.current?.focus())
  }

  useImperativeHandle(
    ref,
    () => ({
      focus: () => taRef.current?.focus(),
      run: (t) => submit(t),
      getRect: () => (taRef.current || rootRef.current)?.getBoundingClientRect(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [processing, onSubmit],
  )

  // Auto-grow
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, floating ? 96 : 220)}px`
  }, [text, floating])

  const guesses = useMemo(() => instantGuess(text, projects), [text, projects])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const status = processing ? 'thinking' : text.trim() ? 'listening' : 'ready'

  return (
    <motion.div
      ref={rootRef}
      layout
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={`glow-card ${processing ? 'is-thinking' : ''} ${
        floating
          ? 'fixed inset-x-0 bottom-24 z-50 mx-auto w-[min(760px,calc(100vw-2rem))] rounded-[24px] px-4 py-3 lg:bottom-6'
          : 'relative rounded-[28px] p-5 sm:p-6'
      } bg-white/80 backdrop-blur-2xl dark:bg-[#1a1016]/85`}
      onClick={() => taRef.current?.focus()}
    >
      <motion.div layout="position" className={`flex ${floating ? 'items-center gap-3' : 'gap-4 sm:gap-5'}`}>
        {/* Orb */}
        <div className={`relative shrink-0 ${floating ? '' : 'mt-1 hidden sm:block'}`}>
          <motion.div
            className={`orb ${processing ? 'is-fast' : ''} ${floating ? 'size-9' : 'size-14'} rounded-full`}
            animate={{ scale: status === 'ready' ? 1 : [1, 1.08, 1] }}
            transition={{ duration: processing ? 0.6 : 1.6, repeat: status === 'ready' ? 0 : Infinity, ease: 'easeInOut' }}
          />
          <div className="orb pointer-events-none absolute inset-0 -z-10 rounded-full opacity-60 blur-xl" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Status */}
          {!floating && (
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
              <span className="relative flex size-2">
                {status !== 'ready' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-70" />}
                <span className={`relative inline-flex size-2 rounded-full ${status === 'ready' ? 'bg-zinc-400' : 'bg-orange-500'}`} />
              </span>
              {status === 'thinking' ? (
                <span className="shimmer font-medium">Sorting it out…</span>
              ) : (
                <span className={status === 'listening' ? 'text-orange-600 dark:text-orange-300' : 'text-zinc-500 dark:text-zinc-400'}>
                  {status === 'listening' ? 'Listening' : 'Ready when you are'}
                </span>
              )}
            </div>
          )}

          {/* Input */}
          <div className={`relative overflow-hidden rounded-lg ${processing ? 'sweep' : ''}`}>
            <textarea
              ref={taRef}
              autoFocus
              rows={floating ? 1 : 2}
              value={text}
              readOnly={processing}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={floating ? (processing ? 'Sorting it out…' : 'Keep yapping…') : 'Hold your Wispr Flow key and just talk: meetings, to-dos, ideas, project updates…'}
              className={`thin-scrollbar block w-full resize-none bg-transparent leading-relaxed outline-none ${floating ? 'py-1 text-base' : 'text-lg sm:text-xl'} ${processing ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'}`}
              aria-label="Tell Yap It Done anything"
            />
          </div>

          {/* Instant guesses (chrono-node + heuristics, before Gemini answers) */}
          <div className={`flex flex-wrap gap-1.5 ${floating ? (guesses.length ? 'mt-1' : 'hidden') : 'min-h-7'}`}>
            <AnimatePresence initial={false}>
              {guesses.map((g) => (
                <motion.span
                  key={g.kind + g.label}
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-mono text-[11px] text-orange-700 dark:text-orange-300"
                >
                  <Zap className="size-3" />
                  {g.kind} · {g.label}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {floating && (
          <span className={`hidden shrink-0 items-center gap-1.5 font-mono text-[11px] sm:flex ${processing ? 'shimmer' : 'text-zinc-500'}`}>
            {processing ? 'thinking' : (
              <>
                <kbd className="rounded border border-black/10 px-1.5 py-0.5 dark:border-white/15">
                  <CornerDownLeft className="size-3" />
                </kbd>
                yap it
              </>
            )}
          </span>
        )}
      </motion.div>

      {/* Footer: suggestions + key hints */}
      {!floating && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setText(s)
                  taRef.current?.focus()
                }}
                className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs text-zinc-600 transition hover:border-orange-400/50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-black/10 px-1.5 py-0.5 dark:border-white/15">
                <CornerDownLeft className="size-3" />
              </kbd>
              yap it
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-black/10 px-1.5 py-0.5 dark:border-white/15">⇧↵</kbd>
              new line
            </span>
            <span className="hidden items-center gap-1.5 xl:flex">
              <kbd className="rounded border border-black/10 px-1.5 py-0.5 dark:border-white/15">⌘Z</kbd>
              undo
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
})

export default CaptureCard
