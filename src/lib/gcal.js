import { addDays, format, parseISO } from 'date-fns'
import { addMinutes, isTime, isDate } from './dates'

const stamp = (date, time) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`
const nextDay = (date) => format(addDays(parseISO(date), 1), 'yyyyMMdd')

// item: { title, date: 'yyyy-MM-dd', start?: 'HH:mm', end?: 'HH:mm', details? }
// Timed → exact slot in your time zone; date only → all-day.
export function googleCalendarUrl({ title, date, start, end, details }) {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title || 'Untitled' })
  if (isDate(date) && isTime(start)) {
    const en = isTime(end) && end > start ? end : addMinutes(start, 60)
    params.set('dates', `${stamp(date, start)}/${stamp(date, en)}`)
    params.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone)
  } else if (isDate(date)) {
    params.set('dates', `${date.replaceAll('-', '')}/${nextDay(date)}`)
  }
  params.set('details', details || 'Added from Yap It Done 🎙️')
  return `https://calendar.google.com/calendar/render?${params}`
}

export function openInGoogleCalendar(item) {
  window.open(googleCalendarUrl(item), '_blank', 'noopener,noreferrer')
}

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

// Downloads an .ics file (Apple Calendar, Outlook, Google import)
export function downloadIcs({ title, date, start, end, details }) {
  if (!isDate(date)) return
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const timed = isTime(start)
  const en = timed ? (isTime(end) && end > start ? end : addMinutes(start, 60)) : null
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yap It Done//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@yapitdone`,
    `DTSTAMP:${now}`,
    timed ? `DTSTART:${stamp(date, start)}` : `DTSTART;VALUE=DATE:${date.replaceAll('-', '')}`,
    timed ? `DTEND:${stamp(date, en)}` : `DTEND;VALUE=DATE:${nextDay(date)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(details || 'Added from Yap It Done')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
