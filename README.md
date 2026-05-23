# 🚀 NeoTheo

> **The future of tenant–property communication.**
> Built for the HalloTheo Hackathon · Track 1 · ElevenLabs Integration

---

## 🎯 The Vision

HalloTheo's mandate: build the **futuristic tech solution** — what will be efficient, useful, and actually working **5 years from now**.

**The insight:** *7 out of 10 tenant inquiries don't need real staff involvement.* They're minor issues or things solvable with a step-by-step guide, a YouTube link, or a short article.

**NeoTheo** is the AI voice layer that sits between tenants and property staff. It listens, understands, classifies urgency, and routes the inquiry to the right place — automatically.

---

## 🧠 How It Works

1. **Tenant initiates contact** via the hallo theo landing page (green-button web call — per [Wynand's guidance](./docs/WYNAND_FEEDBACK.md), no real telephone number is needed for the demo).
2. **ElevenLabs Conversational AI agent** picks up and has a natural conversation in the tenant's language.
3. The agent **transcribes** every word in real time and posts the final transcript to a **Supabase** webhook at end-of-call.
4. An **AI classification layer** (Claude) decides urgency: `LOW` / `MEDIUM` / `HIGH`.
5. The system **dispatches** the correct response:
   - 🟢 **LOW** → SMS/email with DIY guide (article + YouTube link)
   - 🟡 **MEDIUM** → Forward to human staff with full context summary
   - 🔴 **HIGH** → **Theo Negotiates** kicks in — simulated parallel auction with 3 Handwerker, owner-consented Stripe deposit, tenant confirmation ([full spec](./docs/THEO_NEGOTIATES.md))
6. **Everything is logged in Supabase** — full transcript, classification, dispatch action, auction bids, payouts — indexed by tenant ID / contract number.

---

## 🏛️ Architecture (High Level)

```
   ┌─────────────┐        ┌────────────────────┐        ┌──────────────────┐
   │   Tenant    │─green ▶│ ElevenLabs Agent   │───────▶│  NeoTheo API     │
   │ (web call)  │ button │ (voice + STT/TTS)  │ webhook│  (FastAPI/Node)  │
   └─────────────┘        └────────────────────┘        └────────┬─────────┘
                                                                  │
                          ┌───────────────────────────────────────┤
                          ▼                                       ▼
                ┌──────────────────┐                  ┌────────────────────┐
                │ AI Triage Layer  │                  │   Supabase         │
                │ (Claude)         │                  │ (Postgres+Realtime)│
                │ - classify       │                  │ - tenants          │
                │ - extract intent │                  │ - calls/transcripts│
                │ - match KB       │                  │ - dispatch log     │
                │                  │                  │ - auctions, bids   │
                │                  │                  │ - payouts/charges  │
                └────────┬─────────┘                  └────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌──────────────────────┐
   │ LOW     │      │ MEDIUM  │      │ HIGH                 │
   │ DIY     │      │ Human   │      │ ▶ Theo Negotiates    │
   │ guide   │      │ staff   │      │   simulated auction  │
   │ (SMS)   │      │ queue   │      │   3× EL agent panels │
   │         │      │         │      │   → bids → owner OK  │
   │         │      │         │      │   → 2× Stripe events │
   └─────────┘      └─────────┘      └──────────┬───────────┘
                                                │
                                     ┌──────────┴───────────┐
                                     │ Vendor wins → tenant │
                                     │ gets confirmation    │
                                     │ (web agent voice)    │
                                     └──────────────────────┘

                ┌──────────────────┐
                │  Staff Dashboard │  ← real-time view (Supabase Realtime)
                │  (Next.js)       │     of calls, transcripts, dispatches,
                │                  │     auctions, bids, payouts, charges
                └──────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Voice (intake)** | ElevenLabs Conversational AI (web SDK, green-button on landing page) | Natural, multilingual voice agent. Per [mentor guidance](./docs/WYNAND_FEEDBACK.md), web-based call is sufficient for demo — no phone number / Twilio needed. |
| **Voice (negotiator)** | ElevenLabs Conversational AI (3 parallel web sessions simulated in dashboard) | Auction shown as 3 simulated agent panels with live bid extraction. Real outbound telephony is a Phase-2 item (would require Twilio + provisioned number). |
| **AI Triage & Orchestrator** | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Fast, cheap, smart enough for structured JSON classification + auction brief generation + bid scoring. Swap to Haiku 4.5 (`claude-haiku-4-5`) at scale, or Opus 4.7 (`claude-opus-4-7`) for hard cases. |
| **Backend API** | FastAPI (Python) *or* Node | Async, fast, ElevenLabs webhook-friendly |
| **Database + Auth + Realtime** | **Supabase** (Postgres 15 + pgvector + Realtime + Row-Level Security) | Single platform for triage logs, transcripts, dispatch records, Stripe webhook payloads — chosen on mentor recommendation. Realtime channels drive the dashboard live; RLS scopes tenant data. |
| **Knowledge Base** | Markdown + pgvector embeddings in Supabase | DIY guides, YouTube links, articles, all semantically searchable |
| **Dashboard** | Next.js 14 + Tailwind + shadcn/ui + `@supabase/realtime-js` | Real-time staff view: live transcript stream, auction panels, Stripe events |
| **Notifications** | SendGrid (email DIY guides) | Email dispatch to tenants |
| **Payments** | **Stripe — two-sided marketplace** | (1) Stripe Customer + off-session billing → NeoTheo charges Handwerker a 10% lead fee on win. (2) Stripe Connect (Custom accounts) → owner pays Handwerker via destination charges with a 30% deposit hold on consent, full release on completion. Both flows fire on a single auction win. |
| **Hosting** | Local (per mentor guidance) — production: Vercel + Supabase Cloud | Local-only for demo. Supabase Cloud takes the DB + Auth + Realtime concerns off the deployment surface. |
| **Auth** | Supabase Auth | Staff login; ships with the DB |

---

## 📁 Repo Structure

```
neotheo/
├── apps/
│   ├── dashboard/        # Next.js staff dashboard
│   └── api/              # FastAPI backend (webhooks, AI triage, dispatch)
├── packages/
│   ├── agent/            # ElevenLabs agent config + prompts
│   ├── db/               # Schema, migrations, seed data
│   └── knowledge-base/   # DIY guides (markdown) for low-urgency answers
├── docs/
│   ├── ARCHITECTURE.md
│   ├── URGENCY_RULES.md
│   ├── THEO_NEGOTIATES.md   # ★ HIGH-urgency multi-agent vendor auction
│   ├── WYNAND_FEEDBACK.md   # technical mentor scope decisions (Twilio out, Supabase in)
│   └── ELEVENLABS_SETUP.md
└── infra/                # Local dev configs
```

---

## 🎙️ Theo Negotiates — the HIGH-Urgency Auction

When the triage layer classifies an inquiry as `HIGH` (active leak, no heat in winter, gas smell, electrical sparking), NeoTheo invokes **Theo Negotiates**: a multi-agent voice auction that finds the right vendor in under two minutes — and triggers a **two-sided Stripe marketplace** in one move.

**What happens:**
1. The orchestrator (Claude) picks 3 Handwerker matching the category and writes a German negotiation brief
2. Three ElevenLabs Conversational AI sessions run **in parallel** as live agent panels in the dashboard (no telephony — per [mentor guidance](./docs/WYNAND_FEEDBACK.md), the demo simulates the calls visually rather than placing real outbound calls)
3. Each agent discloses the lead fee up front, negotiates price and earliest slot, then calls `submit_bid(price, slot, confidence)`
4. After all sessions return (or timeout), the resolver scores bids on `price × ETA × reputation` and picks a winner
5. The property owner gets a one-tap consent push: *"Approve Müller Klempnerei, €480, tomorrow 9 AM?"*
6. On approval, **two Stripe operations fire in parallel:**
   - **Vendor → NeoTheo:** off-session 10% lead fee charged to the Handwerker's card/SEPA on file (NeoTheo's revenue — *"automatic payout for the service"*)
   - **Owner → Vendor (via Connect):** 30% deposit hold on the owner; full amount released on job completion
7. The tenant receives a confirmation message (web agent voice replay or SMS — demo flexible)

**Two-sided marketplace, one win.** The Handwerker pays NeoTheo for the lead (because we just brought them a qualified, owner-approved job). The owner pays the Handwerker through us (because we keep the deposit on hold until the job is done, which protects them from no-shows). Both flows are auditable in Supabase, both fire in under two minutes.

**Why this lights up all three sponsor tracks:**
- **ElevenLabs** — multi-agent parallel conversational AI in German with structured tool calls
- **Anthropic** — Claude as the orchestrator: vendor selection, brief generation, bid scoring
- **Stripe** — Customer-side off-session billing (lead fee) + Connect Custom destination charges (owner deposit) — a real two-sided marketplace, not a one-flow demo

Full flow, schema additions (`auctions`, `bids`, `owner_consents`, `payouts`, `vendor_charges`), guardrails, and demo script live in [`docs/THEO_NEGOTIATES.md`](./docs/THEO_NEGOTIATES.md).

---

## 🗂️ Customer Data Model

Every call is filed under the tenant's identity. Core entities:

- **Tenant** — `id`, `name`, `contract_nr`, `phone`, `email`, `unit`, `building`
- **Call** — `id`, `tenant_id`, `started_at`, `ended_at`, `audio_url`, `transcript` (full, word-for-word)
- **Inquiry** — `id`, `call_id`, `summary`, `urgency` (LOW/MEDIUM/HIGH), `category` (plumbing, electrical, heating, admin, etc.)
- **Dispatch** — `id`, `inquiry_id`, `action` (`DIY_GUIDE` / `STAFF_QUEUE` / `HANDWERKER` / `AUCTION`), `sent_to`, `sent_at`, `status`

**Theo Negotiates adds** (HIGH-urgency dispatch path):
- **Auction** — `id`, `inquiry_id`, `category`, `brief`, `n_vendors`, `status`, `winning_bid_id`
- **Bid** — `id`, `auction_id`, `handwerker_id`, `price_eur`, `earliest_slot`, `confidence`, `transcript`, `score`
- **OwnerConsent** — `id`, `auction_id`, `bid_id`, `channel`, `message_sent`, `deposit_amount_eur`, `decision`, `responded_at`
- **Payout** *(owner-side)* — `id`, `auction_id`, `bid_id`, `stripe_payment_intent`, `deposit_amount_eur`, `final_amount_eur`, `status`
- **VendorCharge** *(vendor-side)* — `id`, `auction_id`, `bid_id`, `stripe_payment_intent`, `winning_bid_eur`, `fee_pct`, `fee_amount_eur`, `status`

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full schema, and [`docs/THEO_NEGOTIATES.md`](./docs/THEO_NEGOTIATES.md) for the auction subsystem.

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/ibxibx/neo-theo.git
cd neo-theo

# 2. Install
pnpm install        # for dashboard
cd apps/api && pip install -r requirements.txt

# 3. Env
cp .env.example .env
# Fill in: ELEVENLABS_API_KEY, ELEVENLABS_NEGOTIATOR_AGENT_ID,
#          ANTHROPIC_API_KEY, SUPABASE_*, STRIPE_*

# 4. Spin up Supabase locally (or use Supabase Cloud)
npx supabase start                          # local stack (Docker)
npx supabase db push                        # apply packages/db/schema.sql

# 5. Run
cd apps/api && uvicorn main:app --reload    # backend on :8000
cd apps/dashboard && pnpm dev               # dashboard on :3000
```

---

## 🏆 Why This Wins (Hackathon Pitch)

- **Solves a real, measured pain:** 70% of inquiries are over-serviced today
- **Built on tech that will mature, not disappear:** voice AI, RAG, agentic routing
- **Auditable:** every call is logged, searchable, and tied to a tenant
- **Scales:** the DIY knowledge base grows with every resolved call
- **5-year vision:** the agent becomes proactive — predicting issues from past calls, scheduling preventive maintenance, multilingual by default

---

## 👥 Team

Built at the HalloTheo Hackathon in Berlin, 2026, by a two-person team combining property-tech operations, product, and engineering.

### Ian Baumeister — Product, Strategy & Full-Stack Build
[GitHub `@ibxibx`](https://github.com/ibxibx) · [LinkedIn](https://www.linkedin.com/in/avoian/) · Berlin, DE

Founder and CEO of [AVO Group](https://avotravel.com) (since 2013), Head of Design & Marketing at [DIAMONDSITE.DE](https://diamondsite.de). Background spans real estate, travel-tech, and marketing operations, with a long track record of building startups at the intersection of physical space and digital product. Recent technical work includes the **Jasmin Catering AI Agent** (collaborative AI agent project) and a React Native chat app ([`ibxibx/nextchat`](https://github.com/ibxibx/nextchat)). For NeoTheo: product vision, system architecture, API + dashboard implementation, hackathon pitch.

### Soheil Fathalian — Technical Co-Lead & Concept Architect
[GitHub `@soheilfathalian`](https://github.com/soheilfathalian) · [LinkedIn](https://www.linkedin.com/in/soheil-fathalian-2000/) · Berlin, DE

Technical Entrepreneur in Residence at **[yoursquares GmbH](https://yoursquares.de)** (PropTech, Berlin), where he works on early-stage technical product development at the intersection of real estate and emerging technology. For NeoTheo: concept architecture, multi-agent design exploration, vendor-side integration logic (Stripe Connect dispatch, Handwerker negotiation flows), and the longer-term "Property Soul" / synthetic-Verwalter framing that informs the 5-year vision.

> The team's complementary backgrounds — Ian's real-estate-meets-product founding experience and Soheil's PropTech-native technical entrepreneurship — are why NeoTheo is built on a deep, lived understanding of the actual problem space, not a generic "AI for X" pitch.

---

## 📜 License

MIT — built at the HalloTheo Hackathon, 2026.
