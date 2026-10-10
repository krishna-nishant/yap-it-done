import { motion } from 'framer-motion'
import { AlignLeft, LayoutPanelTop, Sun, Moon, SunMoon, AudioLines } from 'lucide-react'

export const PANELS = [
  { id: 'dump', label: 'Dump', icon: AlignLeft },
  { id: 'projects', label: 'Projects', icon: LayoutPanelTop },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'wrap', label: 'Wrap up', icon: Moon },
]

function Item({ id, active, label, icon: Icon, badge, onClick, layoutGroup }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-rail={id}
      className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] transition ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'}`}
    >
      {active && (
        <motion.span
          layoutId={layoutGroup}
          className="absolute inset-0 rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-white/10"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative">
        <Icon className="size-[18px]" strokeWidth={1.75} />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-2 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 font-mono text-[9px] font-medium text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="relative">{label}</span>
    </button>
  )
}

export default function Rail({ panel, setPanel, theme, toggleTheme, badges }) {
  return (
    <>
      {/* Desktop: vertical rail */}
      <aside className="sticky top-6 hidden h-fit w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[26px] border border-black/[0.06] bg-white/60 p-2.5 backdrop-blur-2xl lg:flex dark:border-white/[0.08] dark:bg-white/[0.035]">
        <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-orange-500/30">
          <AudioLines className="size-5 text-white" strokeWidth={2.25} />
        </div>
        {PANELS.map((p) => (
          <Item key={p.id} {...p} active={panel === p.id} badge={badges[p.id]} onClick={() => setPanel(p.id)} layoutGroup="rail-active" />
        ))}
        <div className="my-1 h-px w-8 bg-black/10 dark:bg-white/10" />
        <Item label="Theme" icon={SunMoon} onClick={toggleTheme} />
        <div className="mt-1 grid size-9 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-semibold text-white">KN</div>
      </aside>

      {/* Mobile: bottom tab bar */}
      <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-around rounded-[22px] border border-black/[0.06] bg-white/80 p-1.5 backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-zinc-900/80">
        {PANELS.map((p) => (
          <div key={p.id} className="flex-1">
            <Item {...p} active={panel === p.id} badge={badges[p.id]} onClick={() => setPanel(p.id)} layoutGroup="tab-active" />
          </div>
        ))}
        <div className="flex-1">
          <Item label={theme === 'dark' ? 'Light' : 'Dark'} icon={SunMoon} onClick={toggleTheme} />
        </div>
      </nav>
    </>
  )
}
