# 🎙️ Theo Negotiates — Multi-Agent Vendor Auction

> **The HIGH-urgency dispatch upgrade.**
> When triage classifies an inquiry as HIGH (e.g., *Heizung defekt im Winter*, active leak, gas smell), NeoTheo doesn't just text one Handwerker. It runs a **parallel voice auction**: three AI agents call three vendors simultaneously, negotiate price and earliest slot in German, pick the winner, and trigger a Stripe Connect deposit — all with the owner's one-tap consent.

This is the spectacle layer on top of the standard NeoTheo dispatch flow. It is **only** invoked for `urgency = HIGH`.

---

## 🎯 Why This Exists

The current NeoTheo HIGH path is: *classify → notify on-call Handwerker → done*. That's correct, but it leaves three real problems on the table:

1. **Single point of failure** — if the first Handwerker doesn't pick up, the tenant waits.
2. **No price discovery** — the property owner pays whatever the on-call vendor charges, with no competition.
3. **Slow ack loop** — staff manually coordinate scheduling, often by phone tag.

Theo Negotiates fixes all three in one move: **parallel outbound calls, live voice negotiation, structured bid extraction, deposit on win.**

---

## 🧱 Architecture

```
                ┌───────────────────────────────────────┐
                │ NeoTheo Triage Layer                  │
                │ urgency = HIGH, category = "heating"  │
                └────────────────┬──────────────────────┘
                                 │
                                 ▼
                ┌───────────────────────────────────────┐
                │ Auction Orchestrator (Claude)         │
                │ - selects N=3 Handwerker for category │
                │ - generates negotiation brief         │
                │ - opens "auction" row in DB           │
                └────────────────┬──────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  ┌───────────┐            ┌───────────┐            ┌───────────┐
  │ EL Agent  │            │ EL Agent  │            │ EL Agent  │
  │ Session 1 │            │ Session 2 │            │ Session 3 │
  │ (web,     │            │ (web,     │            │ (web,     │
  │ dashboard │            │ dashboard │            │ dashboard │
  │ panel)    │            │ panel)    │            │ panel)    │
  └─────┬─────┘            └─────┬─────┘            └─────┬─────┘
        │                        │                        │
        ▼                        ▼                        ▼
  bid / decline             bid / decline             bid / decline
        │                        │                        │
        ▼                        ▼                        ▼
  bid extracted             bid extracted             no bid
  (price, slot)             (price, slot)             (declined)
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                ┌───────────────────────────────────────┐
                │ Auction Resolver                      │
                │ - compares bids on price × ETA × rep  │
                │ - picks winner                        │
                │ - drafts owner consent message        │
                └────────────────┬──────────────────────┘
                                 │
                                 ▼
                ┌───────────────────────────────────────┐
                │ Owner Consent (Stripe push / SMS)     │
                │ "Approve €450 deposit to Müller       │
                │  Klempnerei, slot tomorrow 9:00?"     │
                │ One-tap approve / decline             │
                └────────────────┬──────────────────────┘
                                 │
                       approve   │   decline
                ┌────────────────┴────────────────┐
                ▼                                 ▼
   ┌────────────────────┐            ┌────────────────────┐
   │ Stripe Connect:    │            │ Fall back to       │
   │ - 30% deposit to   │            │ standard NeoTheo   │
   │   vendor on-hold   │            │ HIGH path (manual  │
   │ - full payment on  │            │ dispatch to staff) │
   │   resolution       │            └────────────────────┘
   └─────────┬──────────┘
             │
             ▼
   ┌────────────────────┐
   │ Tenant sees        │
   │ confirmation in    │
   │ dashboard / email  │
   └────────────────────┘
```

---

## 🔁 End-to-End Flow

1. **Trigger.** NeoTheo triage layer classifies an inquiry as `HIGH` and emits an `auction.requested` event with `{inquiry_id, category, building, problem_summary}`.
2. **Vendor selection.** Auction Orchestrator queries the `handwerker` table for the top N (default 3) vendors matching `category`, ranked by `on_call = true`, then `reputation_score DESC`. Only vendors with `consents_to_ai_calls = true` AND `consents_to_auto_lead_fee = true` are eligible.
3. **Brief generation.** Claude produces a short German-language negotiation brief: problem, address, desired window, max budget (from owner policy), allowed deviations.
4. **Parallel auction sessions.** Three ElevenLabs Conversational AI sessions are spawned in parallel as live agent panels in the dashboard. Each session is loaded with the brief and a `submit_bid` tool. *(Note: per [mentor guidance](./WYNAND_FEEDBACK.md), the hackathon demo simulates these as parallel web sessions rather than placing real outbound phone calls. The architecture supports both — see "Phase 2" below.)*
5. **Live negotiation.** Each agent introduces itself as calling on behalf of *hallo theo*, states the problem, asks for **price** and **earliest available slot**. The agent discloses up front that NeoTheo charges a lead fee (e.g. 10%) if they win, so the vendor can factor it into their bid.
6. **Bid extraction.** On hangup, the agent calls `submit_bid(price_eur, slot_iso, confidence, transcript_id)`. Voicemail or no-pickup → `submit_bid(null, null, 0, transcript_id)` with `reason = "no_answer"`.
7. **Resolution.** Auction Resolver waits up to `auction_timeout_s` (default 90s), then scores bids using `score = w1 * (1/price) + w2 * (1/eta_hours) + w3 * reputation`. Winner picked.
8. **Owner consent.** Push notification (Stripe-hosted approval link or SMS with one-tap URL) sent to the property owner. Payload: vendor name, bid price, slot, **deposit amount the owner will be charged**. (The lead fee charged to the Handwerker is *not* shown to the owner — it's between NeoTheo and the vendor.)
9. **Two parallel Stripe operations on approval:**
   - **9a. Lead fee charge to Handwerker** (vendor-side flow): off-session `PaymentIntent` on the Handwerker's `stripe_customer_id`, amount = `winning_bid * lead_fee_pct / 100`. This is NeoTheo's revenue — *"automatic payout for the service"*.
   - **9b. Deposit hold from owner** (owner-side flow): `PaymentIntent` with `transfer_data[destination] = handwerker.stripe_account_id`, `capture_method = manual`, amount = 30% of bid. Released to vendor on job completion.
10. **Tenant confirmation.** Confirmation message rendered in the tenant's dashboard view (and optionally sent via email): *"Der Klempner kommt morgen um 9 Uhr."* (Phase-2: outbound voice confirmation via ElevenLabs + Twilio.)

### Two Stripe Flows at a Glance

```
                          ┌─────────────────────────────┐
                          │  Winning bid: €480          │
                          └──────────────┬──────────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ▼                                             ▼
        ┌────────────────────┐                      ┌────────────────────────┐
        │ Vendor-side flow   │                      │ Owner-side flow        │
        │ (lead fee)         │                      │ (job payment)          │
        │                    │                      │                        │
        │ Handwerker pays    │                      │ Owner pays Handwerker  │
        │ NeoTheo €48 (10%)  │                      │ via Connect:           │
        │                    │                      │ - €144 deposit hold    │
        │ Off-session PI on  │                      │ - €336 on completion   │
        │ handwerker.        │                      │                        │
        │ stripe_customer_id │                      │ Destination charge to  │
        │                    │                      │ handwerker.            │
        │ → vendor_charges   │                      │ stripe_account_id      │
        │   table            │                      │                        │
        │                    │                      │ → payouts table        │
        └────────────────────┘                      └────────────────────────┘
```

---

## 🗄️ Schema Additions

New tables added to `packages/db/schema.sql` (see also `docs/ARCHITECTURE.md`):

- **`auctions`** — one row per HIGH-urgency dispatch that took the auction path
- **`bids`** — one row per outbound call leg; null `price_eur` for no-answer / voicemail
- **`owner_consents`** — owner approval audit trail (regulatory + dispute resolution)
- **`payouts`** — *owner-side flow:* Stripe Connect deposit + final-payment events (owner pays Handwerker)
- **`vendor_charges`** — *vendor-side flow:* lead fee charged to Handwerker on win (NeoTheo's revenue)
- **`handwerker`** gets new columns: `stripe_customer_id`, `stripe_default_payment_method`, `stripe_account_id`, `lead_fee_pct`, `reputation_score`, `max_concurrent_jobs`, `consents_to_ai_calls`, `consents_to_auto_lead_fee`

See **§ "Theo Negotiates additions"** in `docs/ARCHITECTURE.md` for the full DDL.

---

## ⚙️ Configuration (env vars)

```bash
# --- ElevenLabs (intake + parallel negotiator sessions) ---
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=                 # intake agent (tenant)
ELEVENLABS_NEGOTIATOR_AGENT_ID=      # negotiator with submit_bid tool

# --- Supabase (per Wynand) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Stripe (two-sided marketplace) ---
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_ACCOUNT_ID=
STRIPE_DEFAULT_DEPOSIT_PCT=30        # owner-side: % of bid held on deposit
STRIPE_DEFAULT_LEAD_FEE_PCT=10       # vendor-side: % of winning bid charged to Handwerker

# --- Auction tuning ---
AUCTION_TIMEOUT_SECONDS=90           # max wait for all sessions
AUCTION_N_VENDORS=3                  # parallel session count
AUCTION_MAX_BUDGET_EUR=              # optional global ceiling
```

---

## 🛡️ Guardrails (Hard Rules)

These are non-negotiable. Implementing the auction without them is irresponsible.

| Guardrail | Why |
|---|---|
| **No deposit without owner consent** | Stripe deposit hold is placed only after explicit one-tap owner approval. No "implied consent." |
| **Lead fee disclosed to Handwerker up front** | The negotiator agent states the fee percentage in the opening sentence of the call so the vendor can price it in. No surprise charges. |
| **Vendor opt-in to off-session billing** | A Handwerker can only be charged automatically if `consents_to_auto_lead_fee = true` (separate from `consents_to_ai_calls`). Without it, fall back to invoicing. |
| **Owner-policy ceiling enforced server-side** | The agent cannot accept a bid above `max_budget_eur` for that category, even if pressured. |
| **Full call recording + transcript per leg** | EU AI Act + GDPR auditability. Vendors are told at call start they are being recorded. |
| **Vendor opt-in to AI calls** | Each `handwerker` row has a `consents_to_ai_calls` boolean. If false, fall back to human dispatch for that vendor. |
| **Rate limit** | Per-building cap of 1 auction per 5 minutes to prevent runaway loops. |
| **Tenant never sees vendor pricing or fees** | The auction result is between the owner and the vendor. Tenant only sees the slot. |

---

## 🎬 Demo Script (90 seconds)

```
[0:00] Judge clicks the green button on the hallo theo landing page.
[0:05] ElevenLabs web agent picks up, greets in Berliner German.
[0:15] Judge says: "Meine Heizung funktioniert nicht, es ist eiskalt."
[0:25] Agent diagnoses, classifies HIGH. Transcript logs to Supabase
       live in the dashboard.
[0:30] Dashboard: three auction panels light up side-by-side. Each is
       a live ElevenLabs Conversational AI session representing a
       Handwerker; the negotiator agent introduces itself, discloses
       the 10% lead fee, and negotiates price + slot.
[0:35] Panel 1 ("Müller Klempnerei"): bid €480, morgen 9 Uhr.
       Panel 2 ("Schmidt Heizung"): bid €520, übermorgen.
       Panel 3 ("Becker Sanitär"): no response / declines.
[1:10] Auction Resolver picks Panel 1 (cheaper + earlier).
[1:15] Owner's phone (held up by teammate): one-tap consent push.
       "Approve Müller Klempnerei, €480, morgen 9 Uhr?" → tap approve.
[1:20] TWO Stripe events fire in parallel — both visible on dashboard:
       ▸ Vendor charge: €48 lead fee from Müller → NeoTheo (succeeded)
       ▸ Owner deposit: €144 hold on owner → Müller via Connect (held)
[1:25] Dashboard shows both Stripe rows green. Supabase Realtime
       streams them in without a refresh.
[1:30] Tenant confirmation rendered on screen: "Klempner kommt morgen
       9 Uhr."
[1:40] Done. Total: under 2 minutes. Voice in, voice negotiation,
       two-sided payment, full audit trail in Supabase.
```

---

## 🏆 Why This Wins All Three Sponsor Tracks

| Sponsor | What Theo Negotiates Demonstrates |
|---|---|
| **ElevenLabs** | Multi-agent parallel Conversational AI sessions, live German negotiation, structured tool use (`submit_bid`), end-to-end transcripts logged to Supabase. Real outbound telephony is a Phase-2 item (architecture supports it; demo skips it on mentor guidance). |
| **Anthropic** | Claude as the orchestrator: vendor selection, negotiation brief generation, bid scoring, owner-consent message drafting, full reasoning trace logged |
| **Stripe** | **Two-sided marketplace done right:** (1) off-session billing of vendors via Customer + saved payment method (NeoTheo's revenue, "automatic payout for the service"), (2) Connect Custom accounts for owner→vendor deposit holds and conditional payouts. Both flows fire on a single auction win, both auditable end-to-end. |

---

## 🚧 What's NOT in Scope for the Hackathon Demo

To keep the demo honest:
- **Real outbound telephony** — the 3 parallel agents run as live web sessions in the dashboard, not as real phone calls. Per [mentor guidance](./WYNAND_FEEDBACK.md), provisioning a number + Twilio integration is unrealistic in the hackathon window. Architecture supports it; demo skips it.
- **Production vendor KYC** — Stripe Connect runs in test mode; Custom accounts are seeded via the API with test data (full data model is real, identity verification flow is mocked)
- **Reputation scoring from real history** — seeded with synthetic data
- **Dispute resolution UI** — described in architecture, not built
- **Multi-language negotiation** — German only for the demo (the intake agent is multilingual, the negotiator is DE-locked for now)

---

## 🔮 Post-Hackathon Roadmap (Phase 2)

- **Real outbound telephony** — Twilio + ElevenLabs outbound calling for genuine three-phones-ring demo (requires provisioned numbers + ElevenLabs outbound capability)

- **Vendor reputation learning** — every completed job updates the score, every dispute decays it
- **Owner policy DSL** — owners write rules like *"plumbing under €300 = auto-approve, above = ask me"*
- **Multi-language negotiation** — Polish, Turkish, English for Berlin's Handwerker landscape
- **Predictive auctions** — when sensors detect anomalies, run a pre-emptive auction before the tenant even calls
