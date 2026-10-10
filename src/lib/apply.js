import { uid } from './ids'
import { todayKey, tomorrowKey, addMinutes, toMin, fromMin, isTime, isDate, whenLabel, relDay, fmtRange, fmtTime, shiftKey, fromKey } from './dates'
import { STATUS } from './theme'

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const STOP = new Set(['the', 'a', 'an', 'to', 'with', 'for', 'on', 'my', 'and', 'of', 'at', 'in', 'finish', 'do'])
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w))

function similar(a, b) {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  const wb = new Set(words(b))
  return words(a).some((w) => wb.has(w))
}

const defaultDuration = (title) => (/coffee|call|chai|ping/i.test(title) ? 30 : 60)
const cleanTitle = (t) => {
  const s = (t || '').trim().replace(/[.\s]+$/, '')
  return s ? s[0].toUpperCase() + s.slice(1) : 'Untitled'
}

function findItem(s, id, title, cols = ['todos', 'events']) {
  if (id) {
    for (const col of ['todos', 'events', 'projects', 'ideas']) {
      const it = s[col].find((x) => x.id === id)
      if (it) return { col, it }
    }
  }
  if (title) {
    for (const col of cols) {
      const pool = s[col].filter((x) => !x.done)
      const it = pool.find((x) => norm(x.title || x.name) === norm(title)) || pool.find((x) => similar(x.title || x.name, title))
      if (it) return { col, it }
    }
  }
  return null
}

function findProject(s, id, name) {
  return (id && s.projects.find((p) => p.id === id)) || (name && s.projects.find((p) => similar(p.name, name))) || null
}

// First other event on the same day whose time overlaps ev
export function findClash(s, ev) {
  if (!ev?.start || ev.done) return null
  const a0 = toMin(ev.start)
  const a1 = toMin(ev.end) ?? a0 + 60
  return (
    s.events.find((o) => {
      if (o.id === ev.id || o.done || o.date !== ev.date || !o.start) return false
      const b0 = toMin(o.start)
      const b1 = toMin(o.end) ?? b0 + 60
      return a0 < b1 && b0 < a1
    }) || null
  )
}
const clashText = (o) => (o ? `Overlaps ${o.title} (${fmtRange(o.start, o.end)})` : null)

const DOW = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Expand a repeat rule into concrete dates for the next 8 weeks (max 40)
function repeatDates(first, repeat, repeatDays) {
  const days = (repeatDays || []).map((d) => DOW[String(d).slice(0, 3).toLowerCase()]).filter((d) => d !== undefined)
  let match
  let label
  if (repeat === 'daily') {
    match = () => true
    label = 'Daily'
  } else if (repeat === 'weekdays') {
    match = (dow) => dow >= 1 && dow <= 5
    label = 'Weekdays'
  } else {
    const set = new Set(days.length ? days : [fromKey(first).getDay()])
    match = (dow) => set.has(dow)
    label = [...set].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DOW_LABEL[d]).join(', ')
  }
  const dates = []
  for (let i = 0; i < 56 && dates.length < 40; i++) {
    const key = shiftKey(first, i)
    if (match(fromKey(key).getDay())) dates.push(key)
  }
  return { dates, label }
}

const patch = (s, col, id, fields) => {
  s[col] = s[col].map((x) => (x.id === id ? { ...x, ...fields } : x))
}

// Pure: (state, actions) -> { state, applied }. applied = plain-English log + ids to highlight.
export function applyActions(prev, actions) {
  const s = { ...prev, events: [...prev.events], todos: [...prev.todos], projects: [...prev.projects], ideas: [...prev.ideas] }
  const applied = []
  const today = todayKey()
  const tomorrow = tomorrowKey()
  const now = Date.now()
  const log = (entry) => applied.push(entry)

  for (const a of actions || []) {
    if (!a || !a.type) continue
    const title = cleanTitle(a.title)
    const emoji = a.emoji || ''
    const category = (a.category || '').toLowerCase() || 'personal'
    const date = isDate(a.date) ? a.date : null
    const start = isTime(a.start) ? a.start : null
    const end = isTime(a.end) ? a.end : null
    const project = findProject(s, a.projectId, null)

    switch (a.type) {
      case 'add_event': {
        const d = date || today
        const prevNew = [...s.events].reverse().find((e) => e.createdAt === now && e.date === d && e.start && e.end)
        const st = start && prevNew && start === prevNew.start && (!end || toMin(end) > toMin(prevNew.end)) ? prevNew.end : start
        const en = end && st && toMin(end) > toMin(st) ? end : st ? addMinutes(st, defaultDuration(title)) : null
        const base = { title, emoji, category, start: st, end: en, projectId: project?.id || null, person: a.person || null, done: false, createdAt: now }

        if (a.repeat || a.repeatDays?.length) {
          const { dates, label } = repeatDates(d, a.repeat, a.repeatDays)
          const seriesId = uid('s')
          const created = dates.map((dt) => ({ ...base, id: uid('e'), date: dt, seriesId, repeatLabel: label }))
          s.events.push(...created)
          const first = created[0]
          if (first) {
            log({ verb: 'Repeats', label: `${title} · ${label}${st ? ' ' + fmtTime(st) : ''}`, tone: 'violet', id: first.id, ids: created.map((e) => e.id), date: first.date, kind: 'event', stat: first.date === today ? 'addedToday' : 'addedLater', warning: clashText(findClash(s, first)) })
          }
          break
        }

        const dupe = s.events.find((e) => e.date === d && e.start === st && similar(e.title, title))
        if (dupe) {
          log({ verb: 'Already have', label: `${dupe.title} · ${whenLabel(d, st)}`, tone: 'zinc', id: dupe.id, date: d, kind: 'event' })
          break
        }
        const ev = { ...base, id: uid('e'), date: d }
        s.events.push(ev)
        log({ verb: 'Created', label: `${title}${st ? ' · ' + whenLabel(d, st) : ' · ' + relDay(d)}`, tone: 'blue', id: ev.id, date: d, kind: 'event', stat: d === today ? 'addedToday' : 'addedLater', warning: clashText(findClash(s, ev)) })
        break
      }
      case 'add_todo': {
        const d = date || today
        const dupe = s.todos.find((t) => !t.done && t.date === d && similar(t.title, title) && norm(t.title) === norm(title))
        if (dupe) {
          log({ verb: 'Already have', label: dupe.title, tone: 'zinc', id: dupe.id, date: d })
          break
        }
        const t = { id: uid('t'), title, emoji, category, date: d, done: false, doneAt: null, projectId: project?.id || null, carriedOver: false, kind: 'todo', person: a.person || null, createdAt: now }
        s.todos.push(t)
        log({ verb: 'Added', label: `${title}${d !== today ? ' → ' + relDay(d) : ''}${project ? ' · ' + project.name : ''}`, tone: 'amber', id: t.id, date: d, kind: 'todo', stat: d === today ? 'addedToday' : 'addedLater' })
        break
      }
      case 'add_project':
      case 'update_project': {
        const existing = findProject(s, a.targetId || a.projectId, title)
        if (existing) {
          const fields = {}
          if (a.status && STATUS[a.status]) fields.status = a.status
          if (isDate(a.deadline)) fields.deadline = a.deadline
          if (a.note) fields.note = a.note
          if (!fields.status && /block|stuck|waiting/i.test(a.note || '')) fields.status = 'blocked'
          patch(s, 'projects', existing.id, fields)
          const what = fields.status ? STATUS[fields.status].label : fields.deadline ? `due ${relDay(fields.deadline)}` : fields.note || 'updated'
          log({ verb: 'Updated', label: `${existing.name} → ${what}`, tone: 'rose', id: existing.id, date: fields.deadline || null, kind: 'project', stat: 'projectsUpdated' })
        } else {
          const p = { id: uid('p'), name: title, emoji, status: STATUS[a.status] ? a.status : 'on-track', deadline: isDate(a.deadline) ? a.deadline : date, note: a.note || '', createdAt: now }
          s.projects.push(p)
          log({ verb: 'New project', label: `${title}${p.deadline ? ' · due ' + relDay(p.deadline) : ''}`, tone: 'violet', id: p.id, date: p.deadline, kind: 'project', stat: 'projectsNew' })
        }
        break
      }
      case 'mark_done': {
        const found = findItem(s, a.targetId, title)
        if (found && (found.col === 'todos' || found.col === 'events')) {
          patch(s, found.col, found.it.id, { done: true, doneAt: now })
          log({ verb: 'Done', label: found.it.title, tone: 'green', id: found.it.id, date: found.it.date, kind: found.col === 'events' ? 'event' : 'todo', stat: 'done' })
        } else if (found && found.col === 'projects') {
          patch(s, 'projects', found.it.id, { status: 'done' })
          log({ verb: 'Done', label: found.it.name, tone: 'green', id: found.it.id, stat: 'done' })
        } else {
          const t = { id: uid('t'), title, emoji, category, date: today, done: true, doneAt: now, projectId: project?.id || null, carriedOver: false, kind: 'todo', person: null, createdAt: now }
          s.todos.push(t)
          log({ verb: 'Done', label: title, tone: 'green', id: t.id, date: today, kind: 'todo', stat: 'done' })
        }
        break
      }
      case 'carry_over': {
        const found = findItem(s, a.targetId, title)
        const d = date && date > today ? date : tomorrow
        if (found?.col === 'todos') {
          patch(s, 'todos', found.it.id, { date: d, carriedOver: true })
          log({ verb: 'Carried', label: `${found.it.title} → ${relDay(d)}`, tone: 'amber', id: found.it.id, date: d, kind: 'todo', stat: 'carried' })
        } else if (found?.col === 'events') {
          patch(s, 'events', found.it.id, { date: d })
          log({ verb: 'Carried', label: `${found.it.title} → ${whenLabel(d, found.it.start)}`, tone: 'amber', id: found.it.id, date: d, kind: 'event', stat: 'carried' })
        } else {
          const t = { id: uid('t'), title, emoji, category, date: d, done: false, doneAt: null, projectId: project?.id || null, carriedOver: true, kind: 'todo', person: null, createdAt: now }
          s.todos.push(t)
          log({ verb: 'Carried', label: `${title} → ${relDay(d)}`, tone: 'amber', id: t.id, date: d, kind: 'todo', stat: 'carried' })
        }
        break
      }
      case 'add_followup': {
        const d = date || tomorrow
        const t = { id: uid('t'), title, emoji: emoji || '↪', category, date: d, done: false, doneAt: null, projectId: project?.id || null, carriedOver: false, kind: 'followup', person: a.person || null, createdAt: now }
        s.todos.push(t)
        log({ verb: 'Follow-up', label: `${title} · ${relDay(d)}`, tone: 'sky', id: t.id, date: d, kind: 'todo', stat: 'followups' })
        break
      }
      case 'add_idea': {
        const idea = { id: uid('i'), title, emoji: emoji || '💡', category: category || 'idea', projectId: project?.id || null, createdAt: now }
        s.ideas.unshift(idea)
        log({ verb: 'Idea', label: title, tone: 'yellow', id: idea.id, kind: 'idea', stat: 'ideas' })
        break
      }
      case 'move_event': {
        const found = findItem(s, a.targetId, title, ['events'])
        if (found?.col === 'events') {
          const ev = found.it
          const dur = ev.start && ev.end ? toMin(ev.end) - toMin(ev.start) : defaultDuration(ev.title)
          const st = start || ev.start
          const en = start ? (end && toMin(end) > toMin(start) ? end : fromMin(toMin(start) + dur)) : end || ev.end
          const d = date || ev.date
          patch(s, 'events', ev.id, { date: d, start: st, end: en })
          const moved = s.events.find((x) => x.id === ev.id)
          log({ verb: 'Moved', label: `${ev.title} → ${whenLabel(d, st)}`, tone: 'blue', id: ev.id, date: d, kind: 'event', stat: 'moved', warning: clashText(findClash(s, moved)) })
        } else if (start || date) {
          // Nothing to move: treat as a new event so nothing is dropped
          const d = date || today
          const ev = { id: uid('e'), title, emoji, category, date: d, start, end: end || (start ? addMinutes(start, defaultDuration(title)) : null), projectId: project?.id || null, person: a.person || null, done: false, createdAt: now }
          s.events.push(ev)
          log({ verb: 'Created', label: `${title} · ${whenLabel(d, start)}`, tone: 'blue', id: ev.id, date: d, stat: d === today ? 'addedToday' : 'addedLater' })
        }
        break
      }
      case 'delete_item': {
        const found = findItem(s, a.targetId, title, ['events', 'todos', 'ideas'])
        if (found) {
          s[found.col] = s[found.col].filter((x) => x.id !== found.it.id)
          log({ verb: 'Removed', label: found.it.title || found.it.name, tone: 'zinc', stat: 'removed' })
        }
        break
      }
      default: {
        // Unknown type: never drop what was said
        const idea = { id: uid('i'), title, emoji: emoji || '💡', category: 'idea', projectId: null, createdAt: now }
        s.ideas.unshift(idea)
        log({ verb: 'Idea', label: title, tone: 'yellow', id: idea.id, kind: 'idea', stat: 'ideas' })
      }
    }
  }
  return { state: s, applied }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// "Added 2 to today, updated 1 project, saved 1 idea."
export function summarize(applied) {
  const c = {}
  for (const a of applied) if (a.stat) c[a.stat] = (c[a.stat] || 0) + 1
  const parts = []
  if (c.addedToday) parts.push(`added ${c.addedToday} to today`)
  if (c.addedLater) parts.push(`scheduled ${c.addedLater} for later`)
  if (c.projectsNew) parts.push(`created ${plural(c.projectsNew, 'project')}`)
  if (c.projectsUpdated) parts.push(`updated ${plural(c.projectsUpdated, 'project')}`)
  if (c.ideas) parts.push(`saved ${plural(c.ideas, 'idea')}`)
  if (c.done) parts.push(`marked ${c.done} done`)
  if (c.carried) parts.push(`carried ${c.carried} to tomorrow`)
  if (c.followups) parts.push(`set ${plural(c.followups, 'follow-up')}`)
  if (c.moved) parts.push(`moved ${c.moved}`)
  if (c.removed) parts.push(`removed ${c.removed}`)
  if (!parts.length) return applied.length ? 'Already up to date.' : 'Nothing to change.'
  const clashes = applied.filter((a) => a.warning).length
  if (clashes) parts.push(`${clashes} clash${clashes === 1 ? '' : 'es'} to check`)
  const text = parts.join(', ')
  return text[0].toUpperCase() + text.slice(1) + '.'
}
