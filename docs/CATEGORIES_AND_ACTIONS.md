# Inquiry Categories & Standard Action Sequences

> Authoritative source for: how **neo-theo** classifies inquiries, and what the system automatically does for each class.
>
> Designed after [Jan @ Hallo Theo's feedback](./JAN_FEEDBACK.md), specifically to mirror Hallo Theo's actual two-tier human structure (Servicer → Property Manager) and to honor the design tension Jan named: *"How far can you push autonomy when you want human-in-the-loop?"*

---

## Two-Axis Classification

Every inquiry is classified along **two independent axes**:

1. **Urgency** — `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`
2. **Action class** — `AUTO_RESOLVE`, `SERVICER_QUEUE`, `PROPERTY_MANAGER`, `OWNER_APPROVAL`, `EMERGENCY_DISPATCH`, `KNOWLEDGE_CAPTURE_REQUIRED`

Urgency answers *"when does this need to be handled?"*. Action class answers *"who or what should handle it?"*. The two combine to determine the standard action sequence (the SAS), which is what the system actually executes.

> **Why two axes, not one?** Jan's insight #4: a HIGH-urgency event isn't automatically a Property-Manager task (e.g., a clear emergency goes straight to dispatch, bypassing PM triage). And a LOW-urgency request can still need owner approval (e.g., €2,000 hallway-paint job is non-urgent but needs WEG sign-off). Collapsing both into a single LOW/MED/HIGH axis loses this signal.

---

## Urgency Definitions

| Urgency | Meaning | Latency budget |
|---|---|---|
| 🟢 **LOW** | DIY-solvable, informational, or non-time-sensitive | 24h |
| 🟡 **MEDIUM** | Requires a human action but is not safety-critical | 2-8h working hours |
| 🔴 **HIGH** | Significant disruption to tenant life or property; needs same-day action | 1-3h |
| 🚨 **EMERGENCY** | Safety, structural, or active-damage risk (gas smell, active leak flooding, no heat in winter, fire, electrical sparking) | Immediate (<15 min) |

---

## Action Class Definitions

| Class | Who / what handles it | Human-in-loop? |
|---|---|---|
| 🤖 **`AUTO_RESOLVE`** | **neo-theo** handles end-to-end — DIY guide, FAQ answer, document re-send | No (audit-logged only) |
| 👤 **`SERVICER_QUEUE`** | Routed to the generalist Servicer queue (front-line human staff) | Yes (within 8h) |
| 🏠 **`PROPERTY_MANAGER`** | Routed to the specific PM for that property | Yes (the named PM) |
| 💰 **`OWNER_APPROVAL`** | Requires explicit owner sign-off (above-budget repair, structural decision) | Yes (owner directly) |
| 🚨 **`EMERGENCY_DISPATCH`** | Bypass triage queue; trigger emergency vendor + notify PM + notify owner in parallel | Yes (parallel notification, not blocking) |
| 📚 **`KNOWLEDGE_CAPTURE_REQUIRED`** | Modifier flag, NOT a destination. When this fires, after the inquiry is resolved by a human, **neo-theo** prompts them with: *"What did you do? Who did you call? Save to property knowledge?"* — and writes the answer into the property's knowledge graph. | After-the-fact, 30 seconds |

The `KNOWLEDGE_CAPTURE_REQUIRED` modifier is **the strategic killer feature for Hallo Theo** — it operationalizes Jan's insight #3 about extracting "tested knowledge" from PMs' heads.

---

## Standard Action Sequences (SAS)

Each (Urgency, Action Class) combination triggers a defined sequence the system executes. These are deterministic — once classification is set, the steps run without further AI decisions until a human is in the loop.

### SAS-1 · `LOW` + `AUTO_RESOLVE` — *"DIY-it-yourself"*

**Trigger examples:** Slow drain, lost letter, how-do-I-read-my-Nebenkostenabrechnung, where-is-my-mailbox-key.

**Sequence:**
1. Agent confirms understanding back to tenant in their language
2. Vector search across `knowledge_base` for matching DIY guide
3. Dispatch the guide via tenant's `preferred_channel` (Email / SMS / Letter PDF / Telegram / In-app)
4. Log inquiry + dispatched guide ID + delivery confirmation to Supabase
5. After 48h: automated follow-up check ("Did this solve it?") via same channel
6. If "no" → escalate to `MEDIUM + SERVICER_QUEUE`

### SAS-2 · `LOW` + `SERVICER_QUEUE` — *"non-urgent but needs a human"*

**Trigger examples:** Document request that requires lookup (Mietvertrag-Kopie), name-change on account, change-of-bank-details, parking-spot-question, neighbour-noise (first report).

**Sequence:**
1. Agent confirms understanding + sets expectation: *"A team member will respond by [next business day, e.g. tomorrow 14:00]."*
2. Create ticket in Supabase + push to HubSpot (Hallo Theo's existing ticket system) via webhook
3. Surface in Servicer dashboard queue, sorted by oldest-first
4. SLA timer: 8 working hours
5. Tenant gets confirmation via preferred channel with ticket ID

### SAS-3 · `MEDIUM` + `PROPERTY_MANAGER` — *"needs the expert"*

**Trigger examples:** Recurring elevator slowdown, request to install Wallbox, balcony renovation question, dispute with neighbour about Hausordnung.

**Sequence:**
1. Agent confirms + sets expectation: *"Your property manager [Name] will be in touch within 24h."*
2. Lookup `building.assigned_pm_id` → fetch PM contact + on-shift status
3. Create ticket with the PM as assignee + full transcript + AI-generated summary
4. Notify PM via their preferred channel (Slack DM / email / WhatsApp Business)
5. `KNOWLEDGE_CAPTURE_REQUIRED = true` (because PMs accumulate "tested knowledge" on these — see Jan insight #3)
6. SLA: 24h to first response

### SAS-4 · `HIGH` + `PROPERTY_MANAGER` — *"PM needs to know now"*

**Trigger examples:** Water leak (contained, not flooding), heating partial-failure in shoulder season, broken elevator (no people trapped), lock-out scenarios.

**Sequence:**
1. Agent confirms + sets clear expectation: *"This is urgent. The property manager is being notified now."*
2. Lookup `building.assigned_pm_id` + `pm.on_shift_now()`
3. **If PM is on-shift:** auto-call them via voice (web bridge for now; Twilio later) with AI summary
4. **If PM is off-shift:** fall through to `SERVICER_QUEUE` with `priority = high` + alert on-call Servicer
5. SLA: 2h to first action
6. Owner gets a courtesy "we're handling X at your property" notification

### SAS-5 · `HIGH` + `OWNER_APPROVAL` — *"big spend, urgent"*

**Trigger examples:** Quote for elevator motor replacement (€8,000+), emergency facade-stone removal (€3,500+), roof repair after storm.

**Sequence:**
1. Agent confirms + sets expectation: *"Cost approval is needed from owner(s). We will request it now."*
2. Look up `property.policy.budget_thresholds[category]` → confirm this exceeds PM's authority
3. Optionally: trigger Theo Negotiates auction to get 2-3 competing quotes first (Phase 2)
4. Send owner(s) an approval link with: scope, quote(s), recommended vendor, rationale
5. Owner taps approve → vendor dispatched + Stripe deposit (per Theo Negotiates flow)
6. Owner taps decline → fall through to PM for re-quote or alternative
7. Full audit trail saved to Supabase (regulatory + transparency, per Jan insight: "valid concern of owners")

### SAS-6 · `EMERGENCY` + `EMERGENCY_DISPATCH` — *"safety / property at risk now"*

**Trigger examples:** Active flooding, gas smell, no-heat in winter, fire, electrical sparking, person trapped in elevator, structural collapse risk.

**Sequence (parallel, not sequential):**
1. Agent immediately stays on the line to keep tenant calm + collect details
2. **In parallel:**
   - Auto-dispatch emergency vendor for that category (24/7 contracted partner)
   - SMS + voice-call to `building.assigned_pm`
   - SMS + voice-call to property owner(s)
   - If `person_trapped` / `fire` / `gas`: instruct tenant to call 110/112 first
3. Skip budget check entirely — emergencies have no budget gate
4. Reconcile finances after the fact with `KNOWLEDGE_CAPTURE_REQUIRED = true`
5. SLA: vendor confirmed en route within 15 minutes

### SAS-7 · `*` + `KNOWLEDGE_CAPTURE_REQUIRED` (modifier)

This isn't a standalone class. When any inquiry resolves with `knowledge_capture_required = true`, the system:

1. After the human (PM or Servicer) marks the ticket resolved, **neo-theo** posts a single Slack DM:
   *"Quick: what did you do for [Tenant], property [Friedrichstraße 12], issue [elevator slow]? Who did you contact? Anything future you/we should remember? (30s answer is fine — voice note OK.)"*
2. The reply (text or transcribed voice) is parsed by Claude and written to `property_knowledge.entries` with embeddings
3. Future inquiries on the same property → that knowledge is surfaced to whoever takes the next call

This is the operationalization of Hallo Theo's strategic priority. **It is also the thing that will make Jan say yes.**

---

## Classification Algorithm (How the Agent Decides)

After every call, Claude is given the transcript + tenant context + property context and emits a JSON object:

```json
{
  "urgency": "HIGH",
  "action_class": "PROPERTY_MANAGER",
  "category": "heating",
  "sub_category": "complete_failure_winter",
  "knowledge_capture_required": true,
  "estimated_cost_eur_bucket": "500-2000",
  "needs_owner_approval": false,
  "language_detected": "de",
  "tenant_emotional_state": "frustrated_but_calm",
  "confidence": 0.91,
  "reasoning": "Tenant reports complete heating failure, outdoor temperature 4°C, building is pre-war Altbau (high heat-loss). Past records show this building had a boiler replaced 2023; current PM has tested knowledge. Owner approval not needed if repair cost is under property's PM-discretion threshold (€2000 per policy_id 47)."
}
```

The classification is non-blocking — the SAS for the assigned class begins executing immediately, and the dashboard live-streams every step.

---

## Category Taxonomy (Domain Categories)

These are the operational categories that pair with the urgency + action class. Each maps to a knowledge-base namespace and to a default vendor type:

- **`heating`** (Heizung) — boiler, radiators, district heating
- **`plumbing`** (Sanitär) — leaks, drains, water pressure, toilets
- **`electrical`** (Elektrik) — outlets, lights, fuse box, sparking
- **`elevator`** (Aufzug) — entrapment, slowness, breakdown
- **`locks_keys`** (Schloss/Schlüssel) — lockout, lost key, broken lock
- **`appliances`** — built-in dishwasher / oven / fridge (in furnished units)
- **`structural`** — roof, facade, balcony, windows, doors
- **`pests`** — Schädlingsbekämpfung
- **`cleaning_common`** — staircase, courtyard, gutters
- **`noise_neighbour`** — Hausordnung-related disputes
- **`document_request`** — Mietvertrag-Kopie, Nebenkostenabrechnung, Wohnungsgeberbescheinigung
- **`accounting`** — payments, rent receipts, bank-details changes
- **`renovation_inquiry`** — Wallbox, balcony, kitchen rebuild (mostly owner-facing)
- **`information_lookup`** — "when is the next ETV?" / "is the parking spot mine?"
- **`administrative`** — name changes, address updates, contract questions

---

## Channel-Adaptive Dispatch

Per Jan's insight #6, the *same* DIY answer must render differently per tenant. Channels supported:

| Channel | Used for | Tenant profile fit |
|---|---|---|
| `voice_callback` | When tenant explicitly prefers being called back | Older / non-tech |
| `letter_pdf` | Mailed physical letter for ultra-traditional tenants | 80+, no email |
| `email` | HubSpot ticket reply (default for most) | All ages |
| `sms` | DIY guide URL + summary text | Most |
| `whatsapp_business` | Rich-media DIY video + bot follow-up | 30-60 |
| `telegram` | Same, for Telegram-preferring users | 25-50 tech-fluent |
| `in_app` | hallo theo tenant app push | Tenants who installed app |

Per tenant: `tenant.preferred_channel` (enum) + `tenant.fallback_channel` for redundancy.

---

## Open Design Questions (For Soheil + Ian to Decide)

- [ ] Should `EMERGENCY` always skip cost-budget rules, or is there a class of "expensive but emergency" that still needs a 5-minute owner-notify-and-proceed pattern (vs. owner-approve)?
- [ ] Knowledge capture for Servicer-handled (not PM-handled) tickets — same flow, or different? Probably yes, but with a lighter prompt.
- [ ] Tenant emotional state ("frustrated", "scared", "calm") — surface to Servicer/PM dashboard? Could help routing to empathetic vs. efficient staff. (Risk: feels surveillance-y if not handled with care.)
- [ ] Do we offer the tenant a "talk to a human" override at any point? Probably yes for `AUTO_RESOLVE`, definitely yes for anyone over a certain age threshold or who explicitly asks.
