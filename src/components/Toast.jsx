import { motion, AnimatePresence } from 'framer-motion'
import { Undo2 } from 'lucide-react'

export default function Toast({ toast, onUndo, raised }) {
  return (
    <div className={`pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-4 transition-[bottom] duration-300 ${raised ? 'bottom-44 lg:bottom-32' : 'bottom-24 lg:bottom-8'}`}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex max-w-2xl items-center gap-3 rounded-full bg-zinc-900 py-2 pl-5 pr-2 text-sm font-medium text-white shadow-2xl shadow-black/30 dark:bg-white dark:text-zinc-900"
          >
            <span className={`size-2 shrink-0 rounded-full ${toast.tone === 'warn' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="py-0.5">{toast.text}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={onUndo}
                className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition hover:bg-white/25 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20"
              >
                <Undo2 className="size-3.5" /> Undo
              </button>
            ) : (
              <span className="pr-3" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
