# Aoandon asset manifest

Generated with OpenAI `gpt-image-2` through Codex's built-in `image_gen` tool (model `gpt-6-astra`, reasoning medium). DESIGN.md (Imagery, Colors) is the authority; this file is the exact work order.

## Rules for every image

1. **Use built-in `image_gen`**, so transparent backgrounds keep their alpha. Do not switch to the CLI fallback or to `gpt-image-1.5`.
   - If built-in `image_gen` is unavailable, use CLI `gpt-image-2`. For the transparent assets, generate on a flat `#0a0c12` background instead, and record `"blend": "screen"` for them in the manifest so the app composites them with `mix-blend-mode: screen`.
2. **Prepend the style bible** (below) to every prompt, except where an asset says "texture rules".
3. **Size limits:** max edge ≤ 3840, both edges multiples of 16, aspect ratio ≤ 3:1, total pixels between 655,360 and 8,294,400. The sizes below already comply.
4. **Never any text in an image:** no letters, kanji, kana, signatures, seals with characters, watermarks or UI. Reject and regenerate any output with visible text-like marks, up to 3 attempts per asset.
5. **Keep the raw output** in `assets-src/raw/<name>-<attempt>.png` (gitignored). Processed files go to `public/assets/`.
6. Record each final file in `public/assets/manifest.json`: `{ name, file, width, height, alpha, blend, alt, prompt }`.

## Style bible (prepend verbatim)

> Original artwork in the manner of a late-Edo Japanese woodblock print (ukiyo-e) crossed with sumi-e ink wash. Limited palette only: deep indigo (#1c2540), sumi black (#0a0c12), aged washi cream (#efe6d2), cold paper-lantern blue (#6f9bff), and at most one small vermilion (#c23a22) accent. Visible washi paper fibre texture and slight woodblock registration offset. Low-key night lighting, soft darkness, generous negative space. Absolutely no text, letters, kanji, kana, signatures, seals, stamps or watermarks. Not photorealistic, not 3D, not anime, no gore, no blood.

## Assets

| # | name | Size | Alpha | Output (processed) | Used in |
|---|---|---|---|---|---|
| 1 | `room` | 2560×1440 | no | `room.webp` (2560w) + `room-1280.webp` | Room, Reader backdrop |
| 2 | `lantern` | 1024×1536 | yes | `lantern.webp` (alpha) | Room centre, Reveal |
| 3 | `aoandon-yokai` | 1024×1536 | yes | `aoandon-yokai.webp` (alpha) | Reveal only |
| 4 | `tale-mujina` | 1536×1024 | no | `tale-mujina.webp` + `-768` | Shelf, Reader header |
| 5 | `tale-chawan` | 1536×1024 | no | `tale-chawan.webp` + `-768` | Shelf, Reader header |
| 6 | `tale-yukionna` | 1536×1024 | no | `tale-yukionna.webp` + `-768` | Shelf, Reader header |
| 7 | `tale-rokurokubi` | 1536×1024 | no | `tale-rokurokubi.webp` + `-768` | Shelf, Reader header |
| 8 | `tale-hoichi` | 1536×1024 | no | `tale-hoichi.webp` + `-768` | Shelf, Reader header |
| 9 | `washi-tile` | 1024×1024 | no | `washi-tile.webp` (seamless) | Paper sheet, gloss slip |
| 10 | `hanko-frame` | 1024×1024 | yes | `hanko-frame.png` (256px, alpha) | Level seals |
| 11 | `shoji-silhouette` | 1024×1536 | yes | `shoji-silhouette.webp` (alpha) | Room shoji shadow effect |
| 12 | `og-base` | 2048×864 | no | `og-base.webp` | DEV cover (title composited later in HTML) |

These are made in code, not generated: `deckle-mask.png` (noise-edged rectangle mask), `favicon.svg` (candle) and the candle and flame drawing (canvas and SVG). See `briefs/codex-build-1.md`.

## Prompts

### 1. room

> A wide interior of an Edo-period Japanese tatami room at night, seen from a low seated viewpoint. Shoji paper screens run across the back wall, faintly lit from behind by cold blue light. Dark wooden pillars and a low ceiling beam. A long, low, empty wooden shelf runs across the lower fifth of the image, where candles will stand later. The centre of the room is left empty and dark, where a lantern will be placed later. Deep shadows at the left and right edges. The upper third stays calm and dark for typography. Wide 16:9 composition.

Alt: "A dark tatami room at night, with shoji screens glowing faintly blue behind a long low shelf."

### 2. lantern

> A single Japanese andon paper lantern: a tall square wooden frame on four short legs, its sides covered with blue-tinted washi paper, glowing softly from inside with cold blue light. Front three-quarter view, centred, the whole object visible with margin around it. Transparent background, no floor, no shadow.

Alt: "A blue paper andon lantern glowing in the dark."

### 3. aoandon-yokai

> Aoandon, the spirit of the blue paper lantern from Japanese folklore. A tall, pale woman in a white kimono with very long, loose black hair, two small horns at her brow, a calm, closed, unsettling expression, hands hidden in her long sleeves. She rises out of a cold blue glow, as if made of lantern light, her lower body dissolving into blue mist. Eerie and still, elegant, never gory. Full figure, centred, transparent background.

Alt: "Aoandon, a pale woman with long black hair and small horns, rising out of blue lantern light."

### 4. tale-mujina (貉)

> Night on a lonely sloping road beside a wide moat with high stone walls. A merchant holding a small paper lantern bends toward a young woman crouched at the water's edge, her face hidden in her long sleeve as if crying. Willow branches hang over black water and mist. The woman's face is not visible at all. Landscape 3:2.

Alt: "A merchant with a lantern bends toward a woman crouched by a moat at night, her face hidden in her sleeve."

### 5. tale-chawan (茶碗の中)

> Inside a quiet teahouse at night, a young Edo-period samurai attendant lifts a small tea bowl and stares into it. On the surface of the tea floats the reflection of a stranger's face that is not his own, glowing faintly blue. Lantern light, tatami, a sliding door left slightly open onto darkness. Landscape 3:2.

Alt: "A young samurai stares into a tea bowl, where a stranger's face glows on the surface of the tea."

### 6. tale-yukionna (雪女)

> A small ferryman's hut in a violent snowstorm at night. The door has blown open. Inside, an old man and a young man sleep under thin quilts. A tall, pale woman in white kneels over the old man and breathes a white frost mist over his face. Snow swirls in through the doorway, cold blue light. Landscape 3:2.

Alt: "A pale woman in white breathes frost over a sleeping old man in a snowbound hut."

### 7. tale-rokurokubi (ろくろ首)

> A woodcutter's hut deep in a mountain forest at night. Outside, among dark pine trunks, several disembodied human heads with long hair drift and float like lanterns, glowing faintly, while a travelling priest with a shaven head watches them from behind a tree. Moonless, mist. Eerie, not gory: no blood, no wounds, no necks shown. Landscape 3:2.

Alt: "Glowing heads with long hair drift between pine trees at night while a priest watches from behind a trunk."

### 8. tale-hoichi (耳無芳一の話)

> A blind young biwa player in plain robes sits playing his lute in the rain at night, among rows of old stone memorial tombs by the sea. Many small, floating, blue ghost-fires (onibi) surround him. His face is calm, eyes closed. Faint abstract ink brush strokes cover his skin like painted patterns, but they are abstract strokes and must not look like writing or characters. Waves and a dark shoreline behind. Landscape 3:2.

Alt: "A blind biwa player sits among sea-side tombs at night, surrounded by floating blue ghost-fires."

### 9. washi-tile (texture rules, no style bible)

> Seamless, tileable texture of handmade Japanese washi paper. Warm aged cream colour (#efe6d2), visible long kozo fibres and subtly uneven thickness, evenly lit and flat. No objects, no shadows, no vignette, no text. Top-down view, edges must tile seamlessly.

Post-process: verify the tile seam (offset the image by 50% in a test composite) and fix it with a mirrored blend if a seam shows. Alt: "" (decorative).

### 10. hanko-frame (texture rules, no style bible)

> A single empty square Japanese hanko seal impression in vermilion ink (#c23a22), with a thick border and worn, slightly uneven, ink-starved edges. Completely empty inside, with no characters or marks inside. Flat front view, centred, transparent background.

Alt: "" (decorative).

### 11. shoji-silhouette (texture rules, no style bible)

> The soft, blurred shadow of a woman with very long, loose hair, standing in profile, as seen through a backlit shoji paper screen. A pure dark grey silhouette with soft edges and no interior detail. Transparent background.

Alt: "" (decorative, `aria-hidden`).

### 12. og-base

> A wide banner composition. In the dark, a glowing blue paper andon lantern stands on the right third. A long row of small lit candles stretches toward the left along a low wooden shelf, and the nearest few are already blown out, with thin smoke rising. The left half is dark and calm, empty for a title. Wide composition.

Alt: "A blue paper lantern beside a long row of candles, some blown out with smoke rising."

## Processing (sharp)

- Opaque images become WebP at quality 80; sizes as in the table; strip metadata.
- Alpha images become WebP at quality 85 with alpha kept. `hanko-frame` becomes a PNG resized to 256px.
- Budgets: `room.webp` ≤ 350 KB, each `tale-*.webp` ≤ 220 KB, `lantern.webp` ≤ 160 KB, `aoandon-yokai.webp` ≤ 260 KB. Lower the quality in steps of 5 until each fits.
- Build `public/assets/contact-sheet.png` (all processed assets on a `#0a0c12` grid with their names) for review.

## Review gate (before handing back)

- [ ] 12 files exist in `public/assets/` with the sizes and alpha above, plus `manifest.json` and `contact-sheet.png`.
- [ ] No visible text, letters, kanji, seals with characters or watermarks in any image (inspect each at 100%).
- [ ] The palette reads as one family on the contact sheet: indigo, sumi, washi, lantern blue, one vermilion accent at most.
- [ ] `room` has an empty centre and an empty lower shelf; `og-base` has an empty left half.
- [ ] The yokai is eerie, not gory; `tale-rokurokubi` shows no blood, wounds or necks; `tale-hoichi` has no writing-like marks.
- [ ] Transparent assets have clean alpha with no halo. If the CLI fallback was used, they are on `#0a0c12` with `"blend": "screen"`.
- [ ] All budgets are met.

## Run log

### Asset generation and verification, 2026-10-29

- Used built-in image_gen throughout. No CLI fallback, dependency changes, or git state changes.
- Preserved the seven existing raw images on resumption. Generated only tale-hoichi, washi-tile, hanko-frame, shoji-silhouette and og-base.
- Each asset has one successful raw output. Hoichi also had one host-interrupted call with no returned file. Shoji attempt 1 was rejected at output by the generator safety system, category sexual, and returned no file. Attempt 2 clarified an adult fully clothed in a full-length kimono and passed. Its exact prompt is in raw/shoji-silhouette-2.json and the manifest. No asset failed three times.
- The tool did not honor every requested raw resolution: room 1672x941, washi and hanko 1254x1254, og-base 1930x815. Raw files remain untouched; Sharp delivers the exact required output dimensions. Room and og-base are upscaled.
- The output table requires 18 image files from 12 assets, including the six responsive variants. All 18 are delivered; the review checklist's "12 files" is interpreted as 12 asset families.
- Paper edges were corrected using the prescribed mirrored blend in 96px strips. Inspected the decoded final WebP as a 2x2 composite and at 50% offset: no visible join. Evidence: assets-src/washi-tile-check.png and assets-src/washi-tile-offset-check.png.
- Implemented scripts/process-assets.mjs with numeric newest-attempt selection and optional assets-src/choices.json overrides, either attempt numbers or raw basenames. It reads the style bible and prompts from this work order, preserves alpha, strips metadata, lowers quality by 5 to meet decimal KB budgets, writes the manifest and labeled contact sheet, and exits 1 for missing assets or exceeded budgets. It processes sequentially with Sharp cache disabled to limit memory.
- Ran node scripts/process-assets.mjs with Cursor's bundled Node directory added to the command-local PATH. Exit 0. Fontconfig reported an unwritable cache but labels rendered correctly and the contact sheet was inspected.
- Inspected the contact sheet and all 18 final images at original resolution. No text, characters, signatures, watermarks, gore, wounds, or exposed floating-head necks. Hoichi has irregular ink patterns rather than writing. Room centre and shelf are empty; og-base retains dark title space above the candle row on the left.
- Inspected all four final alpha assets composited on washi cream, in addition to the dark contact sheet. Clean edges with no matte halo. Normal blend for every output, real alpha for the four transparent assets.
- All review checks pass. An independent file audit confirms 18 manifest entries match the decoded dimensions and alpha, with no EXIF or ICC metadata.
- Exact bytes and encoder quality are recorded in assets-src/processing-report.json. The directory listing is recorded in assets-src/public-assets-listing.txt.
