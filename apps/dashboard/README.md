# NeoTheo Dashboard

Next.js 14 staff dashboard. Lists every call, its transcript, the AI's classification, and the dispatch action.

## Pages

- `/` — Live feed of recent calls (sorted by urgency)
- `/tenants` — Searchable tenant directory
- `/tenants/[id]` — One tenant's full history (all calls, all inquiries, all dispatches)
- `/calls/[id]` — Single call detail: full transcript, AI summary, dispatch trail
- `/kb` — Knowledge base editor (markdown DIY guides)
- `/handwerker` — On-call roster

## Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Server Components for data fetching
- SSE for real-time call feed
- Clerk for staff auth

## Run

```bash
pnpm install
pnpm dev
```
