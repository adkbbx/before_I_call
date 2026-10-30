# Faithfulness audit

Hosted gemma-4-31B-it compares each original scene and retelling. Before counts refer to the first review of the selected run before its targeted rewrite. Remaining counts combine the final hosted review and manual findings from data/faithfulness-manual.json. Raw calls live in each hosted run. Simplification may omit decorative detail. The model judge is fallible; its remaining findings include possible false positives. In particular, 紀伊国坂 is the accepted story-word spelling of 紀国坂.

Issues before targeted rewrite: 234. Remaining issues: 102.

| Kind | Before targeted rewrite | Remaining |
|---|---:|---:|
| number | 58 | 31 |
| who | 21 | 11 |
| event | 82 | 18 |
| death | 5 | 1 |
| invented | 26 | 19 |
| unnatural | 42 | 22 |

## number (31)

- yukionna/s01/N4: あるむらに2人の木こりがいました。 — 数字は漢数字で書く必要があります。「2人」を「二人」に修正してください。
- yukionna/s01/N4: 巳之吉は18さいのわかものでした。 — 数字は漢数字で書く必要があります。「18さい」を「十八歳」に修正してください。
- yukionna/s01/N3: 2人は毎日、むらから約2さとはなれたもりへ一緒に出かけた。 — 「2里」を「2さとはなれた」と表記しているが、数字は漢字で表記せず、また単位の読みを混ぜず「2里」とする必要がある。
- yukionna/s01/N2: 彼らは毎日、村から約2りはなれた森へ一緒に出かけた。 — Number words must not be spelled in kana; change 2り to 2里
- yukionna/s01/N1: 彼らは毎日、村から約2り離れた森へと、二人して一緒に出かけたのである。 — Number words must not be spelled in kana; '2り' should be '2里'.
- yukionna/s02/N2: 火をたく場所もない窓のない2畳の小屋で、二人は戸を閉めて入った。 — Number words must not be spelled in kana, but digits are also prohibited by the prompt's constraint 'Number words must not be spelled in kana' implying the use of Kanji for numbers (二畳).
- yukionna/s03/N1: しばらく彼を見続けていた女は、やがて微笑して、あなたをもう1人の人のようにしようと思ったとささやいた。 — The number '1' must be written as '一' or the original kanji, as kana or arabic numerals for numbers are not permitted.
- yukionna/s06/N1: 打ち明け話の後、2人は長い間何も言わず歩いたが、気があれば眼も口ほどに物を言う通りであった。 — Number words must not be spelled in kana; change 2人に 2人に is not possible as it is already 2, but the rule says 'Number words must not be spelled in kana'. Wait, '2' is a digit. The rule 'Number words must not be spelled in kana' typically means '二' is preferred over 'に' or '2' is preferred over 'ふたつ'. However, checking the input, '2人' is used. Actually, the original says '彼等は'. The rule says 'Number words must not be spelled in kana'. '2' is not kana. There are no errors in this sentence based on the provided rules.
- yukionna/s07/N3: 5年ほど経って母が死ぬとき、お雪のことをほめました。 — The original states the mother died about five years after Oyuki arrived/married; the retelling implies five years passed since the mother became ill or since a previous event. Correction: Clarify it was five years after marriage/arrival.
- yukionna/s08/N4: 巳之吉は18の少年のとき、ふしぎな事がありました。 — 18 should be written as 18 not 十八 (though here it is digits), but the original says 'when I was an 18-year-old boy', the retelling is acceptable. However, the number 18 is in digits; check rules: 'Number words must not be spelled in kana'. 18 is correct. Wait, the original is 十八. The retelling is 18. This is acceptable. No error here.
- yukionna/s08/N1: 明かりを受けてはりしごとをするお雪の姿に、巳之吉は18歳の時に出会った不思議な事を思い出した。 — 18歳は数字で表記すべき。正しくは「18歳」だが、ここでは指示通り「18」などの数字表記であるため問題ないが、原文の「十八」を「18」と書き換えている。しかし、指示に「Number words must not be spelled in kana」とあり、18歳は適切である。
- rokurokubi/s01/N4: 500年前に、つよい男がいました。 — Numbers must not be spelled in kana, but numeric digits are acceptable. However, the retelling uses digits correctly here; the error is the omission of his identity as a retainer (侍臣) of the Kikuchi family, but that is acceptable simplification. No error found in this sentence.
- rokurokubi/s01/N3: 500年ほど前、きゅうしゅうに強いさむらいの男がいました。 — Number words must not be spelled in kana; change 500 to 五百
- rokurokubi/s08/N5: 3かいちをうちました。 — Numbers must not be spelled in kana. Correct to: 3回地を打ちました。
- rokurokubi/s08/N4: 3かいちをうって、死ぬと思います。 — 「3かい」は数字のかな表記であり、「3回」とするべきです。
- rokurokubi/s08/N2: さらに首が戻りどうたいがないと知れば、首ははね回りながら3度地を打つという。 — 数字は漢字ではなく算用数字で表記されているため不適切。 「3度」を「三度」に修正すべき。
- rokurokubi/s08/N1: また、胴が移された事を知った首は、まりのように跳ねながら3度地を打ち、恐れてあえぎ、やがて死ぬという。 — 3度 should be written in kanji as 三度
- rokurokubi/s09/N1: すると木の幹の後ろから5つの首が飛び出し、談笑しているのが見えた。 — Numbers must not be spelled in kana or digits; use 5 → 五
- rokurokubi/s10/N1: 数ふん後、彼女はきょうがくした様子で戻り、旅の僧はもう家に居らず主人の体まで持っていかれたとしわがれ声で激しく叫んだ。 — 数ふん should be written in digits as 数分.
- rokurokubi/s12/N2: 1夜をろうで過ごした後、その土地の役人の前に引き出された。 — Number words must not be spelled in kana. Change 1夜 to 一夜.
- rokurokubi/s12/N1: 1夜をろうやで過ごした後、彼はその土地の役人の前に引き出されることとなった。 — 1夜 should be written in kanji as 一夜
- rokurokubi/s13/N4: 1人のろうじんは、この事にはんたいしました。 — Number words must not be spelled in kana; '1人' should be '一人'.
- rokurokubi/s13/N3: それから5つの首との戦いの話をして、また笑いました。 — Number words must not be spelled in kana; '5つ' should be '五つ' or kept as Arabic numerals, but the instruction specifically bans kana for numbers. However, looking at the context of 'Number words must not be spelled in kana', '5' is a digit. Checking the original: '五つの首'. The retelling uses '5つの'. Wait, '5' is not kana. The error is not here.
- rokurokubi/s16/N2: じぶんの服とうばった衣を渡し、さらに5両出すというじょうけんをていじした。 — 5両 should be written as 五両.
- rokurokubi/s16/N1: じぶんの衣と交換しさらに5両を出すという条件を提示したが、囘龍は首も衣も上げるがこれは人間の首ではないと答えた。 — 5両 should be 5両; use kanji for numbers.
- hoichi/s04/N4: 夜の12時をすぎました。 — Original '夜半も過ぎた' means the middle of the night had passed, not specifically 12 o'clock. Correction: 夜が深まりました。
- hoichi/s09/N3: あと6日間、毎晩とのさまの前でえんそうしてほしいとのことです。 — 数字はかな表記せず「6日間」とするべき（指示：Number words must not be spelled in kana）。ただし、この文では「6」と表記されているため正解。しかし、原文の「これから後六日の間」は「今夜を除いた後6日間」であり、合計7日間の演奏を意味するため、文脈上の期間の整合性を確認。原文は「後六日の間」であり、語り直しの「あと6日間」は正確。再確認した結果、この文にエラーはない。
- hoichi/s09/N2: だが、これから6日の間は毎晩、殿様の御前でえんそうしてほしいという主人の意向だそうだ。 — 数字は漢字ではなく算用数字で表記してはならないため、「6日」を「六日」に修正すべき。
- hoichi/s12/N1: 辺りは真っ暗で、いつも通り2つ3つのおにびがちらちらと見えるのみであった。 — Numbers must not be spelled in kana; change 2つ3つ to 二つ三つ
- hoichi/s16/N4: こえは3かい聞こえました。 — Numbers must not be spelled in kana; change '3かい' to '3回'.
- hoichi/s16/N2: 強い声で3回も名前を呼ばれたが、芳一は石のように動かず、息をこらえていた。 — The number 3 must be spelled as a digit (3), but the rule specifies number words must not be spelled in kana (not applicable here) and impliedly requires digits for numbers. However, the original says he was called three times, but the retelling captures this. Wait, the rule 'Number words must not be spelled in kana' means use digits. 3 is a digit. Let me re-read. Actually, looking at the original '三度', the retelling '3回' is correct. Let me check for other errors.

## who (11)

- chawan/s04/N2: 今朝じぶんにひどい害を加えたという客に対し、關内はたんとうを向けた。 — The guest claimed that Sekinai inflicted harm upon him, not the other way around. Correction: 客が「今朝自分に非道な害を加えたではないか」と訴えたのに対し、關内は短刀を向けた。
- yukionna/s03/N5: 女の人は、男の上にいました。 — The ghost was bending over Shigezo (茂作), not just 'a man'. Correction: 茂作さんの上に屈んでいました。
- yukionna/s03/N4: 女は、とてもきれいだと思いました。 — Minokichi saw that she was beautiful; the woman did not think she herself was beautiful. Correction: 巳之吉は、女がとてもきれいだと思いました。
- rokurokubi/s05/N2: 彼らはそうに向かってていねいにおじぎをし、非常にれいぎ正しいたいどであいさつをした。 — The retelling says 'they' (the poor people) bowed to the monk, but the original states that the monk (囘龍) bowed to them. Correction: 囘龍は彼らに向かってていねいにおじぎをした。
- rokurokubi/s07/N5: しゅじんは小いへやへいきました。 — The master led Kairyu to the room, not just went there himself. Correction: 主人は囘龍を小さな部屋へ案内しました。
- rokurokubi/s16/N3: とうぞくは彼を同じなかまだと思って、その首を売ってほしいと願った。 — The thief offered to buy the head, not asked Kairyu to sell it (buy/sell reversal). Correction: The thief offered to buy the head.
- rokurokubi/s17/N5: ふくとお金をください。 — The bandit gave the clothes and money to the monk in exchange for the head, not the other way around. Correction: 相手にふくとお金をあげました。
- rokurokubi/s17/N4: 服とお金をあげました。 — The thief offered clothes and money to the monk, not the other way around. Correct to: どろぼうは服とお金をあげると言いました。
- hoichi/s01/N4: 海で平家と別の人がたたかいました。 — 「別の人が」ではなく、源氏（源族）との戦闘であることを明記すべきです。
- hoichi/s14/N5: はやく話したかった。 — The priest lamented that Hoichi didn't tell him sooner, not that the priest wanted to talk. Correction: 芳一さんが早く話さなかったのは不幸でした。
- hoichi/s15/N4: 和尚さんは芳一さんの体に文字を書きました。 — The original states the priest (住職) and the keeper of the temple records (納所) wrote together; the retelling attributes it only to the priest. Correct to: 和尚さんと納所さんが芳一さんの体に文字を書きました。

## event (18)

- mujina/s02/N4: 女がかおを出すと、目や口がありませんでした。 — The original states there were no eyes, nose, or mouth (目も鼻も口もない). The nose (鼻) is missing from the retelling.
- chawan/s03/N5: 茶碗にみたかおでした。 — The ghost was seen *inside* the tea bowl (茶碗の中で見て), not *in* (on) the tea bowl. Correction: 茶碗の中で見た顔でした。
- yukionna/s03/N3: 女は笑って、もう一人の人のように、あなたをしようと思ったと言いました。 — The retelling changes the original meaning of 「今ひとりの人のように」 to imply 'like another person' (making him like someone else), whereas it actually refers to doing to Minokichi what was done to the other person (death). Correct to: もう一人の人にしたように、あなたをしようと思った
- yukionna/s05/N4: すぐに元気になったと思います。 — The original states he regained consciousness (正気に帰った) but then fell ill for a long time; the retelling incorrectly claims he became healthy (元気になった).
- yukionna/s07/N5: 5年後、母がしにました。 — The original states the mother died about 5 years after the marriage/arrival, not simply '5 years later' as a standalone event. It should be '5年ぐらいして、母が死にました' or similar.
- yukionna/s07/N4: 5年くらい後に、巳之吉のお母さんがなくなりました。 — The original says the mother died about five years after the marriage/entry into the house, not simply '5 years later'. Restore the context of the timeline relative to the start of the marriage.
- yukionna/s09/N5: だからいまはいいです。 — The original states she would have killed him now if not for the children, not that 'it is okay/fine now'. Correct to: 子供がいるから、今は殺しません。
- rokurokubi/s08/N5: あたまもありませんでした。 — The original states it didn't look like it had been cut off, not that the head was missing from the scene entirely. Correct to: 頭は斬られたようには見えませんでした。
- rokurokubi/s08/N4: あたまがないので、おどろきました。 — 原文では「頭は斬られたようには見えない」とあり、頭がないことに気づいたのではなく、斬られた形跡がないことに気づいた流れであるため、矛盾しています。
- rokurokubi/s11/N5: 囘龍はいえへかえりました。 — 囘龍 (Kairyu) is the monk's name/role; the original says the monk returned home with the head still attached to his sleeve, not that Kairyu as a separate entity returned. While Kairyu is the monk, the retelling implies the monk went home alone, omitting that the head was still attached to his sleeve (袖に首をつけたままで).
- rokurokubi/s16/N5: 「でもくびはないです」。 — The thief said he had never walked around with a head in his sleeve, not that he didn't have a head. Correction: 「でも、首をつけて歩いたことはない」
- rokurokubi/s16/N4: じぶんの服と5りょうでかいたいと言いました。 — The original says he offers his own clothes AND the clothes he just stole from Kairyu (おれのきものと、この衣と), not just his own. Restore the stolen clothes to the exchange.
- hoichi/s10/N4: でも2かいめのとき、ふざいがわかりました。 — The original states that the fact that Hoichi had left the temple was discovered, not that the servants found out. Correction: 2回目に芳一が寺をあけていたことがわかりました。
- hoichi/s14/N4: 夜にそこにいたのはまぼろしでした。 — The original states that the *environs* (the house he thought he was visiting) were an illusion, but he was physically present at the graveyard. The retelling implies his presence there was an illusion. Correction: The house he thought he was in was an illusion; he was actually at the graveyard.
- hoichi/s14/N3: 芳一が見たものは、死んだ人のまぼろしでした。 — The original states everything was an illusion *except* for the visit from the dead; the retelling says the dead people themselves were illusions. Correction: The visit was real, but the surroundings were an illusion.
- hoichi/s17/N5: 芳一のみみをもちました。 — The ghost grabbed the ears to tear them off, not just 'held' them; correct to reflect grabbing/seizing.
- hoichi/s17/N4: でもみみが2つあるだけだと言いました。 — The original specifies these are the only parts of the body remaining ("身体は何も残っていない"), not just that there are two ears. Correction: Only the ears remain.
- hoichi/s18/N5: みみに、もじがなかったです。 — The original states the priest left it to Nosho to write on the ears, not that there were no characters on the ears. Correction: 納所に耳に書くように任せていた。

## death (1)

- chawan/s04/N4: でも男は死にませんでした。 — The original describes the intruder as offering no resistance (手答がない) and passing through the wall like light through paper, meaning he was a ghost, not a living person who failed to die. Correct to: 男はそこにいませんでした / 男はすり抜けた。

## invented (19)

- mujina/s01/N3: 東京のあかさかへの道に、紀伊国坂というさかがあります。 — The original says 紀国坂, not 紀伊国坂.
- chawan/s01/N4: 書いた人が急に死んだと思います。 — The original text lists death as one of several possibilities (or the God of Death stopping the pen), not a definitive belief by the narrator. Correction: Change to 'perhaps the author died' or similar.
- chawan/s04/N5: 關内はなたをもちました。 — The original says he took a short sword (短刀) from his belt; 'なた' (machete/billhook) is the wrong tool. Correction: 短刀を持ちました。
- yukionna/s01/N4: つよい川の力は、こわいと思います。 — 原文にない書き手の主観的な感想が付け加えられています。削除し、急流では橋を防げないという事実に修正してください。
- rokurokubi/s06/N1: corticosteroids — This word does not exist in the original text and is an invented pharmaceutical term.
- rokurokubi/s09/N5: 木の後ろにろくろ首がいました。 — They are detached heads (首), not Rokurokubi (long-necked humans). Correction: 首がいました。
- rokurokubi/s09/N5: 5つのろくろ首がとんでいました。 — They are detached heads (首), not Rokurokubi. Correction: 5つの首がとんでいました。
- rokurokubi/s09/N5: ろくろ首はむしをたべていました。 — They are detached heads (首), not Rokurokubi. Correction: 首はむしをたべていました。
- rokurokubi/s09/N5: 1つのろくろ首がいいました。 — They are detached heads (首), not Rokurokubi. Correction: 1つの首がいいました。
- rokurokubi/s09/N4: 木の後ろから5つのろくろ首が見えました。 — The original describes detached heads (首), not Rokurokubi (long-necked humans). Change ろくろ首 to 首.
- rokurokubi/s09/N4: ろくろ首はとびながら、楽しく話していました。 — The original describes detached heads (首), not Rokurokubi. Change ろくろ首 to 首.
- rokurokubi/s09/N3: 木の後ろから5つのろくろ首が飛び、楽しく話していた。 — They are detached heads (首), not long-necked ghosts (ろくろ首). Correction: 5つの首が
- rokurokubi/s10/N4: わかい女のろくろ首が、家へとびました。 — The original describes a severed head (首) flying, not a Rokurokubi (long-necked woman). Correction: Change ろくろ首 to 首.
- rokurokubi/s10/N2: 若い女のろくろ首がこうもりのように軽く飛び、数ふん後に戻ってきたものの、彼女は枯れた声で叫んだ。 — 原文に「ろくろ首」という記述はないため、「若い女の首」に修正すべき。
- hoichi/s02/N5: この人たちは、わるかったです。 — The original describes them as malicious spirits (ghosts) causing havoc, not that they were 'bad people' in character. Correction: 幽霊になって、いたずらをしていました。
- hoichi/s02/N4: 和尚は、おてらを建てました。 — The original does not mention a priest (和尚) building the temple, only that the temple was established to comfort the dead; restore the purpose of the establishment.
- hoichi/s02/N2: 死者をなぐさめるため、和尚のいるあみだ寺というお寺が建てられた。 — 「和尚のいる」という記述は原文にないため、削除してください。
- hoichi/s05/N5: 「平家のはなしがきたいです」 — The original text refers to the 'war' (戦争の話) at Dan-no-ura, not specifically the 'Heike' (平家), which is an invented detail not present in the provided source.
- hoichi/s10/N2: 芳一はそこで琵琶をはじき、前と同じように大きなせいこうを収めたに違いない。 — The original states he achieved the same success (博した), not a conjecture (に違いない).

## unnatural (22)

- mujina/s04/N5: でも、いいえません。 — 「言えない」という不可能の意味を「いいえません（言いません）」という意志の否定にしてしまっているため、「言えません」に修正すべき。
- chawan/s03/N2: 相手はほほえんでいたが、その目はちょうせんしており、同時にぶじょくしていたに違いない。 — 「ぶじょく」は「侮辱（ぶじょく）」の誤記であり、日本語として不自然です。正しくは「ぶじょく」ではなく「ぶじょく」という言葉はないため、「ぶじょく」を「ぶじょく」と正しく表記するか「ぶじょく（侮辱）」としてください。
- yukionna/s03/N5: あなたを、わるくしません。 — わるくする is unnatural for sparing someone's life. The source means she will not kill or harm Minokichi; あなたをころしません expresses that directly.
- rokurokubi/s02/N5: ゆきがふってもいいです。 — 雪は「降る」ものであり、「ふり」が適切です（また、原文は耐えたという記述であり、許可の「いいです」は不自然です）。
- rokurokubi/s02/N1: ある夕方、山間を旅しているうちに、村から数り離れた場所で暗くなった。 — 「数り」は不自然な表記であり、「数里」と修正すべき。
- rokurokubi/s03/N4: れんしゅうをしたからだいじょうぶだと思いました。 — 修業（spiritual training）を「れんしゅう（practice/exercise）」と訳すのは意味が不適切です。修行したから大丈夫だと答えた内容に修正してください。
- rokurokubi/s06/N5: まえは高い人でした。 — 「高い人」は身体的な身長を指すため、身分が高いことを意味する「えらい人」または「身分が高い人」に修正すべきです。
- rokurokubi/s06/N3: 男は昔、みぶんが高かったので、大切で高い役を務めていました。 — 「高い役」は不自然です。地位や身分が高いことは「高い」で表現しますが、役職については「重要な」や「重い」を用いるべきです。
- rokurokubi/s06/N2: 男は昔、高いみぶんで重要な役についていたものの、酒と女にふけって心を乱した。 — 「高いみぶん」は不自然な表現であり、身分の高さは「えらい」または「高い身分」と表記すべき（または原文の「相当の身分」に従う）。
- rokurokubi/s07/N1: ふすまをそっと開け、行灯の明かりで5人の横たわる体を見たが、だれ一人として頭がなかった。 — 5人の頭がないのではなく、横たわる体にはいずれも頭がなかった（元の体の一部として頭が欠けていた）ため、「だれ一人として頭がなかった」は不自然。正確には「いずれも頭がなかった」とするべき。
- rokurokubi/s08/N4: ちがながれていないと思いました。 — 「ち」は誤字であり、「血」または「ち（血）」として、血が流れていないことに気づいたとするべきです。
- rokurokubi/s08/N3: ちが流れていないので、切られたようではありませんでした。 — 「ち」は「血」の誤字。血が流れていないと修正してください。
- rokurokubi/s09/N2: そこで5つの首が飛びながら楽しく話している変化を見た。 — number words must not be spelled in kana; use 5 instead of 五 (though here it is numeral, the instruction says 'Number words must not be spelled in kana'. Actually, the retelling used '5', which is correct. Checking for other errors: the original says '首が――五つとも――飛び...', the retelling says '5つの首'. This is acceptable. Wait, the instruction says 'Number words must not be spelled in kana'. '5' is not kana. Let's re-read. The original text had '五つ'. The retelling had '5'. This is acceptable. However, '変化' (henka/change) is used instead of '化け物' or similar; '変化' as a noun meaning 'supernatural being' is rare/unnatural in this context. But looking closer: the original doesn't use the word '変化', it just says he saw the heads. Using '変化' as 'supernatural phenomenon' is slightly unnatural.)
- hoichi/s03/N5: 芳一は琵琶がありました。 — Wrong particle. '琵琶がありました' means a biwa existed; should be '琵琶を持っていました' or '琵琶がありました (possession)' is unnatural here. Faithful correction: 芳一は琵琶を持っていました。
- hoichi/s05/N5: 「平家のはなしがきたいです」 — The verb is missing a syllable: はなしがきたい is unnatural here. The intended meaning is はなしがききたい, wanting to hear the story.
- hoichi/s06/N5: 高い人のいえだとおもいました。 — 「高い身分」を「高い人」と訳しているが、これは地位が高い（えらい）という意味であり、身長が高いという意味に誤解される可能性があるため「えらい人の家」とするべきである。
- hoichi/s06/N4: 芳一はいしだんをのぼって、くつをぬぎました。 — The text states he wore straw sandals (草履), not shoes (くつ).
- hoichi/s09/N4: とのさまはれいをしたいと思いまし。 — The word 'thought' is cut off; it should be 'と思いました。'
- hoichi/s09/N4: た — This is a fragmented syllable remaining from the previous sentence; it should be merged to form 'と思いました。'
- hoichi/s10/N3: 次の夜にさむらいがまた来て、高い人の集まりに連れて行きました。 — 高貴な人の集まりを「高い人（tall person）」と表現しているため、「えらい人」または「身分の高い人」に修正すべき
- hoichi/s14/N1: 今夜、げなんが見たのは安徳天皇の記念の墓の前に座る姿であった。 — 下男（しもべ）を「げなん」としているが、これは誤字である。正しくは「下男（げなん/しもべ）」ではなく「下男」として記述すべき。
- hoichi/s18/N1: しんたい中にきょうもんを書いたが、耳だけが残っていたことが原因であった。 — Correct 'しんたい' to '身体' and 'きょうもん' to '経文' as these are common nouns, not decorative details, and the original text uses kanji.
