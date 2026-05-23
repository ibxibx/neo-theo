"""
One-shot script: configure the NeoTheo intake agent in ElevenLabs.

Steps:
1. Create the 5 custom tools (lookup_tenant_by_phone, get_building_emergency_info,
   log_inquiry, trigger_emergency_dispatch, end_call).
2. Update the agent with the new system prompt + tool_ids.

Reads .env for ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, PUBLIC_TUNNEL_URL.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
import httpx

REPO = Path(__file__).resolve().parents[2]
load_dotenv(REPO / ".env")

EL_KEY = os.environ["ELEVENLABS_API_KEY"]
AGENT_ID = os.environ["ELEVENLABS_AGENT_ID"]
TUNNEL = os.environ["PUBLIC_TUNNEL_URL"].rstrip("/")
SYSTEM_PROMPT = (REPO / "packages" / "agent" / "system_prompt.md").read_text(encoding="utf-8")

BASE = "https://api.elevenlabs.io/v1/convai"
HEADERS = {"xi-api-key": EL_KEY, "Content-Type": "application/json"}

# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "tool_config": {
            "type": "webhook",
            "name": "lookup_tenant_by_phone",
            "description": (
                "Looks up the calling tenant by their phone number. "
                "CALL THIS IMMEDIATELY at the start of every call before anything else. "
                "Returns the tenant's name, building, age_bucket, tech_affinity, "
                "preferred_channel, and language. If found, greet by name and skip "
                "asking for identification."
            ),
            "response_timeout_secs": 10,
            "api_schema": {
                "url": f"{TUNNEL}/tools/lookup_tenant_by_phone",
                "method": "GET",
                "query_params_schema": {
                    "properties": {
                        "phone": {
                            "type": "string",
                            "description": "The caller's phone number in E.164 format, e.g. +493012340001"
                        }
                    },
                    "required": ["phone"]
                }
            }
        }
    },
    {
        "tool_config": {
            "type": "webhook",
            "name": "get_building_emergency_info",
            "description": (
                "Returns water shutoff, gas shutoff, and Hausmeister contact for a building. "
                "Call this BEFORE giving emergency safety instructions (e.g. water leak: "
                "where is the shutoff valve)."
            ),
            "response_timeout_secs": 10,
            "api_schema": {
                "url": f"{TUNNEL}/tools/get_building_emergency_info",
                "method": "GET",
                "query_params_schema": {
                    "properties": {
                        "building": {
                            "type": "string",
                            "description": "The building name/address, e.g. 'Friedrichstraße 12'"
                        }
                    },
                    "required": ["building"]
                }
            }
        }
    },
    {
        "tool_config": {
            "type": "webhook",
            "name": "log_inquiry",
            "description": (
                "Logs a draft inquiry record at the end of the call. Call this ONCE at "
                "the very end of every call (after deciding the dispatch direction)."
            ),
            "response_timeout_secs": 10,
            "api_schema": {
                "url": f"{TUNNEL}/tools/log_inquiry",
                "method": "POST",
                "request_body_schema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string", "description": "1-2 sentence summary of the issue."},
                        "tenant_id": {"type": "string", "description": "UUID from lookup_tenant_by_phone, if found."},
                        "urgency_hint": {"type": "string", "description": "Best guess: LOW | MEDIUM | HIGH | EMERGENCY"},
                        "category_hint": {"type": "string", "description": "Best guess: heating | plumbing | electrical | elevator | locks_keys | appliances | structural | pests | cleaning_common | noise_neighbour | document_request | accounting | renovation_inquiry | information_lookup | administrative | other"},
                        "notes": {"type": "string", "description": "Optional additional context."}
                    },
                    "required": ["summary"]
                }
            }
        }
    },
    {
        "tool_config": {
            "type": "webhook",
            "name": "trigger_emergency_dispatch",
            "description": (
                "Fires emergency dispatch IMMEDIATELY for safety-critical issues "
                "(gas smell, fire, active flooding, electrical sparking, person trapped, "
                "elderly with no heat in winter). Notifies vendor + PM + owner in parallel. "
                "Use this WHILE staying on the call with the tenant."
            ),
            "response_timeout_secs": 10,
            "api_schema": {
                "url": f"{TUNNEL}/tools/trigger_emergency_dispatch",
                "method": "POST",
                "request_body_schema": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "description": "One of: heating | plumbing | electrical | gas | elevator | structural | fire"},
                        "address": {"type": "string", "description": "Full building + unit if known."},
                        "summary": {"type": "string", "description": "Brief description of the emergency."},
                        "caller_phone": {"type": "string", "description": "Caller's phone number."}
                    },
                    "required": ["category", "address", "summary"]
                }
            }
        }
    },
]


# ---------------------------------------------------------------------------
# Step 1: Create tools (or replace if names already exist)
# ---------------------------------------------------------------------------

def list_existing_tools():
    r = httpx.get(f"{BASE}/tools", headers=HEADERS, timeout=10)
    r.raise_for_status()
    return r.json().get("tools", [])


def create_tool(tool_def):
    r = httpx.post(f"{BASE}/tools", headers=HEADERS, json=tool_def, timeout=15)
    if not r.is_success:
        print(f"  ✗ create failed: {r.status_code} {r.text[:300]}")
        r.raise_for_status()
    return r.json()


def delete_tool(tool_id):
    r = httpx.delete(f"{BASE}/tools/{tool_id}", headers=HEADERS, timeout=10)
    if not r.is_success and r.status_code != 404:
        print(f"  ! delete failed: {r.status_code} {r.text[:200]}")


print("Step 1: Reconciling tools...")
existing = list_existing_tools()
existing_by_name = {t.get("tool_config", {}).get("name", t.get("name")): t for t in existing}
print(f"  existing tools: {len(existing)} ({list(existing_by_name.keys())})")

new_tool_ids = []
for tool_def in TOOLS:
    name = tool_def["tool_config"]["name"]
    if name in existing_by_name:
        old_id = existing_by_name[name].get("id") or existing_by_name[name].get("tool_id")
        print(f"  - {name}: deleting old (id={old_id})")
        delete_tool(old_id)
    created = create_tool(tool_def)
    tid = created.get("id") or created.get("tool_id")
    new_tool_ids.append(tid)
    print(f"  ✓ {name} → id={tid}")

print(f"\nCreated {len(new_tool_ids)} tools.")


# ---------------------------------------------------------------------------
# Step 2: Update the agent with system prompt + tool_ids
# ---------------------------------------------------------------------------

print("\nStep 2: Updating agent...")

update_payload = {
    "conversation_config": {
        "agent": {
            "first_message": "hallo, hier ist Theo von hallo theo. Wie kann ich Ihnen helfen?",
            "language": "de",
            "prompt": {
                "prompt": SYSTEM_PROMPT,
                "tool_ids": new_tool_ids,
                # keep existing LLM choice
            }
        }
    }
}

r = httpx.patch(f"{BASE}/agents/{AGENT_ID}", headers=HEADERS, json=update_payload, timeout=15)
if not r.is_success:
    print(f"  ✗ update failed: {r.status_code} {r.text[:500]}")
    sys.exit(1)

print(f"  ✓ Agent updated. version_id={r.json().get('version_id')}")

# ---------------------------------------------------------------------------
# Step 3: Verify
# ---------------------------------------------------------------------------

print("\nStep 3: Verifying...")
r = httpx.get(f"{BASE}/agents/{AGENT_ID}", headers=HEADERS, timeout=10)
r.raise_for_status()
agent = r.json()
prompt_obj = agent["conversation_config"]["agent"]["prompt"]
attached = prompt_obj.get("tool_ids", [])
print(f"  agent.first_message: {agent['conversation_config']['agent']['first_message'][:80]}")
print(f"  agent.language: {agent['conversation_config']['agent']['language']}")
print(f"  attached tools: {len(attached)} ({attached})")
print(f"  prompt length: {len(prompt_obj.get('prompt', ''))} chars")
print(f"\n✅ Agent ready: https://elevenlabs.io/app/talk-to?agent_id={AGENT_ID}")
