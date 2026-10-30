# Third-party notices

Every entry must be checked against its source before publishing. P2 and P5 confirm each Aozora colophon and dataset licence and update this file.

## Texts

- **Lafcadio Hearn (小泉八雲)**, *Kwaidan* and related stories. The originals are in the public domain.
- **Japanese translations** by 戸川明三 (貉, 耳無芳一の話) and 田部隆次 (茶碗の中, 雪女, ろくろ首), as published by [Aozora Bunko](https://www.aozora.gr.jp/index_pages/person258.html). Each tale's colophon (底本 and input/proofreading credits) is kept in `data/source/<id>.json` and shown in the app.

## Data

- **JLPT vocabulary:** [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks), MIT. It derives from [chyyran/jlpt-anki-decks](https://github.com/chyyran/jlpt-anki-decks) and Jonathan Waller's JLPT resources at tanos.co.uk.

## Software

- **kuromoji.js**, Apache-2.0, with the bundled mecab-ipadic dictionary (its own licence ships in the package).
- **React**, **Vite**, **zod**, **iconv-lite**, **adm-zip**: MIT. **sharp**: Apache-2.0.

## Fonts

- **Shippori Mincho B1**, **Yuji Syuku** and **Zen Kaku Gothic New**: SIL Open Font License 1.1, via @fontsource.

## Models

- **Gemma 4** (Google), open weights, used under its licence, through Ollama locally and DigitalOcean serverless inference.
- Images were generated with OpenAI gpt-image-2 (see ASSETS.md).
- Sound effects generated with ElevenLabs (sound effects API, model eleven_text_to_sound_v2); see public/assets/sounds/manifest.json for the prompts.

## Kanji levels

Kanji JLPT levels: [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data), MIT License, Copyright (c) 2019 David Gouveia. Trimmed from kanji.json using jlpt_new; unlisted kanji count as level 0. The full MIT notice is preserved in `data/jlpt/kanji-LICENSE.txt`.
