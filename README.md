# Before I Call

Japanese conversation practice for residents navigating everyday life in Japan. The React interface includes a credential-free guided repair demo and live ElevenLabs Agents conversations. Render serves the interface and FastAPI backend from one Docker service.

## Situations

Choose home repairs, a clinic appointment, missed delivery, a city-office visit, dietary requests, lost property, bills, or your own situation. Presets are editable rehearsal examples, not verified case studies or official guidance. Live practice uses the selected role, greeting, and situation; call cards extract actual transcript phrases and vocabulary with romaji and known English word meanings. No preset opening or unrelated vocabulary is inserted. Three guided demos cover home repairs, clinic booking and parcel redelivery. Both sides use saved ElevenLabs Japanese audio, so playback needs no credentials.

## Local setup

Use Node 22 and Python 3.12:

```powershell
npm ci
npm run build
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m uvicorn server.app:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. Use `npm run dev` for frontend development; Vite proxies /api and /audio to port 8000. The demo requires no credentials. `.env` is excluded from Git.

## ElevenLabs live configuration

Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID on the server. ELEVENLABS_VOICE_ID enables slow replay. No Daily account, Groq key, Ollama service, or native audio transport is required.

The key needs ElevenAgents Read for conversation-token issuance, and Text to Speech Access for slow replay. Agent creation or configuration through the API additionally needs ElevenAgents Write. Speech to Text Access is not required by this app anymore; recognition is handled inside Agents.

Configure a dedicated agent with Japanese language, a Japanese voice, a hosted LLM, a maximum conversation duration of 300 seconds, authentication enabled, and voice recording disabled. In Security allow System prompt, First message, and Language overrides. These let one agent play the selected service role. Do not leave a fixed washing-machine prompt as the only configuration. The application supplies the prompt at session start.

The browser gets a conversation token from /api/start, never the API key. The official @elevenlabs/client SDK establishes WebRTC directly with ElevenLabs. It delivers audio, transcripts, microphone muting, typed responses and conversation state. Explain that asks the same agent for help in the selected language; help is part of that conversation's context and transcript. Resume returns to role-play. Pause mutes local input and output; the provider session and billing continue until End practice. Slow replay synthesizes the last role-play question separately.

## Render

Connect the repository as a Blueprint using render.yaml. The Dockerfile installs the lightweight backend and builds the frontend. Start with the included Starter plan and measure actual memory use; there is no local LLM in this configuration. Use one instance because session admission leases are in memory.

Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_VOICE_ID, and APP_ORIGIN to the exact Render origin without a trailing slash. Local .env values do not transfer automatically. LIVE_ACCESS_CODE can restrict token issuance. Remove old DAILY_API_KEY, GROQ_API_KEY and LLM_MODEL settings from the Render service.

MAX_CALL_SECONDS sets the browser's end timer and server admission-lease expiry. Also set the agent's provider-side maximum duration to the same limit, because a browser timer is not authoritative. MAX_CONCURRENT_CALLS limits admission leases on this one app instance, not all sessions started elsewhere on the ElevenLabs account.

## Reading support and privacy

Native ruby shows furigana. Curated vocabulary includes English meanings; pykakasi supplies dictionary readings for unfamiliar kanji without another model API. Those readings can be ambiguous, especially names. Unfamiliar words direct the learner to Explain that rather than inventing English meanings. Hover, focus and tap reveal meanings; Escape/blur dismisses the tooltip. Layouts support narrow phones, system dark mode and reduced motion.

Transcripts stay in browser memory. At completion, the browser sends the transcript to the local app server for word and pronunciation extraction; the server does not persist it or send it to another AI service. The app does not save recordings. ElevenLabs retention follows the agent's privacy settings. Use placeholders rather than real addresses, tracking IDs or account details in practice.

## Checks

`npm test`, `npm run build`, and `.venv/Scripts/python.exe -m unittest discover -s tests -p test_api.py -v` check scripted flow, audio, card exports, token boundaries, provider failures, concurrency leases, and annotations. A real browser voice call must also be tested with an accessible configured agent; compilation and token issuance alone do not prove microphone/audio quality or latency.


