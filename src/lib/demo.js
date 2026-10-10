import { todayKey, shiftKey } from './dates'

// Demo data relative to today, mirroring the mockup
export function demoState() {
  const d0 = todayKey()
  const d1 = shiftKey(d0, 1)
  const d2 = shiftKey(d0, 2)
  const now = Date.now()
  const ev = (id, title, emoji, category, date, start, end, extra = {}) => ({ id, title, emoji, category, date, start, end, projectId: null, person: null, done: false, createdAt: now, ...extra })
  const td = (id, title, emoji, category, date, extra = {}) => ({ id, title, emoji, category, date, done: false, doneAt: null, projectId: null, carriedOver: false, kind: 'todo', person: null, createdAt: now, ...extra })

  return {
    projects: [
      { id: 'p_fest', name: 'College Fest', emoji: '🎪', status: 'on-track', deadline: shiftKey(d0, 10), note: '', createdAt: now },
      { id: 'p_hack', name: 'Hackathon pitch', emoji: '🚀', status: 'on-track', deadline: d1, note: '', createdAt: now },
      { id: 'p_web', name: 'Website redesign', emoji: '🌐', status: 'blocked', deadline: shiftKey(d0, 6), note: 'Waiting on Arjun · till Fri', createdAt: now },
    ],
    events: [
      ev('e_standup', 'Standup', '🧑‍💻', 'work', d0, '10:00', '10:30'),
      ev('e_lunch', 'Lunch with Riya', '🥗', 'social', d0, '13:00', '14:00', { person: 'Riya' }),
      ev('e_coffee', 'Coffee', '☕', 'social', d0, '17:00', '17:30'),
      ev('e_gym', 'Gym', '💪', 'health', d0, '19:00', '20:00'),
      ev('e_riya', 'Coffee with Riya', '☕', 'social', d1, '11:45', '12:15', { person: 'Riya' }),
      ev('e_rehearse', 'Pitch rehearsal', '🎤', 'work', d1, '14:00', '16:00', { projectId: 'p_hack' }),
      ev('e_arjun', 'Call Arjun', '📞', 'work', d2, '10:00', '11:00', { person: 'Arjun', projectId: 'p_web' }),
      ev('e_poster', 'Fest poster review', '🎨', 'work', d2, '15:00', '16:00', { projectId: 'p_fest' }),
    ],
    todos: [
      td('t_emails', 'Reply to emails', '📧', 'work', d0, { done: true, doneAt: now }),
      td('t_poster', 'Design fest poster', '🎨', 'work', d0, { projectId: 'p_fest' }),
      td('t_mom', 'Call mom', '📞', 'family', d0),
      td('t_groceries', 'Buy groceries', '🛒', 'errand', d0, { carriedOver: true }),
      td('t_arjun', 'Follow up with Arjun', '↪', 'work', d2, { kind: 'followup', person: 'Arjun', projectId: 'p_web' }),
      // project backlogs
      td('t_f1', 'Book auditorium', '🏛️', 'work', null, { projectId: 'p_fest', done: true, doneAt: now }),
      td('t_f2', 'Sponsor list', '💰', 'work', null, { projectId: 'p_fest', done: true, doneAt: now }),
      td('t_f3', 'Volunteer roster', '🙋', 'work', null, { projectId: 'p_fest' }),
      td('t_f4', 'Stage lighting quote', '💡', 'work', null, { projectId: 'p_fest' }),
      td('t_f5', 'Print passes', '🎟️', 'work', null, { projectId: 'p_fest' }),
      td('t_h1', 'Problem slide', '🧩', 'work', null, { projectId: 'p_hack', done: true, doneAt: now }),
      td('t_h2', 'Demo video', '🎬', 'work', null, { projectId: 'p_hack', done: true, doneAt: now }),
      td('t_h3', 'Market sizing', '📈', 'work', null, { projectId: 'p_hack', done: true, doneAt: now }),
      td('t_h4', 'Team slide', '👥', 'work', null, { projectId: 'p_hack', done: true, doneAt: now }),
      td('t_h5', 'Final run-through', '🎯', 'work', d1, { projectId: 'p_hack' }),
      td('t_w1', 'Wireframes', '📐', 'work', null, { projectId: 'p_web', done: true, doneAt: now }),
      td('t_w2', 'Copy from Arjun', '✍️', 'work', null, { projectId: 'p_web' }),
      td('t_w3', 'Hero animation', '✨', 'work', null, { projectId: 'p_web', done: true, doneAt: now }),
      td('t_w4', 'Launch checklist', '✅', 'work', null, { projectId: 'p_web' }),
      td('t_someday', 'Learn GSAP timelines', '📚', 'study', null),
    ],
    ideas: [
      { id: 'i_merch', title: 'Fest merch drop', emoji: '👕', category: 'idea', projectId: 'p_fest', createdAt: now },
      { id: 'i_pod', title: 'Podcast about voice-first tools', emoji: '🎙️', category: 'idea', projectId: null, createdAt: now },
    ],
  }
}
