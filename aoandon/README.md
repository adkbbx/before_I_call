# Aoandon 青行灯

A hundred ghost stories by candlelight, for Japanese learners.

Real Meiji-era kaidan (Lafcadio Hearn's ghost stories, in the Japanese translations on Aozora Bunko) are retold at your JLPT level (N5, N4 or N3) by an open-weight model. A vocabulary checker measures every word against open JLPT lists and sends sentences back until they fit your level. Read a scene, answer one question and blow out a candle. When the hundredth flame goes out, 青行灯, the spirit of the blue lantern, arrives.

Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 4: Ghost in the Machine.

## Status

Under construction. See [PLAN.md](PLAN.md) for scope and phases, [DESIGN.md](DESIGN.md) for the design system and [ASSETS.md](ASSETS.md) for the image manifest.

## Run it

```sh
npm install
npm test
npm run dev            # static app on http://127.0.0.1:5173
```

To generate tales (P2):

```sh
cp .env.example .env.local      # add GRADIENT_MODEL_ACCESS_KEY for the hosted model
npm run fetch:jlpt
npm run fetch:aozora
npm run retell -- --provider ollama --levels N4 --tales mujina
npm run build:tales
```

## Credits

Stories: Lafcadio Hearn (小泉八雲), Japanese translations by 戸川明三 and 田部隆次, from [Aozora Bunko](https://www.aozora.gr.jp/index_pages/person258.html). Vocabulary: [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT), based on Jonathan Waller's JLPT lists at tanos.co.uk. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
