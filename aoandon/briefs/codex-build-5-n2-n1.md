# Codex brief: add N2 and N1 (P4c)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder. You are the only agent running. P4b (the strict JLPT kanji ladder for N5, N4 and N3) is committed. Read `briefs/codex-build-4-ladder.md` first: this brief extends the same rules to two more levels.

## Goal

The author's session goal is "look at the JLPT kanji list and update the stories accordingly". Now add **N2 and N1** so the night has five levels: N5 (easiest) → N4 → N3 → N2 → N1 (hardest). Every level follows its own cumulative JLPT kanji list. The author is an N2 learner, so N2 is the level they will judge most closely.

## Hard rules

The same as P4b. Additionally, you may now change `levels` and the `retellings` keys in `src/lib/schema.ts`: add N2 and N1 as optional retellings, so existing tales stay valid. Never print the key. Use hosted `gemma-4-31B-it` only. No git commands that change state.

## AS-IS → TO-BE

1. **Levels everywhere.** `levels` becomes `['N5','N4','N3','N2','N1']` in `pipeline/config.mjs`, `src/lib/schema.ts` (enum, `retellings`, `taleIndexSchema.coverage`), `night.ts`, `prefs.ts`, the reader helpers and the tests. The default level stays N4. Saved nights and prefs that hold a 3-level value must still load.
2. **Kanji policy** (strict, the same mechanism as P4b).
   - N2 may use kanji from N5–N2; N1 from N5–N1.
   - Kanji outside every JLPT list (level 0) are written in kana or replaced, except story words.
   - At-level words must be written in kanji.
   - Density bands: **N2 0.25–0.35**, **N1 0.30–0.42**.
3. **Richness.**
   - **N2:** 30–55 characters per sentence. Plain-form narration with N2 grammar where natural (～ものの, ～わけではない, ～にもかかわらず, ～ばかりか, ～に違いない), N2 vocabulary, and connected clauses.
   - **N1:** 35–70 characters per sentence. Literary-leaning modern prose close to the translator's register, with N1 grammar allowed (～ともなく, ～ずにはいられない, ～をものともせず, ～んばかり). Classical forms are fine only inside quoted speech, when the original has them.
   - Vocabulary targets: N2 0.97, N1 0.98, using the cumulative lists through n2.csv and n1.csv.
   - No modern slang at any level.
4. **Ladder check** across all five levels: kanji density, mean sentence length and the share of harder vocabulary must rise strictly from N5 to N1. Regenerate a failing level once with feedback. Record `ladderOk` per scene.
5. **Faithfulness check**, the same as P4b, for N2 and N1.
6. **Regenerate** N2 and N1 for all 5 tales. Then run `npm run build:tales`, `npm run report` and `npm run audit` (all 5 levels in `docs/readability.md`, with the ladder table across 5 levels).
7. **Frontend** (keep DESIGN.md).
   - **Five hanko seals** on the Room and the Shelf: N5 やさしい, N4 ふつう, N3 すこしむずかしい, N2 むずかしい, N1 とてもむずかしい. They must fit on one row at 1440px and wrap into a tidy 3 + 2 at 390px with no overflow, and keep the radiogroup arrow keys.
   - The reader's level tabs show the five levels (only those available).
   - Update the About text and metrics table for five levels.
8. **Samples.** `docs/samples.md` shows mujina s01 and hoichi s05 at all five levels, with the per-level density and sentence-length line at the top.
9. **Screenshots.** Re-shoot. Check the seals on Room and Shelf at 1440 and 390 especially, and the N1 reader.

## Verification gate

1. `npm test`, `npm run typecheck` and `npm run build` pass.
2. All 5 tales validate at all 5 levels.
3. Non-story tokens with a kanji outside their level's cumulative list: 0 at every level. Report the distinct-kanji count per level.
4. Mean density per level falls inside its band, and mean density and sentence length rise strictly N5 < N4 < N3 < N2 < N1. `ladderOk` holds for at least 90% of scenes.
5. The screenshots show 5 seals with no overlap or overflow at 1440 and 390.

## Report format

- Files changed.
- The 5-level ladder table.
- `ladderOk` rate.
- Faithfulness issues by kind.
- One scene read at N2 and N1, with your verdict.
- Known issues.
