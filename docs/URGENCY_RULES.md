# 🚦 Urgency Classification Rules

The AI triage layer must classify every inquiry as **LOW**, **MEDIUM**, or **HIGH**.

## Decision Tree

```
Is there immediate risk to safety, property, or health?
├── YES → HIGH
└── NO
    │
    Can the tenant solve it themselves with a guide?
    ├── YES → LOW
    └── NO  → MEDIUM
```

## Category × Urgency Matrix

| Category | LOW | MEDIUM | HIGH |
|---|---|---|---|
| **Plumbing** | Slow drain, dripping tap | Running toilet, low pressure | Active leak, burst pipe, flooding |
| **Electrical** | Bulb replacement, reset breaker | Outlet not working | Sparks, burning smell, full outage |
| **Heating** | Thermostat usage question | Radiator not warming up | No heat in winter, gas smell |
| **Appliances** | How to use dishwasher | Intermittent fault | Smoke, fire, water damage risk |
| **Locks/Security** | Lost key (during day) | Stuck lock | Locked out at night, break-in |
| **Admin** | Rent question, contract copy | Dispute, contract change | (rarely high) |
| **Noise/Neighbor** | First-time complaint | Repeated issue | Threat, violence |

## System Prompt for AI Triage

```
You are neo-theo's triage agent. You receive a transcript of a phone call
from a tenant of a residential property. Your job:

1. Summarize the inquiry in 1–2 sentences.
2. Classify the category (plumbing, electrical, heating, appliances,
   locks, admin, noise, other).
3. Classify urgency: LOW, MEDIUM, or HIGH using the rules below.
4. Output strictly valid JSON.

URGENCY RULES:
- HIGH: any active danger to safety, health, or property.
  Examples: water leak in progress, gas smell, sparks, no heat in
  winter, locked out at night, smoke.
- MEDIUM: requires human staff but not emergency. Issue is degraded
  but not dangerous, OR involves negotiation/scheduling.
- LOW: tenant can solve with a step-by-step guide, YouTube video,
  or short article. No physical intervention needed.

When in doubt between two levels, choose the HIGHER one. Tenant
safety is the priority.

OUTPUT FORMAT (JSON only, no prose):
{
  "summary": "...",
  "category": "...",
  "urgency": "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0.0–1.0,
  "keywords": ["...", "..."],
  "reasoning": "one sentence why"
}
```

## Dispatch Logic

| Urgency | Action | Channel | SLA |
|---|---|---|---|
| LOW | Send DIY guide link | SMS + email | Immediate (< 30 sec) |
| MEDIUM | Create staff ticket | Dashboard + email | Human responds in 4h |
| HIGH | Contact on-call Handwerker | Phone + SMS | Handwerker acks in 15 min |

## Escalation

If the AI's `confidence < 0.7`, the inquiry is automatically escalated one level
up (LOW → MEDIUM, MEDIUM → HIGH). Better to over-serve than under-serve when uncertain.
