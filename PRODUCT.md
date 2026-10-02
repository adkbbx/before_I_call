# Before I Call
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, TypeScript, Vite; Python and FastAPI; ElevenLabs Agents WebRTC and hosted inference, with separate ElevenLabs TTS slow replay. Render deployment.

## Users
People living in Japan who want to rehearse a Japanese phone conversation. The initiating user is Indian and lives alone in Tokyo. Judges also need a frictionless demonstration.

## Product purpose
Practice an everyday call, understand a reply, and resume the same conversation. Initial scenario: a leaking washing machine and arranging a repair.

## Capabilities and constraints
Guided demo without login or microphone. Live voice conversation with an AI, not a telephone call. Explain the last reply, replay it slowly, retry, and export a call card. Live credentials remain on the server. Guided content must be labeled scripted. No fabricated user interviews or outcomes. Render hosting is required. Demo must remain usable without provider configuration.

## Open decisions
Explanation language: English first, confirmed by the user. Hindi is an optional live-practice setting. The dedicated Japanese ElevenLabs agent is configured and accessible. A real WebRTC browser session with simulated microphone input passed; human speech quality and latency still need participant testing.

## Evidence on hand
User-supplied challenge brief and the conversation. No real participant test or case study yet.

## Product principles
User experience first. Give learners time to think. Preserve the conversation when seeking help. Make failure recoverable. Keep one scenario polished before expanding.

## Accessibility and inclusion
Keyboard controls, visible transcripts, typed responses, reduced-motion support, responsive mobile layout. Microphone permissions only after choosing live practice.

## October 3 integration revision
Live voice uses ElevenLabs Agents directly. Presets cover repairs, clinic booking, redelivery, city-office questions, dietary requests, lost property and bills, plus custom situations. The guided repair demo remains available. Help is part of the agent conversation; pause mutes local audio without ending provider billing. No Daily/Groq integration remains.
