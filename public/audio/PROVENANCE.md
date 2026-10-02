# Guided demo speech

All three demos use ElevenLabs Multilingual v2 synthetic Japanese speech, with the configured licensed stock voice. Partner pace is 0.9 and learner pace 0.95; stability 0.45, similarity 0.75 and style 0.2. These are prepared fictional practice conversations, not recordings of real people or a cloned participant voice.

Source text: src/demo.json and src/extra-demos.json. Regenerate with scripts/generate-demo-audio.py using server-side ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID. Audio is mono 24 kHz PCM WAV and is served locally for credential-free demo playback. Generating new audio consumes ElevenLabs credits; replaying these saved assets does not.
