# Codex brief: frontend polish after review (P3b)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder. Your P3 work is committed (34f2778). Claude reviewed the screenshots; fix exactly these items. Keep everything else as it is.

## Hard rules

The same rules as `briefs/codex-build-2-frontend.md`: write only in `src/`, `tests/app-*`, `scripts/screenshots.mjs`, `docs/screenshots/` and `package-lock.json`. DESIGN.md stays normative. No git commands that change state.

## AS-IS → TO-BE

1. **Unselected level seals are unreadable.** AS-IS: the `hanko-frame.png` overlay sits on top of the vermilion "N5" and "N3", which nearly disappear on the dark room (room-1440, shelf-1440, room-390). TO-BE: the frame sits behind the text (or only on the border ring). The unselected seal text must meet 3:1 at its size on `night`, and the selected seal keeps its washi-on-vermilion fill. Check both the Room and the Shelf.
2. **A focus box frames the Reveal headline.** AS-IS: a white outline box surrounds 百の怪談が語られた。 after focus moves to it (reveal-1440). TO-BE: elements focused programmatically (`tabIndex={-1}` headings and `main`) show no outline. Real keyboard focus on controls stays as it is.
3. **Plurals.** AS-IS: "1 tales · 1 scenes". TO-BE: a small `plural()` helper, used everywhere counts appear (Reveal, Shelf, About, export), with tests.
4. **Reader controls look like a web form.** AS-IS: native `<select>` elements for Writing, Furigana and Level, truncated on phones ("Horizo…"). TO-BE: paper-tab segmented radiogroups in `ui` type on washi.
   - The controls are Writing (縦 Vertical / 横 Horizontal), Furigana (Above level / All / Off) and Level (only the tale's levels, as small seal tabs).
   - The active tab has a 2px `sumi` underline. Arrow keys move within a group, and every target is 44px.
   - On phones they form one compact wrapping block with no truncation. Keep the 原文 button and the level meter.
5. **Room on phones.** AS-IS: the "100 / 100 candles still burning" label overlaps the lantern's foot (room-390). TO-BE: the label sits clear of the lantern and the candle field on every breakpoint.
6. **Final data.** Claude has regenerated all tales with Gemma 4 31B. Run `node pipeline/build-tales.mjs` and confirm the Shelf shows 5 tales across the 5-column layout (and the strip and stack layouts on smaller screens). If two scrolls look identical in height or misalign, fix it.
7. **Lockfile.** Sync `package-lock.json` for the `playwright` devDependency (`npm install`, with no other dependency changes).

## Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass.
2. Re-shoot all screenshots (`npm run screenshots`), open them and confirm items 1 to 6 are fixed. List each item with the screenshot that proves it.
3. Run the keyboard-only demo-night path again.

## Report format

Files changed, gate results, and per item: fixed, with the proof screenshot, or not fixed, with the reason.
