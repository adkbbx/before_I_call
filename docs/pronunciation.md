# Japanese pronunciation dictionary

The live agent, Japanese replay, and future demo generation share `server/pronunciation.py` and its generated counter aliases in `server/counter_pronunciation.py`. Original transcript and displayed Japanese remain intact. English replay does not substitute Japanese readings.

## Coverage

| Category | Coverage |
| --- | --- |
| Relative days | Today, yesterday, day before yesterday, tomorrow, day after tomorrow, three days from today; this morning, tonight, last night |
| Calendar | All 12 months, seven weekdays, dates 2–31; the first of the month in explicit month/date phrases |
| Relative periods | This/last/next week, month and year; the following week/month/year; daily/weekly/monthly/yearly |
| Clock | Hours 0–24, half hours, minutes 0–60, seconds 0–59; full kanji hour/minute combinations |
| Durations | Hours 0–24, minutes 0–60, days 1–31, weeks/months 1–24 |
| Counters | People, objects 個, sheets 枚, machines 台, order 番, occurrences 回, floors 階, books 冊, long objects 本: 1–99; general objects つ: 1–9 |
| Questions | What time/date/month/weekday; how many minutes/hours/weeks/months/people/objects/floors/etc. |
| Practical vocabulary | Repair, appointments, deliveries, paperwork, food restrictions, lost items, bills; previously reported pronunciation errors |

Generated entries cover ASCII digits, full-width digits, and ordinary kanji numerals where safe. These are spelling variants, not distinct vocabulary words. Valid alternatives exist; this dictionary selects one standard reading consistently, such as じゅっぷん and しちじ.

## Context and limits

- Bare `1日`, `１日`, and `一日` remain ambiguous. `4月1日` is しがつついたち; `1日間` is いちにちかん. `毎月1日` and one-day duration phrases have explicit aliases.
- Bare `一月` and `二月` can also mean a duration. Explicit dates and month-duration forms such as `1ヶ月` get separate readings.
- Bare kanji minutes are omitted because 分 also occurs in fractions and degree expressions. `十分な余裕` is preserved. Numeric fractions such as `3分の1` get さんぶんの rather than さんぷんの. Full clock phrases such as `七時十分` and durations such as `十分間` are explicit.
- Whole words and longer compounds take precedence. Single kanji such as 日, 月, 水, 人, 時 and 分 are not globally substituted.
- Replay rejects partial matches inside unsupported larger numbers. ElevenLabs alias rules provide a word-boundary flag but no regex context; this dictionary retains the default word-boundary matching. Its handling of Japanese word boundaries must be checked with the chosen voice. Values outside the supported ranges, arbitrary personal names, addresses, ambiguous words, ratios and slash/colon notation are not comprehensively covered. The live prompt should express complete numerical details in spoken kana and ask for clarification when needed.
- Kana aliases control the intended reading, not pitch accent or guaranteed audio quality. A new live call and listening check are required after updating the agent. Restart/redeploy the backend to apply replay changes.

## Research sources

Checked on 2026-10-03:

- [Japan Foundation Marugoto calendar](https://words.marugotoweb.jp/static_contents/sp/collection/calendar.php?lang=en): months, dates and relative periods.
- [Japan Foundation Marugoto numbers and counters](https://words.marugotoweb.jp/static_contents/sp/collection/number.php?lang=en) and [starter wordbook](https://www.marugoto-online.jp/a1/support/pdf/MarugotoStarterWordbook_jpn.pdf): counting patterns, irregular readings, clock and duration vocabulary.
- [Japan Foundation teaching material: clock time](https://www.kyozai.jpf.go.jp/kyozai/material/BTS00026/ja/render.do): clock hours, minute sound changes and half hours.
- [Japan Foundation Marugoto: floor counter](https://a2-2.marugotoweb.jp/en/kanji/vocab/2-kai/): floor vocabulary.
- [ElevenLabs pronunciation dictionaries](https://elevenlabs.io/docs/eleven-agents/customization/voice/pronunciation-dictionary): kana aliases and agent configuration.
- [ElevenLabs speech best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices): first-match ordering and text normalization.

The practical vocabulary reuses the app's curated Japanese lexicon. Single-kanji display readings were deliberately excluded from the speech dictionary.

## Rebuild and verify

```powershell
.venv/Scripts/python.exe scripts/export-pronunciation.py
.venv/Scripts/python.exe -m unittest discover -s tests -p test_pronunciation.py -v
.venv/Scripts/python.exe scripts/configure-pronunciation.py
```

The export produces `work/pronunciation/japanese-pronunciation.json` and an importable `japanese-pronunciation.pls`. The configuration script creates a content-versioned dictionary, replaces this app's previous attached dictionary, preserves other dictionaries, and rereads the agent to verify attachment. Retired provider dictionaries are retained for recovery.
