# Agent tracing with Sentry

Every Gemma 4 request the app makes is traced in Sentry: live practice turns, question explanations, situation enhancement and call-card vocabulary. Traces hold timing, token counts, estimated cost, finish reasons, tool names and quality flags. They never hold what the learner said, typed or heard.

## How requests reach Gemma

The ElevenLabs agent's Custom LLM points at this app's `/llm/v1/chat/completions` instead of DigitalOcean directly. The endpoint accepts only the agent's `LLM_PROXY_KEY` and the configured Gemma model, forwards the request to DigitalOcean serverless inference with the server's model access key, and streams the reply back byte for byte. It asks DigitalOcean to include token usage in the stream. Situation enhancement and vocabulary already call DigitalOcean from the server and use the same spans.

The browser labels each ElevenLabs session through `customLlmExtraBody`: `purpose` is `call` or `help`, and `conversation` is a hash of the practice session ID, so a call's turns and its explanations group into one Sentry conversation without exposing the session credential.

## What a trace contains

| Span | Agent | Data |
| --- | --- | --- |
| `gen_ai.invoke_agent` | Practice partner, Question helper, Situation editor, Vocabulary picker | Agent name, model, conversation reference, token totals |
| `gen_ai.chat` | (child of the agent span) | Time to first token, input/output/cached tokens, estimated USD cost, finish reasons, requested tool names, response ID |
| `gen_ai.execute_tool` | Practice partner | `end_call` when Gemma requests it. ElevenLabs executes the tool; the span marks the turn that requested it. |

## Rule checks on every practice reply

`server/reply_rules.py` checks each practice-call reply against the role-play rules in `practice_prompt()`. A broken rule is recorded on the turn's spans and raised as one Sentry issue per rule, tagged with the prompt version, conversation, turn number and traffic type (`live` or `evaluation`):

| Rule | Detected when | Why it matters to the learner |
| --- | --- | --- |
| `missed_hang_up` | The learner said goodbye (以上です, さようなら, "that's all"…) and Gemma did not call `end_call` | The call runs on until the time limit |
| `claimed_booking` | The reply confirms a booking or arrangement (ご予約を承りました, "your appointment is confirmed") | The rehearsal promises it never books anything |
| `digits_in_japanese_speech` | A Japanese reply contains digits | The voice reads kana counters more reliably |
| `english_in_japanese_speech` | A Japanese reply contains Latin letters | The Japanese voice mispronounces them |

Each turn also records `app.learner_said_goodbye`, `app.hung_up`, `app.turn` (the greeting is reply 1, matching the call card) and `app.prompt_version`, an eight-character fingerprint of the role-play template that `/api/start` returns and the browser passes along. Comparing rule issues by prompt version shows whether a prompt edit helped.

## Learner reports

After a live practice, each partner reply on the call card has **Report this reply**. The learner picks a reason and may add a note; the reply's text is included only if they tick the box. `/api/reports` sends it to Sentry as "Learner reported a partner reply: <reason>", tagged with the conversation, turn number and prompt version, so the developer can open the exact traced turn (`gen_ai.conversation.id:<ref> app.turn:<n>`). Reports are limited to five per practice and 200 per day.

## Other quality flags

These appear on the chat span and as Sentry warnings:

- `tool_syntax_in_speech`: Gemma wrote `end_call(...)` or similar as dialogue instead of calling the tool, so the voice would read it aloud.
- `voice_tag_in_speech`: a bracketed direction such as `[slow]` in spoken text.
- `ungrounded_words`: vocabulary that does not occur in the transcript, which the app discards.
- `invalid_output` / `changed_language`: an enhancement or vocabulary reply that failed validation.

Provider failures (unreachable, HTTP errors, interrupted streams) are captured as errors. A turn the learner interrupts finishes with status `cancelled`.

## Privacy

`send_default_pii` is off, request bodies are never attached, local variables are not captured and trace headers are not sent to providers. Reply text is scanned for the flags above in server memory and discarded. Tests assert that captured Sentry payloads contain no conversation text or keys.

## Setup and rollback

1. Create a Sentry project (Python → FastAPI). In Render, set `SENTRY_DSN` and a long random `LLM_PROXY_KEY`. `/api/health` reports `tracing_available` and `llm_proxy_available`.
2. With the same `LLM_PROXY_KEY` in your local `.env`, run `.venv/Scripts/python.exe scripts/configure-llm-proxy.py https://<your-app>.onrender.com`. It stores the key as an ElevenLabs secret, points the Custom LLM at `/llm/v1/`, allows the extra body override, and saves the previous DigitalOcean settings in `work/llm-proxy-rollback.json`.
3. To bypass the proxy, run `.venv/Scripts/python.exe scripts/configure-llm-proxy.py --rollback`.

Traces appear under Sentry Insights → AI → Agents. `SENTRY_TRACES_SAMPLE_RATE` defaults to 1.0. The environment is `production` on Render (which sets `RENDER=true`) and `development` elsewhere unless `SENTRY_ENVIRONMENT` is set, so local scripts and tests never mix with real usage.
