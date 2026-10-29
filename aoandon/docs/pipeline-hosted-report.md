# P2b pipeline and hosted generation report

The P2b verification gate passed. Schema and artifact checks pass. Vocabulary scores are recorded below; the content review found fidelity problems that still need author review.

## Files changed

- `pipeline/aozora.mjs`
- `pipeline/check.mjs`
- `pipeline/retell.mjs`
- `pipeline/story-words.json`
- `pipeline/verify-hosted.mjs`
- `data/failed/hosted/N3/chawan-s03.json`
- `data/failed/hosted/N3/rokurokubi-s14.json`
- `data/failed/hosted/N3/rokurokubi-s16.json`
- `data/failed/hosted/N5/rokurokubi-s03.json`
- `tests/pipeline-core.test.mjs`
- `tests/pipeline-hosted.test.mjs`
- `data/source/mujina.json`
- `data/runs/hosted/N5/mujina-s01.json`
- `data/runs/hosted/N5/mujina-s02.json`
- `data/runs/hosted/N5/mujina-s03.json`
- `data/runs/hosted/N5/mujina-s04.json`
- `data/runs/hosted/N5/chawan-s01.json`
- `data/runs/hosted/N5/chawan-s02.json`
- `data/runs/hosted/N5/chawan-s03.json`
- `data/runs/hosted/N5/chawan-s04.json`
- `data/runs/hosted/N5/chawan-s05.json`
- `data/runs/hosted/N5/yukionna-s01.json`
- `data/runs/hosted/N5/yukionna-s02.json`
- `data/runs/hosted/N5/yukionna-s03.json`
- `data/runs/hosted/N5/yukionna-s04.json`
- `data/runs/hosted/N5/yukionna-s05.json`
- `data/runs/hosted/N5/yukionna-s06.json`
- `data/runs/hosted/N5/yukionna-s07.json`
- `data/runs/hosted/N5/yukionna-s08.json`
- `data/runs/hosted/N5/yukionna-s09.json`
- `data/runs/hosted/N5/rokurokubi-s01.json`
- `data/runs/hosted/N5/rokurokubi-s02.json`
- `data/runs/hosted/N5/rokurokubi-s03.json`
- `data/runs/hosted/N5/rokurokubi-s04.json`
- `data/runs/hosted/N5/rokurokubi-s05.json`
- `data/runs/hosted/N5/rokurokubi-s06.json`
- `data/runs/hosted/N5/rokurokubi-s07.json`
- `data/runs/hosted/N5/rokurokubi-s08.json`
- `data/runs/hosted/N5/rokurokubi-s09.json`
- `data/runs/hosted/N5/rokurokubi-s10.json`
- `data/runs/hosted/N5/rokurokubi-s11.json`
- `data/runs/hosted/N5/rokurokubi-s12.json`
- `data/runs/hosted/N5/rokurokubi-s13.json`
- `data/runs/hosted/N5/rokurokubi-s14.json`
- `data/runs/hosted/N5/rokurokubi-s15.json`
- `data/runs/hosted/N5/rokurokubi-s16.json`
- `data/runs/hosted/N5/rokurokubi-s17.json`
- `data/runs/hosted/N5/hoichi-s01.json`
- `data/runs/hosted/N5/hoichi-s02.json`
- `data/runs/hosted/N5/hoichi-s03.json`
- `data/runs/hosted/N5/hoichi-s04.json`
- `data/runs/hosted/N5/hoichi-s05.json`
- `data/runs/hosted/N5/hoichi-s06.json`
- `data/runs/hosted/N5/hoichi-s07.json`
- `data/runs/hosted/N5/hoichi-s08.json`
- `data/runs/hosted/N5/hoichi-s09.json`
- `data/runs/hosted/N5/hoichi-s10.json`
- `data/runs/hosted/N5/hoichi-s11.json`
- `data/runs/hosted/N5/hoichi-s12.json`
- `data/runs/hosted/N5/hoichi-s13.json`
- `data/runs/hosted/N5/hoichi-s14.json`
- `data/runs/hosted/N5/hoichi-s15.json`
- `data/runs/hosted/N5/hoichi-s16.json`
- `data/runs/hosted/N5/hoichi-s17.json`
- `data/runs/hosted/N5/hoichi-s18.json`
- `data/runs/hosted/N4/mujina-s01.json`
- `data/runs/hosted/N4/mujina-s02.json`
- `data/runs/hosted/N4/mujina-s03.json`
- `data/runs/hosted/N4/mujina-s04.json`
- `data/runs/hosted/N4/chawan-s01.json`
- `data/runs/hosted/N4/chawan-s02.json`
- `data/runs/hosted/N4/chawan-s03.json`
- `data/runs/hosted/N4/chawan-s04.json`
- `data/runs/hosted/N4/chawan-s05.json`
- `data/runs/hosted/N4/yukionna-s01.json`
- `data/runs/hosted/N4/yukionna-s02.json`
- `data/runs/hosted/N4/yukionna-s03.json`
- `data/runs/hosted/N4/yukionna-s04.json`
- `data/runs/hosted/N4/yukionna-s05.json`
- `data/runs/hosted/N4/yukionna-s06.json`
- `data/runs/hosted/N4/yukionna-s07.json`
- `data/runs/hosted/N4/yukionna-s08.json`
- `data/runs/hosted/N4/yukionna-s09.json`
- `data/runs/hosted/N4/rokurokubi-s01.json`
- `data/runs/hosted/N4/rokurokubi-s02.json`
- `data/runs/hosted/N4/rokurokubi-s03.json`
- `data/runs/hosted/N4/rokurokubi-s04.json`
- `data/runs/hosted/N4/rokurokubi-s05.json`
- `data/runs/hosted/N4/rokurokubi-s06.json`
- `data/runs/hosted/N4/rokurokubi-s07.json`
- `data/runs/hosted/N4/rokurokubi-s08.json`
- `data/runs/hosted/N4/rokurokubi-s09.json`
- `data/runs/hosted/N4/rokurokubi-s10.json`
- `data/runs/hosted/N4/rokurokubi-s11.json`
- `data/runs/hosted/N4/rokurokubi-s12.json`
- `data/runs/hosted/N4/rokurokubi-s13.json`
- `data/runs/hosted/N4/rokurokubi-s14.json`
- `data/runs/hosted/N4/rokurokubi-s15.json`
- `data/runs/hosted/N4/rokurokubi-s16.json`
- `data/runs/hosted/N4/rokurokubi-s17.json`
- `data/runs/hosted/N4/hoichi-s01.json`
- `data/runs/hosted/N4/hoichi-s02.json`
- `data/runs/hosted/N4/hoichi-s03.json`
- `data/runs/hosted/N4/hoichi-s04.json`
- `data/runs/hosted/N4/hoichi-s05.json`
- `data/runs/hosted/N4/hoichi-s06.json`
- `data/runs/hosted/N4/hoichi-s07.json`
- `data/runs/hosted/N4/hoichi-s08.json`
- `data/runs/hosted/N4/hoichi-s09.json`
- `data/runs/hosted/N4/hoichi-s10.json`
- `data/runs/hosted/N4/hoichi-s11.json`
- `data/runs/hosted/N4/hoichi-s12.json`
- `data/runs/hosted/N4/hoichi-s13.json`
- `data/runs/hosted/N4/hoichi-s14.json`
- `data/runs/hosted/N4/hoichi-s15.json`
- `data/runs/hosted/N4/hoichi-s16.json`
- `data/runs/hosted/N4/hoichi-s17.json`
- `data/runs/hosted/N4/hoichi-s18.json`
- `data/runs/hosted/N3/mujina-s01.json`
- `data/runs/hosted/N3/mujina-s02.json`
- `data/runs/hosted/N3/mujina-s03.json`
- `data/runs/hosted/N3/mujina-s04.json`
- `data/runs/hosted/N3/chawan-s01.json`
- `data/runs/hosted/N3/chawan-s02.json`
- `data/runs/hosted/N3/chawan-s03.json`
- `data/runs/hosted/N3/chawan-s04.json`
- `data/runs/hosted/N3/chawan-s05.json`
- `data/runs/hosted/N3/yukionna-s01.json`
- `data/runs/hosted/N3/yukionna-s02.json`
- `data/runs/hosted/N3/yukionna-s03.json`
- `data/runs/hosted/N3/yukionna-s04.json`
- `data/runs/hosted/N3/yukionna-s05.json`
- `data/runs/hosted/N3/yukionna-s06.json`
- `data/runs/hosted/N3/yukionna-s07.json`
- `data/runs/hosted/N3/yukionna-s08.json`
- `data/runs/hosted/N3/yukionna-s09.json`
- `data/runs/hosted/N3/rokurokubi-s01.json`
- `data/runs/hosted/N3/rokurokubi-s02.json`
- `data/runs/hosted/N3/rokurokubi-s03.json`
- `data/runs/hosted/N3/rokurokubi-s04.json`
- `data/runs/hosted/N3/rokurokubi-s05.json`
- `data/runs/hosted/N3/rokurokubi-s06.json`
- `data/runs/hosted/N3/rokurokubi-s07.json`
- `data/runs/hosted/N3/rokurokubi-s08.json`
- `data/runs/hosted/N3/rokurokubi-s09.json`
- `data/runs/hosted/N3/rokurokubi-s10.json`
- `data/runs/hosted/N3/rokurokubi-s11.json`
- `data/runs/hosted/N3/rokurokubi-s12.json`
- `data/runs/hosted/N3/rokurokubi-s13.json`
- `data/runs/hosted/N3/rokurokubi-s14.json`
- `data/runs/hosted/N3/rokurokubi-s15.json`
- `data/runs/hosted/N3/rokurokubi-s16.json`
- `data/runs/hosted/N3/rokurokubi-s17.json`
- `data/runs/hosted/N3/hoichi-s01.json`
- `data/runs/hosted/N3/hoichi-s02.json`
- `data/runs/hosted/N3/hoichi-s03.json`
- `data/runs/hosted/N3/hoichi-s04.json`
- `data/runs/hosted/N3/hoichi-s05.json`
- `data/runs/hosted/N3/hoichi-s06.json`
- `data/runs/hosted/N3/hoichi-s07.json`
- `data/runs/hosted/N3/hoichi-s08.json`
- `data/runs/hosted/N3/hoichi-s09.json`
- `data/runs/hosted/N3/hoichi-s10.json`
- `data/runs/hosted/N3/hoichi-s11.json`
- `data/runs/hosted/N3/hoichi-s12.json`
- `data/runs/hosted/N3/hoichi-s13.json`
- `data/runs/hosted/N3/hoichi-s14.json`
- `data/runs/hosted/N3/hoichi-s15.json`
- `data/runs/hosted/N3/hoichi-s16.json`
- `data/runs/hosted/N3/hoichi-s17.json`
- `data/runs/hosted/N3/hoichi-s18.json`
- `public/tales/mujina.json`
- `public/tales/chawan.json`
- `public/tales/yukionna.json`
- `public/tales/rokurokubi.json`
- `public/tales/hoichi.json`
- `public/tales/index.json`
- `docs/metrics.md`
- `docs/pipeline-notes.md`
- `docs/pipeline-hosted-report.md`

## Verification

- `npm test`: 84 tests passed, zero failures.
- N4 generated for all 53 scenes. The one initial failure, rokurokubi/s16, succeeded on its single retry. Successful runs were skipped.
- N5 and N3 generated for all 53 scenes each. Each failed scene was retried once; the available initial failed attempts are preserved under data/failed/hosted.
- N5/N3 scenes retried once: N3/chawan-s03, N3/rokurokubi-s14, N3/rokurokubi-s16, N5/rokurokubi-s03. All recovered.
- Only mujina/s01/N4 used --force.
- `npm run build:tales`: five schema-valid tale files and a schema-valid index with N5, N4 and N3 coverage. All 159 published scene/level retellings match hosted evidence.
- `npm run report`: docs/metrics.md contains hosted N5/N4/N3 and historical Ollama N4 rows.
- `node pipeline/verify-hosted.mjs`: all artifact checks passed.
- `npm run live` and GET /api/health: 200, {"ok":true,"provider":"ollama","model":"gemma4:e2b-it-qat"}. The server was stopped. The Ollama /api/retell call was deliberately skipped because memory was tight.
- Commands used the ignored portable Node 22.22.1 runtime in data/tools because the installed runtime was inaccessible in the restricted shell.

## Hosted results

Coverage is the mean per-scene fraction. Retries are the total vocabulary-rewrite rounds in the successful runs. Failures are final failed scenes after the permitted retry.

### N5

| Tale | Scenes | Mean first → final coverage | Retries | Failures |
| --- | ---: | ---: | ---: | ---: |
| mujina | 4 | 76.4% → 98.5% | 5 | 0 |
| chawan | 5 | 70.7% → 95.4% | 8 | 0 |
| yukionna | 9 | 79.0% → 97.1% | 14 | 0 |
| rokurokubi | 17 | 65.2% → 90.0% | 33 | 0 |
| hoichi | 18 | 73.2% → 93.2% | 34 | 0 |

### N4

| Tale | Scenes | Mean first → final coverage | Retries | Failures |
| --- | ---: | ---: | ---: | ---: |
| mujina | 4 | 77.8% → 97.7% | 7 | 0 |
| chawan | 5 | 82.2% → 97.4% | 6 | 0 |
| yukionna | 9 | 86.6% → 97.9% | 11 | 0 |
| rokurokubi | 17 | 78.0% → 97.1% | 26 | 0 |
| hoichi | 18 | 80.6% → 98.0% | 26 | 0 |

### N3

| Tale | Scenes | Mean first → final coverage | Retries | Failures |
| --- | ---: | ---: | ---: | ---: |
| mujina | 4 | 86.5% → 97.0% | 7 | 0 |
| chawan | 5 | 94.6% → 98.9% | 4 | 0 |
| yukionna | 9 | 92.5% → 99.1% | 11 | 0 |
| rokurokubi | 17 | 86.3% → 97.8% | 25 | 0 |
| hoichi | 18 | 88.4% → 98.9% | 24 | 0 |

## Three randomly selected N4 scenes reviewed

The scene IDs were randomly selected before all three outputs were available. Original snippets are excerpts; the retellings below include the complete narrative output.

### chawan/s02/N4

Original snippet:

> 天和四年一月一日――即ち今から二百二十年前――中川佐渡守が年始の〓礼に出かけて、江戸本郷、白山の茶店に一行とともに立寄った。一同休んでいる間に、家来の一人――關内と云う若党が余りに渇きを覚えたので、自分で大きな茶碗に茶を汲んだ。飲もうとする時、不意にその透明な黄色の茶のうちに、自分のでない顔の映っているのを認めた。びっくりしてあたりを見〓したが誰もいない。茶…

Retelling:

> 220年前の話です。
> 
> 中川さんは江戸本郷のお茶のお店に行きました。
> 
> 一緒にいた關内はお茶がとても飲みたかったです。
> 
> 關内は大きな茶碗にお茶を入れました。
> 
> お茶の中に、知らない人の顔が見えました。
> 
> 若い侍の顔でした。
> 
> とてもきれいで、目は動いていました。
> 
> 關内はとても驚いて、お茶を捨てました。
> 
> 茶碗を見ましたが、普通の茶碗でした。
> 
> 別の茶碗にお茶を入れました。
> 
> また顔が見えました。
> 
> 新しいお茶を入れても、また顔が出ました。
> 
> 今度は顔が笑っていました。
> 
> 關内はもう驚きませんでした。
> 
> 關内はお茶と顔を全部飲みました。
> 
> 死んだ人の顔を飲んだような気持ちでした。

Verdict: The Japanese is mostly natural. The main sequence is kept: the face appears in three servings of tea, and Kannai drinks the tea and face. The retelling omits the New Year visit, the exact date, checking for another person, the moving lips and leaving afterward. “死んだ人の顔” is more specific than the source’s feeling of swallowing a ghost. This does not preserve every source detail.

### hoichi/s01/N4

Original snippet:

> 七百年以上も昔の事、下ノ関海峡の壇ノ浦で、平家すなわち平族と、源氏すなわち源族との間の、永い争いの最後の戦闘が戦われた。この壇ノ浦で平家は、その一族の婦人子供ならびにその幼帝――今日安徳天皇として記憶されている――と共に、まったく滅亡した。そうしてその海と浜辺とは七百年間その怨霊に祟られていた……他の個処で私はそこに居る平家蟹という不思議な蟹の事を読者諸君に…

Retelling:

> 700年以上前のことです。
> 
> 壇ノ浦という海で、大きな戦争がありました。
> 
> 平家は、女や子供と一緒に、みんな死にました。
> 
> この海と海岸には、死んだ人の霊がいました。
> 
> そこに変な蟹がいます。
> 
> 背中が人の顔の形をしています。
> 
> それは平家の強い人の心だと言います。
> 
> 夜になると、青い火がたくさん飛びます。
> 
> 風があるときは、海から大きな声が聞こえます。
> 
> それは戦争のときの声のようです。

Verdict: Readable Japanese, with the battle, deaths, face-shaped crabs, ghost lights and sea cries kept in order. It omits the Genji, the infant emperor, the duration of the haunting and some scenery. “平家の強い人の心” weakens the specific claim that the crabs are the warriors’ souls. No new plot event was found, but it is not a complete rendering.

### hoichi/s11/N4

Original snippet:

> 『芳一、私共はお前の身の上を大変心配していたのだ。目が見えないのに、一人で、あんなに遅く出かけては険難だ。何故、私共にことわらずに行ったのだ。そうすれば下男に供をさしたものに、それからまたどこへ行っていたのかな』
> 芳一は言い〓れるように返事をした――
> 『和尚様、御免下さいまし！　少々私用が御座いまして、他の時刻にその事を処置する事が出来ませんでしたので』
> 住…

Retelling:

> 和尚は芳一に言いました。
> 
> 「とても心配しましたよ。」
> 
> 「目が見えません。夜に一人で出るのは危ないです。」
> 
> 「どうして何も言いませんでしたか。」
> 
> 芳一は答えました。
> 
> 「すみません。大切な用事がありました。」
> 
> 和尚は驚きました。
> 
> 芳一が変だと思いました。
> 
> 「悪いものに、つかれたかもしれません。」
> 
> 和尚はとても心配しました。
> 
> そして、寺で働く人に言いました。
> 
> 「芳一が夜に外へ出たら、後ろから行ってください。」

Verdict: The exchange and instruction to follow Hoichi are understandable. However, “悪いものに、つかれたかもしれません。” turns the priest’s private suspicion into new spoken dialogue. “目が見えません。” has an awkwardly implicit subject. The offered escort, question about where Hoichi went, and his inability to attend the errand at another time are omitted. This fails the strict no-invented-content rule.

## Known issues

- Manual review covered three randomly selected N4 scenes. N5 and N3 outputs have not had editorial review. The three-scene review found omitted details and one invented line of dialogue. Mujina/s01/N4 also moves the original “died about thirty years ago” qualifier onto seeing the apparition. These outputs need editorial review; coverage is not a fidelity score.
- 32 of 159 retellings remain below their coverage targets after bounded retries. All residual ghost tokens have glosses. Below-target scenes: mujina/s03/N3, chawan/s03/N5, chawan/s04/N5, yukionna/s09/N5, rokurokubi/s05/N5, rokurokubi/s06/N5, rokurokubi/s08/N5, rokurokubi/s09/N5, rokurokubi/s10/N5, rokurokubi/s11/N5, rokurokubi/s12/N5, rokurokubi/s13/N5, rokurokubi/s14/N5, rokurokubi/s15/N5, rokurokubi/s16/N5, rokurokubi/s17/N5, rokurokubi/s13/N4, rokurokubi/s14/N4, rokurokubi/s16/N4, rokurokubi/s15/N3, rokurokubi/s16/N3, rokurokubi/s17/N3, hoichi/s01/N5, hoichi/s03/N5, hoichi/s06/N5, hoichi/s07/N5, hoichi/s08/N5, hoichi/s10/N5, hoichi/s11/N5, hoichi/s12/N5, hoichi/s16/N5, hoichi/s11/N4.
- 0 narrative sentences exceed the prompt’s character cap. The pipeline does not automatically enforce sentence length or kanji readability.
- Kana-only Japanese remains ambiguous for kuromoji; the new prompt reduces it, but some ghost tokens are segmentation or grammar artifacts rather than difficult vocabulary.
- Source gaiji without a supported mapping remain 〓 with warnings. Oversized source paragraphs remain intact, so some scenes exceed 500 characters.
- The source spelling 紀国坂 and requested spelling 紀伊国坂 are both retained. Their readings are editorial because the source supplies no ruby for the name. All author review flags remain false.
- The ambiguous story word 蕎麦 was replaced with 蕎麦屋. Completed Mujina N4 outputs were tokenised again without model calls; their final coverage and ghost lists were recalculated. Historical first-draft metrics, timings, retry counts and raw evidence remain intact.
- Aggregate timings describe the final saved attempts, including their internal calls and rewrites; earlier failed attempts are not added to those means. The archived data/failed files retain available N5/N3 failed-attempt evidence.
- The retained Ollama N4 comparison uses the earlier checker and prompt and includes one failed scene. It is not a controlled same-settings comparison. No new Ollama model call was made.
- The live retell call was skipped as explicitly requested. Only health was checked.
