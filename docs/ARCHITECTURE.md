# 🏛️ NeoTheo — Architecture

## End-to-End Call Flow

```
1. Tenant dials HalloTheo number
        │
        ▼
2. Twilio routes call to ElevenLabs Conversational AI agent
   - Agent greets in tenant's preferred language
   - Asks identifying info (name / contract nr / address)
   - Listens to the problem
        │
        ▼
3. ElevenLabs streams transcript to NeoTheo API (webhook)
   - POST /webhooks/elevenlabs/transcript
   - Payload: { call_id, tenant_phone, transcript, audio_url }
        │
        ▼
4. API resolves tenant identity
   - Match phone → tenants table
   - If unknown: create provisional record, flag for review
        │
        ▼
5. AI Triage Layer (Claude/GPT) processes transcript
   - Extracts: intent, category, key facts
   - Classifies urgency: LOW / MEDIUM / HIGH
   - If LOW: searches knowledge-base via vector similarity
        │
        ▼
6. Dispatch decision
   ├── LOW    → DIY guide sent via SMS/email (Twilio/SendGrid)
   ├── MEDIUM → Ticket created in staff queue, dashboard notifies
   └── HIGH   → Auto-call/SMS the on-call Handwerker for that category
        │
        ▼
7. Everything persisted
   - Full transcript stored in `calls` table
   - Inquiry classification in `inquiries`
   - Dispatch action in `dispatches`
   - All linked to tenant_id
        │
        ▼
8. Dashboard reflects everything in real-time (WebSocket / SSE)
```

---

## Database Schema (Postgres + pgvector)

```sql
-- Tenants: the people who call
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    contract_nr     TEXT UNIQUE NOT NULL,
    phone           TEXT UNIQUE NOT NULL,
    email           TEXT,
    unit            TEXT,
    building        TEXT,
    language        TEXT DEFAULT 'de',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Calls: one row per ElevenLabs conversation
CREATE TABLE calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    elevenlabs_id   TEXT UNIQUE,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    audio_url       TEXT,
    transcript      TEXT NOT NULL,           -- full word-for-word
    transcript_vec  VECTOR(1536),            -- for semantic search
    raw_payload     JSONB                    -- everything from ElevenLabs
);

-- Inquiries: the AI's understanding of what the tenant wants
CREATE TABLE inquiries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id         UUID REFERENCES calls(id),
    tenant_id       UUID REFERENCES tenants(id),
    summary         TEXT NOT NULL,           -- AI-generated 1–2 sentences
    category        TEXT NOT NULL,           -- plumbing / electrical / heating / admin / other
    urgency         TEXT NOT NULL CHECK (urgency IN ('LOW','MEDIUM','HIGH')),
    confidence      FLOAT,                   -- 0.0–1.0
    keywords        TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatches: what action was taken
CREATE TABLE dispatches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id      UUID REFERENCES inquiries(id),
    action          TEXT NOT NULL,           -- DIY_GUIDE / STAFF_QUEUE / HANDWERKER
    sent_to         TEXT,                    -- phone / email / staff name
    payload         JSONB,                   -- link sent, ticket id, etc.
    status          TEXT DEFAULT 'pending',  -- pending / sent / acknowledged / resolved
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- Knowledge base: DIY guides
CREATE TABLE kb_articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,
    content         TEXT NOT NULL,           -- markdown
    youtube_url     TEXT,
    external_url    TEXT,
    content_vec     VECTOR(1536),            -- for semantic match
    tags            TEXT[]
);

-- Handwerker contacts (for HIGH urgency)
CREATE TABLE handwerker (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,           -- plumbing / electrical / heating ...
    phone           TEXT NOT NULL,
    email           TEXT,
    on_call         BOOLEAN DEFAULT TRUE
);
```

---

## AI Triage — Classification Rules

The triage prompt instructs Claude/GPT to output structured JSON:

```json
{
  "summary": "Tenant reports kitchen sink draining slowly.",
  "category": "plumbing",
  "urgency": "LOW",
  "confidence": 0.92,
  "keywords": ["sink", "drain", "slow"],
  "reasoning": "No leak, no flooding, common DIY fix available."
}
```

Urgency heuristics (encoded in the system prompt):

| Urgency | Examples |
|---|---|
| **LOW** | Slow drain, light bulb out, how-to questions, "where do I find...", minor noise complaints, billing questions |
| **MEDIUM** | Heating not working but not freezing, intermittent issues, neighbor disputes, repair scheduling |
| **HIGH** | Active water leak, no heat in winter, gas smell, electrical sparking, security/lock issues, anything safety-related |

See [`URGENCY_RULES.md`](./URGENCY_RULES.md) for the full prompt.

---

## Theo Negotiates Additions

When `urgency = HIGH`, the dispatch path branches into the **Theo Negotiates** subsystem — a parallel multi-agent voice auction with Stripe Connect deposit on owner consent. The full spec, demo script, and guardrails live in [`THEO_NEGOTIATES.md`](./THEO_NEGOTIATES.md). The schema additions:

```sql
-- handwerker gains four columns
ALTER TABLE handwerker
    ADD COLUMN stripe_account_id    TEXT,
    ADD COLUMN reputation_score     FLOAT DEFAULT 0.5,
    ADD COLUMN max_concurrent_jobs  INT DEFAULT 3,
    ADD COLUMN consents_to_ai_calls BOOLEAN DEFAULT FALSE;

-- New tables
CREATE TABLE auctions (...);          -- one row per HIGH dispatch that took auction path
CREATE TABLE bids (...);              -- one row per outbound call leg (NULL price = no answer)
CREATE TABLE owner_consents (...);    -- owner approval audit trail (regulatory + dispute)
CREATE TABLE payouts (...);           -- Stripe Connect deposit + final-payment events

-- dispatches.action now includes 'AUCTION' alongside DIY_GUIDE / STAFF_QUEUE / HANDWERKER
```

Full DDL is in [`packages/db/schema.sql`](../packages/db/schema.sql).

### Bid Scoring

The Auction Resolver picks a winner with a weighted score:

```
score = w_price * (1 / price_eur)
      + w_eta   * (1 / hours_until_slot)
      + w_rep   * reputation_score
```

Defaults: `w_price = 0.5`, `w_eta = 0.3`, `w_rep = 0.2`. Owners can override per-category in their policy.

### Why Auction-As-Dispatch (Not a Separate System)

The auction is implemented as a `dispatches.action = 'AUCTION'` row, not a parallel pipeline. This means: a single source of truth for "what happened on this inquiry," uniform dashboard rendering, and any future dispatch innovations (e.g. predictive maintenance auctions) plug into the same primitives.

---

## Why This Is "5-Year Tech"

- **Voice-first interfaces** are replacing apps for non-tech-native users (elderly tenants especially)
- **Agentic AI** that takes actions (not just chats) is the direction every major lab is heading
- **Multi-agent orchestration with real-world side effects** (parallel outbound voice calls negotiating live, then triggering payment) is what separates AI demos from AI products
- **RAG + structured dispatch** is becoming the standard pattern for operational AI
- **Multilingual by default** — ElevenLabs handles 30+ languages, no extra work
- **Auditable transcripts + owner consent records** future-proof against AI regulation (EU AI Act compliance, PSD2 strong-customer-authentication parallels)
