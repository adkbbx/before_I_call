# Codex brief: fix the difficulty ladder and check meaning (P4b)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder. You are the only agent running. P4 (readability) is committed in 15ac9ad.

## Why

The author (N2) points out that the levels are backwards: N5 must be the easiest and N3 clearly the hardest. After P4, mean kanji density is N5 6.9%, N4 6.8% and **N3 5.3%**. N3 now has the least kanji of all, because the "write hard kanji in hiragana" retry applied to every level and N3's 0.97 kanji target pushed it hardest. Kana-only N3 is unnatural and harder to parse for real N3 readers. Furigana (`hk`) already makes every above-level kanji readable, so N4 and N3 don't need to avoid them.

Claude also found meaning errors the vocabulary checker can't see:

- mujina s01 N4: 「さんにじゅうねんまえ」 for 三十年前.
- hoichi s05 N5: 「高い人」 (tall) where the original means high-ranking (えらい人).
- mujina s01: the merchant "saw" the mujina 30 years ago, but in Hearn he died about 30 years ago.
- Your own P4 note: yukionna s03 N4 「あなたをしぬようにしました」.

## Hard rules

The same rules as P4: write in `pipeline/`, `data/`, `docs/`, `public/tales/`, `tests/`, `src/lib/`, `src/components/`; in schema.ts, add optional fields only; never print the key; hosted `gemma-4-31B-it` only; no git commands that change state. **Leave the N5 runs as they are** unless the ladder check (item 3) or the faithfulness check (item 4) flags a scene.

## AS-IS → TO-BE

1. **Per-level kanji policy** (`config.mjs` plus `retell.mjs`).
   - N5 keeps the current rule: N5 kanji only, everything else in hiragana, mean density ≤ 0.12.
   - **N4:** a density band of 0.12–0.20. Use normal kanji for N5 and N4 words; above-level kanji are allowed and get furigana. Retry only when density falls outside the band, or for kanji above N2 (level 0 or 1) that have a simpler common word.
   - **N3:** a density band of 0.20–0.30, i.e. normal written Japanese. N3-level and below kanji as usual, above-level kanji with furigana. The same retry rule.
   - Remove the kanjiCoverage retry for N4 and N3, but keep reporting it.
   - The prompt states the band in plain words, for example: 「N3: write normal Japanese with kanji, as in a newspaper for young people. Do not write words in hiragana just to make them easier.」
2. **Per-level richness.**
   - **N4:** sentences of 15–28 characters, using ～とき, ～たら, ～ている and ～と思います where natural.
   - **N3:** sentences of 22–40 characters, connected with ～て, ～ので, ～のに, ～ようだ and the passive, and N3 vocabulary when it fits.
   - Mean sentence length must rise from level to level within a scene.
   - Vocabulary coverage targets stay where they are.
3. **Ladder check, per scene.**
   - These must hold: kanjiDensity N5 < N4 < N3; mean sentence length N5 < N4 < N3; and the share of N4+N3 vocabulary tokens N5 ≤ N4 < N3.
   - If a scene fails, regenerate the offending level once with feedback, for example "this N3 retelling is easier than the N4 one: use more kanji and longer connected sentences".
   - Record `ladderOk` per scene in the build output, and add a table to `docs/readability.md`.
4. **Faithfulness check, per retelling.**
   - One extra hosted call with the original scene and the retelling. It returns JSON `{ issues: [{ sentence, problem, kind: 'number'|'who'|'event'|'death'|'invented'|'unnatural' }] }`.
   - If it finds issues, send one targeted rewrite of only those sentences, then re-run the level check.
   - Store the remaining issues in `metrics.faithIssues` (an optional array), list them in `docs/faithfulness.md`, and fix the four known errors above.
   - Number words: never spell numbers in kana. Write 三十年 or 30年, and give number words with kanji above the level furigana instead.
5. **Regenerate** N4 and N3 for all tales (`--force`), plus any N5 scenes flagged by item 3 or 4. Then run `npm run build:tales`, `npm run report` and `npm run audit`.
6. **Samples.** Rewrite `docs/samples.md` for mujina s01 and hoichi s05 at N5, N4 and N3 (same format). Add a line at the top showing per-level kanji density and mean sentence length, so the author can see the ladder.
7. **Screenshots.** Re-shoot, and check the reader at N3 looks like normal Japanese with furigana only on hard kanji.

## Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass, including new tests for the density bands, the ladder check and the number-word rule.
2. Mean kanji density is N5 ≤ 0.12, N4 in 0.12–0.20 and N3 in 0.20–0.30. Mean sentence length is strictly increasing N5 < N4 < N3. `ladderOk` holds for at least 90% of scenes, with the rest listed.
3. Hard-kanji tokens without furigana in "above level" mode: still 0.
4. The four known meaning errors are fixed. `docs/faithfulness.md` lists the remaining issues by kind.
5. All 5 tales validate at all 3 levels.

## Report format

- Files changed.
- A ladder table per level (density, sentence length, vocabulary).
- `ladderOk` rate and faithfulness issue counts before and after the rewrite.
- 3 scenes you read at all three levels, with a verdict on whether difficulty clearly increases.
- Known issues.
