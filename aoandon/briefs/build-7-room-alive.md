# Brief: Room readability and a room that feels alive (P6)

Working root: `aoandon/`. The live site is https://aoandon.onrender.com (main 62334d1). DESIGN.md is the design source of truth; you may update its Layout and Motion sections to match what you build.

## Why (the author's feedback on the live site)

"Readability is a little difficult and the page is too static."

Their screenshot is a wide but short browser window, about 1333×594 CSS px:

- The intro paragraph sits straight on the busy shoji painting and is hard to read.
- The lantern overlaps the paragraph's last line ("kaidan, retold at your level.").
- The five seals wrap to 3 + 2, so the second row and the Begin button are pushed below the fold.
- The "100 / 100 candles still burning" label sits on top of the bonsai painting.
- Nothing visibly moves, because the candle flicker is too subtle.

The cause: the Room uses absolute `svh` positions (lantern at `top:27svh`, candle field at `top:52svh`, seals at `margin-top:34svh`), which collide on short viewports.

## Hard rules

- Write only in `src/` (mainly `src/components/Room.css`, `src/components/Effects.tsx`, `src/components/Screens.tsx`, `src/styles/*`), `tests/app-*`, `scripts/screenshots.mjs`, `docs/screenshots/` and `DESIGN.md` (Layout and Motion sections only).
- Do not touch `pipeline/`, `data/` or `public/tales/`. No model calls. No new npm dependencies. No git commands that change state.
- Every effect respects `prefers-reduced-motion: reduce` (static, or a simple fade) and pauses when `document.hidden`.
- No jump scares, no loud sound, no American Halloween imagery. The palette and the "two lights" rule stay as DESIGN.md says: blue is spirits, amber is candles.
- Keep the copy text as it is.
- Shell: PowerShell. Run npm inside `Push-Location aoandon; try { ... } finally { Pop-Location }`.

## A. Room layout (readability first)

1. **Use normal flow, not absolute `svh` positions.** Lay the Room out as one centred column: headline block (title, subtitle, intro) → lantern → candle shelf with the level seals → Begin button and demo link → candle count.
   - The lantern is `clamp(120px, 20svh, 240px)` tall and never overlaps text.
   - The candle canvas may still sit behind the seals row as a band, but nothing overlaps text.
2. **Give the headline a readable ground.** A soft dark radial scrim behind the headline block (`night` at about 0.75, fading to transparent). The intro is 17px in `moon` with `text-shadow: 0 1px 14px rgba(10,12,18,.95)`. It must read clearly over the shoji.
3. **Seals:** one row of five whenever the CSS width is ≥ 720px; wrap 3 + 2 only below that. The labels must not collide.
4. **The candle count label** sits centred under the demo link, never over the background paintings.
5. **Above the fold:** at 1280×600, 1333×594, 1366×640, 1440×900 and 1920×1080, the title, intro, lantern, all five seals and the Begin button are all visible without scrolling. At 390×844 everything stacks with no overlap and no horizontal scroll.

## B. Make the room feel alive

Each item is tasteful and slow, and none takes focus or blocks clicks.

1. **Candles light in a wave on entrance.** On the first Room view of a session (sessionStorage, guarded with try/catch), the lit candles ignite one after another from the centre outward over about 1.6 s, then flicker. Out candles stay out. Reduced motion: no wave.
2. **A visible flicker and a light pool.** Raise the flame flicker amplitude so it's noticeable at arm's length but not jittery. Under each candle row, draw a warm radial light pool on the canvas whose strength follows the average flicker.
3. **Ambient onibi.** Three to five small blue-white wisps (an `andon-pale` core and `andon` glow) drift slowly through the room on gentle sine paths, at different depths: farther ones are smaller and blurrier. They're separate from the ghost-word wisps, `aria-hidden`, and at about 0.35–0.7 opacity. When one passes near the lantern, the lantern brightens slightly.
4. **Floor mist.** A low band of mist drifts across the tatami, left to right over about 40 s, at 8–12% opacity, using two layered moving gradients or a small noise canvas. It never covers text.
5. **The lantern.** Its glow visibly breathes (0.5 → 0.9 over 5 s) and its paper has a faint flicker. A soft blue light pool spills on the floor beneath it.
6. **Parallax.** On desktop pointer movement, the background shifts up to 8px and the lantern and candles up to 4px the other way, eased. Off on touch devices and under reduced motion.
7. **The shoji shadow.** The silhouette (`assets/shoji-silhouette.webp`) crosses behind the shoji once, about 12 s after the Room loads, then every 60–90 s. It takes 8 s, moves linearly, runs at 10–12% opacity, and appears on the Room only.
8. **Title entrance.** The wordmark bleeds in like ink (blur 6px → 0, opacity 0 → 1, 900 ms) on the first view of a session.
9. **Performance.** Run one `requestAnimationFrame` loop where possible, with canvas capped at 30 fps and devicePixelRatio handled. No layout reads inside the loop. The page must stay smooth on a mid-range laptop.

## C. Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass. Add pure-logic tests in `tests/app-*.test.ts` for the wave order, the wisp path function and the parallax clamp.
2. Extend `scripts/screenshots.mjs` to capture the Room at 1280×600, 1333×594, 1366×640, 1440×900, 1920×1080 and 390×844. At each size, assert that:
   - the Begin button's bottom is at or above the viewport height (except at 390);
   - the intro text box does not intersect the lantern box;
   - there is no horizontal page scroll.
3. Run `npm run screenshots`. Open every Room screenshot and confirm the items in A by eye.
4. Capture two extra frames of the Room 1.0 s and 6.0 s after load at 1440×900 (`room-motion-1s.png`, `room-motion-6s.png`) to show the candle wave and the drifting wisps.

## Report

Return the files changed, gate results, which screenshot proves each item in A and B, and any trade-offs. Do not commit; the reviewer commits.
