import { Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, WifiOff, TriangleAlert, Undo2 } from 'lucide-react'
import { TONE_DOT } from '../lib/theme'

export default function HeardYou({ heard, onChipClick, onUndo }) {
  return (
    <AnimatePresence mode="wait">
      {heard && (
        <motion.div
          key={heard.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex flex-wrap items-center gap-2 px-1"
        >
          <span className="mr-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {heard.source === 'offline' ? <WifiOff className="size-3.5 text-amber-500" /> : <Check className="size-3.5 text-emerald-500" />}
            {heard.source === 'offline' ? 'Offline guess' : 'Heard you'} · {heard.ms} ms
          </span>
          {heard.applied.length === 0 && <span className="text-sm text-zinc-500">Nothing new to change.</span>}
          {heard.applied.map((a, i) => (
            <Fragment key={i}>
              <motion.button
                type="button"
                onClick={() => onChipClick?.(a)}
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.06 * i, type: 'spring', stiffness: 400, damping: 26 }}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[13px] backdrop-blur transition hover:border-orange-400/50 dark:border-white/10 dark:bg-white/[0.05]"
              >
                <span className={`size-1.5 rounded-full ${TONE_DOT[a.tone] || TONE_DOT.zinc}`} />
                <span className="text-zinc-500 dark:text-zinc-400">{a.verb}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{a.label}</span>
              </motion.button>
              {a.warning && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.06 * i + 0.1 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[13px] font-medium text-amber-700 dark:text-amber-300"
                >
                  <TriangleAlert className="size-3.5" /> {a.warning}
                </motion.span>
              )}
            </Fragment>
          ))}
          {heard.applied.length > 0 && heard.canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Undo2 className="size-3.5" /> Undo
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
