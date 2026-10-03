# Contributing to Before I Call

Help people rehearse everyday Japanese and English calls.

## Run locally

1. Install Node dependencies with `npm install`.
2. Create a Python virtual environment and install `requirements.txt`.
3. Copy `.env.example` to `.env`. The saved demos work without ElevenLabs credentials.
4. Run `npm run build`, then `python -m uvicorn server.app:app --port 8000`.

## Useful contributions

- Improve Japanese readings, romaji, or word meanings with a reproducible example.
- Add a realistic practice situation with both English and Japanese wording.
- Improve accessibility, responsive layouts, or conversation controls.
- Report voice pronunciation issues with the exact sentence, selected language, and demo/live mode.

Run `npm test`, `npm run build`, and `python -m unittest discover -s tests` before opening a pull request. Include screenshots for visual changes and describe what you tested. Never commit API keys, analytics databases, private transcripts, or recordings of real people. Voice generation scripts consume provider credits; use the saved audio while working on unrelated changes.

Open an issue to discuss larger changes, or send a pull request against `main`.
