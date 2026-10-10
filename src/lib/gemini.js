import { buildRequestBody, clockNow, slimState } from './brain'

// Who pays for the call:
//  1. the visitor's own key (saved in their browser), else
//  2. VITE_GEMINI_API_KEY in .env.local (local dev only, never set this on Vercel), else
//  3. the owner's key via the /api/parse server function (production), up to FREE_PROMPTS per browser.
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest'
const FALLBACK = import.meta.env.VITE_GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'
export const FREE_PROMPTS = Number(import.meta.env.VITE_FREE_PROMPTS) || 122

const KEY_STORAGE = 'yap-it-done:gemini-key'
const USAGE_STORAGE = 'yap-it-done:usage'

export const geminiConfigured = true
export const modelName = MODEL

export function getUserKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}
export function setUserKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage blocked */
  }
}
export function getUsage() {
  try {
    return Number(localStorage.getItem(USAGE_STORAGE)) || 0
  } catch {
    return 0
  }
}
function bumpUsage() {
  try {
    localStorage.setItem(USAGE_STORAGE, String(getUsage() + 1))
  } catch {
    /* storage blocked */
  }
}
export const freeLeft = () => Math.max(0, FREE_PROMPTS - getUsage())

export class NeedKeyError extends Error {
  constructor() {
    super(`Used all ${FREE_PROMPTS} free prompts`)
    this.name = 'NeedKeyError'
  }
}

async function request(url, init) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data?.error?.message || `Gemini HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    const raw = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text
    if (!raw) throw new Error('Gemini returned no content')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.actions)) throw new Error('Gemini returned no actions')
    return parsed.actions
  } finally {
    clearTimeout(timer)
  }
}

const callDirect = (key, model, text, state, thinking, clock) =>
  request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
    body: JSON.stringify(buildRequestBody(text, state, { thinking, clock })),
  })

const callProxy = (model, text, state, thinking, clock) =>
  request('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, text, state, thinking, clock }),
  })

// Race two fast models in parallel and take whichever answers first; retry once with a third.
export async function parseWithGemini(text, state) {
  const userKey = getUserKey()
  const mode = userKey ? 'own key' : ENV_KEY ? 'dev key' : 'shared'
  if (!userKey && getUsage() >= FREE_PROMPTS) throw new NeedKeyError()

  const t0 = performance.now()
  const clock = clockNow()
  const slim = slimState(state)
  const call = (model, thinking) =>
    (mode === 'shared' ? callProxy(model, text, slim, thinking, clock) : callDirect(userKey || ENV_KEY, model, text, slim, thinking, clock)).then((actions) => ({
      actions,
      model,
      ms: Math.round(performance.now() - t0),
    }))

  const rounds = [
    [[MODEL, !MODEL.includes('latest')], [FALLBACK, true]],
    [['gemini-3.1-flash-lite', false], [FALLBACK, false]],
  ]
  let lastErr
  for (const round of rounds) {
    try {
      const result = await Promise.any(round.map(([model, thinking]) => call(model, thinking)))
      if (!userKey) bumpUsage()
      console.groupCollapsed(`%c[yap] ${result.model} · ${result.ms}ms · ${result.actions.length} actions · ${mode}`, 'color:#fb923c')
      console.log('said:', text)
      console.table(result.actions)
      console.groupEnd()
      return { ...result, mode }
    } catch (err) {
      lastErr = err.errors?.[0] || err
      console.warn('[yap] gemini round failed:', (err.errors || [err]).map((e) => e.message).join(' | '))
    }
  }
  throw lastErr
}

// Cheap check that a pasted key works
export async function validateKey(key) {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'X-goog-api-key': key.trim() } })
    return res.ok
  } catch {
    return false
  }
}
