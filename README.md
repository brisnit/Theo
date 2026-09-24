# THEO — Predictive Learning for Fuller

**Canvas manages learning. Theo predicts learning.**

A front-end prototype showing how Theo sits on top of Canvas and turns course, assignment,
grade, engagement and activity data into predictive intelligence for professors and students:
**Predict → Personalize → Intervene → Prove.**

> Prototype only. No Canvas integration, authentication or backend. All data is deterministic,
> mocked Fuller-style data (6 courses, 3 professors, 45 students).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

Routing is hash-based, so `dist/` deploys to any static host (Vercel, Netlify, GitHub Pages).

## What's in the demo

- **Home** — choose the Professor Portal (Dr. Sarah Whitfield) or Student Portal (Maya Johnson).
- **Professor dashboard** — every course at a glance with predicted averages, risk mix, engagement and momentum; who needs attention; intervention impact; upcoming Canvas work; messages.
- **Course view** — Theo Insight, class KPIs, performance trend with prediction band, risk distribution, needs-attention student cards, concept mastery, engagement, submission behavior, and a searchable/sortable/filterable roster.
- **Student profile** — current vs. predicted grade and risk, explainable flags, recommended intervention (Send Message / Assign Review / Dismiss), predicted outcome with and without intervention, momentum, engagement, mastery, assignments, and intervention history (Prove).
- **Impact** — intervention success rates and history.
- **Student dashboard** — Theo Insight with Start Review, semester progress, all courses in plain language (Needs Attention, Trending Down, Getting Stronger, On Track), what to do next, upcoming, momentum, mastery, activity and messages.
- **Messaging** — lightweight chat panel and inbox for both roles, with mocked replies.
- **Ask Theo** — a small assistant that answers questions from the same mocked data.
- **Edit dashboard** — drag to reorder, hide/restore cards, compact or comfortable layout (saved in localStorage).

## Code map

```
src/data/        mock Canvas data (mock.ts) and derived predictions/insights (insights.ts)
src/state/       app-wide demo state: messages, actions, toasts, layout density
src/components/  shell, charts (hand-built SVG), dashboard grid, chat, assistant, cards
src/pages/       home, professor and student pages, messages
src/lib/         hash router and assistant answer rules
```
