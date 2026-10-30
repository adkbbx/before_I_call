# Brief: ElevenLabs sound for the ghost night (P7)

Working root: `aoandon/`. Live: https://aoandon.onrender.com (main 6cbe597). The deadline is today at 15:59 JST, so keep this to about one hour.

## Why

The author's feedback: "create some sounds using ElevenLabs? It still feels lifeless." Sound today is a few procedural WebAudio tones in `src/lib/sound.ts`. It is off by default and easy to miss.

## Hard rules

- Use the API key `ELEVENLABS_API_KEY` from `aoandon/.env.local`, read the same way `pipeline/config.mjs` reads env files. Never print, log or write the key anywhere else. It must not appear in any file except `.env.local`.
- Write only in `scripts/generate-sounds.mjs` (new), `public/assets/sounds/` (new), `src/lib/sound.ts`, `src/lib/prefs.ts`, `src/components/*`, `src/styles/*`, `tests/app-*`, `THIRD_PARTY_NOTICES.md`, `README.md` (one credits line) and `DESIGN.md` (the Sound subsection only). Don't touch `pipeline/`, `data/` or `public/tales/`.
- No git commands that change state. Use PowerShell, and run npm inside `Push-Location aoandon; try { ... } finally { Pop-Location }`.
- Total generated audio is 75 seconds or less, so as not to burn credits. Generate each sound once. Regenerate a sound only if the output is clearly wrong (for example silent or the wrong length), and at most once.
- Mood: a quiet Japanese ghost night. No music with a beat, no voices or words, no screams, no jump scares, nothing loud.

## 1. Generate the sounds

Use the ElevenLabs sound effects API: `POST https://api.elevenlabs.io/v1/sound-generation` with header `xi-api-key`, JSON `{ text, duration_seconds, prompt_influence: 0.5 }` and `?output_format=mp3_44100_128`. For the two loops, also send `loop: true` if the API accepts it (check the response; if it rejects the field, retry without it and make a crossfade loop in code). Check ElevenLabs' current API docs if a field is rejected.

`scripts/generate-sounds.mjs` holds the list below. It writes `public/assets/sounds/<name>.mp3` and `public/assets/sounds/manifest.json` (name, file, seconds, loop, prompt, model) and skips files that already exist unless given `--force`.

| name | seconds | loop | prompt |
|---|---|---|---|
| room-ambience | 22 | yes | Quiet Japanese autumn night inside an old wooden tatami house: soft wind brushing paper shoji screens, distant bell crickets (suzumushi) chirping, an occasional faint wooden creak. Very calm and low. Seamless loop. No music, no voices. |
| candle-ignite | 2 | no | A single small candle wick catching flame: a soft whoosh and a gentle crackle, close and quiet. |
| candle-blow | 2.5 | no | Someone gently blows out a candle: a soft breath, the flame puffs out, a faint sizzle of the wick. Intimate and quiet. |
| furin-chime | 2.5 | no | A single Japanese glass wind chime (furin) rings softly once in a light breeze, delicate, with a short natural decay. |
| paper-turn | 1.2 | no | Turning a sheet of thick handmade Japanese washi paper, a soft close rustle. |
| flame-flare | 1.5 | no | A candle flame flares up with a low soft whoomp and crackle, then settles. Subtle and eerie, not loud. |
| temple-bell | 8 | no | A deep Japanese Buddhist temple bell (bonsho) struck once in the distance at night, long resonant decay, calm and solemn. |
| aoandon-arrival | 8 | no | A quiet supernatural presence arriving: a cold breath of wind and a low shimmering glassy drone that rises softly, faint distant airy whispers without words. No jump scare. |
| lantern-hum | 10 | yes | A very soft, low, ethereal hum of a glowing paper lantern, gentle airy shimmer. Seamless loop, quiet. |

## 2. Play them in the app

1. **`src/lib/sound.ts`.** Sample playback through WebAudio. After the first user gesture, fetch and decode files lazily, ambience first. Use gain nodes per channel: ambience 0.22, events 0.5, bell and arrival 0.6. Fade loops in and out over 1.2 s. If a file fails to load, fall back to the existing procedural tone for that event. Mute when `document.hidden`. Nothing plays before a user gesture.
2. **Default on.** Sound is now on by default (prefs default `sound: true`; a saved `false` is respected). Audio starts on the first pointer or key gesture anywhere. The top-bar toggle reads "Sound on" or "Sound off" as now. On the Room, add one small line under the demo link in `ui-small`: 「音あり · Sound on, tap anywhere」. It hides once audio is running or if sound is off.
3. **Where each sound plays.**
   - room-ambience loops on the Room, Shelf and Reader (Reader at half gain) and stops on the Reveal.
   - lantern-hum loops on the Reveal and briefly under the Room on first view.
   - The candle-wave entrance plays candle-ignite up to 6 times, staggered and pitch-varied (playbackRate 0.9–1.1), not 100 times.
   - BlowCandle success plays candle-blow; a word added to the ghost words plays furin-chime; Next scene plays paper-turn; a wrong answer plays flame-flare.
   - On the Reveal, temple-bell plays at 0 s, then aoandon-arrival at 1.2 s.
4. **Respect reduced motion** for visuals only. Sound follows only the sound toggle.
5. **Credits.** THIRD_PARTY_NOTICES.md and the About page: "Sound effects generated with ElevenLabs." README credits: one line.

## 3. Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass. Add pure tests for the event-to-sound mapping, the prefs default with a saved `false` respected, and that nothing plays before a gesture (with a mocked AudioContext).
2. Every file in the manifest exists, is under 600 KB, and has about the requested duration (read the MP3 frame headers or decode with a small script). Report each file's size and duration.
3. No file outside `.env.local` contains the key: search `aoandon/` excluding `node_modules`.
4. In Playwright (`scripts/screenshots.mjs` or a small separate check), confirm that after a click on the Room the sound manifest and room-ambience.mp3 are requested, with no console errors.

## Report

Return the files changed, the sounds table (size and duration), gate results, the ElevenLabs model used, and anything rejected or regenerated. Do not commit.
