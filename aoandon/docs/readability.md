# Readability audit

Vocabulary is mean stored scene coverage; kanji ratios count narrative characters. Length counts Unicode characters including punctuation, splitting at 。！？. Missing ruby counts hard-kanji tokens in narrative and questions using the actual reader decision. Names are IPADIC person-name candidates, not an exact person count. JLPT lists are approximate.

## N5

| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mujina | 98.5% → 92.9% | 37.7% → 49.2% | 20.0% → 9.2% | 15.0 → 10.7 | 71.0 → 15.0 | 0 | 0 | はな |
| chawan | 95.4% → 97.6% | 29.5% → 11.8% | 23.3% → 4.3% | 14.3 → 11.2 | 73.0 → 17.0 | 0 | 0 | さん、平内、つき |
| yukionna | 97.1% → 95.5% | 31.2% → 38.1% | 25.2% → 7.8% | 12.9 → 13.3 | 21.0 → 30.0 | 0 | 0 | 巳之吉、みの、きち、さん、ゆき、ふゆ |
| rokurokubi | 90.0% → 85.8% | 34.9% → 56.7% | 21.0% → 5.0% | 13.0 → 11.5 | 143.0 → 24.0 | 0 | 0 | さん、きの、つき、たき |
| hoichi | 93.2% → 91.0% | 39.3% → 51.1% | 21.6% → 8.3% | 13.3 → 11.7 | 140.0 → 21.0 | 0 | 0 | さん、芳一、なつの |

## N4

| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mujina | 97.7% → 96.4% | 60.7% → 73.0% | 22.6% → 4.6% | 17.5 → 13.6 | 36.0 → 21.0 | 0 | 0 | さん、はな、あかり |
| chawan | 97.4% → 91.1% | 52.0% → 35.0% | 27.6% → 10.5% | 17.5 → 16.1 | 53.0 → 98.0 | 0 | 0 | 平内 |
| yukionna | 97.9% → 94.6% | 53.8% → 65.1% | 24.1% → 9.4% | 18.5 → 14.2 | 103.0 → 28.0 | 0 | 0 | 巳之吉、風の音、きち、さん、みの、きの、ひので、あかり、お雪 |
| rokurokubi | 97.1% → 90.7% | 55.7% → 85.9% | 23.1% → 5.2% | 17.4 → 15.1 | 58.0 → 86.0 | 0 | 0 | さん、きの、たき、さま、あかり、なみ、つよ |
| hoichi | 98.0% → 95.1% | 58.3% → 63.4% | 25.3% → 4.5% | 18.2 → 16.0 | 224.0 → 56.0 | 0 | 0 | さま、芳一、さん |

## N3

| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mujina | 97.0% → 92.8% | 74.1% → 90.3% | 27.8% → 6.7% | 15.7 → 17.3 | 28.0 → 26.0 | 0 | 0 | はな、あかり |
| chawan | 98.9% → 93.0% | 78.4% → 85.5% | 26.9% → 5.0% | 20.3 → 20.1 | 30.0 → 30.0 | 0 | 0 | まもる、さん |
| yukionna | 99.1% → 96.7% | 75.0% → 98.1% | 30.3% → 7.3% | 18.4 → 17.9 | 30.0 → 32.0 | 0 | 0 | 巳之吉、みの、ふゆの |
| rokurokubi | 97.8% → 95.0% | 80.5% → 91.3% | 27.4% → 4.5% | 17.9 → 18.0 | 32.0 → 32.0 | 0 | 0 | さん、つき、たき、はな、あかり、なみ、ゆみ、やを |
| hoichi | 98.9% → 95.7% | 77.4% → 85.5% | 29.0% → 3.0% | 19.6 → 16.5 | 137.0 → 29.0 | 0 | 1 | さま、芳一、いちの、はきの、みや、あかり、ちか、さん |

## Literary / keigo sentences

- hoichi/s09/N3: ず — とのさまは、だれにもしらず旅をしていたからだ。

N5 mean scene kanji density: 7.21%. Sentence means in each tale must be at most 20 / 28 / 40 for N5 / N4 / N3.
