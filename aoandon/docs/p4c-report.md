# P4c report

Verification gate passed: 118 tests, typecheck, production build, five-tale assembly, report and audit. All 265 hosted retellings validate. Desktop/mobile seals, keyboard navigation, N1 reader and 30 browser ruby cases pass. Evidence: [p4c-verification.json](p4c-verification.json).

## Files changed

See [complete manifest](p4c-files.md). Pipeline, shared schema, Room/Shelf controls, six test files, 106 new N2/N1 runs, 24 flagged older runs, public tales, reports and screenshots. Of 159 N5–N3 runs, 135 remain byte-identical to P4b; changed runs are N5: 1, N4: 10, N3: 13. DESIGN.md is unchanged.

## Five-level ladder

| Level | Density | Mean sentence | Vocabulary coverage | Harder vocabulary share | Distinct non-story / all kanji |
|---|---:|---:|---:|---:|---:|
| N5 | 9.05% | 11.71 | 84.32% | 17.02% | 47 / 80 |
| N4 | 14.96% | 17.16 | 84.99% | 28.47% | 150 / 180 |
| N3 | 21.71% | 28.62 | 91.36% | 38.63% | 369 / 392 |
| N2 | 25.75% | 35.06 | 86.23% | 45.54% | 551 / 570 |
| N1 | 31.33% | 39.15 | 87.35% | 52.24% | 903 / 920 |

Illegal non-story kanji tokens: **0 at every level**. Every distinct non-story kanji belongs to its cumulative list. Story-word exceptions retain furigana. Harder vocabulary share counts N4 through N1 entries among non-story content tokens.

## ladderOk

48/53 scenes (**90.57%**). Remaining failures: yukionna/s09 (advancedShare); rokurokubi/s02 (meanLength); hoichi/s01 (advancedShare); hoichi/s05 (meanLength, advancedShare); hoichi/s09 (meanLength).

## Faithfulness issues by kind

| Kind | Before targeted rewrite | Remaining |
|---|---:|---:|
| number | 58 | 31 |
| who | 21 | 11 |
| event | 82 | 18 |
| death | 5 | 1 |
| invented | 26 | 19 |
| unnatural | 42 | 22 |

234 flags before targeted rewriting, 102 remaining. These are model/manual flags, including false positives: the judge sometimes objects to Arabic digits even though the brief permits them. See [all findings](faithfulness.md). Raw hosted requests and responses, candidate selections and rewrite evidence remain in data/runs/hosted/.

## One scene read at N2 and N1

mujina s01: N2 has 28.25% kanji and 31.86 characters/sentence; N1 has 34.66% and 35.86. Both preserve the detour and the merchant's death about thirty years earlier. N2 uses connected plain narration; N1 is denser and more literary, with 宏大, 極めて and ～のである. Verdict: difficulty clearly increases, and the central events remain faithful. Full text is in [samples.md](samples.md), alongside hoichi s05 at all five levels.

## Known issues

- Five scenes still fail the strict ladder, listed above.
- 102 faithfulness flags remain; this is not a claim of perfect translation.
- Vocabulary retry targets remain unmet: N2 86.23% vs 97%, N1 87.35% vs 98%. The pipeline uses the requested cumulative lists and bounded retries; coverage is a dictionary/tokenizer measurement. Sentence-length outliers remain visible in readability.md.
- The pinned list labels some common kanji, including 分 and 誰, level 0. Strict compliance therefore keeps such words in kana even at N1.
- Browser evidence is Chromium at emulated viewport sizes; no physical-device testing was performed.
