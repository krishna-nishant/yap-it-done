# Yap It Done 🎙️

**Talk to your planner.** Hold your Wispr Flow key, ramble about your day, and Yap It Done sorts it into to-dos, calendar events, projects, follow-ups and ideas, in about 2 seconds.

Built by Krishna at **YapMaxxing** (a Wispr Flow event) 🏆

## What it does

- **One box, no forms.** Say anything ("standup at 10, then pitch deck until 1, gym every Mon Wed Fri at 7, fest project is at risk") and Gemini turns it into actions.
- **Understands Hinglish.** "Kal subah 9 baje dentist" works.
- **Instant feedback.** chrono-node guesses times while you type, a "Heard you" row lists every action, chips fly to where each item landed, and the calendar jumps to the right day.
- **Safe to yap.** One-click **Undo** (or ⌘Z) for every input, plus clash warnings when events overlap.
- **Four sections:** Dump (ideas, someday), Projects (status, deadline, progress), Today (your plate), Wrap up (done / carry over / follow up tomorrow).
- **Calendar:** day / 3-day / week / month, drag to move or resize, repeating events, Add to Google Calendar or download `.ics`.
- **Brief me:** speaks your rest-of-day, morning brief or evening wrap.
- **Reminders** 10 minutes before events, dark and light mode, and everything saved locally in your browser.

## Stack

React + Vite · Tailwind CSS · Framer Motion · GSAP · Lenis · lucide-react · chrono-node · date-fns · Gemini (flash-lite, thinking off, JSON schema)

## Run locally

```bash
npm install
echo "VITE_GEMINI_API_KEY=your-key" > .env.local   # free key: https://aistudio.google.com/apikey
npm run dev
```

## Deploy (Vercel)

Set `GEMINI_API_KEY` (no `VITE_` prefix) in the Vercel project settings. The browser calls `/api/parse`, so the key stays on the server. Each browser gets 12 free prompts (change with `VITE_FREE_PROMPTS`), then visitors are asked for their own free Gemini key, which stays in their browser.
