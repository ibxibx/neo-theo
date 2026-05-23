-- NeoTheo schema
-- Postgres 15+ with pgvector extension

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE TABLE calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    elevenlabs_id   TEXT UNIQUE,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    audio_url       TEXT,
    transcript      TEXT NOT NULL,
    transcript_vec  VECTOR(1536),
    raw_payload     JSONB
);

CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_started ON calls(started_at DESC);

CREATE TABLE inquiries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id         UUID REFERENCES calls(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES tenants(id),
    summary         TEXT NOT NULL,
    category        TEXT NOT NULL,
    urgency         TEXT NOT NULL CHECK (urgency IN ('LOW','MEDIUM','HIGH')),
    confidence      FLOAT,
    keywords        TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inquiries_tenant ON inquiries(tenant_id);
CREATE INDEX idx_inquiries_urgency ON inquiries(urgency, created_at DESC);

CREATE TABLE dispatches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id      UUID REFERENCES inquiries(id) ON DELETE CASCADE,
    action          TEXT NOT NULL CHECK (action IN ('DIY_GUIDE','STAFF_QUEUE','HANDWERKER','AUCTION')),
    sent_to         TEXT,
    payload         JSONB,
    status          TEXT DEFAULT 'pending',
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE TABLE kb_articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,
    content         TEXT NOT NULL,
    youtube_url     TEXT,
    external_url    TEXT,
    content_vec     VECTOR(1536),
    tags            TEXT[]
);

CREATE INDEX idx_kb_category ON kb_articles(category);

CREATE TABLE handwerker (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    phone           TEXT NOT NULL,
    email           TEXT,
    on_call         BOOLEAN DEFAULT TRUE,
    -- Theo Negotiates additions
    stripe_account_id    TEXT,                       -- Stripe Connect account
    reputation_score     FLOAT DEFAULT 0.5 CHECK (reputation_score BETWEEN 0 AND 1),
    max_concurrent_jobs  INT DEFAULT 3,
    consents_to_ai_calls BOOLEAN DEFAULT FALSE       -- opt-in required by guardrail
);

-- =========================================================================
-- THEO NEGOTIATES -- multi-agent vendor auction (HIGH-urgency dispatch only)
-- See docs/THEO_NEGOTIATES.md for the full spec.
-- =========================================================================

CREATE TABLE auctions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id          UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    building            TEXT NOT NULL,
    category            TEXT NOT NULL,
    problem_summary     TEXT NOT NULL,
    max_budget_eur      NUMERIC(10,2),               -- per-category owner ceiling
    n_vendors           INT NOT NULL DEFAULT 3,
    timeout_seconds     INT NOT NULL DEFAULT 90,
    brief               TEXT NOT NULL,               -- Claude-generated negotiation brief
    status              TEXT NOT NULL DEFAULT 'open' -- open / resolved / failed / cancelled
                        CHECK (status IN ('open','resolved','failed','cancelled')),
    winning_bid_id      UUID,                        -- FK set after resolution
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ
);

CREATE INDEX idx_auctions_inquiry ON auctions(inquiry_id);
CREATE INDEX idx_auctions_status ON auctions(status, started_at DESC);

CREATE TABLE bids (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id          UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    handwerker_id       UUID NOT NULL REFERENCES handwerker(id),
    call_sid            TEXT,                        -- Twilio call id for this leg
    elevenlabs_call_id  TEXT,                        -- EL session id for this leg
    price_eur           NUMERIC(10,2),               -- NULL = no bid (vmail/no answer)
    earliest_slot       TIMESTAMPTZ,                 -- vendor's offered time
    confidence          FLOAT,                       -- agent's confidence in extracted bid
    transcript          TEXT,                        -- full leg transcript
    reason              TEXT,                        -- "no_answer" / "declined" / "voicemail" / NULL
    score               FLOAT,                       -- composite score, computed at resolve
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_auction ON bids(auction_id);

-- Late FK once both tables exist
ALTER TABLE auctions ADD CONSTRAINT fk_winning_bid
    FOREIGN KEY (winning_bid_id) REFERENCES bids(id);

CREATE TABLE owner_consents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id          UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bid_id              UUID NOT NULL REFERENCES bids(id),
    owner_identifier    TEXT NOT NULL,               -- phone / email / owner_id
    channel             TEXT NOT NULL                -- "sms" / "stripe_push" / "email"
                        CHECK (channel IN ('sms','stripe_push','email')),
    message_sent        TEXT NOT NULL,               -- exact text shown to owner
    deposit_amount_eur  NUMERIC(10,2) NOT NULL,
    requested_at        TIMESTAMPTZ DEFAULT NOW(),
    responded_at        TIMESTAMPTZ,
    decision            TEXT                         -- "approve" / "decline" / NULL (timeout)
                        CHECK (decision IN ('approve','decline')),
    response_ip         INET,                        -- where the tap came from
    response_payload    JSONB
);

CREATE INDEX idx_owner_consents_auction ON owner_consents(auction_id);

CREATE TABLE payouts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id              UUID NOT NULL REFERENCES auctions(id),
    bid_id                  UUID NOT NULL REFERENCES bids(id),
    handwerker_id           UUID NOT NULL REFERENCES handwerker(id),
    stripe_payment_intent   TEXT UNIQUE,
    stripe_transfer_id      TEXT,
    deposit_amount_eur      NUMERIC(10,2) NOT NULL,
    final_amount_eur        NUMERIC(10,2),
    status                  TEXT NOT NULL DEFAULT 'deposit_pending'
                            CHECK (status IN (
                                'deposit_pending','deposit_held',
                                'released','refunded','disputed','failed'
                            )),
    deposit_at              TIMESTAMPTZ,
    released_at             TIMESTAMPTZ,
    raw_stripe_event        JSONB
);

CREATE INDEX idx_payouts_auction ON payouts(auction_id);
CREATE INDEX idx_payouts_status ON payouts(status);
