# Before I Call
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, TypeScript, Vite; Python and FastAPI. ElevenLabs Agents over WebRTC for the live call, with Gemma 4 on DigitalOcean serverless inference as the agent's Custom LLM through the app's traced proxy. ElevenLabs Text to Speech for slow replay. pykakasi and Janome for furigana and romaji. Sentry agent tracing. Render deployment. See docs/ARCHITECTURE.md.

## Users
People living in Japan who want to rehearse a Japanese phone conversation. The initiating user is Indian and lives alone in Tokyo. Judges also need a frictionless demonstration.

## Product purpose
Practice an everyday call, understand a reply, and resume the same conversation. Presets cover repairs, clinic booking, redelivery, city-office questions, dietary requests, lost property and bills, plus custom situations. The first guided demo is a leaking washing machine and arranging a repair.

## Capabilities and constraints
Guided demos in Japanese and English without login or microphone. Live voice conversation with an AI, not a telephone call. Enhance a rough situation, explain the last reply, replay it slowly, repeat it, and export a call card as a PDF with furigana. Live credentials remain on the server. Guided content must be labeled scripted. No fabricated user interviews or outcomes. Render hosting is required. Demo must remain usable without provider configuration.

## Open decisions
Explanation language: English first, confirmed by the user. Call practice and explanations each offer English and Japanese; Hindi is not included. The dedicated Japanese ElevenLabs agent is configured and accessible. A real WebRTC browser session with simulated microphone input passed; human speech quality and latency still need participant testing.

## Evidence on hand
User-supplied challenge brief and the conversation. No real participant test or case study yet.

## Product principles
User experience first. Give learners time to think. Preserve the conversation when seeking help. Make failure recoverable. Keep one scenario polished before expanding.

## Accessibility and inclusion
Keyboard controls, visible transcripts, typed responses, reduced-motion support, responsive mobile layout. Microphone permissions only after choosing live practice.

## Session behaviour
Help opens a separate text-only session so explanations stay out of the role-play transcript. Pause mutes local audio without ending provider billing. Every practice reply is checked against the role-play rules and traced in Sentry without conversation text.
