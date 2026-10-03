# Cost controls

Default live practice lasts at most 120 seconds. The app reserves 120 seconds before issuing a token, allows three successful token issuances per browser per UTC day, and reserves at most 1,800 seconds (30 minutes) across all visitors daily. Failed token issuance releases its reservation. Early endings do not refund reservations: the browser cannot prove provider billing has stopped. These admission figures estimate maximum allowed practice time; they are not a provider credit meter or a guarantee against reuse of issued credentials.

The limits use a random HTTP-only browser cookie and a SQLite ledger on the existing persistent disk. Clearing cookies resets the browser quota, but does not reset the site budget. Use `LIVE_ACCESS_CODE` to restrict a public deployment further. No IP addresses, situations, or transcripts are stored in the budget ledger. Daily entries reset at midnight UTC (09:00 Japan time).

Explanations are cached in browser memory for the current live practice only, keyed by exact question and both languages. Generated replay audio is cached in server memory for ten minutes, scoped to its practice session, voice, language and text digest. Concurrent requests for the same audio render once. The cache has a 16 MiB/128-entry limit and is cleared for a session when it ends; nothing is saved to disk. Microphone recordings are never cached. Repeated requests can hit cache even after fresh-generation limits are exhausted. Each call permits six text-help session issuances and six fresh speech-generation attempts by default.

Configuration:

| Variable | Default |
| --- | --- |
| `MAX_CALL_SECONDS` | `120` |
| `MAX_CALLS_PER_VISITOR_DAY` | `3` |
| `MAX_DAILY_CALL_SECONDS` | `1800` |
| `MAX_HELP_REQUESTS_PER_CALL` | `6` |
| `MAX_SPEECH_REQUESTS_PER_CALL` | `6` |

Sync the Render Blueprint to apply these environment values and ensure `/var/data` is attached. Keep one service instance. Set the ElevenLabs agent's maximum duration to match `MAX_CALL_SECONDS`; `scripts/configure-agent.py` does this without changing its LLM selection. The current configured agent has been updated to 120 seconds. For a monetary backstop, set a credit allowance on the ElevenLabs API key and avoid enabling usage-based overages unintentionally. Calls started outside this app do not pass through its admission limits.

Verification uses mocked provider responses, durable-ledger tests and a browser test with a mocked SDK. No paid audio or live conversations are needed to exercise the controls.

## DigitalOcean preparation

Enhance prompt uses the server-only GRADIENT_MODEL_ACCESS_KEY (DIGITALOCEAN_INFERENCE_KEY also accepted), with GRADIENT_MODEL defaulting to gemma-4-31B-it. Add the key separately in Render Environment. Sync the Blueprint to apply MAX_PREPARATIONS_PER_VISITOR_DAY=5 and MAX_PREPARATIONS_PER_DAY=50.

Input is limited to 1,000 characters and output to 350 tokens. Each provider attempt, including failures, reserves one request in the persistent SQLite daily ledger. No automatic retries. Budgets reset at midnight UTC. Identical requests for the same browser are cached in memory for ten minutes, up to 100 results, and cache hits do not spend the budget. Cache contents are not written to disk. Clearing cookies resets the browser limit but cannot reset the site-wide budget.

These limits apply only to the preparation endpoint, not Gemma calls made through ElevenLabs or other apps sharing the key. They bound request count, not dollars or all DigitalOcean account spending. Provider billing and any provider-side spending controls remain separate. The app sends situation text to DigitalOcean; enhancement updates the editable situation directly and Undo restores the original. Rewrites preserve the original language and first-person perspective.
