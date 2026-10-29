# Codex brief: pipeline fixes and hosted generation (P2b)

Model: gpt-6.1-sol, reasoning medium. You built the pipeline in this session; this continues it. Do not start over.

## What changed since you stopped

- The host stopped you for low memory. Your code is committed. 55/55 tests passed.
- Local `gemma4:e2b-it-qat` is not good enough to ship. On mujina s01 it looped ("むかしの" more than 50 times), and its other scenes contain broken Japanese ("さびしいでした", "きのくにのくにの"). Keep it only for the live "retell again" control and for the comparison table.
- `.env.local` now holds the hosted key, and the hosted provider works (`gemma-4-31B-it` on DigitalOcean). Claude added `num_predict: 1536` and `repeat_penalty: 1.15` for Ollama, and `max_tokens: 1536` for hosted, in `createProvider`.
- A test run is in `data/runs/hosted/N4/mujina-s01.json`. Its Japanese is good, but it shows the two problems below.
- Another agent is building `src/` right now. Don't touch `src/`, `index.html`, `scripts/` or `tests/app-*`.

## AS-IS → TO-BE

1. **Spaced hiragana breaks the checker.** AS-IS: the model writes children's-book style with spaces between words, in mostly hiragana ("とうきょうに きこくざか という さかがあります。"). kuromoji then splits it into junk content words (とう, こい, ざか, さ, ゅうねんまえに) that count as ghosts and trigger useless retries. TO-BE, all three:
   - (a) Prompt rule 5 becomes: "Write normal Japanese with no spaces between words. Use kanji for words a {LEVEL} learner reads in kanji and for every story word; write other words in hiragana. The reader shows furigana, so do not avoid kanji the learner knows. Write numbers as 三十年 or 30年, never as kana."
   - (b) The checker removes ASCII and full-width spaces before tokenising, and normalises full-width digits.
   - (c) Add tests built from this run's sentences, so these cases tokenise into real words.
2. **Story words in kana.** AS-IS: the model wrote 紀伊国坂 as "きこくざか". TO-BE:
   - The prompt lists story words with their readings ("紀伊国坂（きいのくにざか）") and says to copy them exactly in kanji.
   - The checker also recognises a story word written in kana, matched by its reading, as a `story` token displayed in its kanji form.
   - `story-words.json` is checked against the source ruby, and the mujina set must include 紀伊国坂.
   - Add tests.
3. **Gaiji warnings.** AS-IS: 感嘆符二つ and 感嘆符三つ are unresolved. TO-BE: map 感嘆符二つ to ‼ and 感嘆符三つ to ！！！. Leave 「廴＋囘」 as 〓 with its warning; it isn't in mujina's retold text path.
4. **Hosted generation.**
   - Run `--provider hosted --levels N4 --tales all`. Print a per-scene line, then review 3 random scenes yourself for natural Japanese, kept events and no invented content. Report what you see.
   - Then run N5 and N3 for all tales.
   - Use `--force` only for mujina s01 N4, which was made before these fixes; skip existing good runs otherwise.
   - Retry failed scenes once. Report any that still fail.
5. **Rebuild.** Run `npm run build:tales` (all 5 tales should now be complete) and `npm run report`.
6. **Live server.** Check `/api/health` only. Skip the Ollama `/api/retell` call this time: memory is tight while the frontend agent runs. Say that you skipped it.

## Verification gate

1. `npm test` passes, with new tests for items 1 to 3. Other agents' tests may also be present; all must pass.
2. `public/tales/index.json` lists 5 tales, each with N5, N4 and N3 coverage. Every tale file validates.
3. `docs/metrics.md` shows hosted and ollama rows.

## Report format

- Files changed, one line each.
- A table per level: tale, scenes, mean first → final coverage, retries, failures.
- The three scenes you reviewed: the original snippet, the retelling, and your verdict.
- Known issues, plainly.
