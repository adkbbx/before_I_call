# Frontend build report

## Files created or changed

- `src/App.tsx`: routes, loading and error states, persistent night and preferences, top bar and export entry.
- `src/main.tsx`: required font weights, wordmark subset preloads, styles and generated deckle mask.
- `src/components/Effects.tsx`: manifest images, lantern, hitodama, candle canvas, shadow, smoke and SVG candle.
- `src/components/Reader.tsx`: token reader, gloss, original, question, hold and microphone controls, progression and live retelling.
- `src/components/Screens.tsx`: Room, Shelf, Reveal, About and export panel.
- `src/components/Room.css`: Room, lantern, seals and candle field styles.
- `src/components/Shelf.css`: scroll cards and shelf layout.
- `src/components/Reader.css`: both writing modes, words, questions, candle controls and hold ring.
- `src/components/Sheets.css`: gloss, original, export, About and metrics table.
- `src/styles/app.css`: shared stage, top bar, paper, Reveal and breakpoint rules.
- `src/styles/effects.css`: motion, visibility pause and reduced-motion rules.
- `src/lib/blow.ts`: pure calibrated detector and microphone wrapper.
- `src/lib/paper.ts`: deterministic SVG deckle mask.
- `src/lib/prefs.ts`: guarded preferences storage.
- `src/lib/reader.ts`: furigana, progression, placement, coverage and metrics helpers.
- `src/lib/sound.ts`: gesture-gated WebAudio wind, puff and hum.
- `src/lib/tales.ts`: recoverable loading-error copy.
- `tests/app-logic.test.ts`: nine pure frontend logic tests.
- `scripts/screenshots.mjs`: real-data Chromium captures and browser assertions.
- `package.json`: only Playwright devDependency and screenshots script added.
- `docs/screenshots/verification.json`: screenshot and browser-check results.
- `docs/screenshots/report.md`: this report.
- `docs/screenshots/room-390.png`
- `docs/screenshots/room-1440.png`
- `docs/screenshots/shelf-390.png`
- `docs/screenshots/shelf-1440.png`
- `docs/screenshots/reader-horizontal-390.png`
- `docs/screenshots/reader-vertical-1440.png`
- `docs/screenshots/reader-gloss-390.png`
- `docs/screenshots/reader-gloss-1440.png`
- `docs/screenshots/wrong-answer-390.png`
- `docs/screenshots/wrong-answer-1440.png`
- `docs/screenshots/reveal-390.png`
- `docs/screenshots/reveal-1440.png`
- `docs/screenshots/room-reduced-390.png`
- `docs/screenshots/room-reduced-1440.png`
- `docs/screenshots/original-390.png`
- `docs/screenshots/original-1440.png`
- `docs/screenshots/about-390.png`
- `docs/screenshots/about-1440.png`
- `docs/screenshots/export-390.png`
- `docs/screenshots/export-1440.png`

The explicitly requested pipeline rebuild generated the current public tale output. No pipeline, source data, assets, schema contract, or design documentation was authored or edited by this frontend work. Fixtures are used only in tests.

## Gate results

- `npm test`: 81 passed, 0 failed, 0 skipped, including nine new app tests.
- `npm run typecheck`: passed.
- `npm run build -- --configLoader runner`: passed. The normal Vite config bundler hits an ancestor-directory access restriction in this Windows sandbox; the runner loader avoids that restriction without changing the build script. A portable Node 22.22.1 runtime and temporary npm cache were used because the installed runtime is inaccessible to the sandbox.
- JavaScript gzip: 84.15 KB before, 96.58 KB after. Final raw JS: 318.87 KB. The 180 KB gzip budget passes; fonts excluded.
- CSS gzip: 293.00 KB before, 235.78 KB after. Final raw CSS: 560.97 KB. These numbers include font-face declarations, not font binaries.
- `node pipeline/build-tales.mjs` ran before the screenshot gate. Real Mujina N4 became available with four scenes. All 20 captures use real pipeline content and manifest assets.
- `npm run screenshots`: passed, 20 PNGs, no skips, no browser errors. Every screenshot was opened and reviewed; independent visual review also scored the visual fixes resolved.
- At 360×740, Room, Shelf, About, Export, Reader, Gloss, Original, wrong-answer state, Reveal and tale summary have no horizontal page scroll.
- Four-scene completion passed: each hold extinguishes once, Next scene receives focus, the next reading starts at the beginning, and the final summary opens.
- Keyboard-only demo passed: Tab to the selected level radio; arrow right and left; Tab to Demo night and Enter; Tab to Mujina and Enter; Tab to the correct answer and Enter; Tab to Blow out and hold Space for 800 ms; Reveal appears. Export traps focus and Escape restores it.
- Reduced motion passed: candle canvas unchanged across frames, no lantern flicker, no smoke, instant room dim and the short Reveal path.
- Additional browser checks passed: denied/unavailable microphone displays the exact hold fallback; the hold ring is vermilion, centred on the SVG candle, and partially filled at 400 ms.

## Fixes after visual review

- Reserved a centre gap in the desktop candle field so candles do not overlap the seals.
- Locked background scrolling for dialogs and used viewport captures for overlays and reader states.
- Removed gloss measurement feedback that clipped the slip.
- Constrained the phone paper sheet and scrolled story content inside it.
- Clipped decorative Reveal glow so it cannot create sideways page scroll.
- Scrolled the wrong-answer result into view for its capture.
- Kept metrics headers intact and made the comparison table scroll within the paper on phones.
- Placed Original at the reading end with a 60% scrim; warm paper light follows the right rail in vertical mode.
- Moved the vermilion hold ring around the active candle.
- Corrected reduced-motion specificity so dimming is actually instant.

## DESIGN.md readings and conflicts

- The brief's generated SVG deckle takes precedence over DESIGN.md's raster-mask reference. Manifest WebP filenames take precedence over its PNG references.
- Used 28px for the top-bar brush wordmark because the Calligraphy Rule forbids display type below 28px, while the top-bar paragraph asks for 24px.
- Story-word ruby remains present even in Off mode, following the explicit statement that story words always have furigana. Known and ghost readings follow the selected mode; plain tokens have no ruby.
- The Room title and explanation sit above the lantern; seals and actions sit below it. Treating the entire headline/control block as above a lantern at 40% height would overlap at the required viewport. The three mandatory seals are treated as one accent group alongside the primary action.
- Wrong-answer copy on paper uses sumi-soft rather than moon-dim for paper contrast.
- Tokens contain a JLPT gloss source but no source-list level. The UI therefore says JLPT list rather than inventing a JLPT N2 attribution.
- Original text preserves supplied Aozora punctuation and wording verbatim; the UI's own copy follows the copy restrictions.

## Known issues and skipped work

- The real Mujina tokens split とうきょう, and the supplied gloss for とう is "party (political)". This remains an upstream tokenization/gloss error. The frontend preserves the supplied data; pipeline and public tales are outside its write scope. It should be corrected in content generation before publication. The gloss captures use the supplied story word 濠 / moat, while the erroneous fragment remains discoverable in the app and is explicitly disclosed here.
- Only Mujina N4 was complete at the rebuild; other tales and levels remain content work. No required screenshot or keyboard gate was skipped.
- Successful live Gemma generation and a physical microphone blow were not exercised. API absence, microphone denial fallback and the pure blow detector were verified.
- No simulated-fast-4G LCP measurement was performed; the verification gate's JS budget and required build/browser checks passed.

Community research used: [How an Accessibility SaaS Broke Its Own Landing (and How We Fixed It)](https://dev.to/lawebe/how-an-accessibility-saas-broke-its-own-landing-and-how-we-fixed-it-5802), by [@lawebe](https://dev.to/lawebe). It reinforced checking reduced-motion rendered states rather than relying only on CSS declarations.
