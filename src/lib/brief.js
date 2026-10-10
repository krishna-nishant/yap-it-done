import { todayKey, tomorrowKey, toMin, nowMin, fmtTime, daysLeft } from './dates'

const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
const at = (e) => (e.start ? `${e.title} at ${fmtTime(e.start)}` : e.title)

function freeLine(events) {
  const timed = events.filter((e) => e.start)
  if (!timed.length) return "You're free all day."
  const lastEnd = Math.max(...timed.map((e) => toMin(e.end || e.start)))
  if (lastEnd <= nowMin()) return "You're free for the rest of the day."
  const hh = String(Math.floor(lastEnd / 60)).padStart(2, '0')
  const mm = String(lastEnd % 60).padStart(2, '0')
  return `You're free after ${fmtTime(`${hh}:${mm}`)}.`
}

function projectLines(state) {
  const lines = []
  for (const p of state.projects) {
    if (p.status === 'done') continue
    const left = daysLeft(p.deadline)
    if (p.status === 'at-risk') lines.push(`${p.name} is at risk${left != null && left >= 0 ? `, due in ${plural(left, 'day')}` : ''}.`)
    else if (p.status === 'blocked') lines.push(`${p.name} is blocked${p.note ? `: ${p.note.replace(/\s*·\s*/g, ', ')}` : ''}.`)
    else if (left === 0) lines.push(`${p.name} is due today.`)
    else if (left === 1) lines.push(`${p.name} is due tomorrow.`)
  }
  return lines.slice(0, 3)
}

// mode: 'now' (rest of today) | 'morning' | 'evening'
export function buildBrief(state, mode = 'now', name = 'Krishna') {
  const today = todayKey()
  const tomorrow = tomorrowKey()
  const byTime = (a, b) => (toMin(a.start) ?? 9999) - (toMin(b.start) ?? 9999)
  const eventsToday = state.events.filter((e) => e.date === today && !e.done).sort(byTime)
  const openToday = state.todos.filter((t) => t.date === today && !t.done)
  const tasks = openToday.filter((t) => t.kind !== 'followup')
  const followToday = openToday.filter((t) => t.kind === 'followup')
  const s = []

  if (mode === 'morning') {
    s.push(`Good morning, ${name}. Here's your day.`)
    s.push(eventsToday.length ? `You have ${plural(eventsToday.length, 'event')}: ${list(eventsToday.slice(0, 5).map(at))}.` : 'Your calendar is clear today.')
    if (tasks.length) {
      const carried = tasks.filter((t) => t.carriedOver).length
      s.push(`${plural(tasks.length, 'to-do')} on your plate: ${list(tasks.slice(0, 5).map((t) => t.title))}${carried ? `, including ${carried} carried over` : ''}.`)
    }
    if (followToday.length) s.push(`Follow up on ${list(followToday.map((t) => t.title.replace(/^follow up (with|on)\s*/i, '')))}.`)
    s.push(...projectLines(state))
    s.push(freeLine(eventsToday))
    s.push("Let's yap it done.")
    return { title: 'Morning brief', sentences: s }
  }

  if (mode === 'evening') {
    const doneTodos = state.todos.filter((t) => t.done && (t.date === today || (t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString())))
    const doneEvents = state.events.filter((e) => e.done && e.date === today)
    const done = [...doneTodos, ...doneEvents]
    const tmrEvents = state.events.filter((e) => e.date === tomorrow && !e.done).sort(byTime)
    const tmrFollow = state.todos.filter((t) => t.date === tomorrow && !t.done && t.kind === 'followup')
    s.push(`Good evening, ${name}. Here's your wrap-up.`)
    s.push(done.length ? `You finished ${plural(done.length, 'thing')}: ${list(done.slice(0, 5).map((t) => t.title))}. Nice work.` : "Nothing ticked off today, and that's okay.")
    if (openToday.length) s.push(`${plural(openToday.length, 'thing')} still open: ${list(openToday.slice(0, 4).map((t) => t.title))}. Tap Close the day to carry them to tomorrow.`)
    else s.push('Your plate is clear.')
    if (tmrEvents.length) s.push(`Tomorrow starts with ${at(tmrEvents[0])}${tmrEvents.length > 1 ? `, and ${plural(tmrEvents.length - 1, 'more event')} after that` : ''}.`)
    if (tmrFollow.length) s.push(`Follow-ups tomorrow: ${list(tmrFollow.map((t) => t.title))}.`)
    s.push(...projectLines(state).slice(0, 2))
    s.push('Rest well.')
    return { title: 'Evening wrap', sentences: s }
  }

  const upcoming = eventsToday.filter((e) => e.start && toMin(e.end || e.start) > nowMin())
  const hour = new Date().getHours()
  s.push(`${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${name}. Here's the rest of your day.`)
  s.push(upcoming.length ? `Still on the calendar: ${list(upcoming.slice(0, 4).map(at))}.` : 'Nothing left on the calendar.')
  s.push(tasks.length ? `${plural(tasks.length, 'pending task')}: ${list(tasks.slice(0, 5).map((t) => t.title))}.` : 'No pending tasks. Nice.')
  if (followToday.length) s.push(`Follow up on ${list(followToday.map((t) => t.title.replace(/^follow up (with|on)\s*/i, '')))}.`)
  s.push(...projectLines(state).slice(0, 2))
  s.push(freeLine(eventsToday))
  return { title: 'Rest of today', sentences: s }
}
