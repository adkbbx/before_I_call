# Readability audit

Vocabulary is mean stored scene coverage; kanji ratios count narrative characters. Length counts Unicode characters including punctuation, splitting at 。！？. Missing ruby counts hard-kanji tokens in narrative and questions using the actual reader decision. Names are IPADIC person-name candidates, not an exact person count. JLPT lists are approximate.

## N5

| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mujina | 98.5% → 83.7% | 37.7% → 100.0% | 20.0% → 9.3% | 15.0 → 10.5 | 71.0 → 17.0 | 0 | 0 | はな |
| chawan | 95.4% → 75.2% | 29.5% → 100.0% | 23.3% → 8.3% | 14.3 → 10.7 | 73.0 → 17.0 | 0 | 0 | さん、平内、つき |
| yukionna | 97.1% → 91.4% | 31.2% → 100.0% | 25.2% → 11.8% | 12.9 → 12.5 | 21.0 → 30.0 | 0 | 0 | 巳之吉、ちや、さん、ふゆ |
| rokurokubi | 90.0% → 77.6% | 34.9% → 100.0% | 21.0% → 6.7% | 13.0 → 11.5 | 143.0 → 21.0 | 0 | 0 | さん、きの、たき |
| hoichi | 93.2% → 85.5% | 39.3% → 100.0% | 21.6% → 9.8% | 13.3 → 11.7 | 140.0 → 61.0 | 0 | 0 | 芳一、なつの、さん |

## N4

| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mujina | 97.7% → 77.6% | 60.7% → 100.0% | 22.6% → 13.2% | 17.5 → 17.7 | 36.0 → 22.0 | 0 | 0 | ゆう、ちん、あかり |
| chawan | 97.4% → 89.5% | 52.0% → 100.0% | 27.6% → 17.3% | 17.5 → 16.3 | 53.0 → 48.0 | 0 | 0 | さん |
| yukionna | 97.9% → 89.4% | 53.8% → 100.0% | 24.1% → 17.0% | 18.5 → 15.3 | 103.0 → 25.0 | 0 | 1 | 巳之吉、あかり |
| rokurokubi | 97.1% → 83.0% | 55.7% → 100.0% | 23.1% → 12.8% | 17.4 → 17.2 | 58.0 → 27.0 | 0 | 3 | ゆみ、さん、きの、たき、やを |
| hoichi | 98.0% → 88.6% | 58.3% → 100.0% | 25.3% → 16.2% | 18.2 → 15.7 | 224.0 → 25.0 | 0 | 0 | 芳一、さん |

## N3

| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| mujina | 97.0% → 88.8% | 74.1% → 100.0% | 27.8% → 20.8% | 15.7 → 27.4 | 28.0 → 37.0 | 0 | 0 | いとう、はな、ゆう、ちん |
| chawan | 98.9% → 94.4% | 78.4% → 100.0% | 26.9% → 22.3% | 20.3 → 28.4 | 30.0 → 43.0 | 0 | 0 | — |
| yukionna | 99.1% → 94.9% | 75.0% → 100.0% | 30.3% → 23.2% | 18.4 → 26.1 | 30.0 → 42.0 | 0 | 1 | しげ、巳之吉、渡、みの |
| rokurokubi | 97.8% → 90.6% | 80.5% → 100.0% | 27.4% → 19.9% | 17.9 → 27.8 | 32.0 → 38.0 | 0 | 0 | ゆみ、たけと、たき、さん、平太 |
| hoichi | 98.9% → 92.5% | 77.4% → 100.0% | 29.0% → 22.2% | 19.6 → 29.9 | 137.0 → 66.0 | 0 | 1 | なみ、芳一、きぬ、うの、ひので |

## Literary / keigo sentences

- yukionna/s08/N4: ず — 木こりはなにも言わず死にました。
- rokurokubi/s01/N4: ぬ — しかし、ある家のぬしがなくなりました。
- rokurokubi/s01/N4: ぬ — 前のぬしのことを大切に思っていました。
- rokurokubi/s12/N4: わず、ず — 囘龍は何も言わず、わらいました。
- yukionna/s06/N3: かず、ず — 母にすすめられたので、お雪はえどへ行かずに、よめになりました。
- hoichi/s16/N3: かず、ず — 芳一は怖かったので、石のように動かずにいました。

## Scene ladder

Each cell is N5 / N4 / N3. Vocabulary share counts N4+N3 entries among non-story content tokens, looking up their base form in the same JLPT vocabulary index.

| Scene | Density | Mean sentence length | N4+N3 vocabulary share | ladderOk |
|---|---|---|---|---|
| mujina/s01 | 8.91% / 16.98% / 18.22% | 11.22 / 17.67 / 26.75 | 11.11% / 23.53% / 38.46% | yes |
| mujina/s02 | 8.98% / 9.93% / 25.85% | 10.24 / 20.13 / 26.22 | 8.47% / 25.37% / 37.14% | yes |
| mujina/s03 | 10.97% / 16.46% / 20.12% | 11.07 / 14.91 / 24.14 | 18.52% / 26.67% / 37.50% | yes |
| mujina/s04 | 8.64% / 12.57% / 17.71% | 10.13 / 17.36 / 35.00 | 15.63% / 19.51% / 26.19% | yes |
| chawan/s01 | 3.28% / 15.12% / 22.75% | 12.20 / 17.20 / 23.63 | 0.00% / 16.67% / 33.33% | yes |
| chawan/s02 | 8.67% / 18.03% / 21.24% | 10.71 / 15.53 / 25.90 | 0.00% / 36.54% / 43.33% | yes |
| chawan/s03 | 0.00% / 18.33% / 24.87% | 1.00 / 15.00 / 39.40 | 0.00% / 15.63% / 25.00% | yes |
| chawan/s04 | 8.33% / 16.49% / 21.43% | 12.00 / 20.89 / 28.00 | 7.69% / 13.51% / 35.29% | yes |
| chawan/s05 | 9.63% / 17.28% / 21.64% | 9.84 / 14.73 / 29.78 | 5.88% / 21.62% / 29.69% | yes |
| yukionna/s01 | 11.49% / 11.84% / 22.34% | 13.45 / 16.89 / 28.14 | 7.69% / 15.15% / 24.53% | yes |
| yukionna/s02 | 11.43% / 16.60% / 25.71% | 13.46 / 14.69 / 24.50 | 0.00% / 16.33% / 39.66% | yes |
| yukionna/s03 | 9.80% / 20.00% / 22.75% | 13.42 / 13.85 / 25.50 | 12.96% / 21.95% / 32.81% | yes |
| yukionna/s04 | 10.32% / 13.11% / 17.89% | 11.07 / 13.07 / 25.91 | 18.18% / 29.73% / 34.38% | yes |
| yukionna/s05 | 10.67% / 19.34% / 29.30% | 11.87 / 16.31 / 26.88 | 8.57% / 20.75% / 35.85% | yes |
| yukionna/s06 | 14.78% / 20.76% / 24.66% | 13.86 / 16.86 / 30.75 | 9.80% / 12.00% / 24.05% | yes |
| yukionna/s07 | 15.22% / 15.38% / 21.05% | 12.55 / 16.55 / 25.33 | 3.45% / 13.89% / 23.08% | yes |
| yukionna/s08 | 14.79% / 21.74% / 23.60% | 10.92 / 14.38 / 25.43 | 8.00% / 16.67% / 40.54% | yes |
| yukionna/s09 | 7.78% / 13.83% / 21.83% | 11.13 / 15.67 / 21.89 | 18.52% / 22.22% / 44.68% | yes |
| rokurokubi/s01 | 4.39% / 11.74% / 22.67% | 12.67 / 19.17 / 28.13 | 17.39% / 17.65% / 43.10% | yes |
| rokurokubi/s02 | 7.98% / 10.63% / 21.53% | 10.87 / 16.93 / 26.13 | 14.71% / 21.67% / 36.54% | yes |
| rokurokubi/s03 | 8.38% / 14.37% / 20.95% | 9.94 / 15.82 / 28.11 | 9.68% / 20.51% / 22.73% | yes |
| rokurokubi/s04 | 9.20% / 15.89% / 24.58% | 12.43 / 15.29 / 29.70 | 3.13% / 14.00% / 29.11% | yes |
| rokurokubi/s05 | 8.29% / 13.21% / 19.19% | 12.07 / 17.67 / 28.29 | 15.15% / 25.53% / 37.78% | yes |
| rokurokubi/s06 | 9.38% / 15.44% / 20.89% | 11.64 / 13.60 / 28.73 | 20.00% / 24.24% / 47.13% | yes |
| rokurokubi/s07 | 9.33% / 15.87% / 19.77% | 11.35 / 18.90 / 29.22 | 12.82% / 17.95% / 28.36% | yes |
| rokurokubi/s08 | 5.84% / 12.67% / 16.48% | 9.79 / 15.00 / 26.00 | 36.36% / 38.71% / 42.55% | yes |
| rokurokubi/s09 | 7.73% / 13.35% / 21.71% | 12.94 / 21.47 / 28.67 | 18.60% / 21.95% / 30.26% | yes |
| rokurokubi/s10 | 5.61% / 13.90% / 20.66% | 11.26 / 18.70 / 23.67 | 18.60% / 26.53% / 37.10% | yes |
| rokurokubi/s11 | 5.71% / 9.50% / 15.86% | 11.67 / 18.62 / 25.22 | 13.79% / 16.33% / 44.44% | yes |
| rokurokubi/s12 | 3.86% / 14.72% / 19.39% | 11.77 / 17.67 / 26.73 | 19.57% / 28.13% / 45.57% | yes |
| rokurokubi/s13 | 4.66% / 7.33% / 18.77% | 12.06 / 15.47 / 24.42 | 22.22% / 24.07% / 51.47% | yes |
| rokurokubi/s14 | 3.19% / 10.34% / 19.01% | 11.75 / 20.08 / 32.88 | 14.29% / 16.92% / 44.12% | yes |
| rokurokubi/s15 | 6.00% / 12.44% / 17.41% | 11.54 / 14.93 / 32.00 | 10.00% / 29.55% / 44.00% | yes |
| rokurokubi/s16 | 7.50% / 17.37% / 17.78% | 11.43 / 16.38 / 32.14 | 13.95% / 21.15% / 43.08% | yes |
| rokurokubi/s17 | 5.83% / 11.54% / 18.73% | 11.15 / 16.71 / 25.10 | 19.05% / 27.45% / 38.60% | yes |
| hoichi/s01 | 9.62% / 16.95% / 19.35% | 11.56 / 16.09 / 35.43 | 27.27% / 37.50% / 31.82% | advancedShare |
| hoichi/s02 | 7.91% / 8.47% / 15.57% | 12.64 / 17.18 / 35.33 | 14.71% / 20.00% / 27.12% | yes |
| hoichi/s03 | 16.08% / 18.00% / 27.50% | 11.06 / 16.67 / 26.67 | 7.14% / 14.58% / 41.38% | yes |
| hoichi/s04 | 10.53% / 17.65% / 19.81% | 11.69 / 13.36 / 35.33 | 16.00% / 20.51% / 21.05% | yes |
| hoichi/s05 | 10.60% / 14.80% / 19.44% | 15.10 / 17.86 / 36.00 | 26.09% / 23.08% / 33.33% | advancedShare |
| hoichi/s06 | 9.74% / 16.67% / 20.83% | 12.19 / 17.57 / 34.67 | 19.51% / 16.67% / 23.86% | advancedShare |
| hoichi/s07 | 14.04% / 17.71% / 24.87% | 11.40 / 14.58 / 27.00 | 16.67% / 30.77% / 37.21% | yes |
| hoichi/s08 | 10.00% / 14.84% / 23.15% | 10.63 / 18.20 / 33.83 | 24.24% / 36.59% / 37.04% | yes |
| hoichi/s09 | 8.66% / 15.43% / 22.58% | 12.70 / 16.20 / 46.50 | 22.58% / 36.84% / 40.00% | yes |
| hoichi/s10 | 8.47% / 18.83% / 25.09% | 15.75 / 17.11 / 27.90 | 6.67% / 19.05% / 29.41% | yes |
| hoichi/s11 | 17.74% / 20.11% / 21.93% | 11.27 / 15.75 / 26.71 | 24.00% / 31.11% / 39.53% | yes |
| hoichi/s12 | 11.97% / 17.92% / 24.61% | 11.14 / 14.68 / 32.00 | 6.52% / 17.91% / 26.87% | yes |
| hoichi/s13 | 10.28% / 14.41% / 25.87% | 11.50 / 14.75 / 25.13 | 12.50% / 28.89% / 33.33% | yes |
| hoichi/s14 | 9.09% / 17.39% / 22.38% | 10.15 / 13.14 / 26.25 | 12.00% / 21.05% / 30.77% | yes |
| hoichi/s15 | 7.88% / 15.52% / 21.29% | 12.69 / 17.40 / 25.25 | 17.65% / 35.14% / 35.29% | yes |
| hoichi/s16 | 8.55% / 16.85% / 23.21% | 10.17 / 12.71 / 28.00 | 2.44% / 28.57% / 36.62% | yes |
| hoichi/s17 | 4.73% / 11.40% / 18.62% | 10.19 / 16.00 / 26.36 | 20.75% / 31.25% / 35.62% | yes |
| hoichi/s18 | 7.03% / 18.72% / 22.76% | 12.80 / 15.58 / 27.33 | 14.29% / 26.19% / 31.15% | yes |

Ladder pass rate: 50/53 (94.34%).

## Level means and cumulative kanji compliance

Story-word kanji are the explicit list exception, always with furigana. Distinct non-story kanji below must all belong to the cumulative list. Density includes story words and punctuation; coverage excludes story words.

| Level | Density | Sentence length | Vocabulary coverage | N4+N3 share | Distinct non-story kanji | All distinct kanji | Illegal tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| N5 | 8.86% | 11.53 | 82.86% | 13.68% | 47 | 80 | 0 |

<!-- N5 verified non-story set: 一三上中二五人今何入六出前十友名外大女学小山川年後日時書月木本来校母水父男白聞行見話読金雨食高; story exceptions: 一之伊侍内化吉吹和囘国坂変家尚屋巳平式木濠琵琶碗紀芳茶蕎貉部關雪首麦龍 -->
| N4 | 15.20% | 16.39 | 86.16% | 23.32% | 149 | 179 | 0 |

<!-- N4 verified non-story set: 一上下中主事二京人今仕代以休会住体何作使元先入冬出切別前力動医友口古右同名国地売夏夕外多夜大女始字安家小少屋山川左帰年広店度建強待後心思急悪手持文新方旅日早明昼時書月有服朝木本来東楽歌止歩死母毎気水海火物生用男町病白目着知私空立答紙習考者聞花茶行見親言話読赤走起足近通道金長開間集雨青音風食飲高魚鳥; story exceptions: 一之伊侍内化吉吹和囘国坂変家尚屋巳平式数木濠琵琶碗紀芳茶蕎貉部關雪首麦龍 -->
| N3 | 21.46% | 28.75 | 92.22% | 35.15% | 361 | 384 | 0 |

<!-- N3 verified non-story set: 一上下不与世両中主乗争事二互亡京人今仕他付代以任休会伝住体何作使供倒側偶働優元兄先光入全内冬冷出切初別前力助動務勝危去友反取受口古右合同名向告呼命商問喜回困国土地報場増声売変夏夕外多夜夢大太失女好妻始娘子字学守安客家容宿寄寒寝対小少居屋山川左帰平年幸広店度座庭引弟強当形役彼待後心必怒怖思急性恐息悪悲意感慣戦戻所手才打招持指捕探支敗教文新方旅族日早明易昔映昼時晩景暗暮書最月有服望朝木本束来東校格楽様横次欲歌止正歩歯歳死残殺母毎気水決法注泳洗活流海消深済渡満火然煙熱物犯理生用由男町番疲病痛登白皆目眠着知石礼祖神福私空突窓立笑答約終経続緒罪置美習老考耳聞背能自船良色若苦茶草落葉行要見覚親言話語読調識議負貧買質赤走起越足迎近返迷追送逃途通速連進遅運過道達違遠選部配酒重金長閉開間集難雨雪青静音頂頭頼題顔願風飛食飲首高髪鳥鳴; story exceptions: 一之伊侍内化吉吹和囘国坂変家尚屋巳平式木濠琵琶碗紀芳茶蕎貉部關雪首麦龍 -->

P4 baseline ladder: 0/53. Remaining failures: hoichi/s01, hoichi/s05, hoichi/s06.

N5 preservation: 1 scenes retain identical narrative and question tokens; 52 changed only after a recorded faithfulness, number-word, or ladder flag. Hashes are in data/ladder-before.json.

N5 mean scene kanji density: 8.86%. Sentence means in each tale must be at most 20 / 28 / 40 for N5 / N4 / N3.
