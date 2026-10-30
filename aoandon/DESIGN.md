---
name: Aoandon
description: A hyakumonogatari night for Japanese learners. Real kaidan, retold at your level, read by candlelight; one flame goes out per scene.
colors:
  night: "#0a0c12"
  night-raised: "#11151f"
  indigo: "#1c2540"
  indigo-line: "#2c3757"
  moon: "#e9e2d0"
  moon-dim: "#a39d90"
  andon: "#6f9bff"
  andon-pale: "#cfe0ff"
  andon-tint: "rgba(111, 155, 255, 0.16)"
  flame: "#ffb44c"
  flame-core: "#fff3d1"
  ember: "#ff6a2a"
  washi: "#efe6d2"
  washi-shade: "#ddd0b5"
  washi-edge: "#c9b994"
  sumi: "#1a1916"
  sumi-soft: "#4b463d"
  shu: "#c23a22"
  shu-deep: "#9b2a17"
  shu-bright: "#ef6a4f"
  focus: "#cfe0ff"
typography:
  display:
    fontFamily: "'Yuji Syuku', 'Shippori Mincho B1', serif"
    fontSize: "clamp(44px, 6.5vw, 96px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.04em"
  tale-title:
    fontFamily: "'Yuji Syuku', 'Shippori Mincho B1', serif"
    fontSize: "clamp(28px, 3vw, 40px)"
    fontWeight: 400
    lineHeight: 1.2
  subtitle-en:
    fontFamily: "'Shippori Mincho B1', serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
    textTransform: "uppercase"
  story:
    fontFamily: "'Shippori Mincho B1', 'Yu Mincho', serif"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: 2.0
  story-vertical:
    fontFamily: "'Shippori Mincho B1', 'Yu Mincho', serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 2.1
  story-mobile:
    fontSize: "18px"
    lineHeight: 1.95
  ruby:
    fontSize: "0.5em"
    fontWeight: 500
  body:
    fontFamily: "'Shippori Mincho B1', serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  ui:
    fontFamily: "'Zen Kaku Gothic New', 'Yu Gothic', sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
  ui-small:
    fontFamily: "'Zen Kaku Gothic New', 'Yu Gothic', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  none: "0"
  control: "2px"
  seal: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
  stage: "72px"
motion:
  ease-candle: "cubic-bezier(0.3, 0, 0.2, 1)"
  ease-smoke: "cubic-bezier(0.2, 0.6, 0.3, 1)"
  ease-dim: "cubic-bezier(0.4, 0, 0.2, 1)"
  quick: "150ms"
  ink: "420ms"
  extinguish: "520ms"
  ember: "1300ms"
  dim: "1200ms"
  smoke: "2600ms"
  breathe: "5000ms"
components:
  button-primary:
    backgroundColor: "{colors.shu}"
    textColor: "{colors.washi}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
    minHeight: "48px"
  button-primary-hover:
    backgroundColor: "{colors.shu-deep}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.moon}"
    border: "1px solid {colors.moon-dim}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    minHeight: "44px"
  button-quiet-hover:
    border: "1px solid {colors.moon}"
  level-seal:
    backgroundColor: "transparent"
    textColor: "{colors.shu}"
    border: "2px solid {colors.shu}"
    rounded: "{rounded.seal}"
    size: "64px"
  level-seal-selected:
    backgroundColor: "{colors.shu}"
    textColor: "{colors.washi}"
  paper-sheet:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.sumi}"
    rounded: "{rounded.none}"
  word-ghost:
    textColor: "{colors.sumi}"
    backgroundColor: "{colors.andon-tint}"
    underline: "1.5px wavy {colors.andon}"
  word-story:
    textColor: "{colors.sumi}"
    underline: "1px dotted {colors.sumi-soft}"
  gloss-slip:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.sumi}"
    border: "1px solid {colors.washi-edge}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
    maxWidth: "260px"
  scroll-card:
    backgroundColor: "{colors.night-raised}"
    border: "1px solid {colors.indigo-line}"
    rounded: "{rounded.none}"
---

# Design System: Aoandon

## Overview

**Creative North Star: "The last room of the hyakumonogatari"**

In Edo Japan, friends gathered on summer nights to tell a hundred ghost stories (百物語怪談会). A hundred wicks burned in a lantern covered with blue paper, in a room far from the guests. After each tale, the teller walked to that room and put out one flame. Folklore says that when the last one goes out, 青行灯 (Aoandon), the spirit of the blue lantern, appears.

Aoandon is that far room. The page is a dark tatami room lit by two kinds of light: the cold blue of the paper lantern and the warm amber of candles. Light is the hierarchy. Whatever is lit is what matters now, and the room grows darker as you read. Stories are always read on washi paper in sumi ink, so they stay legible while everything around them falls into shadow.

This is a Japanese ghost-story night, not American Halloween. There are no pumpkins, bats, cobwebs, slime green or neon orange. The fear is quiet: a flame that won't go out, a shadow on the shoji, a lantern that brightens as the room dims.

**Key characteristics:**

- Near-black indigo room with two light temperatures: lantern blue (cold, the spirit) and candle amber (warm, the reader).
- Reading surfaces are washi sheets with deckled edges and sumi text. Japanese is set vertically on wide screens.
- Vermilion is the only saturated accent: hanko seals and primary actions.
- Motion speaks only the language of light and smoke: flicker, extinguish, drift, dim.
- Bilingual, quiet copy. Japanese leads, and English supports.

## Colors

The palette comes from a night room: lacquered darkness, paper, ink, fire and one seal of vermilion. Frontmatter values are normative and are mirrored as CSS custom properties in `src/styles/tokens.css` (`--color-<name>`).

### Light sources

- `andon` and `andon-pale` are the blue paper lantern: its glow, the hitodama (ghost-word wisps), focus rings on the dark room, and the ghost-word mark on paper. Blue always means the spirit world, or something you don't know yet.
- `flame`, `flame-core` and `ember` are candlelight: the candle field, the active candle and the warm vignette on the paper sheet. Amber always means the reader's own progress.

### Accent

- `shu` (vermilion) marks hanko level seals, the primary action ("Begin the night", "Blow out the candle") and the selected level. It appears at most twice on any screen. `shu-deep` is its hover and pressed state. `shu-bright` is the text of an unselected seal on its dark backing over the room, about 6:1.

### Neutrals

- `night` is the page; `night-raised` is the scroll cards and overlays on the dark room; `indigo` and `indigo-line` are dividers and card borders on dark.
- `moon` is primary text on dark (15:1 on `night`); `moon-dim` is supporting text on dark (7:1).
- `washi`, `washi-shade` and `washi-edge` are the paper: the sheet, its shaded fold and its deckled border.
- `sumi` is story text on paper; `sumi-soft` is ruby, credits and secondary text on paper (7.6:1 on `washi`).

**The Two Lights Rule.** Blue is never used for progress and amber is never used for unknown words. If a reader can't tell what a color means from that rule, the color is wrong.

**The Paper Rule.** Story text never sits directly on the dark room. It always sits on `washi`.

## Typography

Three families, each with one job. All are self-hosted through `@fontsource` (OFL-1.1).

- **Yuji Syuku** (brush calligraphy) is display only: the wordmark 青行灯, tale titles in Japanese and the Reveal line. Never use it for body text, numbers or anything under 28px.
- **Shippori Mincho B1** is the reading voice: story text in both writing modes, the original-text sheet, About copy and English subtitles (uppercase, tracked 0.18em). Ruby uses the same family at 0.5em in `sumi-soft`.
- **Zen Kaku Gothic New** is UI only: buttons, counters ("63 candles burning"), the level meter, toggles and toasts. It uses tabular numerals.

Story measure: horizontal text keeps to 34 Japanese characters per line (`max-inline-size: 34em`). Vertical text keeps columns to 22 to 26 characters (block size about 68svh) with `line-height: 2.1` so ruby never collides. On phones (≤ 680px) story text is 18px and always horizontal.

**The Calligraphy Rule.** Brush type is the voice of the tale, not the interface. Buttons and numbers are always gothic.

## Layout

The page is a stage, not a document. Each screen is full-bleed (`100svh`), with a fixed top bar of 56px (wordmark left; sound, about and ghost words right).

- **Room:** the background image `room.webp` covers the stage (`object-position: center 40%`). The lantern sits on the centre axis at 40% height, about 30svh tall. The candle shelf spans the lower 22% (canvas, full width, max 1400px). The headline block sits above the lantern on desktop and below the shelf on phones: the wordmark, one line of explanation (max 46ch), the three level seals in a row, the primary action and the Demo night link.
- **Shelf:** five hanging scrolls in a row on wide screens (equal columns, 1240px max, 24px gaps), as a horizontal scroll-snap strip at 681 to 1023px, and stacked one per row on phones. Each scroll has an illustration (3:2) above a text block.
- **Reader:** a single washi sheet centred on the dimmed room: `min(1100px, 94vw)` wide and `min(80svh, 780px)` tall on wide screens. In vertical mode text flows right to left; the sheet scrolls horizontally inside itself, and the page never scrolls sideways. A slim candle rail (72px) sits at the reading start (right in vertical mode, top in horizontal) showing this tale's scenes as small candles. Controls for writing mode, furigana mode and 原文 sit on the sheet's foot (horizontal) or left edge (vertical). The question and the blow-out control appear at the end of the text flow, in reading order.
- **Original sheet (原文):** a second, narrower sheet (`min(520px, 92vw)`) slides over from the reading end and dims the main sheet to 40%. Esc or the close control returns.
- **Reveal:** full-bleed, centred composition; the yokai image is up to 70svh, and the line and summary sit under it.
- **Gutters:** 24px on desktop, 16px on phones. No horizontal page scroll at 360px.

## Elevation and depth

There are no box shadows. Depth comes from light falloff:

- A radial vignette on the room (`radial-gradient` from transparent at the lantern to `night` at the edges) whose strength follows the room light level `--lit`.
- The paper sheet gets a warm inner glow from the active candle: an inset gradient of `flame` at 6% opacity from the candle rail side, with a 2px `washi-edge` deckle mask.
- Overlays (gloss slip, original sheet) separate by darkening what is behind them (a `night` scrim at 55%), never by shadow.

**The Flat Light Rule.** If something needs to stand forward, light it. Don't shadow it.

## Shapes

- Paper is rectangular with a deckled edge: a CSS `mask-image` using `assets/deckle-mask.png` with a 2px irregular border. There are no rounded corners on paper or cards.
- Hanko seals are squares with `rounded.seal` and a slightly worn vermilion border (the `assets/hanko-frame.png` overlay at 85%). Text is set inside in Shippori Mincho B1 600.
- Buttons are flat plaques with `rounded.control`. Icons are thin 1.5px strokes, drawn as inline SVG: candle, lantern, brush, scroll, ear (for audio) and a close mark.
- Candles in the field are drawn, not imaged: a 4 × 18px body in `washi-shade` with a 1px `washi-edge` top, plus the flame.

## Motion and effects (the Halloween layer)

Candlelight is the only animation language. Every effect below reads its timing from the `motion` tokens. All of them stop or simplify under `prefers-reduced-motion: reduce`, and all of them pause when `document.hidden`.

### Room light (`--lit`)

`--lit = litCandles / 100`, from 1 down to 0. Room brightness = `0.35 + 0.65 × lit^0.7` (applied as a `brightness()` filter on the background layer, not on text). Vignette alpha = `0.35 + 0.5 × (1 − lit)`. Changes animate over `dim` with `ease-dim`.

### Candle flicker

The 100-candle shelf is one `<canvas>` (`CandleField`), drawn at 30 fps with devicePixelRatio scaling. Each candle has a seeded phase and period (2.8 to 4.6 s). The flame scales Y from 0.92 to 1.06 and skews X by ±3°, and its opacity runs 0.85 to 1, with a halo sprite (a pre-rendered radial gradient of `flame` at 22%) at 0.6 to 0.9. Two or three random candles each second get a short gust (120 ms, scale Y 0.8). Lit candles use `flame-core` at the centre, `flame` at the edge and an `ember` tip. Out candles show the wick only.

### Extinguish (the main moment)

1. 0 to 120 ms: the flame squashes (scale Y 0.6, X 1.2) as if breathed on.
2. 120 to 520 ms: it shrinks to the wick (`extinguish`, `ease-candle`); the halo fades.
3. 520 to 1820 ms: the wick ember glows `ember` and fades (`ember`).
4. 300 to 2900 ms: smoke (`Smoke`, a canvas overlay). 18 to 26 particles per candle rise with curl-noise drift; they are `washi` at 18% alpha, widening and fading (`smoke`, `ease-smoke`).
5. After 600 ms: the room dims one step (`--lit` updates).

The active candle in the Reader is SVG plus CSS (so it can take focus and is announced as "Candle for scene 3, lit"). Under reduced motion there is no squash and no smoke: the flame fades in 150 ms and the dim applies instantly.

### Hold to blow

Pressing and holding the blow control (pointer, Space or Enter) fills a thin vermilion ring around the candle over 800 ms while the flame leans away from the pointer. Releasing early lets the flame spring back upright (200 ms). With the microphone opted in, a live input meter replaces the ring and a sustained blow (≥ 250 ms over the calibrated floor) triggers the same sequence.

### Wrong answer

The flame flares (scale 1.35, 150 ms), then flickers hard for 600 ms, and the line 火が消えない ("the flame won't go out") appears in `moon-dim` under the question. The answer options stay enabled. No red flashes and no shaking of the page.

### Lantern breathing

The lantern image has a glow layer (a radial gradient of `andon` at 35%) that breathes over a 5 s cycle. Intensity = `0.55 + 0.45 × (1 − lit)`, so the spirit gets stronger as the room gets darker. Under 30 lit candles the paper of the lantern itself gains a faint inner flicker.

### Hitodama (ghost words)

Each collected ghost word becomes a small blue-white wisp (`andon-pale` core, `andon` glow, a three-dot fading tail) orbiting the lantern. The orbit radius is 60 to 140px, the period 3 to 5 s, and the drift slow and sinusoidal. They are capped at 24 visible, with a counter for the rest. Hovering or focusing a wisp shows its word. Under reduced motion the wisps sit still in a ring.

### Ink bleed

The first time a scene appears, each sentence fades in from `blur(2px)` and opacity 0 to sharp over `ink`, staggered by 90 ms, as if ink were soaking into paper. Text never animates again while being read.

### Shoji shadow

When fewer than 30 candles are lit, a silhouette (`assets/shoji-silhouette.png`, 12% opacity, multiply) crosses the shoji in the room background over 8 s, linear, at most once every 90 s, and only on the Room screen. It never appears in the Reader. There are no jump scares.

### Reveal (the hundredth candle)

1. 0 to 1.2 s: all remaining light falls to 5%.
2. 1.2 to 3.2 s: the lantern flares to full `andon-pale`, then settles.
3. 3.2 to 6 s: `aoandon-yokai.webp` fades in from 0 with a 12px upward drift.
4. At 6 s: 百の怪談が語られた。青行灯が来た。 ("The hundred tales are told. Aoandon has come.") in Yuji Syuku, then the summary (tales, scenes, ghost words) and the export action.

Under reduced motion this becomes a 400 ms crossfade straight to step 4.

### Sound (off by default)

Sound is generated with WebAudio only, with no audio files: soft wind (filtered noise at -36 dB), a tiny puff on extinguish and a low lantern hum on Reveal. A toggle sits in the top bar, the state is remembered, and nothing plays before the first user gesture.

## Components

### Buttons

`button-primary` (vermilion plaque, washi text, 48px minimum) is used for one action per screen. `button-quiet` (moon outline on dark) is for everything else. Hover changes the fill or border in `quick`. Focus is a 2px `focus` outline with a 3px offset on dark, and a 2px `sumi` outline on paper. Disabled controls drop to 55% opacity with a reason in text nearby.

### Level seals

Three hanko seals (N5, N4, N3) form a radio group (`role="radiogroup"`), with arrow-key navigation. The selected seal is filled `shu` with washi text and the others are outlined. Under each sits its Japanese name in `ui-small`: やさしい / ふつう / すこしむずかしい. The choice is remembered.

### Candle field and active candle

`CandleField` is the canvas shelf, `aria-hidden`, with a text twin: "63 / 100 candles still burning" (live region, polite). The active candle (`BlowCandle`) is a button with the label "Blow out the candle for scene N" and states lit, holding and out.

### Scroll cards (Shelf)

Each card is an illustration, the Japanese title (`tale-title`), the English title (`subtitle-en`), "7 scenes · 96% N4 words" (`ui-small`) and the credit "Lafcadio Hearn, tr. 戸川明三, Aozora Bunko" (`ui-small`, `moon-dim`). A tale that's been read shows a small out-candle mark. The whole card is one link with a visible focus ring.

### Reader sentence and words

Sentences render pre-tokenised spans.

- `known` words are plain sumi text. Furigana appears only when the furigana mode is "all".
- `story` words have a dotted underline and are always shown with furigana.
- `ghost` words (above the level) use `word-ghost`: a faint blue tint, a wavy blue underline and furigana in "above-level" mode.

Tapping or pressing Enter on a word opens the gloss slip and adds the word to the ghost words. Words are `button` elements inside `lang="ja"` text.

### Gloss slip

The gloss slip is a small washi slip like an omikuji fortune. It shows the word, its reading, the gloss and its source ("JLPT N2 list" or "Gemma gloss", the latter in `sumi-soft` italic-free small text), plus a "followed you" note. It is anchored with collision handling in both writing modes and closes on Esc, on an outside tap or on blur. It is never a native `title` tooltip.

### Level meter

A thin bar on the sheet's foot or edge shows the share of words in this scene at or below your level, for example "N4 · 97% · 2 ghost words". Tapping it explains the measurement in one sentence and links to About.

### Question

One question per scene, at level, with three options as `button-quiet` on paper (sumi outline). A correct answer lights the blow control; a wrong one plays the Wrong answer effect. The result is announced in a live region.

### Original sheet (原文)

The original scene in Shippori Mincho B1 with Aozora's own ruby, the credit and a link to the Aozora card. It is read-only and can be focus-trapped while open.

### Top bar

The wordmark 青行灯 (`tale-title` size scaled to 24px) links home. On the right: the ghost-words counter (hitodama icon + number; opens the export panel), the sound toggle and About. Each control is 44px.

### Export panel

A list of collected words (word, reading, gloss, source sentence) with remove buttons, plus "Download Anki deck (.tsv)" and "Download CSV". It explains in one line how to import into Anki.

### Toasts and status

Toasts are small `night-raised` strips at the bottom with `moon` text, auto-hiding after 4 s, used for "Saved", "Mic is off, hold to blow instead" and similar. Errors are explained in text with a recovery action.

## Imagery

All raster art is generated from ASSETS.md with gpt-image-2 and shares one style bible. In short: an original Edo woodblock print crossed with sumi-e ink wash, in a limited palette (indigo, sumi, aged washi, cold lantern blue and one vermilion accent), with visible paper fibre, low-key night scenes, generous negative space and no text of any kind. Illustrations sit behind a 4% `washi` grain overlay so they share the paper surface.

Illustrations always carry an `alt` that describes the scene in plain words. The yokai image is never shown before the Reveal (no spoilers in the Shelf or About).

## Copy and voice

The voice is quiet, short and bilingual: Japanese first and English second, in lighter text.

| Key | Japanese | English |
|---|---|---|
| Primary action | 夜をはじめる | Begin the night |
| Demo night | 九十九話目から | Demo night: start at the 99th tale |
| Blow out | ろうそくを消す | Blow out the candle |
| Original text | 原文 | Original |
| Ghost words | 憑いてきた言葉 | Words that followed you |
| Wrong answer | 火が消えない | The flame won't go out |

The one-line explanation on the Room: "In Edo Japan, friends told a hundred ghost stories by candlelight and put out one flame after each. Read real Meiji-era kaidan, retold at your level."

Copy has no emojis and no em dashes, and never says "AI magic". The model is named plainly (Gemma 4) where it matters, mainly in About and the level meter explanation.

## Accessibility and performance

- WCAG AA contrast for all text. Story text exceeds 12:1.
- Every interaction works with the keyboard alone. Focus order follows reading order in both writing modes.
- `lang="ja"` on Japanese runs and `lang="en"` on English.
- Respect `prefers-reduced-motion` and `prefers-contrast: more` (raise `moon-dim` to `moon` and drop the grain overlays).
- Budgets: the Room LCP is under 2.5 s on a simulated fast 4G connection; the Room image is ≤ 350 KB as WebP; each illustration is ≤ 220 KB; JS is ≤ 180 KB gzip excluding fonts. Fonts use `unicode-range` subsets via fontsource, and the display font is preloaded only for the wordmark.

## Do's and Don'ts

### Do:

- Do use light as the hierarchy: what is lit is what matters now.
- Do keep story text as sumi on washi, with the original one tap away.
- Do credit Hearn, the translator and Aozora Bunko on every tale.
- Do keep the two meanings of light separate: blue for the spirit and unknown words, amber for the reader's progress.
- Do provide hold-to-blow and full keyboard paths; mic is opt-in.
- Do honour reduced motion and pause effects when the tab is hidden.
- Do keep one primary vermilion action per screen.

### Don't:

- Don't use American Halloween clip art: pumpkins, bats, spiders, cobwebs, purple or slime green, neon orange.
- Don't use jump scares, sudden loud sounds, screen shakes or red error flashes.
- Don't put story text directly on the dark room, and don't make paper text glow.
- Don't use drop shadows, rounded cards, glassmorphism or gradients on text.
- Don't use fake kanji, garbled sutra text, signatures or seals inside generated images.
- Don't use emojis, em dashes or the user's location anywhere in the UI, fixtures or screenshots.
- Don't show the Aoandon yokai before the hundredth candle.
- Don't animate text while it is being read.
