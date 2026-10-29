# Codex brief: Aoandon tale pipeline and live API (P2)

Model: gpt-6.1-sol, reasoning medium. Working root: this `aoandon/` folder.

## GOAL

Implement the pipeline in `PLAN.md` ("Data contracts", "Pipeline details", "Product rules") so that this sequence works end to end on this machine with the local Ollama model:

```
npm run fetch:jlpt
npm run fetch:aozora
npm run retell -- --provider ollama --levels N4 --tales mujina
npm run build:tales
```

It must produce a schema-valid `public/tales/mujina.json` and `public/tales/index.json`, plus a working `server/live.mjs`. Come back only after the verification gate passes.

## Read first

`PLAN.md`; `src/lib/schema.ts` (the contract; do not change it); the header comment of every file in `pipeline/` and `server/` (each states its contract); `tests/base.test.ts` (the test style); `.env.example`.

## Hard rules

- Write only in `pipeline/`, `server/`, `data/`, `docs/`, `public/tales/` and new test files `tests/pipeline-*.test.mjs` or `tests/pipeline-*.test.ts`. Another agent is writing `assets-src/`, `public/assets/` and `scripts/process-assets.mjs` at the same time: don't touch them. Don't edit `src/`, `PLAN.md`, `DESIGN.md`, `ASSETS.md` or `package.json` dependencies.
- If the schema in `src/lib/schema.ts` truly cannot express something, stop and report rather than editing it.
- No git commands that change state.
- Model calls in this run go only to local Ollama (`http://127.0.0.1:11434`, model `gemma4:e2b-it-qat`). Check `/api/tags` first, and stop and report if it is down. Implement the `hosted` provider (OpenAI-compatible `POST {baseUrl}/chat/completions`, `Authorization: Bearer <GRADIENT_MODEL_ACCESS_KEY>`, `response_format: {type: "json_object"}`) but test it only against a mocked `fetch`. Never print, log or write the key.
- Unit tests make no network calls. Use a fake provider for the retell loop.
- Match the existing style: ESM `.mjs`, small pure exported functions, sparse comments. Node 22 runs `.ts` imports directly, so `build-tales.mjs` imports `../src/lib/schema.ts` to validate.
- No location mentions in fixtures or output, beyond place names that are part of the original tales.

## AS-IS → TO-BE

1. **`pipeline/jlpt.mjs`.** AS-IS: a stub. TO-BE: `--download` saves the 5 CSVs from `config.jlptSources` to `data/jlpt/n5.csv` .. `n1.csv`. They are MIT, so commit them as data. `loadVocab()` follows the header contract. Normalise expressions: split alternatives on `・`, `、`, `;` and `/`; strip `〜`, `～` and bracketed notes; index each entry by expression and by reading; a word's level is the lowest level it appears at. The cumulative set for N4 contains N5 ∪ N4.
2. **`pipeline/tokenize.mjs`.** AS-IS: `toHiragana` only. TO-BE: a memoised kuromoji tokenizer, with the dictionary path resolved through `createRequire(import.meta.url).resolve('kuromoji/package.json')` + `/dict`. `isContentWord(token)` follows the rules in the `check.mjs` header.
3. **`pipeline/check.mjs`.** AS-IS: a stub. TO-BE: `tokenizeForLevel(text, level, { storyWords, vocab })` following the header contract. Mark story-word spans by string search *before* tokenising (kuromoji may split 芳一 into two tokens). Emit `Token` objects exactly as in `src/lib/schema.ts`:
   - `r` (hiragana) only when the surface contains kanji;
   - `b` for content words;
   - `g` and `gs: 'jlpt'` for known and ghost words found in any JLPT list;
   - story words take their gloss from the story-word list.
4. **`pipeline/story-words.json`** (new). Up to 8 story words per tale, chosen from the original text: proper nouns and story-critical terms (for example 芳一, 琵琶, 平家, 和尚 in hoichi). Each has `text`, `reading` (from Aozora ruby when present) and a short English `gloss`. Add `"reviewed": false` per tale so the author can check them.
5. **`pipeline/aozora.mjs`.** AS-IS: stubs. TO-BE, following the header contract:
   - Find the zip link on the card page (an `href` ending in `.zip` under `./files/`), download it to `data/source/<id>.zip`, unzip with adm-zip and decode with iconv-lite (`Shift_JIS`).
   - Strip the header (from the line of hyphens through the closing line of hyphens around 【テキスト中に現れる記号について】). The colophon starts at `底本：`.
   - Parse ruby: `｜base《rt》`, and otherwise the trailing run of kanji (including 々 〆 ヵ ヶ) before `《`.
   - Remove `［＃…］` notes. For gaiji `※［＃…］`, use the codepoint if the note gives `U+XXXX`; otherwise write `〓` and add a warning.
   - Write `data/source/<id>.json` = `{ id, colophon, paragraphs: Ruby[][], scenes: { id, original: Ruby[][] }[], warnings: string[] }`.
   - CLI: `npm run fetch:aozora` (all tales, or `--tales mujina`). Print the scene count and warnings per tale.
6. **`pipeline/retell.mjs`.** AS-IS: a stub. TO-BE, following the header contract:
   - CLI flags: `--provider ollama|hosted`, `--levels`, `--tales`, `--scenes`, `--force`. Existing runs are skipped unless `--force` is given.
   - Ollama: `POST /api/chat` with `{ model, messages, stream: false, think: false, format: <JSON schema>, options: { temperature: 0.4, num_ctx: 8192 } }`.
   - Timeout of 180 s per call. Measure wall-clock seconds per scene, retries included.
   - Use the **retelling prompt** below verbatim, with placeholders filled.
   - Shuffle the question options deterministically (seeded by `taleId/sceneId/level`) and fix `answer` to match.
   - Check the question at the same level. If it has ghost words that aren't story words, ask once to simplify it; keep any leftovers as ghosts.
   - Ghost glosses: look the word up in N2 and N1 first (`gs: 'jlpt'`); otherwise make one batched gloss call (`gs: 'model'`, at most 6 English words each).
   - Evidence goes in `data/runs/<provider>/<level>/<taleId>-<sceneId>.json` = `{ request: { model, messages }, responses: [...raw strings], metrics, retelling }`. Never include headers or keys.
   - Bad JSON: try a local repair (strip code fences, take the outermost `{…}`), then one re-ask, then mark the scene failed. Continue with the other scenes; exit 1 if any scene failed.
7. **`pipeline/build-tales.mjs`.** AS-IS: a stub. TO-BE:
   - Assemble each tale from `data/source`, `story-words.json` and `data/runs` (prefer hosted over ollama per scene and level).
   - Fields: `illustration: "assets/tale-<id>.webp"`; `colophon` from source; tale titles, translator and card from `config.tales`.
   - Validate with `taleSchema`. Write `public/tales/<id>.json` only for tales whose every scene has at least one level.
   - `index.json`: `coverage[level]` = the mean `finalCoverage` across scenes that have that level. Validate with `taleIndexSchema`. Exit 1 on any invalid tale.
8. **`server/live.mjs`.** AS-IS: health only. TO-BE: `POST /api/retell { taleId, sceneId, level }` runs one scene through the same retell loop with the ollama provider and returns a schema-valid `Retelling`. Only one job runs at a time (429 with `{ error }` while busy). Malformed bodies get a 400. The server listens on `127.0.0.1` only.
9. **`pipeline/report.mjs`.** AS-IS: a stub. TO-BE: writes `docs/metrics.md` as described in its header. These are markdown tables per provider × level (mean first-draft coverage, mean final coverage, retries per scene, seconds per scene, ghost words per scene, failed scenes), plus the date and models used.
10. **Tests** (`tests/pipeline-*.test.mjs`):
    - The Aozora parser on synthetic strings for every markup form, including header and colophon stripping, notes, gaiji and scene splitting at the 250..500 bounds.
    - JLPT normalisation and cumulative sets.
    - The checker on a table of at least 30 known pairs (来る/くる, ある/有る, 食べました→食べる, お茶, 静か, ゆっくり, and so on), the coverage maths, story-word exclusion and plain kinds.
    - The retell loop with a fake provider: retry replaces only the offending sentences; ghost gloss sources; JSON repair; a failed scene; deterministic shuffling.
    - build-tales schema validation on fixture runs.
    - live server: health, 400, and 429 while busy, with a fake provider injected.

## Retelling prompt (system message; fill in the {placeholders})

```
You are Koizumi Setsu. You are retelling a Japanese ghost story (kaidan) aloud to a foreign friend who is learning Japanese at JLPT {LEVEL}.
Retell the scene in simple, natural storytelling Japanese. {STYLE}
Rules:
1. Use only words a JLPT {LEVEL} learner knows. If an idea needs a harder word, say it with easier words instead.
2. Every sentence is at most {CAP} characters.
3. Keep every event of the scene, in the same order. Do not add events, people, names, feelings or explanations that are not in the scene.
4. You may use these story words exactly as written: {STORY_WORDS}.
5. Write kanji only for words a {LEVEL} learner can read in kanji. Write other words in hiragana.
6. Then write one question in Japanese at the same level about what happens in this scene, with three short answer options. Exactly one option is correct.
Return only JSON: {"sentences": ["..."], "question": {"prompt": "...", "options": ["...", "...", "..."], "answer": 0}}
```

- `{STYLE}` is "Use です/ます and polite past forms (～ました)." for N5 and N4, and "Use plain past forms (～た) for narration." for N3.
- `{STORY_WORDS}` is the tale's story words joined with "、", or なし.
- The user message is `前の場面（やさしく語り直したもの）: {PREVIOUS_RETELLING or なし}\n\n場面（原文）:\n{ORIGINAL_PLAIN_TEXT}`, where the original is plain text with ruby bases only.
- The retry message is: `These sentences use words above {LEVEL}: {n}: "{sentence}" (avoid: {words}) ... Rewrite only these sentences, with the same meaning and the same rules. Return only JSON: {"rewrites": [{"index": n, "sentence": "..."}]}`.

## Verification gate (all must pass before you return)

1. `npm test` passes: the 9 existing tests plus all new ones.
2. `npm run typecheck` and `npx vite build` pass.
3. `npm run fetch:jlpt` and `npm run fetch:aozora` succeed for all 5 tales. Print the scene counts and warnings.
4. `npm run retell -- --provider ollama --levels N4 --tales mujina` succeeds with no failed scenes. Then `npm run build:tales` writes a schema-valid `public/tales/mujina.json` and `index.json`.
5. If the N4 run took under 15 minutes, also run `--levels N5,N3 --tales mujina` and rebuild.
6. `npm run report` writes `docs/metrics.md`.
7. Start `npm run live`, call `/api/health` and one `/api/retell` for `mujina/s01/N4`, then stop the server.

## Report format (your final message)

- Files created or changed, one line each.
- Commands from the gate with their results (test counts, scene counts, warnings).
- For mujina: per level, `firstCoverage → finalCoverage`, retries, seconds and ghost words for each scene. Paste the first scene's original text and its N4 retelling.
- Known issues, shortcuts taken and anything skipped, plainly stated.
