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
  │ Outbound  │            │ Outbound  │            │ Outbound  │
  │ Call A    │            │ Call B    │            │ Call C    │
  │ (Twilio + │            │ (Twilio + │            │ (Twilio + │
  │ EL Agent) │            │ EL Agent) │            │ EL Agent) │
  └─────┬─────┘            └─────┬─────┘            └─────┬─────┘
        │                        │                        │
        ▼                        ▼                        ▼
  pickup / vmail            pickup / vmail            pickup / vmail
        │                        │                        │
        ▼                        ▼                        ▼
  bid extracted             bid extracted             vmail left
  (price, slot)             (price, slot)             (no bid)
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
   │ Tenant gets        │
   │ confirmation call  │
   │ (EL outbound)      │
   └────────────────────┘
```

---

## 🔁 End-to-End Flow

1. **Trigger.** NeoTheo triage layer classifies an inquiry as `HIGH` and emits an `auction.requested` event with `{inquiry_id, category, building, problem_summary}`.
2. **Vendor selection.** Auction Orchestrator queries the `handwerker` table for the top N (default 3) vendors matching `category`, ranked by `on_call = true`, then `reputation_score DESC`.
3. **Brief generation.** Claude produces a short German-language negotiation brief: problem, address, desired window, max budget (from owner policy), allowed deviations.
4. **Parallel outbound calls.** Twilio dials all N vendors at once. Each leg is an ElevenLabs Conversational AI agent loaded with the brief and a `submit_bid` tool.
5. **Live negotiation.** Each agent introduces itself as calling on behalf of *hallo theo*, states the problem, asks for **price** and **earliest available slot**. If the vendor counters, the agent negotiates within owner-policy bounds.
6. **Bid extraction.** On hangup, the agent calls `submit_bid(price_eur, slot_iso, confidence, transcript_id)`. Voicemail or no-pickup → `submit_bid(null, null, 0, transcript_id)` with `reason = "no_answer"`.
7. **Resolution.** Auction Resolver waits up to `auction_timeout_s` (default 90s), then scores bids using `score = w1 * (1/price) + w2 * (1/eta_hours) + w3 * reputation`. Winner picked.
8. **Owner consent.** Push notification (Stripe-hosted approval link or SMS with one-tap URL) sent to the property owner. Payload: vendor name, price, slot, deposit amount.
9. **Payment.** On approval, Stripe Connect places a 30% deposit hold against the chosen vendor's connected account. Full payment released on `dispatch.status = 'resolved'`.
10. **Tenant confirmation.** ElevenLabs places an outbound call to the tenant: *"Guten Tag, der Klempner kommt morgen um 9 Uhr. Können Sie das bestätigen?"*

---

## 🗄️ Schema Additions

New tables added to `packages/db/schema.sql` (see also `docs/ARCHITECTURE.md`):

- **`auctions`** — one row per HIGH-urgency dispatch that took the auction path
- **`bids`** — one row per outbound call leg; null `price_eur` for no-answer / voicemail
- **`owner_consents`** — owner approval audit trail (regulatory + dispute resolution)
- **`payouts`** — Stripe Connect deposit + final-payment events
- **`handwerker`** gets new columns: `stripe_account_id`, `reputation_score`, `max_concurrent_jobs`

See **§ "Theo Negotiates additions"** in `docs/ARCHITECTURE.md` for the full DDL.

---

## ⚙️ Configuration (env vars)

```bash
# --- Twilio (outbound dialer for auction legs) ---
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMBER=                       # caller ID for outbound auction calls

# --- ElevenLabs (negotiator agent, separate from intake agent) ---
ELEVENLABS_NEGOTIATOR_AGENT_ID=      # configured with submit_bid tool

# --- Stripe Connect ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_ACCOUNT_ID=          # hallo theo platform account
STRIPE_DEFAULT_DEPOSIT_PCT=30        # percent of bid held on deposit

# --- Auction tuning ---
AUCTION_TIMEOUT_SECONDS=90           # max wait for all legs
AUCTION_N_VENDORS=3                  # parallel call count
AUCTION_MAX_BUDGET_EUR=              # optional global ceiling
```

---

## 🛡️ Guardrails (Hard Rules)

These are non-negotiable. Implementing the auction without them is irresponsible.

| Guardrail | Why |
|---|---|
| **No payment without owner consent** | Stripe deposit is held only after explicit one-tap approval. No "implied consent." |
| **Owner-policy ceiling enforced server-side** | The agent cannot accept a bid above `max_budget_eur` for that category, even if pressured. |
| **Full call recording + transcript per leg** | EU AI Act + GDPR auditability. Vendors are told at call start they are being recorded. |
| **Vendor opt-in to AI calls** | Each `handwerker` row has a `consents_to_ai_calls` boolean. If false, fall back to human dispatch for that vendor. |
| **Rate limit** | Per-building cap of 1 auction per 5 minutes to prevent runaway loops. |
| **Tenant never sees vendor pricing** | The auction result is between the owner and the vendor. Tenant only sees the slot. |

---

## 🎬 Demo Script (90 seconds)

```
[0:00] Tenant calls hallo theo number (faked on stage).
[0:05] ElevenLabs intake agent answers in Berliner German.
[0:15] Tenant: "Meine Heizung funktioniert nicht, es ist eiskalt."
[0:25] Agent diagnoses, classifies HIGH, hangs up cleanly.
[0:30] Projector: three call panels light up — auction is live.
[0:35] Two phones in the room ring (team members answer).
       AI voice: "Guten Abend, ich rufe für eine Heizungsreparatur,
       Friedrichstraße 12 — können Sie morgen 9 Uhr, und zu welchem Preis?"
[0:50] Vendor 1: "€480, ja morgen früh." → bid logged.
       Vendor 2: "€520, aber erst übermorgen." → bid logged.
       Vendor 3: voicemail → no bid, polite message left.
[1:10] Auction Resolver picks Vendor 1 (cheaper + earlier).
[1:15] Owner's phone (held up): Stripe consent push.
       "Approve €144 deposit to Müller Klempnerei?" → one-tap approve.
[1:25] Stripe webhook confirms hold. Dashboard updates.
[1:30] ElevenLabs outbound call to tenant: confirmation.
[1:40] Done. Total elapsed: under 2 minutes, end-to-end voice + payment.
```

---

## 🏆 Why This Wins All Three Sponsor Tracks

| Sponsor | What Theo Negotiates Demonstrates |
|---|---|
| **ElevenLabs** | Parallel Conversational AI sessions, outbound calls, German negotiation, tool use (`submit_bid`), multi-agent orchestration — likely the most kinetic ElevenLabs demo at the event |
| **Anthropic** | Claude as the orchestrator: vendor selection, negotiation brief generation, bid scoring, owner-consent message drafting, full reasoning trace logged |
| **Stripe** | Connect (**Custom accounts**) for API-driven vendor onboarding, deposit holds with explicit consent, conditional payouts on job completion, dispute-safe audit trail |

---

## 🚧 What's NOT in Scope for the Hackathon Demo

To keep the demo honest:
- **Production vendor KYC** — Stripe Connect runs in test mode; Custom accounts are seeded via the API with test data (full data model is real, identity verification flow is mocked)
- **Reputation scoring from real history** — seeded with synthetic data
- **Dispute resolution UI** — described in architecture, not built
- **Multi-language negotiation** — German only for the demo (the intake agent is multilingual, the negotiator is DE-locked for now)

---

## 🔮 Post-Hackathon Roadmap

- **Vendor reputation learning** — every completed job updates the score, every dispute decays it
- **Owner policy DSL** — owners write rules like *"plumbing under €300 = auto-approve, above = ask me"*
- **Multi-language negotiation** — Polish, Turkish, English for Berlin's Handwerker landscape
- **Predictive auctions** — when sensors detect anomalies, run a pre-emptive auction before the tenant even calls
