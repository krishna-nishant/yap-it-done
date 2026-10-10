// Shared style tokens. Full class strings so Tailwind can see them.

const mk = (block, dot, text) => ({ block, dot, text })

export const CATEGORY = {
  work: mk('bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:bg-indigo-400/15 dark:border-indigo-300/30 dark:text-indigo-50', 'bg-indigo-400', 'text-indigo-600 dark:text-indigo-300'),
  social: mk('bg-rose-500/10 border-rose-500/30 text-rose-950 dark:bg-rose-400/15 dark:border-rose-300/30 dark:text-rose-50', 'bg-rose-400', 'text-rose-600 dark:text-rose-300'),
  health: mk('bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:bg-emerald-400/15 dark:border-emerald-300/30 dark:text-emerald-50', 'bg-emerald-400', 'text-emerald-600 dark:text-emerald-300'),
  errand: mk('bg-amber-500/10 border-amber-500/30 text-amber-950 dark:bg-amber-400/15 dark:border-amber-300/30 dark:text-amber-50', 'bg-amber-400', 'text-amber-600 dark:text-amber-300'),
  study: mk('bg-sky-500/10 border-sky-500/30 text-sky-950 dark:bg-sky-400/15 dark:border-sky-300/30 dark:text-sky-50', 'bg-sky-400', 'text-sky-600 dark:text-sky-300'),
  personal: mk('bg-violet-500/10 border-violet-500/30 text-violet-950 dark:bg-violet-400/15 dark:border-violet-300/30 dark:text-violet-50', 'bg-violet-400', 'text-violet-600 dark:text-violet-300'),
  family: mk('bg-orange-500/10 border-orange-500/30 text-orange-950 dark:bg-orange-400/15 dark:border-orange-300/30 dark:text-orange-50', 'bg-orange-400', 'text-orange-600 dark:text-orange-300'),
  finance: mk('bg-teal-500/10 border-teal-500/30 text-teal-950 dark:bg-teal-400/15 dark:border-teal-300/30 dark:text-teal-50', 'bg-teal-400', 'text-teal-600 dark:text-teal-300'),
  idea: mk('bg-yellow-500/10 border-yellow-500/30 text-yellow-950 dark:bg-yellow-400/15 dark:border-yellow-300/30 dark:text-yellow-50', 'bg-yellow-400', 'text-yellow-600 dark:text-yellow-300'),
  default: mk('bg-slate-500/10 border-slate-500/30 text-slate-950 dark:bg-slate-400/15 dark:border-slate-300/30 dark:text-slate-50', 'bg-slate-400', 'text-slate-600 dark:text-slate-300'),
}
export const catStyle = (c) => CATEGORY[(c || '').toLowerCase()] || CATEGORY.default

// Dots for the "Heard you" row
export const TONE_DOT = {
  blue: 'bg-indigo-400',
  amber: 'bg-amber-400',
  violet: 'bg-violet-400',
  rose: 'bg-rose-400',
  green: 'bg-emerald-400',
  sky: 'bg-sky-400',
  yellow: 'bg-yellow-400',
  zinc: 'bg-zinc-400',
}

export const STATUS = {
  'on-track': { label: 'On track', pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300', ring: '#34d399' },
  'at-risk': { label: 'At risk', pill: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300', ring: '#fb7185' },
  blocked: { label: 'Blocked', pill: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30 dark:text-zinc-300', ring: '#a1a1aa' },
  done: { label: 'Done', pill: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:text-indigo-300', ring: '#818cf8' },
}
export const STATUS_ORDER = ['on-track', 'at-risk', 'blocked', 'done']

// Glassy panel surface used by every card
export const PANEL =
  'rounded-[28px] border border-black/[0.06] bg-white/60 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_20px_60px_-30px_rgba(60,20,40,0.35)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_30px_80px_-40px_rgba(0,0,0,0.8)]'

// Small mono label (e.g. "PROJECTS", "1 of 4 done")
export const LABEL = 'font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400'

// Ring shown on an item for ~2.5s after voice changed it
export const HIGHLIGHT = 'ring-2 ring-orange-400/80 shadow-[0_0_24px_-4px_rgba(251,146,60,0.7)]'
