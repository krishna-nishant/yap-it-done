// Pure prompt + schema for Gemini. No env access here so it can be tested from Node.

export const ACTION_TYPES = [
  'add_event',
  'add_todo',
  'add_project',
  'update_project',
  'mark_done',
  'carry_over',
  'add_followup',
  'add_idea',
  'move_event',
  'delete_item',
]

export const SYSTEM_PROMPT = `You are the brain of Yap It Done, a planner that people talk to.
People ramble and mix Hindi and English. Turn everything they say into a list of actions.

ACTIONS
- add_event: something at a specific time/day (meeting, call, coffee, gym, class). Needs date + start; set end too.
- add_todo: a task to do (no fixed time). date = today unless another day is mentioned; omit date only for "someday" tasks.
- add_project: a new project. Set status and deadline if mentioned.
- update_project: change an existing project's status/deadline/note. targetId = the project's id. ALWAYS include status, and a short note with the reason (e.g. "Blocked till Fri").
- mark_done: they finished something. targetId = existing todo/event id if it matches, else just give a title.
- carry_over: they didn't get to something. Moves it to tomorrow. targetId if it matches an existing item.
- add_followup: "follow up", "remind me", "ping", "check with". A follow-up for tomorrow unless another day is said.
- add_idea: random ideas, thoughts, or anything you are not sure where it goes.
- move_event: reschedule an existing event (targetId) to a new date/start/end. "Running 30 min late" = move each of today's upcoming events 30 min later.
- delete_item: they cancel/remove something. targetId required.

RULES
- One sentence can contain many actions. Never ignore anything the person said.
- Use the ids in "items" to update existing things instead of creating duplicates. For new items leave targetId empty — never invent ids.
- If something mentions a project name, set projectId to that project's id.
- If you are not sure where something goes, save it as an idea rather than dropping it.
- Keep titles short and clean, e.g. "Coffee with Riya", never the whole sentence. Title Case first word.
- Give every item an emoji and a one-word category (work, health, social, errand, study, personal, idea, family, finance).
- If they say they finished something -> mark_done. Didn't get to something -> carry_over. "Follow up"/"remind me" -> add_followup.
- Project status words: "blocked"/"stuck"/"waiting on" -> blocked; "at risk"/"behind"/"delayed" -> at-risk; "on track"/"going well" -> on-track; "shipped"/"finished" -> done. Put the reason in note, e.g. "Waiting on Arjun till Fri".

TIME
- Use "now" for today's date, current time and time zone. Dates are YYYY-MM-DD, times are 24h HH:mm.
- Resolve relative days: tomorrow, day after, next Monday, this Friday.
- Hinglish: "kal" = tomorrow (for plans), "parso" = day after tomorrow, "aaj" = today, "baje" = o'clock, "subah" = morning, "dopahar" = afternoon, "shaam" = evening, "raat" = night. "kal 3 baje" = tomorrow 15:00.
- "this evening"/"shaam" ~ 18:00, "morning"/"subah" ~ 09:00, "after lunch" ~ 14:00, "night"/"raat" ~ 21:00, "noon" = 12:00.
- A bare hour like "at 3" means 15:00; 1-7 are PM, 8-11 are AM unless they say otherwise. But if that AM time has already passed today and they mean today, use PM (said at 10:30, "gym at 8" = 20:00).
- "X until 11" / "X from 10 to 11" sets end time. "then" chains: start the next item when the previous one ends if no time is given.
- No duration given? Coffee 30 min, call 30 min, meeting 1 hour, gym 1 hour, lunch/dinner 1 hour, class 1 hour, anything else 1 hour.

REPEATS
- "every day" -> add_event with repeat "daily". "weekdays"/"every weekday" -> repeat "weekdays".
- "every Monday and Thursday", "Mon Wed Fri" -> repeat "weekly" with repeatDays ["mon","thu"] etc. "every week" -> repeat "weekly".
- date = the first occurrence (today or later). Only set repeat when they clearly say it repeats.

EXAMPLE
"Finished the report. Didn't get to the gym. Website project is blocked till Friday."
-> mark_done "Report", carry_over "Gym", update_project (website project id) status blocked, note "Blocked till Fri".`

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    actions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ACTION_TYPES },
          targetId: { type: 'STRING', description: 'id of an existing item this action changes' },
          title: { type: 'STRING' },
          emoji: { type: 'STRING' },
          category: { type: 'STRING' },
          date: { type: 'STRING', description: 'YYYY-MM-DD' },
          start: { type: 'STRING', description: 'HH:mm 24h' },
          end: { type: 'STRING', description: 'HH:mm 24h' },
          projectId: { type: 'STRING' },
          status: { type: 'STRING', enum: ['on-track', 'at-risk', 'blocked', 'done'] },
          deadline: { type: 'STRING', description: 'YYYY-MM-DD' },
          note: { type: 'STRING' },
          person: { type: 'STRING' },
          repeat: { type: 'STRING', enum: ['daily', 'weekdays', 'weekly'] },
          repeatDays: { type: 'ARRAY', items: { type: 'STRING', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] } },
        },
        required: ['type', 'title', 'emoji', 'category'],
      },
    },
  },
  required: ['actions'],
}

// The user's clock (date, time, time zone). Computed in the browser so the server never guesses.
export function clockNow(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

// Compact snapshot of what exists, so Gemini can reference ids instead of duplicating.
export function buildUserTurn(text, state, clock = clockNow()) {
  const pad = (n) => String(n).padStart(2, '0')
  const d = new Date(`${clock.date}T12:00:00`)
  d.setDate(d.getDate() - 1)
  const recentKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const arr = (v) => (Array.isArray(v) ? v : [])

  const items = {
    events: arr(state.events)
      .filter((e) => !e.done && e.date >= recentKey)
      .slice(0, 60)
      .map(({ id, title, date, start, end }) => ({ id, title, date, start, end })),
    todos: arr(state.todos)
      .filter((t) => !t.done)
      .slice(0, 60)
      .map(({ id, title, date, projectId }) => ({ id, title, date, projectId })),
    projects: arr(state.projects)
      .slice(0, 40)
      .map(({ id, name, status, deadline }) => ({ id, name, status, deadline })),
    ideas: arr(state.ideas)
      .slice(0, 20)
      .map(({ id, title }) => ({ id, title })),
  }

  return JSON.stringify({ now: clock, items, said: text })
}

// Only the fields Gemini needs (keeps requests small)
export function slimState(state) {
  return {
    events: state.events.map(({ id, title, date, start, end, done }) => ({ id, title, date, start, end, done })),
    todos: state.todos.map(({ id, title, date, projectId, done }) => ({ id, title, date, projectId, done })),
    projects: state.projects.map(({ id, name, status, deadline }) => ({ id, name, status, deadline })),
    ideas: state.ideas.map(({ id, title }) => ({ id, title })),
  }
}

export function buildRequestBody(text, state, { thinking = true, clock } = {}) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildUserTurn(text, state, clock) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      ...(thinking ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}),
    },
  }
}
