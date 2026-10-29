# Codex brief: Aoandon frontend and Halloween layer (P3)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder.

## GOAL

Build every screen, component and effect in `DESIGN.md` on top of the P0 base, reading tales from `public/tales/` and images from `public/assets/manifest.json`. The result must feel like one consistent, unique piece: a Japanese ghost-story night, not generic Halloween. Come back only after the verification gate passes, including your own review of the screenshots.

## Read first

1. `DESIGN.md`, all of it. It is normative: tokens, the Two Lights Rule, the Paper Rule, layouts, every motion spec and the copy table.
2. `PLAN.md`: "Frontend summary" and "Product rules".
3. Everything in `src/`. Keep and extend `schema.ts`, `night.ts`, `anki.ts`, `route.ts` and `tales.ts`; replace the placeholders in `App.tsx`.
4. `public/assets/manifest.json` (file names, sizes, alt text, `blend`) and `public/tales/index.json` with one tale JSON.

## Hard rules

- Write only in `src/`, `index.html`, new tests `tests/app-*.test.ts`, `scripts/screenshots.mjs` and `docs/screenshots/`. In `package.json`, add only the devDependency `playwright` and a `screenshots` script.
- `pipeline/`, `server/`, `data/`, `public/tales/` and `public/assets/` are read-only for you.
- If DESIGN.md conflicts with itself or can't be built as written, follow the closest reading, and list it in the report. Don't edit DESIGN.md.
- No new runtime dependencies (React, zod and fontsource only). No animation or UI libraries; effects are canvas, SVG and CSS.
- UI copy follows the DESIGN.md copy table. No emojis, no em dashes, no location, no "AI magic".
- Never show `aoandon-yokai` before the Reveal. Never put story text directly on the dark room (Paper Rule).
- Don't change the data contract in `schema.ts`. Adding helpers is fine.
- No git commands that change state.

## AS-IS → TO-BE

1. **Styles.** AS-IS: tokens, base and a Room placeholder. TO-BE: add `effects.css` and per-component CSS. Trim the font imports to what DESIGN.md uses (Shippori Mincho B1 500 and 600, Yuji Syuku 400, Zen Kaku Gothic New 500) and report the CSS and JS gzip sizes before and after. Make the deckle edge an SVG mask or filter generated in code (no new raster file). Lay the washi grain using `assets/washi-tile.webp`.
2. **Room.** The `room.webp` background (`room-1280.webp` under 1280px) under `brightness(var(--room-brightness))`, and the vignette following `--lit`.
   - `Lantern`: `lantern.webp`, honouring `blend` from the manifest, with breathing glow intensity from `lanternIntensity`.
   - `CandleField`: one canvas for 100 candles; seeded flicker and gusts per DESIGN.md; 30 fps; devicePixelRatio scaling; paused when hidden; lit and out states from `night.out`; plus a text twin in a polite live region.
   - `Hitodama`: the orbiting ghost words.
   - The shoji shadow (under 30 lit, at most once per 90 s, Room only).
   - The headline block, the level seals radiogroup (arrow keys), "Begin the night" and the Demo night link.
3. **Shelf.** Scroll cards from `index.json`, following DESIGN.md Layout at all three breakpoints. Each shows the coverage line for the selected level, the credit line, a read mark and the available levels. A tale missing the selected level says so and offers the levels it has.
4. **Reader.**
   - Illustration header; the washi sheet. Vertical by default at ≥ 1024px and horizontal below; the toggle is remembered in `src/lib/prefs.ts` (guarded storage, like `night.ts`).
   - Furigana modes: above-level (the default), all and off.
   - A level switch limited to the levels the tale has. Scenes in order, with the candle rail. Ink bleed on first view only.
   - `Sentence` and `Word` render tokens per kind, as DESIGN.md "Reader sentence and words" describes. Any content word opens the `WordGloss` slip, and tapping adds it with `addGhost`, recording the sentence text, tale id and gloss source.
   - `WordGloss` handles collisions in both writing modes, and closes on Esc, outside tap or blur.
   - `LevelMeter`; the 原文 sheet with Aozora ruby, the credit, colophon and card link, focus-trapped.
   - `Question` with the wrong-answer effect.
   - `BlowCandle`: hold for 800 ms with the ring (pointer, Space or Enter), or opt into the mic.
   - On blow: the extinguish sequence and the `Smoke` canvas, then `blowOut`, then the "Next scene" button takes focus.
   - End of tale: a summary and a way back to the Shelf.
   - If `GET /api/health` answers, show "Retell again (local Gemma)", which calls `POST /api/retell`, swaps the retelling in memory and shows a "live" badge. Otherwise hide it.
5. **`src/lib/blow.ts`.** A pure `createBlowDetector({ frameMs, minMs, marginDb })` that takes per-frame low-band RMS in dB, calibrates a noise floor over the first 500 ms and fires once sustained energy exceeds floor + margin for `minMs` (250 by default). Plus a browser wrapper using `getUserMedia` and an `AnalyserNode`, with a clear fallback when permission is denied ("Mic is off, hold to blow instead").
6. **Reveal.** Triggered when `isRevealed(night)`: the four-step sequence from DESIGN.md (reduced motion: a 400 ms crossfade), the yokai image, the line, the summary and the export action.
7. **Export panel.** Opened from the top-bar ghost counter: the list with remove buttons, and downloads of the Anki TSV (`toAnkiTsv`) and CSV (`toCsv`) via Blob, with one line of import help.
8. **About.**
   - Hearn and Setsu, in plain factual words: "Hearn never properly learned Japanese. His wife, Koizumi Setsu, found the old ghost stories and told them to him in her own words; his book Kwaidan grew from those tellings." Use no quotations from her memoir.
   - How the level check works, in one paragraph.
   - A metrics table computed from the loaded tales (mean first-draft vs final coverage per level and model, ghost words per scene).
   - The models used (from `retelling.model`), "What it can't do" (no proof of faithfulness; glosses labelled "Gemma gloss" are model-written; JLPT lists are approximate since the official lists were retired in 2010), and the credits from THIRD_PARTY_NOTICES.md.
9. **Sound.** WebAudio only, off by default, with a top-bar toggle remembered in prefs: wind, the extinguish puff and the Reveal hum, per DESIGN.md. Nothing plays before a user gesture.
10. **Top bar.** Wordmark, ghost counter, sound toggle and About; 44px targets; visible focus.
11. **Accessibility.** Full keyboard paths; focus order that follows reading order in both writing modes; `lang` attributes; live regions for candle count, question results and status; `prefers-reduced-motion` per every DESIGN.md effect; `prefers-contrast: more`.
12. **Tests** (`tests/app-*.test.ts`, pure logic only, no DOM): the blow detector (calibration, sustained versus short bursts, fires once); the furigana decision (token kind × mode); scene progression and the next-scene logic; the gloss placement helper (pure, from rects plus writing mode, never off-screen); prefs guards; the About metrics aggregation; the Shelf coverage line text.
13. **Screenshots** (`scripts/screenshots.mjs`, Playwright Chromium against `vite preview`).
    - At 390×844 and 1440×900: Room; Shelf; Reader in vertical (1440) and horizontal (390); Reader with a gloss slip open; the wrong-answer state; the Reveal (open `?night=demo#/tale/mujina`, finish a scene's question, hold to blow, wait for the Reveal); and Room with `reducedMotion: 'reduce'`.
    - Also assert no horizontal page scroll at 360×740 on every screen.
    - Save to `docs/screenshots/<screen>-<width>.png`.

## Verification gate (all must pass before you return)

1. `npm test` passes: all existing tests (base and pipeline) plus the new app tests.
2. `npm run typecheck` and `npm run build` pass. Report the JS gzip size; it must be at most 180 KB, fonts excluded.
3. `npm run screenshots` succeeds. Open every screenshot and check it against DESIGN.md Do's and Don'ts and the Two Lights and Paper rules. Fix and re-shoot anything that fails, and list what you fixed.
4. Run through the demo night in the browser by keyboard only, from Room to Reveal, and describe the path.
5. Use reduced motion to confirm there is no smoke, no flicker and an instant dim.

## Report format (your final message)

- Files created or changed, one line each.
- Gate results: test counts, bundle sizes, the screenshot list and the fixes made after review.
- Any DESIGN.md readings or conflicts you had to resolve.
- Known issues and anything skipped, plainly stated.
