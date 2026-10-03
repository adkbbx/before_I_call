# Guided demo speech

All three demos use ElevenLabs Multilingual v2 synthetic Japanese speech, with the Japanese Kaito voice (fumz37wr3YJ8VD5HWENG). Both sides use pace 0.95, stability 0.7, similarity 0.75 and style 0. Names and water-related words use explicit kana in speech input (水 → みず; 排水 → はいすい). Audio URLs include hashes of the recordings so regenerated speech is not served under an unchanged browser cache URL. These are prepared fictional practice conversations, not recordings of real people or a cloned participant voice.

Source text: src/demo.json and src/extra-demos.json. Regenerate with scripts/generate-demo-audio.py using server-side ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID. Audio is mono 24 kHz PCM WAV and is served locally for credential-free demo playback. Generating new audio consumes ElevenLabs credits; replaying these saved assets does not.



English counterparts use the licensed Sarah stock voice (EXAVITQu4vr4xnSDxMaL). Regenerate only these clips with `scripts/generate-demo-audio.py --english-only`.
