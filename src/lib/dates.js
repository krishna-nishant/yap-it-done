import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns'

const pad = (n) => String(n).padStart(2, '0')

export const dayKey = (d = new Date()) => format(d, 'yyyy-MM-dd')
export const todayKey = () => dayKey()
export const tomorrowKey = () => dayKey(addDays(new Date(), 1))
export const fromKey = (key) => parseISO(key)
export const shiftKey = (key, days) => dayKey(addDays(parseISO(key), days))

export const isTime = (v) => typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v)
export const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

export const toMin = (hhmm) => {
  if (!isTime(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const fromMin = (min) => {
  const m = Math.max(0, Math.min(min, 23 * 60 + 59))
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}
export const addMinutes = (hhmm, mins) => fromMin(toMin(hhmm) + mins)
export const nowMin = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

// "15:30" -> "3:30 PM" (or "3:30" when short)
export function fmtTime(hhmm, { short = false } = {}) {
  const min = toMin(hhmm)
  if (min == null) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  const h12 = h % 12 || 12
  const base = m ? `${h12}:${pad(m)}` : `${h12}`
  return short ? (m ? base : `${h12}:00`) : `${base} ${h < 12 ? 'AM' : 'PM'}`
}
export const fmtRange = (start, end) => (end ? `${fmtTime(start, { short: true })} – ${fmtTime(end, { short: true })}` : fmtTime(start))

// "today" / "tomorrow" / "Mon" / "Oct 14"
export function relDay(key) {
  if (!isDate(key)) return ''
  const diff = differenceInCalendarDays(parseISO(key), new Date())
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 1 && diff < 7) return format(parseISO(key), 'EEE')
  return format(parseISO(key), 'MMM d')
}
export const daysLeft = (key) => (isDate(key) ? differenceInCalendarDays(parseISO(key), new Date()) : null)
export const whenLabel = (date, start) => [relDay(date), start ? fmtTime(start) : ''].filter(Boolean).join(' ')
