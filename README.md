# Before I Call

Rehearse a Japanese repair call, pause to understand a reply, and leave with a practice card. Built for the Hacktoberfest 2026 weekend prototype.

## What works

- A four-exchange guided demo with packaged Japanese audio. No signup, microphone or provider credentials. Explicitly labeled scripted.
- Explanation, slower audio, retry, transcript and UTF-8 call-card download.
- Responsive call interface with keyboard focus and reduced-motion support.
- A live voice implementation using Daily WebRTC, Pipecat, ElevenLabs realtime speech recognition/Japanese synthesis, and a configurable Groq-hosted open-weight model.
- Typed live responses, microphone mute, tap-to-speak mode, separate explanation context, session timeout and concurrency limits.
- A Docker image and Render Blueprint. One Render service serves the built frontend and backend.

**Verification limit:** The demo, API boundary behavior and Pipecat service constructors were tested locally. A real Daily/ElevenLabs/Groq call, Japanese model quality, Render container execution and network latency have not been verified. Live mode is disabled when configuration or Daily's native library is missing. It never silently substitutes scripted replies.

## Run the demo locally on Windows

Use Node 22 and Python 3.12.

```powershell
npm ci
npm run build
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m uvicorn server.app:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. For frontend development, run `npm run dev` in a second terminal; Vite proxies `/api` to port 8000.

Daily's native Python library supports Linux/macOS, so Windows can run the demo/API but needs a Linux deployment for this live voice transport.

## Live configuration and Render

1. Push the project to a Git repository you control.
2. Create a Render Blueprint from the repository's `render.yaml`. It specifies a paid Starter service to avoid idle spin-down. No deployment has been performed yet.
3. Set server environment variables `DAILY_API_KEY`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. Choose and audition a Japanese voice; do not use a voice ID without permission.
4. Set `APP_ORIGIN` to the public Render origin, for example `https://your-app.onrender.com`, without a trailing slash. Set `LIVE_ACCESS_CODE` if you want to restrict who can spend live-provider credits. The demo stays public.
5. `LLM_MODEL` defaults to `openai/gpt-oss-20b`, an open-weight model listed by Groq. Set it to another compatible open-weight model after testing Japanese output. An OpenAI API key is not required for this Groq-hosted model.
6. Check `/api/health` for `live_available: true`, then test microphone permissions, a full call, interruption, explanation, retry and card download on desktop and a real phone.

Live calls have a five-minute runtime budget plus 45 seconds for startup. At most two run concurrently by default. Provider charges are separate from Render hosting. These limits reduce spend but are not a substitute for provider account spend limits.

Use one Uvicorn worker/one Render instance for this prototype: session state is in memory. Restarts lose current calls; scaling requires a shared session service. Transcripts are available to the session's unguessable ID and purged on subsequent session creation after the retention window. No database, account system or recording storage is included.

## Voice and help behavior

The learner starts from a written scenario and speaks Japanese or English. Pipecat uses Silero VAD with a 1.2-second silence threshold and its default turn strategy. ElevenLabs recognizes speech, the open-weight model asks a short Japanese question, and ElevenLabs speaks it. Browser audio is carried through Daily WebRTC.

Explain pauses microphone/output and uses a separate model request, so explanation text does not become a role-play turn. Slow replay synthesizes the last generated reply at lower speed. Retry asks the model to repeat its last question. Resume returns to the same session. No actual phone number is dialed or appointment booked.

Tap-to-speak currently toggles microphone input; it does not force a semantic turn boundary. End-of-turn behavior still needs testing with hesitant learners. The on-screen transcript records generated replies, which may include text interrupted before it was fully heard.

Live audio and text go to Daily, ElevenLabs and Groq. This app does not persist raw recordings; provider retention depends on their account policies. The demo voice is Windows Microsoft Haruka Desktop, generated locally by `scripts/generate-demo-audio.ps1`; it is a prototype voice, not the final ElevenLabs voice. All demo sentences and explanations are authored examples, not evidence from a real participant.

## Validation

```powershell
npm run build
npm test
.venv/Scripts/python.exe -m unittest discover -s tests -p test_api.py -v
```

The local browser pass completed the guided flow, exercised explanation/slower/retry controls, downloaded and inspected the card, checked the missing-provider state, and captured desktop/mobile layouts. No provider call or latency benchmark is claimed.

## Submission still needs

A real intended recipient, their feedback, a provider-backed call test, a published demo/repository, and the DEV write-up. Do not present the fictional repair scenario as a real interview or claim a measured confidence improvement without testing it.

## October 3 interface update

Responsive speech-led layout with self-hosted Outfit, light/dark themes and reduced motion support. Guided demo includes audio for both partner and prepared learner replies. Japanese displays furigana; underlined words have hover, keyboard and touch meanings. Live replies request contextual annotations from the existing Groq backend, cached per session; no new provider keys are needed. Provider-generated readings have not been verified against a real call locally. If annotations fail, curated known vocabulary remains available.

Start voice practice checks server availability on click before microphone access. Unconfigured servers show an actionable message and a guided-demo entry instead of a disabled button. Demo audio is synthesized locally with Windows Haruka and checked into public/audio; it needs no credentials at runtime.

Call cards include romaji for the opening and help phrases, plus a useful Japanese word list with pronunciation and meanings in both the interface and text download.
