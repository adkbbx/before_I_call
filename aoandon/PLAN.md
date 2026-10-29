# Aoandon (青行灯): build plan

Hacktoberfest Open-Source AI Challenge, Week 4: Ghost in the Machine.
Planned 2026-10-29 by Claude Opus 5.5 (medium). DESIGN.md is the visual source of truth; ASSETS.md is the image manifest.

## One line

A candlelit reading room for Japanese learners. Real Meiji-era kaidan (Lafcadio Hearn's ghost stories, in the Japanese translations on Aozora Bunko) are retold at your JLPT level by an open-weight model, and a vocabulary checker measures and enforces that level. Read a scene, blow out a candle. After the hundredth candle, the blue lantern spirit 青行灯 arrives.

## Why this entry

From the field scan on 2026-10-29 (about 465 Week 4 entries):

- The prompt's own ideas are crowded: about 106 séances for dead code, 91 haunted terminals and 87 ofrenda or memory keepers. Fifteen of the strongest titles share the hook "the AI refuses to invent the dead".
- Japanese folklore is untouched: no entries mention tsukumogami, yokai, kaidan, Obon or hyakumonogatari.
- It honours the past literally. Hearn never learned to read Japanese. Koizumi Setsu told him the ghost stories in plain words, and his *Kwaidan* came from her tellings. Aoandon does Setsu's job for a foreigner living in Japan today. The NHK asadora *Bakebake* (from 2025-09-29) is based on Setsu and Hearn.
- It is the author's own story: an N2 learner living in Japan, whose Weekend win (Before I Call) was about Japanese in daily life.
- Our hook is different from the crowd's: the ghost has to speak at *your* level. The constraint is vocabulary, measured word by word.

## Deadline

- **Ship by Sat 31 Oct, 15:59 JST.** That is the API `ends_at` (2026-10-31T06:59Z). The post text says Oct 31 11:59 PM PDT (Sun 1 Nov, 15:59 JST); treat the later time as buffer only.
- The Meta hackathon is due Thu 5 Nov, 11:00 JST, so Week 4 gets about 1.5 build days. Anything not green by Fri 30 Oct, 18:00 JST is cut.

## Scope

### Must ship (v1)

1. **Five tales** from Aozora Bunko (public domain; the credit line comes from each file's colophon):

   | id | Title | Translator | Aozora card |
   |---|---|---|---|
   | `mujina` | 貉 | 戸川明三 | https://www.aozora.gr.jp/cards/000258/card42928.html |
   | `chawan` | 茶碗の中 | 田部隆次 | https://www.aozora.gr.jp/cards/000258/card59429.html |
   | `yukionna` | 雪女 | 田部隆次 | https://www.aozora.gr.jp/cards/000258/card50326.html |
   | `rokurokubi` | ろくろ首 | 田部隆次 | https://www.aozora.gr.jp/cards/000258/card50327.html |
   | `hoichi` | 耳無芳一の話 | 戸川明三 | https://www.aozora.gr.jp/cards/000258/card42927.html |

   The order runs shortest first. 貉 is the demo tale.
2. **Three levels:** N5, N4 and N3. The sets are cumulative, so N4 includes N5.
3. **Pipeline** (Node, offline): fetch and parse Aozora, split into scenes, retell with an open model, check against the JLPT lists, retry offending sentences, gloss what is left, write question data and metrics, then write pre-tokenised JSON for the frontend.
4. **Frontend** (static, Vite + React + TS): Room, Shelf, Reader, Reveal and About screens, as specified in DESIGN.md.
5. **Deploy:** a static build on DigitalOcean App Platform. Local "live" mode re-tells a scene with Ollama (Gemma 4 E2B) through `server/live.mjs`.
6. **Measured result** for the post: coverage before and after the checker, by level and by model (Gemma 4 E2B local vs Gemma 4 31B on DigitalOcean), plus seconds per scene.

### Stretch (only if v1 is green by Fri 18:00 JST)

- **Tinker:** LoRA-tune a small model (Qwen3 4B or Llama 3.2 3B) on checker-passed retellings, and report first-draft coverage and latency against the base model. Only if credits are already claimed at hacktoberfest.com/my.
- **Narration:** an open Japanese TTS (Kokoro 82M or VOICEVOX engine) reads the retelling. Off by default.
- **More tales:** 葬られたる秘密 and お貞のはなし.

### Out of scope

Accounts, server database, sharing, uploads, new AI-written kaidan, romaji, translation into English (glosses only).

## Product rules

1. **Never pass a retelling off as the original.** The original scene (with Aozora's own ruby) is always one tap away, and every tale shows its credit: "Lafcadio Hearn, tr. 戸川明三, Aozora Bunko".
2. **The model may simplify but never add events.** The prompt forbids it and the checker keeps names. We can't prove faithfulness automatically, so the post says so.
3. **Words above the level are never silently kept.** They are rewritten or shown as glossed "ghost words" (DESIGN.md: `word-ghost`).
4. **The first screen explains itself** in one line and offers the Demo night (from the Worth the Walk phone tests: the app makes the decision, no walls of text).
5. **Reading happens on paper.** The room is dark by design, but story text is always sumi ink on washi paper (dark on light).
6. **No location** in fixtures, screenshots, copy or commits.
7. **Respect reduced motion and no-mic users.** Hold-to-blow is the default; mic blowing is opt-in.

## Architecture

```
aoandon/
  PLAN.md  DESIGN.md  ASSETS.md  README.md  LICENSE  THIRD_PARTY_NOTICES.md
  index.html  vite.config.ts  tsconfig.json  package.json  .env.example
  briefs/                 Codex briefs (assets, build) and their logs (logs gitignored)
  public/
    assets/               processed images from ASSETS.md (webp, png with alpha)
    tales/                pipeline output: <taleId>.json + index.json (static, fetched by the app)
    favicon.svg
  src/
    main.tsx  App.tsx
    styles/ tokens.css base.css effects.css
    components/ Room CandleField Lantern Hitodama Shelf Reader Sentence WordGloss
                LevelSeal LevelMeter Question BlowCandle Smoke Reveal About
    lib/ schema.ts  night.ts  anki.ts  blow.ts  tales.ts  prefs.ts
  pipeline/
    config.mjs            providers, levels, paths
    aozora.mjs            fetch zip, decode Shift_JIS, parse ruby and notes, split scenes
    jlpt.mjs              load the cumulative N5..N3 sets from data/jlpt/*.csv
    tokenize.mjs          kuromoji wrapper, content-word filter, reading to hiragana
    check.mjs             coverage + offending words
    retell.mjs            prompt, call provider, JSON repair, retry loop, gloss, question
    build-tales.mjs       assemble public/tales/*.json
    report.mjs            metrics -> docs/metrics.md (tables for the post)
  data/
    source/               raw Aozora zips + parsed scenes (parsed JSON committed)
    jlpt/                 n5.csv n4.csv n3.csv (MIT, from jamsinclair/open-anki-jlpt-decks)
    runs/                 raw model outputs per provider/level (committed: evidence)
  server/live.mjs         local only: /api/health, /api/retell (Ollama + checker)
  tests/                  node --test, *.test.ts (Node 22 strips types)
```

Data flow: Aozora zip → `aozora.mjs` (scenes with ruby) → `retell.mjs` (model × level, with the checker loop) → `data/runs/*.json` → `build-tales.mjs` → `public/tales/*.json` (pre-tokenised; the browser needs no tokenizer) → React app.

## Data contracts

`src/lib/schema.ts` (zod) is the single source of truth, used by both the pipeline and the app:

```ts
Level = 'N5' | 'N4' | 'N3'
Ruby = { base: string, rt?: string }                 // original text runs, Aozora ruby kept
Token = { s: string, r?: string, b?: string,          // surface, reading (hiragana), base form
          k: 'known' | 'story' | 'ghost' | 'plain',  // plain = punctuation/particles
          g?: string, gs?: 'jlpt' | 'model' }         // gloss + where it came from
Sentence = { tokens: Token[] }
Question = { prompt: Sentence, options: [Sentence, Sentence, Sentence], answer: 0|1|2 }
Metrics = { firstCoverage: number, finalCoverage: number, retries: number,
            seconds: number, offendingFirst: string[], ghostWords: string[] }
Retelling = { level: Level, model: string, provider: 'ollama'|'hosted',
              sentences: Sentence[], question: Question, metrics: Metrics }
Scene = { id: string, original: Ruby[][], retellings: Partial<Record<Level, Retelling>> }
StoryWord = { text: string, reading: string, gloss: string }
Tale = { id, titleJa, titleEn, translator, aozoraCard, colophon, illustration,
         storyWords: StoryWord[], scenes: Scene[] }
TaleIndex = { tales: { id, titleJa, titleEn, scenes: number, coverage: Partial<Record<Level, number>> }[] }
```

## Pipeline details

**Aozora parsing** (`aozora.mjs`): download the card's text zip, decode Shift_JIS with iconv-lite, and strip the header (the `---` notation block) and the colophon (keep the colophon as `colophon`). Parse `｜base《reading》` and `漢字《よみ》`, drop `［＃…］` notes, and keep paragraph breaks. Split scenes at paragraph boundaries into chunks of 250 to 500 characters, never mid-paragraph. There are fixture tests for each markup form.

**Checker** (`check.mjs`):

- Content tokens are nouns (except proper nouns, numbers and pronouns), verbs, i-adjectives, na-adjective stems and adverbs. Particles, auxiliaries, symbols and the suffixes ます, です and た are `plain`.
- A token is `known` if its base form, surface or hiragana reading matches an entry at or below the level. Kana-only entries match on reading.
- `story` tokens are a tale's story words (at most 8 per tale; for example 芳一, 琵琶, 平家, 和尚, 雪女). They are excluded from the denominator and always glossed.
- Coverage = known content tokens / counted content tokens. Offending = unique base forms of unknown content tokens.

**Retell loop** (`retell.mjs`):

1. The prompt (JSON mode) is "You are Setsu Koizumi, retelling a kaidan aloud to a learner…". It covers the level's word list policy, the sentence length cap (N5 25, N4 35, N3 45 characters), keeping every event in order, no new events or names, story words allowed, and output `{sentences: string[], question: {prompt, options[3], answer}}`.
2. Check. If coverage is below the target (N5 0.95, N4 0.95, N3 0.97), send only the offending sentences back with "rewrite without: [words]", up to 2 retries.
3. Any remaining unknown words become `ghost` tokens with a gloss: the JLPT list meaning if found at a higher level, otherwise a model gloss (`gs: 'model'`, labelled in the UI).
4. Record metrics. Save the raw request and response in `data/runs/` as evidence.

**Providers** (`config.mjs`, reading `.env.local`):

- `ollama`: `OLLAMA_URL` (default http://127.0.0.1:11434), `LOCAL_MODEL` (default `gemma4:e2b-it-qat`).
- `hosted`: OpenAI-compatible; `HOSTED_BASE_URL` (default https://inference.do-ai.run/v1), `HOSTED_MODEL` (default `gemma-4-31B-it`), key in `GRADIENT_MODEL_ACCESS_KEY`. The key is never logged or committed.

**Commands:** `npm run fetch:aozora`, `npm run retell -- --provider hosted --levels N5,N4,N3 --tales all`, `npm run build:tales`, `npm run report`.

## Frontend summary (details in DESIGN.md)

- **Room** (`/`): dark tatami room, the blue andon at the centre, a shelf of 100 candles, the wordmark 青行灯, a one-line explanation, three hanko level seals (N5, N4, N3), "Begin the night", and a "Demo night" link (`?night=demo` starts with 99 candles out, clearly labelled).
- **Shelf:** five hanging-scroll cards with illustration, Japanese and English title, scene count, a level-fit line ("96% N4 words") and the credit.
- **Reader:** washi sheet, vertical text on wide screens (`writing-mode: vertical-rl`) and horizontal on phones, with a toggle that is remembered. Furigana modes: above-level / all / off. Tapping a word opens a gloss slip and adds it to the ghost words. 原文 opens the original scene. Each scene ends with one question; a correct answer lights the "blow out" control; a wrong one makes the flame flare ("火が消えない").
- **Blow out:** hold for 800 ms (pointer, Space or Enter), or opt into the microphone (`blow.ts`: sustained low-band energy for 250 ms or more over a calibrated noise floor). Extinguish, smoke, then the room dims one step.
- **Ghost words:** hitodama orbit the lantern, one per collected word. Export as an Anki TSV (front: word + reading; back: gloss + the sentence it came from + tale credit).
- **Reveal:** at the hundredth candle, the room goes dark, the lantern flares and 青行灯 appears, followed by a summary and the export.
- **About:** Hearn and Setsu, how the level check works, the metrics table, limits and credits.
- **State:** `night.ts` in localStorage (wrapped in try/catch; works without storage): lit candles, scenes done per level, ghost words, preferences.

## Model routing

| Work | Model | How |
|---|---|---|
| Planning, specs, DESIGN.md, review, DEV post | Claude Opus 5.5, medium | This Claude Code session |
| Image assets (ASSETS.md) | Codex `gpt-6-astra`, medium, built-in `image_gen` (gpt-image-2) | `codex exec -m gpt-6-astra -c model_reasoning_effort="medium"` with `briefs/codex-assets.md` |
| Code build | Codex `gpt-6.1-sol`, medium | `codex exec -m gpt-6.1-sol -c model_reasoning_effort="medium"` with `briefs/codex-build-*.md` |
| Fallback when Codex hits a usage limit | Claude Sonnet 5.5 | Claude Code subagent (`model: sonnet`), same brief, told "do not start over, finish and verify" |
| Retelling at runtime | Gemma 4 E2B (Ollama, local) and Gemma 4 31B (DigitalOcean serverless) | `pipeline/retell.mjs` |

Runs are not ephemeral, so `codex exec resume <id>` can pick up after a limit. Logs go to `briefs/logs/` (gitignored). Codex never commits; Claude reviews, reruns tests, then commits.

## Phases and gates

| Phase | Owner and model | Done when (gate) | Target (JST) |
|---|---|---|---|
| P0 Base | Opus | PLAN, DESIGN, ASSETS, scaffold; `npm test` and `npm run build` green | Thu 29, 16:00 |
| P1 Assets | Codex astra | All ASSETS.md files exist at the stated sizes and alpha; contact sheet `public/assets/contact-sheet.png`; no text or lettering visible | Thu 29, 19:00 |
| P2 Pipeline | Codex sol | Parser, tokenizer, checker, retell and build-tales implemented; fixture tests green; 貉 retold at N4 with local Ollama end to end | Thu 29, 23:00 |
| P3 Frontend | Codex sol | All screens per DESIGN.md; tests green; build green; Playwright screenshots at 390×844 and 1440×900 for Room, Shelf, Reader and Reveal; reduced-motion pass | Fri 30, 12:00 |
| P4 Content | Opus + pipeline | All 5 tales × 3 levels on hosted 31B; local E2B runs for the comparison table; `docs/metrics.md` | Fri 30, 15:00 |
| P5 QA + deploy | Opus + Codex fixes | Phone and desktop QA by the author; DigitalOcean App Platform URL live; README with run steps | Fri 30, 20:00 |
| P6 Post | Opus + author | Demo video, the Japanese friend's reaction, DEV draft via DevRelay, published | Sat 31, 14:00 |

## DEV post plan

- **Title candidates:** "Lafcadio Hearn couldn't read Japanese either. His wife told him the ghost stories." / "My Japanese is N3. Japan's ghost stories are Meiji-era. So a local model tells them the way Setsu did."
- **Opening:** a real line from 耳無芳一の話 that the author can't read, plus the measured count of above-level words in its first scene.
- **Sections (template):** What I Built / Demo (video plus the live link) / Code / How I Built It (pipeline, checker, numbers table) / Why Does Open Innovation Matter? (public-domain stories deserve a tool that can't disappear; your mistakes stay on your machine; it works offline; you can tune it to a JLPT level, which no closed API targets) / My Agent Session (DevRelay embed) / The Spirit of It (a Japanese friend reads the 雪女 retelling; the author's first kaidan finished without a dictionary) / What it can't do / Prize Categories.
- **Categories:** Gemma, DigitalOcean (hosting + 31B inference), and Tinker only if the stretch lands.
- **Style:** no em dashes, emojis or tick marks; plain voice; about 2,000 to 2,500 words; screenshots checked through DEV's image proxy.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Aozora markup edge cases | Fixture tests per markup form; keep the raw zip; scenes are reviewed by eye for 貉 |
| kuromoji base forms differ from the JLPT list (来る / くる, 有る / ある) | Match on base form, surface and hiragana reading; a test table of 30 known pairs |
| Small-model JSON breaks | JSON repair, schema validation, one re-ask, then mark the scene failed (never silently ship) |
| Vertical text bugs (ruby, popovers, scroll) | Toggle to horizontal; Playwright screenshots in both modes; popovers anchored with collision checks |
| 100 animated candles are heavy | One canvas at 30 fps, paused when hidden; only the active candle is DOM/SVG |
| Mic permission denied | Hold-to-blow is the default; mic is opt-in with a clear fallback |
| DigitalOcean key or credits missing | Generate everything locally with E2B; DigitalOcean category then rests on hosting only, and the post says so |
| Time | Stretch items are cut first; the post always gets Saturday morning |

## Open questions for the author

1. Can the DigitalOcean key from Week 2 be reused (`GRADIENT_MODEL_ACCESS_KEY`), and is App Platform available on the account?
2. Public repo name: `adkbbx/aoandon`?
3. Which Japanese friend or teacher can read one retelling and react on Friday?
4. Are Tinker credits already claimed?
