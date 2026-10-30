# Codex brief: reader polish before shipping (P5)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder. You are the only agent running. The five-level ladder is committed (032103f) and live at https://aoandon.onrender.com. **Do not regenerate any retellings** and do not call any model. This is display and tokenisation polish only.

## Hard rules

- Write only in `pipeline/check.mjs`, `pipeline/build-tales.mjs`, `public/tales/`, `src/`, `tests/` and `docs/screenshots/`.
- No model calls. No git commands that change state. Keep DESIGN.md.

## AS-IS → TO-BE

1. **Junk ghost marks on kana fragments.**
   - AS-IS: words that the kanji rule moved into kana get split by kuromoji into fragments, which are then marked `ghost` with a blue wavy underline. Examples in mujina s01 N4 (see `docs/screenshots/reader-vertical-1440.png`): the 「さ」 of 「さか」 (坂, N3 kanji, written in kana at N4), and 「の」 in 「歩くのを」.
   - TO-BE:
     - (a) A content token that is a single kana character, or a kana fragment that kuromoji tagged as a prefix, suffix or nominaliser (の, こと and similar functional uses), is `plain`, never `ghost`.
     - (b) Before tokenising, merge kana spellings of known words back into one token, using the JLPT vocabulary readings, so 「さか」 becomes one token with `b: 坂` and the gloss "slope". It is `known` if the word is within the level's vocabulary, `ghost` otherwise. Keep the kana surface: never change the displayed text.
   - Re-tokenise the existing retellings deterministically from their sentence text (`npm run build:tales` path or a small `pipeline/retokenize.mjs`) without any model call. Coverage and ghost lists then update.
   - Report how many ghost tokens disappeared per level and list a sample.
2. **Stray furigana fragment in vertical mode.**
   - AS-IS: a tiny vertical 「むじな」 floats beside the divider, left of the story columns (`reader-vertical-1440.png`, around x=415, y=300).
   - TO-BE: find the source. It may be a ruby from a hidden or offscreen element, the question block, or a story-word ruby positioned outside its column. Fix it so no ruby renders outside its base text, in either writing mode. Add a Playwright assertion in `scripts/screenshots.mjs` that every `rt` element's bounding box sits within 40px of its `ruby` base.
3. **Level meter wording.**
   - AS-IS: "N4 · words 88% · kanji 100%".
   - TO-BE: "N4 · 88% of words at your level · kanji all N4", with a tooltip or the existing one-line explanation saying ghost words are glossed. Keep it short on phones.

## Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass, with new tests for (1a), (1b) and the meter text.
2. Re-shoot the screenshots. The reader at N4 in vertical (1440) and horizontal (390) shows no wavy mark on single kana and no stray ruby. Open both and confirm.
3. The zero-kanji-outside-list property still holds at all five levels; recount it the same way as the audit.

## Report format

Files changed, ghost-token counts before → after per level with examples, the cause of the stray ruby, and gate results.
