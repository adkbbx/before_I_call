# Guided demo speech

The repair demo's photo request uses Eleven v3 with stability 1.0 and the same Kaito voice. This replaces the Multilingual v2 recording after repeated reports that 送って sounded like "okeutte". Other clips retain Multilingual v2. The generation script preserves this model choice when rebuilding the recording. Audio pronunciation still requires listening verification.

All three Japanese demos use ElevenLabs Multilingual v2 synthetic speech. The partner uses Kaito (fumz37wr3YJ8VD5HWENG); prepared learner replies use the separate stock voice iTqcz0mjbxzCZAfsqojU. Both sides use pace 0.95, stability 0.7, similarity 0.75 and style 0. The shared dictionary in server/pronunciation.py converts selected vocabulary, dates and counters to explicit kana before synthesis for both voices. All 20 Japanese clips were regenerated with the expanded dictionary on 2026-10-03. Audio URLs include hashes of the recordings so regenerated speech is not served under an unchanged browser cache URL. These are prepared fictional practice conversations, not recordings of real people or a cloned participant voice.

Source text: src/demo.json and src/extra-demos.json. Regenerate Japanese clips with scripts/generate-demo-audio.py --japanese-only using server-side ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID. Set ELEVENLABS_JAPANESE_REPLY_VOICE_ID to change the learner voice. Audio is mono 24 kHz PCM WAV and is served locally for credential-free demo playback. Generating new audio consumes ElevenLabs credits; replaying these saved assets does not.



English counterparts use the licensed Sarah stock voice (EXAVITQu4vr4xnSDxMaL). Regenerate only these clips with `scripts/generate-demo-audio.py --english-only`.
