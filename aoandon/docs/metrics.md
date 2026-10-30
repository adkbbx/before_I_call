# Retelling metrics

Date: 2026-10-30

Models: gemma-4-31B-it, gemma4:e2b-it-qat

Coverage counts known content tokens; story words are excluded. Failed scenes are excluded from coverage means. Seconds are recorded pipeline timings; early P4b checkpoints measured the initial retell loop without the separate faithfulness and repair phases.

## hosted / N1

| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | 0.795 | 0.873 | 1.000 | 0.313 | 9.358 | 144.670 | 10.075 | 0 |

## hosted / N2

| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | 0.810 | 0.862 | 1.000 | 0.258 | 9.604 | 124.205 | 9.509 | 0 |

## hosted / N3

| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | 0.863 | 0.914 | 1.000 | 0.217 | 6.830 | 65.122 | 4.943 | 0 |

## hosted / N4

| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | 0.813 | 0.850 | 1.000 | 0.150 | 7.585 | 64.032 | 6.906 | 0 |

## hosted / N5

| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 53 | 0.759 | 0.843 | 1.000 | 0.090 | 5.698 | 38.355 | 5.094 | 0 |

## ollama / N4

| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 0.783 | 0.873 | — | — | 2.000 | 43.422 | 10.000 | 1 |
