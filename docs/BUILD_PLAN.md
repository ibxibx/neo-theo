# Build Plan & Team Split — Ian + Soheil

> Concrete delegation between Ian Baumeister and Soheil Fathalian for the hackathon window. Based on each partner's profile, with explicit hand-off points and an explicit "what we are NOT building" list to prevent scope creep.
>
> **Single guiding principle, from Jan @ Hallo Theo:**
> *"Triage and negotiation are two distinct issues. I'm not sure to what extent you want to solve both tonight — might be a long night otherwise."*
>
> So: **triage is the demo. Theo Negotiates is the framing.** We build triage end-to-end working, and show Theo Negotiates as the next-phase architecture.

---

## Profile-Based Split

| Partner | Profile-Strengths | Implication |
|---|---|---|
| **Ian** (AVO Group founder, marketing/operations, real estate background, recent React Native + AI agent builds) | Customer-facing product, narrative, integrations setup, dashboard UX, pitch | Owns the **customer-visible surface** + the demo + the pitch + Stripe (already in flight with David) |
| **Soheil** (Technical EiR at yoursquares PropTech, concept architect for Theo Negotiates, German-language native fit for the domain) | Backend systems, PropTech domain logic, technical architecture, agent prompt engineering | Owns the **brain** — triage classifier, agent prompts, knowledge base, the Theo Negotiates architecture write-up |

This is the highest-leverage split. **No one builds in isolation** — we sync at the 4 checkpoints below.

---

## Critical Path (Demo-Blocking Items)

These MUST work for the demo to function. Anything else is bonus.

| # | Item | Owner | Time est. | Hand-off |
|---|---|---|---|---|
| **CP-1** | Supabase project + schema migration applied | **Ian** | 30-45 min | Soheil takes over DB once it's up |
| **CP-2** | ElevenLabs intake agent configured (German + English, system prompt, webhook to our API) | **Soheil** | 1-2 hr | Ian wires the dashboard receiving end |
| **CP-3** | Green-button landing page → ElevenLabs Web SDK call | **Ian** | 1-2 hr | Soheil reviews voice quality |
| **CP-4** | Claude triage classifier (transcript → urgency + action_class JSON) | **Soheil** | 2-3 hr | Ian wires response into Supabase + dashboard |
| **CP-5** | Live dashboard showing inbound call → transcript → classification → dispatch (via Supabase Realtime) | **Ian** | 3-5 hr | Both review |
| **CP-6** | 3-5 hand-picked DIY guides in the knowledge base (from sample inquiries #6, #10, #13, #16, #29) | **Soheil** | 1-2 hr | — |
| **CP-7** | LOW dispatch flow (DIY guide via email/SMS) — at least one channel working | **Ian** | 2 hr | — |
| **CP-8** | MEDIUM dispatch flow (Servicer queue card in dashboard with ticket details) | **Ian** | 1-2 hr | — |
| **CP-9** | HIGH/EMERGENCY visual — dashboard shows "PM notified" / "Vendor dispatched" status (mocked for demo, real arch documented) | **Soheil** | 1 hr | — |
| **CP-10** | Demo script rehearsed end-to-end at least twice | **Both** | 1 hr | — |

**Total critical path: ~16–22 hours of work, parallelizable to ~10–12 hours of wall-clock time for 2 people.**

---

## Theo Negotiates — Phase-2 Storyline (Not Building for Demo)

We have the schema, the flow, the docs, and now the Stripe integration David's helping with. For the demo we **frame this as the architectural Phase-2** that the system is designed to grow into. Concretely:

- Schema is in [`packages/db/schema.sql`](../packages/db/schema.sql) — judges can see it
- Spec is in [`THEO_NEGOTIATES.md`](./THEO_NEGOTIATES.md) — judges can read it
- **One visual** in the dashboard: when an inquiry hits `OWNER_APPROVAL`, the dashboard shows a card that says *"Phase 2: would auto-collect 3 quotes via voice negotiation"* with a "preview" button that shows a Lottie animation or static mockup of the auction.
- David's Stripe integration → demoed as a separate "Stripe in action" segment if time permits, or kept as architectural evidence

**Owner:** Soheil maintains the docs/schema (they're his concept). Ian builds the dashboard "Phase-2 placeholder" card.

---

## Checkpoint Cadence

| Checkpoint | Time | What we verify |
|---|---|---|
| **CP-α** | Now (kickoff) | Both partners have read [JAN_FEEDBACK.md](./JAN_FEEDBACK.md), [CATEGORIES_AND_ACTIONS.md](./CATEGORIES_AND_ACTIONS.md), and this plan |
| **CP-β** | +4h | CP-1, CP-2, CP-3 done. End-to-end call possible (even if classification is stubbed). |
| **CP-γ** | +10h | CP-4, CP-5, CP-6 done. Live demo of: call in → transcript → classification → at least one dispatch path → dashboard update |
| **CP-δ** | +16h | CP-7, CP-8, CP-9 done. Polish pass. |
| **CP-Demo** | +20h | CP-10 done. Rehearsal complete. Sleep before demo. |

If we slip past CP-β, we cut ruthlessly. Priority list when cutting:
1. CP-9 (HIGH visual placeholder) — easiest to mock
2. CP-7 reduced to one channel (email only — drop SMS / Telegram / Letter)
3. CP-8 reduced to a static-data demo
4. CP-5 simplified to manual refresh (no Realtime)

**Do NOT cut CP-1 through CP-6. Those are the demo.**

---

## Detailed Ownership

### Ian — "The Customer-Visible Surface"

**Owns:**
- `apps/dashboard/*` — entire Next.js dashboard (Realtime feed, classification cards, dispatch panels, the Theo-Negotiates Phase-2 placeholder)
- `apps/landing/*` (or wherever the green-button lives) — the intake page
- Supabase project setup + RLS policies (initial wiring; Soheil refines)
- Stripe integration with David (already in flight)
- Demo script + pitch deck
- The hand-pick of which 3-5 sample inquiries to demo live (from [INQUIRIES_SAMPLES.md](./INQUIRIES_SAMPLES.md))

**Reads & references:**
- [JAN_FEEDBACK.md](./JAN_FEEDBACK.md) — the "peace of mind" UX framing is the dashboard's job
- [CATEGORIES_AND_ACTIONS.md](./CATEGORIES_AND_ACTIONS.md) — what each card type should show
- David's Stripe notes (in your conversations)

**Does NOT touch:**
- Agent prompts or system instructions (Soheil's domain)
- The classification logic itself (Soheil)
- The schema beyond what's already shipped (refer changes to Soheil)

---

### Soheil — "The Brain"

**Owns:**
- `apps/api/*` — the FastAPI backend (webhooks, classification, dispatch logic)
- `packages/agent/system_prompt.md` + `packages/agent/triage_prompt.md` — the actual Claude prompts
- The ElevenLabs agent configuration (intake + negotiator) — system prompts, tool definitions (`submit_bid`, `lookup_tenant_by_phone`, `dispatch_diy_guide`), voice selection
- `packages/knowledge-base/*` — the 3-5 demo DIY guides
- `packages/db/schema.sql` ownership (he refines the WEG/SEV distinction, the policy tables, the language tags)
- The Theo Negotiates docs (his concept, his to maintain)

**Reads & references:**
- [JAN_FEEDBACK.md](./JAN_FEEDBACK.md) — the WEG vs SEV split, tested-knowledge capture, two-tier staff structure
- [CATEGORIES_AND_ACTIONS.md](./CATEGORIES_AND_ACTIONS.md) — the SAS sequences are his to implement
- [INQUIRIES_SAMPLES.md](./INQUIRIES_SAMPLES.md) — his eval set

**Does NOT touch:**
- Dashboard rendering / styling (Ian)
- Stripe code (Ian + David)
- Customer-visible copy / pitch language (Ian)

---

## What We Are Explicitly NOT Building

This list is short, and it should stay short. Anything on it = "Phase 2" in the pitch.

- ❌ Real outbound voice calls (no Twilio — confirmed by Wynand)
- ❌ Production-grade vendor onboarding (Stripe Connect Custom accounts seeded via API only)
- ❌ Letter-mail PDF generation (mocked: dashboard shows "letter queued" status)
- ❌ Telegram / WhatsApp Business / In-app push (one channel: email. Others: shown as the *concept* on dashboard cards but not actually sent)
- ❌ HubSpot ticket sync (mentioned in architecture, not wired up live)
- ❌ Knowledge-capture write-back loop (we *show* the dashboard prompt but don't store the answer back to the property knowledge graph)
- ❌ Multi-language voice responses beyond German + English (Turkish / Polish: nice-to-have if time)
- ❌ Phone-number-based tenant lookup (we hardcode 1-2 tenants in seed data and demo with those)
- ❌ Real auction execution (Theo Negotiates is a Phase-2 visual)

---

## Communication Protocol (Two People, No Slack-Channel-Bureaucracy)

- **Hard sync every 2 hours** — 5 minutes, "what I just shipped / what I'm blocked on"
- **Hard rule: no silent struggle past 30 minutes** — if either of us is stuck for half an hour, the other gets pinged
- **Both partners commit directly to `main`** — no PR review process for the hackathon. Trust + speed.
- **Don't refactor the other's code** without asking. Better to duplicate a helper than fight over it.
- **Pitch + demo script: Ian leads, Soheil reviews tomorrow morning**
- **Architecture talk-track during the pitch: Soheil leads, Ian frames**

---

## The Pitch Story (60 seconds)

> "Hallo Theo manages thousands of apartments across Berlin. Their property managers spend 70% of their time on calls that don't need a human — locked-out tenants asking for a Schlüsseldienst, retirees who lost their Nebenkostenabrechnung, simple plumbing fixes.
>
> **neo-theo** is the AI voice layer that handles those 70%. A tenant calls — in their language, with their tech comfort. Our agent picks up, identifies them, classifies urgency, and routes to the right place: a DIY guide for the easy ones, the right Property Manager for the complex ones, an emergency vendor for actual emergencies.
>
> But what makes this real for Hallo Theo isn't the AI. It's that **every staff handoff also extracts the property manager's 'tested knowledge' back into the property record** — so when the same building has the same elevator problem in 2 years, the next person on the phone already knows.
>
> And in Phase 2, **neo-theo** doesn't just route the HIGH-urgency calls — it auctions them. Three Handwerker, parallel voice negotiation, owner one-tap consent, two-sided Stripe marketplace. *That's* the 5-year vision Hallo Theo is investing in."

---

## Soheil — Read This First

(Section addressed directly to Soheil to bring him in sync.)

The repo at https://github.com/ibxibx/neo-theo has everything we've discussed today. Critical reads, in order:
1. `docs/JAN_FEEDBACK.md` — the customer (15 min)
2. `docs/CATEGORIES_AND_ACTIONS.md` — the architecture (10 min)
3. `docs/INQUIRIES_SAMPLES.md` — your eval set (skim)
4. `docs/THEO_NEGOTIATES.md` — your concept, now framed as Phase 2 (5 min, refresh)
5. `docs/WYNAND_FEEDBACK.md` — the technical-mentor constraints (5 min)
6. This document (15 min)
7. `packages/db/schema.sql` — what's already in the DB (5 min)

**Your first concrete deliverable:** the system prompt for the ElevenLabs intake agent (in `packages/agent/system_prompt.md`), written to handle the 50 sample inquiries with the right urgency + action_class output. Aim for Claude Sonnet 4.6 in the classification step.

**Second deliverable:** confirm the schema in `packages/db/schema.sql` captures everything from CATEGORIES_AND_ACTIONS — specifically the `tenant.preferred_channel` enum, the property `management_type` (WEG / SEV), and the `property_policies` (budget thresholds per category).

Ping Ian when both are done. Then we both go heads-down on our streams.
