// Vercel serverless function: calls Gemini with the owner's key (GEMINI_API_KEY),
// so the key never ships to the browser. Only builds Yap It Done prompts, so it
// can't be used as a general-purpose Gemini proxy.
import { buildRequestBody } from '../src/lib/brain.js'

const MODELS = new Set(['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])
const isClock = (c) =>
  c && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && /^\d{2}:\d{2}$/.test(c.time) && typeof c.weekday === 'string' && typeof c.timeZone === 'string'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'POST only' } })
  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: { message: 'GEMINI_API_KEY is not set on the server' } })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const { text, state = {}, model = 'gemini-flash-lite-latest', thinking = false, clock } = body
  if (typeof text !== 'string' || !text.trim() || text.length > 3000) return res.status(400).json({ error: { message: 'text must be 1-3000 characters' } })
  if (!MODELS.has(model)) return res.status(400).json({ error: { message: 'model not allowed' } })
  if (!isClock(clock)) return res.status(400).json({ error: { message: 'clock is required' } })

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify(buildRequestBody(text, state, { thinking: Boolean(thinking), clock })),
    })
    const data = await r.text()
    res.status(r.status).setHeader('Content-Type', 'application/json').send(data)
  } catch (err) {
    res.status(502).json({ error: { message: `Upstream error: ${err.message}` } })
  }
}
