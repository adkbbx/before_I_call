# Codex brief: Aoandon image assets (P1)

Model: gpt-6-astra, reasoning medium. Working root: this `aoandon/` folder.

## GOAL

Produce the 12 image assets in `ASSETS.md` with OpenAI gpt-image-2 through your built-in `image_gen` tool, process them with sharp into `public/assets/`, and pass the ASSETS.md review gate. Come back only after the gate passes, or after 3 failed attempts on an asset, which you then report.

## Read first

1. `ASSETS.md`: the work order, the style bible, the prompts, sizes, processing rules and the review gate. Follow it exactly.
2. `DESIGN.md`: the sections Overview, Colors, Imagery and Do's and Don'ts. The images must look like one family in this palette.

## Hard rules

- Use the built-in `image_gen` tool (gpt-image-2). Do not use `gpt-image-1.5`. Use the CLI fallback only if built-in `image_gen` is unavailable, and then follow ASSETS.md rule 1 (dark `#0a0c12` background plus `"blend": "screen"`).
- Prepend the style bible verbatim to every prompt except those marked "texture rules".
- Write only these paths: `assets-src/`, `public/assets/` and `scripts/process-assets.mjs`. You may append a "Run log" section to the end of `ASSETS.md`. Touch nothing else: another agent is working in `pipeline/`, `server/`, `data/` and `tests/`.
- Do not add, remove or upgrade npm dependencies (`sharp` is already installed). Do not run `npm install`.
- No git commands that change state (no add, commit, stash or checkout).
- No text, letters, kanji, kana, signatures or watermarks in any image. Inspect every output at full size; if there is any text-like mark, regenerate (up to 3 attempts per asset).

## AS-IS → TO-BE

| Item | AS-IS | TO-BE |
|---|---|---|
| Raw images | none | `assets-src/raw/<name>-<attempt>.png` for every attempt. After each `image_gen` call, copy the produced file from wherever the tool saved it. |
| `scripts/process-assets.mjs` | a stub that exits 1 | An ESM script using sharp. It reads the chosen raw file per asset (the newest attempt by default, or an explicit choice in `assets-src/choices.json`), writes the outputs named in the ASSETS.md table (WebP sizes, alpha, PNG for `hanko-frame`), enforces the byte budgets by lowering quality in steps of 5, writes `public/assets/manifest.json` (`{ name, file, width, height, alpha, blend, alt, prompt }` per output) and builds `public/assets/contact-sheet.png`. It exits 1 if any asset is missing or over budget. |
| `public/assets/` | `.gitkeep` only | All processed files, `manifest.json` and `contact-sheet.png`. |
| `washi-tile` | none | Seamless. Prove it with a 2×2 tiled test composite at `assets-src/washi-tile-check.png` and inspect the seams. |

## Verification gate (all must pass before you return)

1. `node scripts/process-assets.mjs` exits 0.
2. Every item in the ASSETS.md "Review gate" checklist is true. Open `public/assets/contact-sheet.png` and every final asset and look at them.
3. `public/assets/manifest.json` lists every output, with correct dimensions read from the files.
4. Report `ls -l public/assets` with the byte sizes.

## Report format (your final message)

- A table: asset, attempts used, final file(s), size in KB, alpha or blend, and a pass/fail note.
- Any asset that failed 3 times, with the reason.
- Whether built-in `image_gen` or the CLI fallback was used.
- Anything that deviates from ASSETS.md, and why.
