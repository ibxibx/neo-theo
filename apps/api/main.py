"""
NeoTheo API — main entry point.
Handles ElevenLabs webhooks, runs AI triage, dispatches actions.
"""

import os
import json
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import anthropic

app = FastAPI(title="NeoTheo API", version="0.1.0")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class TriageResult(BaseModel):
    summary: str
    category: str
    urgency: str
    confidence: float
    keywords: list[str]
    reasoning: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "neotheo-api"}


@app.post("/webhooks/elevenlabs/transcript")
async def elevenlabs_webhook(request: Request):
    """Receives the completed call payload from ElevenLabs."""
    # TODO: verify HMAC signature using ELEVENLABS_WEBHOOK_SECRET
    payload = await request.json()

    transcript_text = _flatten_transcript(payload.get("transcript", []))
    tenant = _resolve_tenant(payload.get("caller_number"))
    call_id = _store_call(tenant, payload, transcript_text)

    triage = await run_triage(transcript_text)
    inquiry_id = _store_inquiry(call_id, tenant["id"], triage)

    dispatch = await dispatch_action(inquiry_id, triage, tenant)

    return {"ok": True, "inquiry_id": inquiry_id, "dispatch": dispatch}


async def run_triage(transcript: str) -> TriageResult:
    """Send the transcript to Claude and get back structured classification."""
    with open("packages/agent/triage_prompt.md") as f:
        system_prompt = f.read()

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": transcript}],
    )

    raw = msg.content[0].text.strip()
    # Strip code fences if the model added any
    if raw.startswith("```"):
        raw = raw.split("```")[1].lstrip("json").strip()

    data = json.loads(raw)
    return TriageResult(**data)


async def dispatch_action(inquiry_id, triage: TriageResult, tenant: dict):
    """Route to DIY guide / staff queue / Handwerker based on urgency."""
    if triage.urgency == "LOW":
        article = _match_kb(triage.keywords, triage.category)
        _send_sms(tenant["phone"], _format_diy_message(article))
        return {"action": "DIY_GUIDE", "article_id": article["id"] if article else None}

    if triage.urgency == "MEDIUM":
        _create_staff_ticket(inquiry_id, triage, tenant)
        return {"action": "STAFF_QUEUE"}

    if triage.urgency == "HIGH":
        handwerker = _find_on_call_handwerker(triage.category)
        _call_handwerker(handwerker, triage, tenant)
        return {"action": "HANDWERKER", "handwerker_id": handwerker["id"]}


# ----- Stubs (implement against real DB / Twilio / SendGrid) -----

def _flatten_transcript(messages: list) -> str:
    return "\n".join(f"{m['role']}: {m['text']}" for m in messages)

def _resolve_tenant(phone: str) -> dict:
    # TODO: query Postgres
    return {"id": "uuid-stub", "phone": phone, "name": "Test Tenant"}

def _store_call(tenant, payload, transcript) -> str:
    # TODO: INSERT INTO calls
    return "call-uuid-stub"

def _store_inquiry(call_id, tenant_id, triage) -> str:
    # TODO: INSERT INTO inquiries
    return "inquiry-uuid-stub"

def _match_kb(keywords, category):
    # TODO: vector similarity search in kb_articles
    return {"id": "kb-stub", "title": "Slow Drain Fix", "youtube_url": "https://..."}

def _format_diy_message(article) -> str:
    return f"Hi! Try this: {article['title']} → {article['youtube_url']}"

def _send_sms(to, body):
    # TODO: Twilio
    print(f"[SMS to {to}] {body}")

def _create_staff_ticket(inquiry_id, triage, tenant):
    # TODO: insert into dispatches + notify dashboard via SSE/WS
    pass

def _find_on_call_handwerker(category):
    # TODO: SELECT FROM handwerker WHERE category=? AND on_call=true
    return {"id": "hw-uuid", "name": "Klaus", "phone": "+49..."}

def _call_handwerker(handwerker, triage, tenant):
    # TODO: Twilio outbound call/SMS
    pass
