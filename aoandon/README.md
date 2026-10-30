# Aoandon 青行灯

A hundred ghost stories by candlelight, for Japanese learners.

**Live: https://aoandon.onrender.com** · Demo night (starts at candle 99): https://aoandon.onrender.com/?night=demo#/shelf

Five of Lafcadio Hearn's ghost stories, in the Japanese translations on Aozora Bunko, retold by Gemma 4 at five JLPT levels from N5 to N1. Read a scene, answer one question and blow out a candle. Words you tap follow you home as blue ghost flames and export to Anki. When the hundredth candle goes out, 青行灯, the spirit of the blue lantern, arrives.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 4: Ghost in the Machine.

## How the levels work

Every level follows its own cumulative JLPT kanji list: 79 kanji for N5, 245 for N4, 612 for N3, 979 for N2 and 2,211 for N1. A word whose kanji are above the level is written in kana; a word whose kanji are allowed is written in kanji. Story names (芳一, 貉) keep their kanji and always show furigana. Every retelling is also checked against open JLPT word lists and compared with the original for meaning.

| Level | Kanji in the text | Average sentence | Kanji outside the level's list |
|---|---|---|---|
| N5 | 9.0% | 11.5 characters | 0 |
| N4 | 14.8% | 16.9 characters | 0 |
| N3 | 21.7% | 28.0 characters | 0 |
| N2 | 25.7% | 34.2 characters | 0 |
| N1 | 31.2% | 37.9 characters | 0 |

Across the 53 scenes, kanji share rises from N5 to N1 in every scene and sentence length in 50. The share of harder words rises on average (23%, 33%, 41%, 51%, 55%) but not in every single scene. Full numbers: [docs/readability.md](docs/readability.md), meaning-check notes: [docs/faithfulness.md](docs/faithfulness.md).

## Run it

```sh
npm install
npm test
npm run dev            # http://127.0.0.1:5173
```

The site is static: the stories are pre-generated JSON in `public/tales/`, so it needs no API key. To regenerate them:

```sh
cp .env.example .env.local      # add GRADIENT_MODEL_ACCESS_KEY for the hosted model
npm run fetch:jlpt
npm run fetch:aozora
npm run retell -- --provider hosted --levels N5,N4,N3,N2,N1 --tales all
npm run build:tales
npm run audit
```

`npm run live` starts a local API that lets the reader retell a scene again with a local Ollama model.

Deploy files for a static site are included for Render (`render.yaml`) and DigitalOcean App Platform (`.do/app.yaml`).

## Project files

[PLAN.md](PLAN.md) (scope and phases), [DESIGN.md](DESIGN.md) (design system and candlelight effects), [ASSETS.md](ASSETS.md) (image work order), `briefs/` (the build briefs).

## Credits

Stories: Lafcadio Hearn (小泉八雲), Japanese translations by 戸川明三 and 田部隆次, from [Aozora Bunko](https://www.aozora.gr.jp/index_pages/person258.html). Vocabulary: [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT), based on Jonathan Waller's JLPT lists at tanos.co.uk. Kanji levels: [kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT). Model: Gemma 4 (31B on DigitalOcean serverless inference). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
