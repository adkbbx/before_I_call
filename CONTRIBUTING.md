# Contributing to Before I Call

Help people rehearse everyday Japanese and English calls. Start with [the architecture](docs/ARCHITECTURE.md) for how the pieces fit together.

## Run locally

1. Install Node dependencies with `npm install`.
2. Create a Python virtual environment and install `requirements.txt`.
3. Copy `.env.example` to `.env`. The saved demos work without ElevenLabs credentials. For live voice practice with no keys at all, use [free local mode](README.md#free-local-mode-on-your-own-computer): install `requirements-local.txt`, pull the Gemma model in Ollama and set `LOCAL_VOICE=1`.
4. Run `npm run build`, then `python -m uvicorn server.app:app --port 8000`.

## Useful contributions

- Improve Japanese readings, romaji, or word meanings with a reproducible example.
- Add a realistic practice situation with both English and Japanese wording.
- Improve accessibility, responsive layouts, or conversation controls.
- Report voice pronunciation issues with the exact sentence, selected language, and demo/live mode.

Run `npm test`, `npm run build`, and `python -m unittest discover -s tests` before opening a pull request. Include screenshots for visual changes and describe what you tested. Never commit API keys, analytics databases, private transcripts, or recordings of real people. Voice generation scripts consume provider credits; use the saved audio while working on unrelated changes.

The configuration scripts in `scripts/` change the live ElevenLabs agent. Each accepts `--help`, which prints usage without making a request. They load `.env` by searching parent folders, so a git worktree inside this repository still uses the main checkout's `.env` and its live keys.

Open an issue to discuss larger changes, or send a pull request against `main`.
