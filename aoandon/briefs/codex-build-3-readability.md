# Codex brief: make the levels honest (P4 readability)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder. You are the only agent running.

## Why

The author is an N2 learner. They read the shipped N5, N4 and N3 retellings and said they are too difficult, even for them. Claude's audit agrees.

- **Kanji is not checked at all.** At every level 20–30% of characters are kanji. Across all tales and levels about 4,300 kanji sit above the reader's level (hoichi N5 alone has 455: 壇 浦 戦 霊 蟹 顔 …), and about 60% of them show **no furigana**. "Above level" furigana only marks ghost and story tokens, and a word like 驚く counts as known vocabulary even though its kanji is beyond the level.
- **Names are heavy:** 磯貝平太左衞門, 茂作, 巳之吉, 壇ノ浦.
- **Grammar and style are unconstrained,** apart from a character cap.
- **Homophones leak.** A reading-only match marks words as known: 僧 via そう, 死 via し, 霊 via れい, 復讐 via 復習 (about 2–4% of known tokens).

The current audit script is `C:\Users\ADK\.claude\jobs\6bcea7e5\tmp\readability.mjs`. Read it for the method, then port it into the repo.

## Hard rules

- Write in `pipeline/`, `data/`, `docs/`, `public/tales/`, `tests/`, `src/lib/schema.ts`, `src/lib/reader.ts`, `src/components/` and `THIRD_PARTY_NOTICES.md`.
- In `schema.ts`, only add **optional** fields.
- Keep DESIGN.md's look. No git commands that change state. Never print or write the API key.
- Hosted calls go to `gemma-4-31B-it` (DigitalOcean) through the existing provider. No Ollama in this run.

## AS-IS → TO-BE

1. **Kanji levels data.**
   - Download `https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json` (MIT) and write a trimmed `data/jlpt/kanji-levels.json` as `{ "漢": 3, ... }` from `jlpt_new`.
   - A kanji outside the lists counts as level 0, i.e. harder than N1.
   - Credit it in THIRD_PARTY_NOTICES.md.
2. **Checker** (`check.mjs`).
   - (a) Each token gets an optional `hk: true` when its surface contains any kanji above the target level (story words included).
   - (b) A reading-only vocabulary match counts only when the token surface has no kanji. This fixes 僧, 死, 霊 and 復讐.
   - (c) New metric `kanjiCoverage`: kanji characters at or below the level ÷ all kanji characters (1 when there are none).
   - (d) New metric `kanjiDensity`: kanji characters ÷ all characters.
   - Add both as optional fields in `metricsSchema` and `tokenSchema` (`hk`).
   - Tests for each, including the four homophone cases.
3. **Per-level prompt** (`retell.mjs`). Keep the Setsu framing and the existing JSON contract. Replace the level-specific rules with:
   - **N5, picture-book style.** です/ます and ました/ませんでした only, with ～て, ～たい, ～から and ～が (but). At most 20 characters per sentence and one idea per sentence. Kanji only from the N5 kanji list, so write everything else in hiragana. Replace personal names with simple roles (おさむらい, おぼうさん, おじいさん, わかい男), except the tale's one main character (a story word).
   - **N4.** Adds ～とき, ～たら, ～ている, ～と思います, potential forms and ～ても. At most 28 characters. Kanji only up to N4. At most two named people per tale, the rest as roles.
   - **N3.** Plain past narration, adding ～ようだ, ～らしい, the passive and ～ために. At most 40 characters. Kanji up to N3.
   - **All levels:** no classical or literary forms (～ぬ, ～ず, ～けり, ～べし), no keigo beyond です/ます (no 申す, 参る, いたす, ござる), and no idioms.
4. **Retry loop.**
   - Retry when vocabulary coverage is below target, **or** kanjiCoverage is below 0.95 (N5 and N4) or 0.97 (N3), **or** (N5 only) kanjiDensity is above 0.12.
   - The retry message lists the offending sentences with the words to avoid **and** the words whose kanji must be written in hiragana. Keep a maximum of 3 retries.
   - Remaining hard-kanji words keep `hk: true`, so they always get furigana.
5. **Story words.** At most 4 per tale used at N5 and N4, chosen by importance. All story words carry readings, so they always show furigana. Update `story-words.json` if needed and keep `"reviewed": false`.
6. **Frontend** (minimal, keep the design).
   - "Above level" furigana shows ruby for `ghost`, `story` **and** `hk` tokens.
   - The level meter shows, for example, "N4 · words 97% · kanji 96%".
   - Update the About text, explaining in plain words that both words and kanji are checked, and update its metrics table with the new columns.
   - Add tests in `tests/app-*.test.ts` for the furigana decision with `hk`.
7. **Regenerate.**
   - Run `--provider hosted --levels N5,N4,N3 --tales all --force`.
   - Before overwriting, copy the current hosted metrics to `docs/readability-before.json` (from git HEAD data), so we can compare.
   - Retry any failed scene once.
   - Then run `npm run build:tales` and `npm run report`.
8. **Readability audit** (`pipeline/audit.mjs`, plus `npm run audit`).
   - Writes `docs/readability.md`, one table per level with these columns per tale: vocabulary coverage, kanjiCoverage, kanjiDensity, mean and max sentence length, hard-kanji tokens shown **without** furigana in "above level" mode (must be 0), literary/keigo marker hits, and named people.
   - Include a before → after column for the main numbers, using `docs/readability-before.json`.
9. **Sample pack for the human check.** `docs/samples.md` holds mujina s01 and hoichi s05 at N5, N4 and N3, as plain text with furigana in parentheses after hard-kanji words (for example 濠（ほり）). Leave room for the author's rating ("easy / ok / hard") under each.
10. **Screenshots.** Re-shoot with `npm run screenshots` and check that the reader now shows furigana on hard kanji.

## Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass.
2. All 5 tales validate, at all 3 levels.
3. In `docs/readability.md`, hard-kanji tokens without furigana in "above level" mode are 0, at every level.
4. N5 mean kanjiDensity is ≤ 0.12. Mean sentence length is ≤ 20 at N5, ≤ 28 at N4 and ≤ 40 at N3. Keigo and literary hits are 0, or listed with each sentence.
5. `docs/samples.md` exists.

## Report format

- Files changed.
- The readability before → after tables.
- Failures.
- 3 scenes you read yourself, with an honest verdict on whether each matches its level.
- Known issues.
