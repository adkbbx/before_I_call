# Before I Call

Japanese conversation practice for residents navigating everyday life in Japan. The React interface includes a credential-free guided repair demo and live ElevenLabs Agents conversations. Render serves the interface and FastAPI backend from one Docker service.

## Situations

Choose home repairs, a clinic appointment, missed delivery, a city-office visit, dietary requests, lost property, bills, or your own situation. Presets are editable rehearsal examples, not verified case studies or official guidance. Live practice uses the selected role, greeting, and situation; call cards extract actual transcript phrases and vocabulary with romaji and known English word meanings. No preset opening or unrelated vocabulary is inserted. Three guided situations cover home repairs, clinic booking and parcel redelivery in both Japanese and English. Both sides use saved ElevenLabs Japanese audio, so playback needs no credentials.

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

Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID on the server. ELEVENLABS_VOICE_ID enables slow replay.

The key needs ElevenAgents Read for conversation-token issuance, and Text to Speech Access for slow replay. Agent creation or configuration through the API additionally needs ElevenAgents Write. Speech to Text Access is not required by this app anymore; recognition is handled inside Agents.

Configure a dedicated agent with Japanese language, a Japanese voice, a maximum conversation duration of 120 seconds, authentication enabled, and voice recording disabled. In Security allow System prompt, First message, Language, TTS Voice ID and Conversation → Text only overrides.

The agent's LLM is Gemma 4 on DigitalOcean serverless inference, connected as an ElevenLabs Custom LLM with model `gemma-4-31B-it` and the Chat Completions API. The Custom LLM URL is this app's traced proxy, `https://<your-app>/llm/v1/`, which forwards each request to DigitalOcean (`https://inference.do-ai.run/v1/`) with the server's model access key and records it in Sentry; see [agent tracing](docs/AGENT_TRACING.md). Pointing the agent straight at DigitalOcean also works, without traces. Set the backup LLM to Disabled so a provider error ends the turn instead of silently switching to a different model. Calls, question explanations, situation enhancement and call-card vocabulary all use the same Gemma model; the last two call DigitalOcean directly with `GRADIENT_MODEL_ACCESS_KEY` (see [cost controls](docs/COST_CONTROLS.md)). Enable the built-in End Call tool. Run `.venv/Scripts/python.exe scripts/configure-agent.py` with ElevenAgents Write permission to apply these settings and match the provider duration to MAX_CALL_SECONDS. These let one agent play the selected service role. Do not leave a fixed washing-machine prompt as the only configuration. The application supplies the prompt at session start.

The browser gets a conversation token from /api/start, never the API key. The official @elevenlabs/client SDK establishes WebRTC directly with ElevenLabs. It delivers audio, transcripts, microphone muting, typed responses and conversation state. Explain opens a separate text-only session (described below), so help stays out of the role-play transcript. Resume returns to role-play. Pause mutes local input and output; the provider session and billing continue until End practice. Slow replay synthesizes the last role-play question separately.

## Render

Connect the repository as a Blueprint using render.yaml. The Dockerfile installs the lightweight backend and builds the frontend. Start with the included Starter plan and measure actual memory use; there is no local LLM in this configuration. Use one instance because session admission leases are in memory.

Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_VOICE_ID, GRADIENT_MODEL_ACCESS_KEY (enables situation enhancement and call-card vocabulary), and APP_ORIGIN to the exact Render origin without a trailing slash. Local .env values do not transfer automatically. LIVE_ACCESS_CODE can restrict token issuance.

MAX_CALL_SECONDS sets the browser's end timer and server admission-lease expiry. Also set the agent's provider-side maximum duration to the same limit, because a browser timer is not authoritative. MAX_CONCURRENT_CALLS limits admission leases on this one app instance, not all sessions started elsewhere on the ElevenLabs account.

## Reading support and privacy

Native ruby shows furigana. Curated vocabulary includes English meanings; pykakasi supplies dictionary readings for unfamiliar kanji without another model API. Those readings can be ambiguous, especially names. Unfamiliar words direct the learner to Explain that rather than inventing English meanings. Hover, focus and tap reveal meanings; Escape/blur dismisses the tooltip. Layouts support narrow phones, system dark mode and reduced motion.

Transcripts stay in browser memory. At completion, the browser sends the transcript to the local app server for word and pronunciation extraction; the server does not persist it or send it to another AI service. The app does not save recordings. ElevenLabs retention follows the agent's privacy settings. Use placeholders rather than real addresses, tracking IDs or account details in practice.

## Checks

`npm test`, `npm run build`, and `.venv/Scripts/python.exe -m unittest discover -s tests -p test_api.py -v` check scripted flow, audio, card exports, token boundaries, provider failures, concurrency leases, and annotations. A real browser voice call must also be tested with an accessible configured agent; compilation and token issuance alone do not prove microphone/audio quality or latency.



English practice uses Sarah (EXAVITQu4vr4xnSDxMaL) by default; override with ELEVENLABS_ENGLISH_VOICE_ID. Call language is separate from explanation language (English or Japanese). No Hindi option is included. The live timer displays elapsed and remaining session time; reaching the limit or a provider-led conclusion opens the transcript card. Pause does not stop this timer.

## Japanese pronunciation corrections

See [pronunciation coverage and research](docs/pronunciation.md) for the supported date/counter ranges, context limits, sources and importable dictionary export. Use `scripts/generate-demo-audio.py --japanese-only` to regenerate both Japanese demo voices with the shared corrections.

`server/pronunciation.py` contains the shared kana aliases used by demo generation and Japanese slow replay. English replay preserves the original text. Corrections match longer phrases first, so words such as 水曜日 keep their intended readings.

Run `.venv/Scripts/python.exe scripts/configure-pronunciation.py` to install these aliases as a pronunciation dictionary on the live ElevenLabs agent. The API key needs pronunciation dictionary Read/Write and ElevenAgents Read/Write access. The script preserves other attached dictionaries and verifies the saved agent configuration. Rerun it after editing the shared readings. Restart or redeploy the backend to apply replay changes; start a new live call after updating the agent. Verify pronunciation with the selected voice in an actual call.

Run `.venv/Scripts/python.exe -m unittest discover -s tests -p test_pronunciation.py -v` to check reported readings, replay requests, English preservation and repeatable live dictionary setup.

## Anonymous usage analytics

The footer shows lifetime visits. A random browser identifier estimates returning visitors; a session identifier groups actions into journeys. These are estimates, not a count of individual people. Clearing browser storage or automated traffic can affect totals.

Open `/analytics` and enter `ANALYTICS_ADMIN_KEY` to see the last 30 days of language and situation choices, demo/live starts, successful live connections, completions, exits, practice durations, help actions, downloads, and recent visit journeys. The key stays in memory in the dashboard. Event payloads accept only predefined categories and numbers; audio, transcripts, custom situations, IP addresses and referrers are not stored by this analytics feature. Detailed events expire after 90 days; lifetime visit/browser counts remain.

For an existing Render Blueprint, sync the updated `render.yaml` to attach the 1 GB persistent disk and generate `ANALYTICS_ADMIN_KEY`. Retrieve that key from your service's Environment settings. `ANALYTICS_DB_PATH` must point to `/var/data/analytics.sqlite3`; files outside the disk disappear on deployments. Locally, use the key from your ignored `.env`. Keep one service instance. Back up the SQLite database if you need long-term recovery.

Guided demos use different voices for each speaker: Kaito asks and Nao replies in Japanese; Sarah asks and Roger replies in English. To regenerate only learner audio, run `.venv/Scripts/python.exe scripts/generate-demo-audio.py --replies-only`. Optional `ELEVENLABS_JAPANESE_REPLY_VOICE_ID` and `ELEVENLABS_ENGLISH_REPLY_VOICE_ID` select replacement learner voices. Partner and learner IDs must differ. Playback uses bundled files and content hashes, so deployed demos need no extra voice settings.

Live question help opens a separate, short-lived ElevenLabs text-only session while the voice call is muted. The explanation shows a meaning, note, and suggested reply; only the reply receives Japanese reading support. Speech is generated only on the optional Listen action. The main voice call stays connected, so its time limit and applicable billing continue. Help is cancelled when dismissed or the call closes, and is not added to the role-play transcript. Agent security must allow Conversation → Text only overrides; `scripts/configure-agent.py` enables that setting.

## Agent tracing

Sentry traces every Gemma request: live turns, explanations, situation enhancement and vocabulary, with time to first token, tokens, estimated cost, tool calls and quality flags such as tool syntax spoken as dialogue. No conversation text is sent to Sentry. Set `SENTRY_DSN` and `LLM_PROXY_KEY`, then run `scripts/configure-llm-proxy.py`. See [agent tracing](docs/AGENT_TRACING.md).

## License

MIT. See [LICENSE](LICENSE).
