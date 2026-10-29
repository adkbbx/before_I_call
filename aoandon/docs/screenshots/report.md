# Frontend polish report

All seven requested polish items are fixed. No requested check was skipped.

## Files created or changed

- src/components/Segmented.tsx: typed paper-tab radiogroups with roving focus, arrow keys, Home and End.
- src/components/Reader.tsx: Writing, Furigana and available-Level tabs; plural counts; preserve tab focus when switching level.
- src/components/Reader.css: ui typography, seal tabs, 44px targets, 2px sumi selection underline and compact phone wrapping.
- src/components/Screens.tsx: shared plural counts in Reveal, About and export.
- src/components/Room.css: clip the hanko texture to the border ring so it cannot cover seal text.
- src/components/Shelf.css: align text rows and give the five wide-screen scrolls distinct lengths.
- src/lib/plural.ts: shared count-label helper.
- src/lib/reader.ts: plural-aware Shelf coverage line.
- src/styles/base.css: suppress outlines on programmatically focused headings and main only.
- src/styles/app.css: clear the phone candle label from the lantern; remove obsolete select styling.
- tests/app-plural.test.ts: zero, singular, plural, irregular and one-scene Shelf checks.
- scripts/screenshots.mjs: use the new radios; assert contrast, ring clipping, target sizes, tab navigation, five scroll lengths and responsive layouts.
- package-lock.json: sync playwright and playwright-core 1.64.1 with the existing devDependency.
- docs/screenshots/report.md: this report.
- docs/screenshots/verification.json: final browser-check results, with empty skips and errors.
- docs/screenshots/room-390.png: regenerated and visually reviewed.
- docs/screenshots/shelf-390.png: regenerated and visually reviewed.
- docs/screenshots/about-390.png: regenerated and visually reviewed.
- docs/screenshots/export-390.png: regenerated and visually reviewed.
- docs/screenshots/reader-horizontal-390.png: regenerated and visually reviewed.
- docs/screenshots/reader-gloss-390.png: regenerated and visually reviewed.
- docs/screenshots/original-390.png: regenerated and visually reviewed.
- docs/screenshots/wrong-answer-390.png: regenerated and visually reviewed.
- docs/screenshots/reveal-390.png: regenerated and visually reviewed.
- docs/screenshots/room-reduced-390.png: regenerated and visually reviewed.
- docs/screenshots/room-1440.png: regenerated and visually reviewed.
- docs/screenshots/shelf-1440.png: regenerated and visually reviewed.
- docs/screenshots/about-1440.png: regenerated and visually reviewed.
- docs/screenshots/export-1440.png: regenerated and visually reviewed.
- docs/screenshots/reader-vertical-1440.png: regenerated and visually reviewed.
- docs/screenshots/reader-gloss-1440.png: regenerated and visually reviewed.
- docs/screenshots/original-1440.png: regenerated and visually reviewed.
- docs/screenshots/wrong-answer-1440.png: regenerated and visually reviewed.
- docs/screenshots/reveal-1440.png: regenerated and visually reviewed.
- docs/screenshots/room-reduced-1440.png: regenerated and visually reviewed.
- docs/screenshots/shelf-768.png: regenerated and visually reviewed.

The explicitly requested node pipeline/build-tales.mjs also ran and validated Mujina (4 scenes), In a Cup of Tea (5), Yuki-Onna (9), Rokuro-Kubi (17), and Mimi-Nashi-Hoichi (18). Total: five tales and 53 scenes. Generated tales and index were written by that command only; pipeline code and source data were not edited. package.json and DESIGN.md remain unchanged.

## Gate results

- npm test: 86 passed, zero failed, zero skipped.
- npm run typecheck: passed.
- Production build: passed with npm run build -- --configLoader runner. The default bundled config loader cannot scan an ancestor directory under this Windows sandbox; runner avoids that environment restriction without modifying the project configuration.
- JavaScript: 319.93 KB raw, 96.92 KB gzip, below the 180 KB gzip budget. Prior report: 96.58 KB gzip.
- CSS: 562.21 KB raw, 236.11 KB gzip, including font-face declarations. Prior report: 235.78 KB gzip. Font binaries are excluded from these bundle figures.
- npm run screenshots: passed; 21 screenshots, zero browser errors, zero skips. Every screenshot was opened and reviewed against the existing design, Two Lights Rule and Paper Rule.
- No horizontal page scroll at 360 x 740 for Room, Shelf, About, export, Reader, gloss, original, wrong answer, Reveal and tale summary.
- Keyboard-only demo: Tab to Room level radio; Right then Left; Tab to Demo and Enter; Tab to Mujina and Enter; Tab to the correct answer and Enter; Tab to Blow and hold Space for 850 ms, exceeding the 800 ms threshold; Reveal appears. No pointer action was used for this path.
- Reduced motion: no smoke, identical candle-canvas pixels across frames, no lantern animation and a zero-second room dim transition.
- All four Mujina scenes also passed hold-to-blow, Next scene focus, reading-position reset and the final summary check.

## Per-item results

1. Fixed: hanko texture is confined to the border ring. Unselected shu text on night measures 3.65:1; selected washi-on-vermilion remains intact. Proof: room-1440.png, room-390.png, shelf-1440.png and shelf-390.png.
2. Fixed: Reveal headline and programmatically focused headings/main have no outline. Real control keyboard focus remains visible, including the Reader's focused N4 tab. Proof: reveal-1440.png and reader-horizontal-390.png; computed Reveal outlineStyle is none.
3. Fixed: plural() covers numeric tale, scene and word labels in Reveal, Shelf, About, export and Reader summaries/meters. Proof: reveal-1440.png shows 1 tale and 1 scene; reader-horizontal-390.png shows 1 ghost word; about-1440.png and export-390.png cover plural and zero counts. Pure helper and Shelf singular tests pass.
4. Fixed: paper-tab Writing, Furigana and available-Level radiogroups replace all Reader selects. They use ui type, 44px targets and a 2px sumi active underline; arrow keys wrap and retain focus. Original and the level meter remain. Proof: reader-vertical-1440.png and reader-horizontal-390.png. Phone vertical mode stays disabled to preserve DESIGN.md's horizontal-only phone rule.
5. Fixed: the count label clears the lantern foot and candle flames. Proof: room-390.png and room-reduced-390.png. Label/lantern separation also passes at widths 360, 680, 681, 1024 and 1440.
6. Fixed: all five final tales load. Wide scrolls have aligned text rows and distinct lengths; tablet strips scroll to the fifth tale, and phone cards stack. Proof: shelf-1440.png, shelf-768.png and full-page shelf-390.png.
7. Fixed: npm install completed; lockfile root dependencies and devDependencies match package.json, and both Playwright entries resolve to 1.64.1. No package.json dependency changes. Proof is the lockfile and dependency consistency check, not a screenshot.

## Readings and limitations

- The explicit request to run build-tales was treated as the exception to the generated-tales read-only rule. No generated content was manually edited.
- DESIGN.md specifies equal-width columns, not equal scroll lengths. Distinct paper tails follow the polish brief while keeping illustration and text rows aligned.
- Phones retain horizontal writing as required by DESIGN.md; the Vertical tab is visible, disabled and never truncated.
- The production build requires the runner flag in this sandbox. No requested polish item or browser gate was skipped.
