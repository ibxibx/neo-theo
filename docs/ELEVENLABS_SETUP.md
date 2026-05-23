# 🎙️ ElevenLabs Conversational AI — Setup

## Agent Configuration

1. Create a Conversational AI agent at https://elevenlabs.io/app/conversational-ai
2. Pick a warm, professional voice (German default; multilingual on).
3. Set the system prompt (see `packages/agent/system_prompt.md`).
4. Enable transcription + audio recording.
5. Add a **webhook** for `conversation.completed`:
   - URL: `https://api.neotheo.app/webhooks/elevenlabs/transcript`
   - Auth: HMAC signature (set `ELEVENLABS_WEBHOOK_SECRET` in env)

## Inbound Phone Routing

- Buy a Twilio number for the HalloTheo region
- Point the Twilio voice webhook at the ElevenLabs SIP/WebRTC endpoint
- ElevenLabs handles STT → LLM → TTS in real time

## Required Environment Variables

```
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_WEBHOOK_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER=+49...
ANTHROPIC_API_KEY=...
DATABASE_URL=postgres://...
```

## Webhook Payload (what we receive)

```json
{
  "conversation_id": "conv_abc123",
  "agent_id": "agent_xyz",
  "started_at": "2026-05-23T14:32:01Z",
  "ended_at": "2026-05-23T14:35:47Z",
  "caller_number": "+4915112345678",
  "transcript": [
    { "role": "agent", "text": "Hallo, hier ist neo-theo...", "ts": 0.5 },
    { "role": "user",  "text": "Mein Wasserhahn tropft...", "ts": 4.2 }
  ],
  "audio_url": "https://storage.elevenlabs.io/conv_abc123.mp3"
}
```

The API flattens `transcript` into a single text blob for storage,
and keeps the raw JSON in `calls.raw_payload`.
