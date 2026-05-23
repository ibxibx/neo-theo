"""
Create the post-call webhook in ElevenLabs and attach it to our agent.
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv
import httpx

REPO = Path(__file__).resolve().parents[2]
load_dotenv(REPO / ".env")

EL_KEY = os.environ["ELEVENLABS_API_KEY"]
AGENT_ID = os.environ["ELEVENLABS_AGENT_ID"]
TUNNEL = os.environ["PUBLIC_TUNNEL_URL"].rstrip("/")

BASE = "https://api.elevenlabs.io/v1"
HEADERS = {"xi-api-key": EL_KEY, "Content-Type": "application/json"}

# Step 1: Create or find workspace-level webhook
print("Step 1: Creating workspace webhook...")

webhook_payload = {
    "usage": ["convai"],
    "settings": {
        "name": "neotheo-post-call",
        "webhook_url": f"{TUNNEL}/webhooks/elevenlabs/transcript",
        "auth_type": "hmac",
        "request_body_format": "json"
    }
}

# Check for existing first (idempotent)
r_list = httpx.get(f"{BASE}/workspace/webhooks", headers=HEADERS, timeout=10)
r_list.raise_for_status()
existing = r_list.json().get("webhooks", [])
match = next((w for w in existing if (w.get("name") or w.get("settings", {}).get("name")) == "neotheo-post-call"), None)

if match:
    webhook_id = match.get("webhook_id") or match.get("id")
    print(f"  ✓ Found existing webhook: {webhook_id}")
    print(f"    URL: {webhook_payload['settings']['webhook_url']}")
else:
    r = httpx.post(f"{BASE}/workspace/webhooks", headers=HEADERS, json=webhook_payload, timeout=15)
    if r.is_success:
        data = r.json()
        webhook_id = data.get("webhook_id") or data.get("id")
        print(f"  ✓ Created webhook: {webhook_id}")
        print(f"    URL: {webhook_payload['settings']['webhook_url']}")
    else:
        print(f"  ✗ Create failed ({r.status_code}): {r.text[:500]}")
        raise SystemExit(1)

# Step 2: Attach webhook to agent (workspace_overrides.webhooks.post_call_webhook_id)
print("\nStep 2: Attaching webhook to agent...")

update_payload = {
    "workspace_overrides": {
        "webhooks": {
            "post_call_webhook_id": webhook_id,
            "events": ["transcript"],
            "transcript_format": "json",
            "send_audio": False
        }
    }
}

r = httpx.patch(f"{BASE}/convai/agents/{AGENT_ID}", headers=HEADERS, json=update_payload, timeout=15)
if not r.is_success:
    print(f"  ✗ Attach failed ({r.status_code}): {r.text[:500]}")
    raise SystemExit(1)

attached = r.json().get("workspace_overrides", {}).get("webhooks", {})
print(f"  ✓ Attached. post_call_webhook_id={attached.get('post_call_webhook_id')}")
print(f"    events={attached.get('events')}")

print(f"\n✅ Webhook configured. EL will POST transcripts to:")
print(f"   {webhook_payload['settings']['webhook_url']}")
