import * as chrono from 'chrono-node'
import { format } from 'date-fns'
import { dayKey, relDay, fmtTime, todayKey, tomorrowKey, addMinutes } from './dates'

// Hinglish → English so chrono can read it ("kal 9 baje" → "tomorrow at 9")
export function normalize(text) {
  return text
    .replace(/\bkal\b/gi, 'tomorrow')
    .replace(/\bparso\b/gi, 'day after tomorrow')
    .replace(/\baaj\b/gi, 'today')
    .replace(/(\d{1,2})(?:[:.](\d{2}))?\s*baje/gi, (_, h, m) => `at ${h}${m ? ':' + m : ''}`)
    .replace(/\bshaam\b/gi, 'this evening')
    .replace(/\bsubah\b/gi, 'morning')
    .replace(/\bdopahar\b/gi, 'afternoon')
    .replace(/\braat\b/gi, 'tonight')
    .replace(/\bafter lunch\b/gi, 'at 2pm')
}

// Bare "at 3" → 3 PM (1–7 are PM unless said otherwise); times already past roll to the next day
function resolve(result, ref) {
  const d = result.start.date()
  const hasTime = result.start.isCertain('hour')
  if (hasTime && !result.start.isCertain('meridiem')) {
    const h = d.getHours()
    if (h >= 1 && h <= 7) d.setHours(h + 12)
  }
  const dayGiven = result.start.isCertain('day')
  if (!dayGiven && result.start.isCertain('weekday') && d < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) d.setDate(d.getDate() + 7)
  return { date: dayKey(d), time: hasTime ? format(d, 'HH:mm') : null, text: result.text }
}

export function parseTimes(text) {
  try {
    const ref = new Date()
    return chrono.parse(normalize(text), ref).map((r) => resolve(r, ref))
  } catch {
    return []
  }
}

const significantWords = (name) => name.toLowerCase().split(/\W+/).filter((w) => w.length >= 4)

export function mentionedProjects(text, projects) {
  const lower = text.toLowerCase()
  return projects.filter((p) => significantWords(p.name).some((w) => new RegExp(`\\b${w}\\b`).test(lower)))
}

const INTENTS = [
  [/\b(finished|completed|done with|wrapped up|ho gaya)\b/i, 'done'],
  [/\b(didn'?t get to|couldn'?t|skipped|missed|nahi hua)\b/i, 'carry over'],
  [/\b(follow up|remind me|ping|check with)\b/i, 'follow-up'],
  [/\b(idea|what if|maybe we)\b/i, 'idea'],
  [/\b(blocked|at risk|on track|stuck|delayed)\b/i, 'project update'],
]

// Rough guess shown instantly while typing / while Gemini thinks
export function instantGuess(text, projects) {
  if (!text.trim()) return []
  const chips = []
  for (const t of parseTimes(text).slice(0, 2)) {
    chips.push({ kind: 'instant guess', label: [relDay(t.date), t.time && fmtTime(t.time)].filter(Boolean).join(' ') })
  }
  for (const p of mentionedProjects(text, projects).slice(0, 2)) chips.push({ kind: 'mentions', label: p.name })
  for (const [re, label] of INTENTS) if (re.test(text)) chips.push({ kind: 'sounds like', label })
  return chips.slice(0, 5)
}

// ---------- Offline fallback: used only if Gemini is unreachable ----------
const FILLER = /^(the|a|an|so|and|also|then|ok(ay)?|um+|uh+|like|i have|i've got|i need to|i have to|need to|have to|i should|remind me to|follow up (with|on)?|random idea,?|idea:?|i|today|aaj)\s+/i

function cleanTitle(s, timeText) {
  let t = s
  if (timeText) t = t.replace(timeText, '')
  t = t.replace(/\b(today|tomorrow|tonight|this (morning|evening|afternoon)|at \d{1,2}(:\d{2})?\s*(am|pm)?)\b/gi, '')
  for (let i = 0; i < 4; i++) t = t.trim().replace(FILLER, '')
  t = t.replace(/\s+/g, ' ').replace(/[,.;:\s]+$/, '').trim()
  if (!t) return ''
  t = t.length > 48 ? t.slice(0, 46).trim() + '…' : t
  return t[0].toUpperCase() + t.slice(1)
}

const guessCategory = (s) =>
  /gym|run|yoga|walk|doctor/i.test(s) ? 'health' :
  /coffee|lunch|dinner|party|friends?/i.test(s) ? 'social' :
  /mom|dad|family|bhai|didi/i.test(s) ? 'family' :
  /buy|grocer|pay|bill|pick up/i.test(s) ? 'errand' :
  /study|class|exam|read/i.test(s) ? 'study' : 'work'

const EMOJI = { health: '💪', social: '☕', family: '🏠', errand: '🛒', study: '📚', work: '💼', idea: '💡' }

export function fallbackParse(text, state) {
  const actions = []
  const sentences = normalize(text).split(/(?<=[.!?])\s+|\n+|\s+and then\s+/i).map((s) => s.trim()).filter(Boolean)
  for (const s of sentences) {
    const times = parseTimes(s)
    const time = times.find((t) => t.time) || times[0]
    const title = cleanTitle(s, time?.text) || s.slice(0, 40)
    const category = guessCategory(s)
    const base = { title, category, emoji: EMOJI[category] }
    const project = mentionedProjects(s, state.projects)[0]
    if (/\b(finished|completed|done with|wrapped up)\b/i.test(s)) actions.push({ ...base, type: 'mark_done', title: cleanTitle(s.replace(/\b(finished|completed|done with|wrapped up)\b/i, ''), time?.text) || title })
    else if (/\b(didn'?t get to|couldn'?t|skipped|missed)\b/i.test(s)) actions.push({ ...base, type: 'carry_over', title: cleanTitle(s.replace(/\b(didn'?t get to|couldn'?t|skipped|missed)( the)?\b/i, ''), time?.text) || title })
    else if (/\b(follow up|remind me|ping)\b/i.test(s)) actions.push({ ...base, type: 'add_followup', date: time?.date || tomorrowKey() })
    else if (project && /\b(blocked|at risk|on track|stuck|delayed|done)\b/i.test(s)) {
      const status = /blocked|stuck|waiting/i.test(s) ? 'blocked' : /risk|delayed|behind/i.test(s) ? 'at-risk' : /done|shipped/i.test(s) ? 'done' : 'on-track'
      actions.push({ ...base, type: 'update_project', targetId: project.id, title: project.name, status, note: cleanTitle(s) })
    } else if (/\bproject\b/i.test(s) && !project) actions.push({ ...base, type: 'add_project', title: cleanTitle(s.replace(/\b(new )?project\b/i, ''), time?.text) || title, status: 'on-track', deadline: time?.date })
    else if (/\b(idea|what if)\b/i.test(s)) actions.push({ ...base, type: 'add_idea', category: 'idea', emoji: '💡' })
    else if (time?.time) actions.push({ ...base, type: 'add_event', date: time.date, start: time.time, end: addMinutes(time.time, /coffee|call/i.test(s) ? 30 : 60), projectId: project?.id })
    else actions.push({ ...base, type: 'add_todo', date: time?.date || todayKey(), projectId: project?.id })
  }
  return actions
}

// Safety net: Gemini lite sometimes drops `repeat`. If the user said "every …" in the
// sentence that mentions this event, fill repeat/repeatDays from the text.
const DAY_WORDS = { mon: /\bmon(day)?s?\b/i, tue: /\btue(s|sday)?s?\b/i, wed: /\bwed(nesday)?s?\b/i, thu: /\bthu(rs|rsday)?s?\b/i, fri: /\bfri(day)?s?\b/i, sat: /\bsat(urday)?s?\b/i, sun: /\bsun(day)?s?\b/i }
export function inferRepeats(text, actions) {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/)
  const seen = new Set()
  const norm = (t) => (t || '').toLowerCase().trim()
  // Gemini sometimes splits "gym every Mon, Wed, Fri" into one event per day: keep one series
  return actions
    .map((a) => {
    if (a.type !== 'add_event' || a.repeat || a.repeatDays?.length) return a
    const words = (a.title || '').toLowerCase().split(/\W+/).filter((w) => w.length > 2)
    const s = sentences.find((x) => /\b(every|daily|roz|har din|weekdays?)\b/i.test(x) && words.some((w) => x.toLowerCase().includes(w)))
    if (!s) return a
    if (/\b(every ?day|daily|roz|har din)\b/i.test(s)) return { ...a, repeat: 'daily' }
    if (/\bweekdays?\b|every weekday/i.test(s)) return { ...a, repeat: 'weekdays' }
    const days = Object.keys(DAY_WORDS).filter((d) => DAY_WORDS[d].test(s))
    return /\bevery\b/i.test(s) ? { ...a, repeat: 'weekly', repeatDays: days } : a
    })
    .filter((a) => {
      if (a.type !== 'add_event' || !(a.repeat || a.repeatDays?.length)) return true
      const key = norm(a.title)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
