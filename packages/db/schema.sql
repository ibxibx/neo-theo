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
    action          TEXT NOT NULL CHECK (action IN ('DIY_GUIDE','STAFF_QUEUE','HANDWERKER')),
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
    on_call         BOOLEAN DEFAULT TRUE
);
