import { motion } from 'framer-motion'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { PANEL } from '../lib/theme'

const EXAMPLES = [
  {
    emoji: '☀️',
    label: 'Morning plan',
    phrase: 'Standup at 10, then deep work on the pitch deck until 1. Lunch with Riya at 1:30, gym at 7 and buy groceries.',
  },
  {
    emoji: '🚀',
    label: 'Projects & ideas',
    phrase: "New project College Fest due on the 20th, it's on track. Remind me to call the sponsor tomorrow. Random idea, a fest Instagram countdown.",
  },
  {
    emoji: '🔁',
    label: 'Hinglish & repeats',
    phrase: 'Kal subah 9 baje dentist. Gym every Monday, Wednesday and Friday at 7 pm. Follow up with Arjun about the website on Thursday.',
  },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }
const item = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

// First-run empty state: three tappable example phrases
export default function Onboarding({ onTry, onDemo }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`${PANEL} relative overflow-hidden p-6 sm:p-8`}
    >
      {/* soft glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl dark:bg-orange-500/15" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-64 w-72 rounded-full bg-fuchsia-500/15 blur-3xl dark:bg-fuchsia-500/10" />

      <div className="relative">
        <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">
          <Sparkles className="size-3.5" /> First time here
        </div>
        <h2 className="font-serif text-4xl tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">Talk to it. It sorts itself.</h2>
        <p className="mt-2 font-mono text-[12px] text-zinc-500 dark:text-zinc-400">Tap an example or hold your Wispr Flow key and ramble</p>

        <motion.div variants={container} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <motion.button
              key={ex.label}
              type="button"
              variants={item}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTry?.(ex.phrase)}
              className="group relative flex flex-col items-start gap-3 rounded-2xl border border-black/[0.06] bg-white/60 p-4 text-left shadow-sm transition-[border-color,box-shadow,background-color] duration-300 hover:border-orange-400/60 hover:bg-white/90 hover:shadow-[0_0_0_1px_rgba(251,146,60,0.25),0_18px_40px_-18px_rgba(251,146,60,0.55)] dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-medium text-zinc-900 dark:text-zinc-50">
                  <span className="text-lg">{ex.emoji}</span>
                  {ex.label}
                </span>
                <ArrowUpRight className="size-4 text-zinc-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-500" />
              </div>
              <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">“{ex.phrase}”</p>
              <span className="mt-auto font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition group-hover:text-orange-500 dark:text-zinc-500">
                Tap to try →
              </span>
            </motion.button>
          ))}
        </motion.div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => onDemo?.()}
            className="font-mono text-[12px] text-zinc-500 underline decoration-zinc-400/40 underline-offset-4 transition hover:text-zinc-900 hover:decoration-orange-400 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            or load demo data
          </button>
        </div>
      </div>
    </motion.section>
  )
}
