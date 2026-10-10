import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, KeyRound, ExternalLink, Eye, EyeOff, Loader2, WifiOff, Trash2 } from 'lucide-react'
import { FREE_PROMPTS, getUserKey, setUserKey, validateKey, freeLeft } from '../lib/gemini'

// reason: 'limit' (free prompts used up) | 'busy' (owner's free quota rate-limited) | 'settings' (opened from the footer)
export default function KeyModal({ open, reason, onClose, onSaved, onOffline }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const existing = getUserKey()

  useEffect(() => {
    if (!open) return
    setKey('')
    setError('')
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const save = async () => {
    const k = key.trim()
    if (!k) return setError('Paste your key first.')
    setChecking(true)
    setError('')
    const ok = await validateKey(k)
    setChecking(false)
    if (!ok) return setError("That key didn't work. Double-check it and try again.")
    setUserKey(k)
    onSaved()
  }

  const remove = () => {
    setUserKey('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
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
            className="glow-card relative w-full max-w-lg rounded-[32px] bg-white/95 p-7 shadow-2xl sm:p-8 dark:bg-[#170e14]/95"
          >
            <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-zinc-500 transition hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">
              <X className="size-4" />
            </button>

            <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">
              <KeyRound className="size-3.5" /> {reason === 'limit' ? 'Free yaps used up' : reason === 'busy' ? 'Lots of yappers right now' : 'Gemini key'}
            </div>
            <h2 className="font-serif text-4xl leading-tight text-zinc-900 dark:text-zinc-50">
              {reason === 'limit' ? `You used your ${FREE_PROMPTS} free yap${FREE_PROMPTS === 1 ? '' : 's'} 🎉` : reason === 'busy' ? 'Krishna’s free key is busy 🔥' : existing ? 'Using your own key' : 'Bring your own key'}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              Yap It Done is a fun project by Krishna. To keep yapping, add your own <b>free</b> Gemini key. It stays in this browser and goes straight to Google, never to anyone else.
            </p>

            <ol className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-2">
                <span className="font-mono text-orange-500">1.</span>
                <span>
                  Open{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-orange-600 underline underline-offset-2 dark:text-orange-300">
                    Google AI Studio <ExternalLink className="size-3" />
                  </a>{' '}
                  and sign in
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-orange-500">2.</span> Click <b>Create API key</b> and copy it
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-orange-500">3.</span> Paste it below
              </li>
            </ol>

            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-3 py-2 focus-within:border-orange-400/70 dark:border-white/10 dark:bg-white/[0.04]">
              <input
                autoFocus
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder={existing ? 'Paste a new key to replace yours' : 'Paste your Gemini API key'}
                className="min-w-0 flex-1 bg-transparent py-1 font-mono text-sm outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="text-zinc-500" aria-label={show ? 'Hide key' : 'Show key'}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(reason === 'limit' || reason === 'busy') && (
                  <button type="button" onClick={onOffline} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
                    <WifiOff className="size-4" /> Try offline mode
                  </button>
                )}
                {existing && reason === 'settings' && (
                  <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400">
                    <Trash2 className="size-4" /> Remove my key
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={save}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-60 dark:bg-white dark:text-zinc-900"
              >
                {checking && <Loader2 className="size-4 animate-spin" />} {checking ? 'Checking…' : 'Save & keep yapping'}
              </button>
            </div>
            {!existing && reason === 'settings' && <p className="mt-4 text-center font-mono text-[11px] text-zinc-500">{freeLeft()} free yap{freeLeft() === 1 ? '' : 's'} left on Krishna's key</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
