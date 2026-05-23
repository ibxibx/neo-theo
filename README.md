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

1. **Tenant calls** the HalloTheo number.
2. **ElevenLabs Conversational AI agent** picks up and has a natural conversation.
3. The agent **transcribes** every word in real time.
4. An **AI classification layer** decides urgency: `LOW` / `MEDIUM` / `HIGH`.
5. The system **dispatches** the correct response:
   - 🟢 **LOW** → SMS/email with DIY guide (article + YouTube link)
   - 🟡 **MEDIUM** → Forward to human staff with full context summary
   - 🔴 **HIGH** → Immediately notify the relevant Handwerker (plumber, electrician, etc.)
6. **Everything is logged** — full transcript, classification, dispatch action — into the tenant's file, indexed by tenant ID / contract number.

---

## 🏛️ Architecture (High Level)

```
   ┌─────────────┐        ┌────────────────────┐        ┌──────────────────┐
   │   Tenant    │ ─call─▶│ ElevenLabs Agent   │───────▶│  NeoTheo API     │
   │  (phone)    │        │ (voice + STT/TTS)  │        │  (FastAPI/Node)  │
   └─────────────┘        └────────────────────┘        └────────┬─────────┘
                                                                  │
                          ┌───────────────────────────────────────┤
                          ▼                                       ▼
                ┌──────────────────┐                  ┌────────────────────┐
                │ AI Triage Layer  │                  │   Database         │
                │ (Claude/GPT)     │                  │ (Postgres + vector)│
                │ - classify       │                  │ - tenants          │
                │ - extract intent │                  │ - calls/transcripts│
                │ - match KB       │                  │ - dispatch log     │
                └────────┬─────────┘                  └────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌──────────────┐
   │ LOW     │      │ MEDIUM  │      │ HIGH         │
   │ DIY     │      │ Human   │      │ Handwerker   │
   │ guide   │      │ staff   │      │ dispatch     │
   │ (SMS)   │      │ queue   │      │ (call/SMS)   │
   └─────────┘      └─────────┘      └──────────────┘

                         ▼
                ┌──────────────────┐
                │  Staff Dashboard │  ← real-time view of all calls,
                │  (Next.js)       │     transcripts, dispatches, history
                └──────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Voice** | ElevenLabs Conversational AI | Natural, multilingual voice agent (required by Track 1) |
| **AI Triage** | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Fast, cheap, smart enough for structured JSON classification. Swap to Haiku 4.5 (`claude-haiku-4-5`) at scale, or Opus 4.7 (`claude-opus-4-7`) for hard cases. |
| **Backend API** | FastAPI (Python) *or* Node/Express | Async, fast, ElevenLabs webhook-friendly |
| **Database** | PostgreSQL + pgvector | Relational data + semantic search over past calls |
| **Knowledge Base** | Markdown + vector embeddings | DIY guides, YouTube links, articles, all searchable |
| **Dashboard** | Next.js 14 + Tailwind + shadcn/ui | Real-time staff view, clean and modern |
| **Notifications** | Twilio (SMS) + SendGrid (email) | Dispatch to tenants and Handwerker |
| **Hosting** | Vercel (dashboard) + Railway/Fly.io (API+DB) | Fast hackathon deploy |
| **Auth** | Clerk or Supabase Auth | Staff login |

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
│   └── ELEVENLABS_SETUP.md
└── infra/                # Docker, deployment configs
```

---

## 🗂️ Customer Data Model

Every call is filed under the tenant's identity. Core entities:

- **Tenant** — `id`, `name`, `contract_nr`, `phone`, `email`, `unit`, `building`
- **Call** — `id`, `tenant_id`, `started_at`, `ended_at`, `audio_url`, `transcript` (full, word-for-word)
- **Inquiry** — `id`, `call_id`, `summary`, `urgency` (LOW/MEDIUM/HIGH), `category` (plumbing, electrical, heating, admin, etc.)
- **Dispatch** — `id`, `inquiry_id`, `action` (DIY_GUIDE / STAFF / HANDWERKER), `sent_to`, `sent_at`, `status`

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full schema.

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR-ORG/neotheo.git
cd neotheo

# 2. Install
pnpm install        # for dashboard
cd apps/api && pip install -r requirements.txt

# 3. Env
cp .env.example .env
# Fill in: ELEVENLABS_API_KEY, ANTHROPIC_API_KEY, DATABASE_URL, TWILIO_*

# 4. Run
docker compose up -d postgres      # spin up DB
cd apps/api && uvicorn main:app --reload
cd apps/dashboard && pnpm dev
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
