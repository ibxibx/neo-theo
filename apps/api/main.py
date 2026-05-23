"""
neo-theo API — FastAPI backend.

Endpoints split into 3 groups:

1. AGENT TOOLS — called by the ElevenLabs intake agent during a call.
   - GET  /tools/lookup_tenant_by_phone
   - GET  /tools/get_building_emergency_info
   - POST /tools/log_inquiry
   - POST /tools/trigger_emergency_dispatch

2. WEBHOOKS — called by ElevenLabs at end-of-call.
   - POST /webhooks/elevenlabs/transcript

3. DASHBOARD — internal helpers for the staff dashboard.
   - GET  /inquiries (with filtering)
   - GET  /health

Triage is done post-call via Claude Sonnet 4.6 using packages/agent/triage_prompt.md.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import anthropic
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("neotheo")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    log.warning("Supabase env vars missing — DB calls will fail")
if not ANTHROPIC_API_KEY:
    log.warning("ANTHROPIC_API_KEY missing — triage calls will fail")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL else None
claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

REPO_ROOT = Path(__file__).resolve().parents[2]
TRIAGE_PROMPT = (REPO_ROOT / "packages" / "agent" / "triage_prompt.md").read_text(encoding="utf-8")

app = FastAPI(title="neo-theo API", version="0.2.0")

# CORS — for the landing page (green button) + Next.js dashboard.
# allow_origin_regex matches:
#   * any localhost port (local dev)
#   * any *.vercel.app domain (Vercel previews + production)
#   * any *.onrender.com (rare cross-service calls)
# This is safe to combine with allow_credentials=True (unlike "*").
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|.*\.vercel\.app|.*\.onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TriageResult(BaseModel):
    summary: str
    category: str
    urgency: str   # LOW | MEDIUM | HIGH | EMERGENCY
    action_class: str   # AUTO_RESOLVE | SERVICER_QUEUE | PROPERTY_MANAGER | OWNER_APPROVAL | EMERGENCY_DISPATCH
    knowledge_capture_required: bool = False
    estimated_cost_eur_bucket: Optional[str] = "unknown"
    needs_owner_approval: bool = False
    tenant_emotional_state: Optional[str] = "calm"
    language_detected: Optional[str] = "de"
    confidence: float
    keywords: list[str] = Field(default_factory=list)
    reasoning: str


class LogInquiryRequest(BaseModel):
    call_id: Optional[str] = None
    tenant_id: Optional[str] = None
    summary: str
    urgency_hint: Optional[str] = None    # agent's best guess; triage may override
    category_hint: Optional[str] = None
    notes: Optional[str] = None


class EmergencyDispatchRequest(BaseModel):
    category: str
    address: str
    summary: str
    caller_phone: Optional[str] = None


# ---------------------------------------------------------------------------
# 1. AGENT TOOLS — called by the ElevenLabs intake agent
# ---------------------------------------------------------------------------

@app.get("/tools/lookup_tenant_by_phone")
def lookup_tenant_by_phone(phone: str):
    """
    The FIRST tool the EL agent calls on every call.
    Returns the tenant record so the agent can personalize.
    """
    if not supabase:
        return {"found": False, "error": "db_unavailable"}

    # Normalize phone: tolerate variations like +49 30 1234 0001 vs +493012340001
    normalized = "".join(c for c in phone if c.isdigit() or c == "+")

    res = supabase.table("tenants").select("*").eq("phone", normalized).execute()

    if not res.data:
        log.info(f"lookup_tenant_by_phone: NO MATCH for {phone} (normalized: {normalized})")
        return {"found": False, "phone": phone}

    t = res.data[0]
    return {
        "found": True,
        "id": t["id"],
        "name": t["name"],
        "contract_nr": t["contract_nr"],
        "language": t.get("language", "de"),
        "building": t.get("building"),
        "unit": t.get("unit"),
        "email": t.get("email"),
        # Profile signals for age/tech-adaptive style
        # In production these would be on the tenants table; for demo we infer
        # from the seed-data conventions in INQUIRIES_SAMPLES.md.
        "age_bucket": _infer_age_bucket(t),
        "tech_affinity": _infer_tech_affinity(t),
        "preferred_channel": _infer_preferred_channel(t),
    }


@app.get("/tools/get_building_emergency_info")
def get_building_emergency_info(building: str):
    """Returns emergency contact and shutoff locations for a building."""
    # MVP: hardcoded for demo buildings. Would be a buildings table in production.
    info = {
        "Friedrichstraße 12":   {"water_shutoff": "Keller, links neben dem Heizraum", "gas_shutoff": "Außenwand zur Straße", "hausmeister": "Herr Walter (+493012349000)"},
        "Schönhauser Allee 88": {"water_shutoff": "Tiefgarage Ebene -1", "gas_shutoff": "Hinterhof, gelber Kasten", "hausmeister": "Frau Behrens (+493012349001)"},
        "Kantstraße 47":        {"water_shutoff": "Keller, gegenüber Aufzug", "gas_shutoff": "Hofeinfahrt rechts", "hausmeister": "Herr Walter (+493012349000)"},
        "Greifswalder Straße 134": {"water_shutoff": "Keller, Raum 03", "gas_shutoff": "Hauseingang, Schacht links", "hausmeister": "Frau Köhler (+493012349002)"},
        "Bergmannstraße 21":    {"water_shutoff": "Hinterhof, Pumpenhaus", "gas_shutoff": "Vorderhaus EG, links", "hausmeister": "Herr Walter (+493012349000)"},
    }
    return info.get(building, {"error": "building_not_in_directory", "building": building})


@app.post("/tools/log_inquiry")
def log_inquiry(req: LogInquiryRequest):
    """Called by the agent at end of call. Writes a draft inquiry row."""
    if not supabase:
        return {"ok": False, "error": "db_unavailable"}

    insert_data = {
        "tenant_id": req.tenant_id,
        "call_id": req.call_id,
        "summary": req.summary,
        "urgency": req.urgency_hint or "LOW",   # agent best-guess, classifier will fix
        "category": req.category_hint or "other",
        "confidence": 0.5,                       # agent doesn't compute this; classifier will
    }
    res = supabase.table("inquiries").insert(insert_data).execute()
    inquiry_id = res.data[0]["id"] if res.data else None
    log.info(f"log_inquiry: created {inquiry_id} ({req.urgency_hint}/{req.category_hint})")
    return {"ok": True, "inquiry_id": inquiry_id}


@app.post("/tools/trigger_emergency_dispatch")
def trigger_emergency_dispatch(req: EmergencyDispatchRequest):
    """
    Fires immediately for EMERGENCY-level issues. Parallel vendor + PM + owner notification.
    For the demo: writes the dispatch row + logs the notifications (no real SMS/calls).
    """
    if not supabase:
        return {"ok": False, "error": "db_unavailable"}

    # In a real system: parallel async dispatch
    log.warning(f"🚨 EMERGENCY DISPATCH: {req.category} @ {req.address} — {req.summary}")
    log.warning(f"   → notifying vendor for {req.category}")
    log.warning(f"   → notifying property manager")
    log.warning(f"   → notifying owner")

    return {
        "ok": True,
        "dispatched": True,
        "category": req.category,
        "vendor_eta_minutes": 15,
        "notifications_sent": ["vendor", "property_manager", "owner"],
    }


# ---------------------------------------------------------------------------
# 2. WEBHOOKS — called by ElevenLabs at end-of-call
# ---------------------------------------------------------------------------

@app.post("/webhooks/elevenlabs/transcript")
async def elevenlabs_webhook(request: Request):
    """
    End-of-call webhook from ElevenLabs.
    Steps: store call → run triage (Claude) → store inquiry → dispatch.
    """
    payload = await request.json()
    log.info(f"webhook: received call {payload.get('conversation_id', '?')}")

    transcript = _flatten_transcript(payload)
    caller_phone = _extract_caller_phone(payload)
    tenant = _resolve_tenant(caller_phone)

    call_id = _store_call(tenant.get("id") if tenant else None, payload, transcript)

    triage = await run_triage(transcript, tenant)
    inquiry_id = _store_inquiry(call_id, tenant.get("id") if tenant else None, triage)

    dispatch = await dispatch_action(inquiry_id, triage, tenant)

    return {
        "ok": True,
        "call_id": call_id,
        "inquiry_id": inquiry_id,
        "triage": triage.dict(),
        "dispatch": dispatch,
    }


# ---------------------------------------------------------------------------
# Core: Triage via Claude
# ---------------------------------------------------------------------------

async def run_triage(transcript: str, tenant: Optional[dict]) -> TriageResult:
    """
    Send transcript + tenant context to Claude, parse the JSON output.
    """
    if not claude:
        raise HTTPException(503, "claude_unavailable")

    user_payload = {
        "transcript": transcript,
        "tenant": tenant or {"id": None, "name": None, "age_bucket": "unknown"},
        "is_business_hours": _is_business_hours(),
    }

    msg = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        temperature=0.2,
        system=TRIAGE_PROMPT,
        messages=[{"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)}],
    )

    raw = msg.content[0].text.strip()
    # Strip code fences if the model added them
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        log.error(f"triage: invalid JSON from Claude: {raw[:300]}")
        raise HTTPException(502, f"triage_invalid_json: {e}")

    log.info(f"triage: {data['urgency']} / {data['action_class']} (conf {data['confidence']})")
    return TriageResult(**data)


# ---------------------------------------------------------------------------
# Core: Dispatch
# ---------------------------------------------------------------------------

async def dispatch_action(inquiry_id: str, triage: TriageResult, tenant: Optional[dict]):
    """
    Route the inquiry according to the action_class.
    For the demo: writes the dispatches row + logs what would happen.
    Real send-actions (email, SMS, vendor call) are stubs that log.
    """
    if not supabase:
        return {"action": "NONE", "error": "db_unavailable"}

    action_map = {
        "AUTO_RESOLVE": "DIY_GUIDE",
        "SERVICER_QUEUE": "STAFF_QUEUE",
        "PROPERTY_MANAGER": "STAFF_QUEUE",
        "OWNER_APPROVAL": "STAFF_QUEUE",
        "EMERGENCY_DISPATCH": "HANDWERKER",
    }
    db_action = action_map.get(triage.action_class, "STAFF_QUEUE")

    payload = {"action_class": triage.action_class, "category": triage.category, "summary": triage.summary}
    if tenant:
        payload["tenant_name"] = tenant.get("name")
        payload["preferred_channel"] = tenant.get("preferred_channel")

    res = supabase.table("dispatches").insert({
        "inquiry_id": inquiry_id,
        "action": db_action,
        "sent_to": tenant.get("email") or tenant.get("phone") if tenant else None,
        "payload": payload,
        "status": "pending",
    }).execute()

    # Trigger the action class side-effect (mocked in demo)
    if triage.action_class == "AUTO_RESOLVE":
        article = _match_kb(triage.keywords, triage.category)
        _send_diy(tenant, article)
        log.info(f"dispatch: AUTO_RESOLVE → DIY guide '{article.get('title') if article else 'NONE'}' to {tenant.get('preferred_channel') if tenant else '?'}")
    elif triage.action_class == "EMERGENCY_DISPATCH":
        log.warning(f"dispatch: EMERGENCY → vendor + PM + owner already notified by tool call")
    elif triage.action_class == "OWNER_APPROVAL":
        log.info(f"dispatch: OWNER_APPROVAL → consent link queued (Phase 2 = Stripe)")
    else:
        log.info(f"dispatch: {triage.action_class} → ticket in staff queue")

    return {"action": db_action, "action_class": triage.action_class, "dispatch_id": res.data[0]["id"] if res.data else None}


# ---------------------------------------------------------------------------
# 3. DASHBOARD HELPERS
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    db_ok = False
    if supabase:
        try:
            supabase.table("tenants").select("id").limit(1).execute()
            db_ok = True
        except Exception:
            db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "neo-theo-api",
        "version": "0.2.0",
        "db": "ok" if db_ok else "unreachable",
        "claude": "ok" if claude else "missing_key",
    }


@app.get("/inquiries")
def list_inquiries(limit: int = 20, urgency: Optional[str] = None):
    """For the dashboard's live feed."""
    if not supabase:
        return []
    q = supabase.table("inquiries").select("*").order("created_at", desc=True).limit(limit)
    if urgency:
        q = q.eq("urgency", urgency)
    return q.execute().data


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _flatten_transcript(payload: dict) -> str:
    """Extract transcript text from various EL webhook shapes."""
    # ElevenLabs sends transcript in a few shapes; handle the common ones
    if isinstance(payload.get("transcript"), str):
        return payload["transcript"]
    if isinstance(payload.get("transcript"), list):
        return "\n".join(f"{m.get('role', '?')}: {m.get('text') or m.get('message', '')}" for m in payload["transcript"])
    return payload.get("text", "")


def _extract_caller_phone(payload: dict) -> Optional[str]:
    # The agent's lookup tool already gives us the tenant via phone; the
    # webhook may also include caller metadata. Handle both.
    return (
        payload.get("caller_number")
        or payload.get("from")
        or payload.get("metadata", {}).get("caller_phone")
    )


def _resolve_tenant(phone: Optional[str]) -> Optional[dict]:
    if not phone or not supabase:
        return None
    normalized = "".join(c for c in phone if c.isdigit() or c == "+")
    res = supabase.table("tenants").select("*").eq("phone", normalized).execute()
    if not res.data:
        return None
    t = res.data[0]
    t["age_bucket"] = _infer_age_bucket(t)
    t["tech_affinity"] = _infer_tech_affinity(t)
    t["preferred_channel"] = _infer_preferred_channel(t)
    return t


def _store_call(tenant_id, payload, transcript_text) -> Optional[str]:
    if not supabase:
        return None
    res = supabase.table("calls").insert({
        "tenant_id": tenant_id,
        "elevenlabs_id": payload.get("conversation_id"),
        "started_at": payload.get("started_at") or datetime.utcnow().isoformat(),
        "ended_at": payload.get("ended_at") or datetime.utcnow().isoformat(),
        "audio_url": payload.get("audio_url"),
        "transcript": transcript_text,
        "raw_payload": payload,
    }).execute()
    return res.data[0]["id"] if res.data else None


def _store_inquiry(call_id, tenant_id, triage: TriageResult) -> Optional[str]:
    if not supabase:
        return None
    res = supabase.table("inquiries").insert({
        "call_id": call_id,
        "tenant_id": tenant_id,
        "summary": triage.summary,
        "category": triage.category,
        "urgency": triage.urgency if triage.urgency != "EMERGENCY" else "HIGH",   # schema constraint is LOW/MEDIUM/HIGH only; EMERGENCY → HIGH + flag
        "confidence": triage.confidence,
        "keywords": triage.keywords,
    }).execute()
    return res.data[0]["id"] if res.data else None


def _match_kb(keywords, category):
    """Naive keyword match — vector search is Phase 2."""
    if not supabase:
        return None
    res = supabase.table("kb_articles").select("*").eq("category", category).limit(1).execute()
    return res.data[0] if res.data else {"title": f"DIY guide for {category}", "youtube_url": "https://example.com"}


def _send_diy(tenant, article):
    """Mock: log what we'd send. Real impl: SendGrid email or SMS gateway."""
    if not tenant or not article:
        return
    channel = tenant.get("preferred_channel", "email")
    log.info(f"[{channel.upper()} to {tenant.get('name')}] DIY: {article.get('title', '?')}")


def _is_business_hours() -> bool:
    now = datetime.utcnow()
    return 0 <= now.weekday() <= 4 and 7 <= now.hour <= 17   # rough UTC business hours


# ----- Demo-data heuristics -----
# In production these are columns on the tenants table. For the hackathon we
# infer from the seed-data conventions in docs/INQUIRIES_SAMPLES.md so the
# demo can showcase channel-adaptive dispatch without extra wiring.

_DEMO_PROFILES = {
    "HT-2024-001": {"age_bucket": "65+", "tech_affinity": "low",  "preferred_channel": "letter"},   # Brigitte 82
    "HT-2024-006": {"age_bucket": "<25", "tech_affinity": "high", "preferred_channel": "in_app"},   # Lisa 26
    "HT-2024-012": {"age_bucket": "65+", "tech_affinity": "low",  "preferred_channel": "phone"},    # Wolfgang 87
    "HT-2024-021": {"age_bucket": "65+", "tech_affinity": "low",  "preferred_channel": "phone"},    # Edith 81
    "HT-2024-024": {"age_bucket": "35-49", "tech_affinity": "high", "preferred_channel": "in_app"}, # Daniel 36
}

def _infer_age_bucket(tenant) -> str:
    return _DEMO_PROFILES.get(tenant.get("contract_nr"), {}).get("age_bucket", "unknown")

def _infer_tech_affinity(tenant) -> str:
    return _DEMO_PROFILES.get(tenant.get("contract_nr"), {}).get("tech_affinity", "unknown")

def _infer_preferred_channel(tenant) -> str:
    return _DEMO_PROFILES.get(tenant.get("contract_nr"), {}).get("preferred_channel", "email")
