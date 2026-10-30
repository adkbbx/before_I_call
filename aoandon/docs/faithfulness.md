# Faithfulness audit

Hosted gemma-4-31B-it compares each original scene and retelling. Before counts refer to the first review of the selected run before its targeted rewrite. Remaining counts combine the final hosted review and manual findings from data/faithfulness-manual.json. Raw calls live in each hosted run. Simplification may omit decorative detail. The model judge is fallible; its remaining findings include possible false positives. In particular, 紀伊国坂 is the accepted story-word spelling of 紀国坂.

Issues before targeted rewrite: 169. Remaining issues: 79.

| Kind | Before targeted rewrite | Remaining |
|---|---:|---:|
| number | 29 | 14 |
| who | 13 | 8 |
| event | 70 | 19 |
| death | 5 | 1 |
| invented | 19 | 20 |
| unnatural | 33 | 17 |

## number (14)

- yukionna/s01/N4: あるむらに2人の木こりがいました。 — 数字は漢数字で書く必要があります。「2人」を「二人」に修正してください。
- yukionna/s01/N4: 巳之吉は18さいのわかものでした。 — 数字は漢数字で書く必要があります。「18さい」を「十八歳」に修正してください。
- yukionna/s01/N3: 2人は毎日、むらから約2さとはなれたもりへ一緒に出かけた。 — 「2里」を「2さとはなれた」と表記しているが、数字は漢字で表記せず、また単位の読みを混ぜず「2里」とする必要がある。
- yukionna/s07/N3: 5年ほど経って母が死ぬとき、お雪のことをほめました。 — The original states the mother died about five years after Oyuki arrived/married; the retelling implies five years passed since the mother became ill or since a previous event. Correction: Clarify it was five years after marriage/arrival.
- rokurokubi/s01/N4: 500年前に、つよい男がいました。 — Numbers must not be spelled in kana, but numeric digits are acceptable. However, the retelling uses digits correctly here; the error is the omission of his identity as a retainer (侍臣) of the Kikuchi family, but that is acceptable simplification. No error found in this sentence.
- rokurokubi/s01/N3: 500年ほど前、きゅうしゅうに強いさむらいの男がいました。 — Number words must not be spelled in kana; change 500 to 五百
- rokurokubi/s08/N5: 3かいちをうちました。 — Numbers must not be spelled in kana. Correct to: 3回地を打ちました。
- rokurokubi/s08/N4: 3かいちをうって、死ぬと思います。 — 「3かい」は数字のかな表記であり、「3回」とするべきです。
- rokurokubi/s13/N4: 5つのくびの話をしたとき、またわらいました。 — Number words must not be spelled in kana; use '五つ' instead of '5つ'.
- rokurokubi/s13/N3: それから5つの首との戦いの話をして、また笑いました。 — Number words must not be spelled in kana; '5つ' should be '五つ' or kept as Arabic numerals, but the instruction specifically bans kana for numbers. However, looking at the context of 'Number words must not be spelled in kana', '5' is a digit. Checking the original: '五つの首'. The retelling uses '5つの'. Wait, '5' is not kana. The error is not here.
- hoichi/s04/N4: 夜の12時をすぎました。 — Original '夜半も過ぎた' means the middle of the night had passed, not specifically 12 o'clock. Correction: 夜が深まりました。
- hoichi/s09/N3: あと6日の間、毎晩とのさまの前でひいてほしいので、 — Number words must not be spelled in kana. Change 6 to 6 or 六.
- hoichi/s16/N4: こえは3かい聞こえました。 — Numbers must not be spelled in kana; change '3かい' to '3回'.
- hoichi/s16/N3: 恐ろしい声で3回呼ばれましたが、返事をしませんでした。 — 3 should be written as 三

## who (8)

- yukionna/s03/N5: 女の人は、男の上にいました。 — The ghost was bending over Shigezo (茂作), not just 'a man'. Correction: 茂作さんの上に屈んでいました。
- rokurokubi/s07/N5: しゅじんは小いへやへいきました。 — The master led Kairyu to the room, not just went there himself. Correction: 主人は囘龍を小さな部屋へ案内しました。
- rokurokubi/s16/N3: とうぞくは彼を同じなかまだと思って、その首を売ってほしいと願った。 — The thief offered to buy the head, not asked Kairyu to sell it (buy/sell reversal). Correction: The thief offered to buy the head.
- rokurokubi/s17/N5: ふくとお金をください。 — The bandit gave the clothes and money to the monk in exchange for the head, not the other way around. Correction: 相手にふくとお金をあげました。
- rokurokubi/s17/N4: 服とお金をあげました。 — The thief offered clothes and money to the monk, not the other way around. Correct to: どろぼうは服とお金をあげると言いました。
- hoichi/s01/N4: 海で平家と別の人がたたかいました。 — 「別の人が」ではなく、源氏（源族）との戦闘であることを明記すべきです。
- hoichi/s14/N5: はやく話したかった。 — The priest lamented that Hoichi didn't tell him sooner, not that the priest wanted to talk. Correction: 芳一さんが早く話さなかったのは不幸でした。
- hoichi/s15/N4: 和尚さんは芳一さんの体に文字を書きました。 — The original states the priest (住職) and the keeper of the temple records (納所) wrote together; the retelling attributes it only to the priest. Correct to: 和尚さんと納所さんが芳一さんの体に文字を書きました。

## event (19)

- mujina/s02/N4: 女がかおを出すと、目や口がありませんでした。 — The original states there were no eyes, nose, or mouth (目も鼻も口もない). The nose (鼻) is missing from the retelling.
- yukionna/s03/N4: 女は木こりの上にいました。 — The woman was leaning over/stooping (屈んで) over Mosaku, not simply 'on' or 'above' him. Correction: 茂作の上に屈んでいました。
- yukionna/s03/N3: 女は笑って、もう一人の人のように、あなたをしようと思ったと言いました。 — The retelling changes the original meaning of 「今ひとりの人のように」 to imply 'like another person' (making him like someone else), whereas it actually refers to doing to Minokichi what was done to the other person (death). Correct to: もう一人の人にしたように、あなたをしようと思った
- yukionna/s05/N4: すぐに元気になったと思います。 — The original states he regained consciousness (正気に帰った) but then fell ill for a long time; the retelling incorrectly claims he became healthy (元気になった).
- yukionna/s07/N5: 5年後、母がしにました。 — The original states the mother died about 5 years after the marriage/arrival, not simply '5 years later' as a standalone event. It should be '5年ぐらいして、母が死にました' or similar.
- yukionna/s07/N4: 5年くらい後に、巳之吉のお母さんがなくなりました。 — The original says the mother died about five years after the marriage/entry into the house, not simply '5 years later'. Restore the context of the timeline relative to the start of the marriage.
- yukionna/s09/N5: だからいまはいいです。 — The original states she would have killed him now if not for the children, not that 'it is okay/fine now'. Correct to: 子供がいるから、今は殺しません。
- rokurokubi/s08/N5: あたまもありませんでした。 — The original states it didn't look like it had been cut off, not that the head was missing from the scene entirely. Correct to: 頭は斬られたようには見えませんでした。
- rokurokubi/s08/N4: あたまがないので、おどろきました。 — 原文では「頭は斬られたようには見えない」とあり、頭がないことに気づいたのではなく、斬られた形跡がないことに気づいた流れであるため、矛盾しています。
- rokurokubi/s11/N5: 囘龍はいえへかえりました。 — 囘龍 (Kairyu) is the monk's name/role; the original says the monk returned home with the head still attached to his sleeve, not that Kairyu as a separate entity returned. While Kairyu is the monk, the retelling implies the monk went home alone, omitting that the head was still attached to his sleeve (袖に首をつけたままで).
- rokurokubi/s11/N4: つよいそうは木のえだでたたかいました。 — The monk pulled out a young tree (若木) to use as a weapon, not a branch (枝).
- rokurokubi/s14/N4: この変化は山に住んでいると知っています。 — The original specifies the location as 'Kai Province mountains' (甲斐の国の山中). Change to 'Kai Province mountains' or 'the mountains of that region'.
- rokurokubi/s16/N5: 「でもくびはないです」。 — The thief said he had never walked around with a head in his sleeve, not that he didn't have a head. Correction: 「でも、首をつけて歩いたことはない」
- rokurokubi/s16/N4: じぶんの服と5りょうでかいたいと言いました。 — The original says he offers his own clothes AND the clothes he just stole from Kairyu (おれのきものと、この衣と), not just his own. Restore the stolen clothes to the exchange.
- hoichi/s14/N4: 夜にそこにいたのはまぼろしでした。 — The original states that the *environs* (the house he thought he was visiting) were an illusion, but he was physically present at the graveyard. The retelling implies his presence there was an illusion. Correction: The house he thought he was in was an illusion; he was actually at the graveyard.
- hoichi/s14/N3: 芳一が見たものは、死んだ人のまぼろしでした。 — The original states everything was an illusion *except* for the visit from the dead; the retelling says the dead people themselves were illusions. Correction: The visit was real, but the surroundings were an illusion.
- hoichi/s17/N5: 芳一のみみをもちました。 — The ghost grabbed the ears to tear them off, not just 'held' them; correct to reflect grabbing/seizing.
- hoichi/s17/N4: でもみみが2つあるだけだと言いました。 — The original specifies these are the only parts of the body remaining ("身体は何も残っていない"), not just that there are two ears. Correction: Only the ears remain.
- hoichi/s18/N5: みみに、もじがなかったです。 — The original states the priest left it to Nosho to write on the ears, not that there were no characters on the ears. Correction: 納所に耳に書くように任せていた。

## death (1)

- chawan/s04/N4: でも男は死にませんでした。 — The original describes the intruder as offering no resistance (手答がない) and passing through the wall like light through paper, meaning he was a ghost, not a living person who failed to die. Correct to: 男はそこにいませんでした / 男はすり抜けた。

## invented (20)

- mujina/s01/N3: 東京のあかさかへの道に、紀伊国坂というさかがあります。 — The original says 紀国坂, not 紀伊国坂.
- chawan/s01/N4: 書いた人が急に死んだと思います。 — The original text lists death as one of several possibilities (or the God of Death stopping the pen), not a definitive belief by the narrator. Correction: Change to 'perhaps the author died' or similar.
- chawan/s04/N5: 關内はなたをもちました。 — The original says he took a short sword (短刀) from his belt; 'なた' (machete/billhook) is the wrong tool. Correction: 短刀を持ちました。
- yukionna/s01/N4: つよい川の力は、こわいと思います。 — 原文にない書き手の主観的な感想が付け加えられています。削除し、急流では橋を防げないという事実に修正してください。
- yukionna/s08/N4: 外は吹雪のこわい夜でした。 — The original text does not mention a blizzard (吹雪); this is an invented detail.
- yukionna/s09/N3: 子供を大事にしないなら、ばちを与えます。 — The original says she will treat him accordingly if the children have reason to complain, not that she will give him 'divine punishment' (ばち). Correct to something like 'ひどいことをします'.
- rokurokubi/s09/N5: 木の後ろにろくろ首がいました。 — They are detached heads (首), not Rokurokubi (long-necked humans). Correction: 首がいました。
- rokurokubi/s09/N5: 5つのろくろ首がとんでいました。 — They are detached heads (首), not Rokurokubi. Correction: 5つの首がとんでいました。
- rokurokubi/s09/N5: ろくろ首はむしをたべていました。 — They are detached heads (首), not Rokurokubi. Correction: 首はむしをたべていました。
- rokurokubi/s09/N5: 1つのろくろ首がいいました。 — They are detached heads (首), not Rokurokubi. Correction: 1つの首がいいました。
- rokurokubi/s09/N4: 木の後ろから5つのろくろ首が見えました。 — The original describes detached heads (首), not Rokurokubi (long-necked humans). Change ろくろ首 to 首.
- rokurokubi/s09/N4: ろくろ首はとびながら、楽しく話していました。 — The original describes detached heads (首), not Rokurokubi. Change ろくろ首 to 首.
- rokurokubi/s09/N3: 木の後ろから5つのろくろ首が飛び、楽しく話していた。 — They are detached heads (首), not long-necked ghosts (ろくろ首). Correction: 5つの首が
- rokurokubi/s10/N4: わかい女のろくろ首が、家へとびました。 — The original describes a severed head (首) flying, not a Rokurokubi (long-necked woman). Correction: Change ろくろ首 to 首.
- rokurokubi/s15/N3: そのころは人間もあくまも怖くなかったので、強い人だったようです。 — The original states he did not fear humans or demons, but does not claim he was a 'strong person' (強い人). This is an invented inference.
- hoichi/s01/N3: この戦で平家は女や子供と一緒にすべてほろびて、亡くなったので悲しいです。 — The original mentions the young emperor (Antoku) specifically; while simplification is allowed, adding the subjective emotion '悲しいです' (it is sad) is an invented claim not present in the text.
- hoichi/s02/N5: この人たちは、わるかったです。 — The original describes them as malicious spirits (ghosts) causing havoc, not that they were 'bad people' in character. Correction: 幽霊になって、いたずらをしていました。
- hoichi/s02/N4: 和尚は、おてらを建てました。 — The original does not mention a priest (和尚) building the temple, only that the temple was established to comfort the dead; restore the purpose of the establishment.
- hoichi/s05/N5: 「平家のはなしがきたいです」 — The original text refers to the 'war' (戦争の話) at Dan-no-ura, not specifically the 'Heike' (平家), which is an invented detail not present in the provided source.
- hoichi/s10/N4: 前と同じように上手だったと思います。 — The original states he achieved the same success (success was a fact), not that the narrator thinks he was skilled. Correct to reflect the actual success.

## unnatural (17)

- mujina/s04/N5: でも、いいえません。 — 「言えない」という不可能の意味を「いいえません（言いません）」という意志の否定にしてしまっているため、「言えません」に修正すべき。
- yukionna/s03/N5: あなたを、わるくしません。 — わるくする is unnatural for sparing someone's life. The source means she will not kill or harm Minokichi; あなたをころしません expresses that directly.
- rokurokubi/s02/N5: ゆきがふってもいいです。 — 雪は「降る」ものであり、「ふり」が適切です（また、原文は耐えたという記述であり、許可の「いいです」は不自然です）。
- rokurokubi/s03/N4: れんしゅうをしたからだいじょうぶだと思いました。 — 修業（spiritual training）を「れんしゅう（practice/exercise）」と訳すのは意味が不適切です。修行したから大丈夫だと答えた内容に修正してください。
- rokurokubi/s06/N5: まえは高い人でした。 — 「高い人」は身体的な身長を指すため、身分が高いことを意味する「えらい人」または「身分が高い人」に修正すべきです。
- rokurokubi/s06/N3: 男は昔、みぶんが高かったので、大切で高い役を務めていました。 — 「高い役」は不自然です。地位や身分が高いことは「高い」で表現しますが、役職については「重要な」や「重い」を用いるべきです。
- rokurokubi/s08/N4: ちがながれていないと思いました。 — 「ち」は誤字であり、「血」または「ち（血）」として、血が流れていないことに気づいたとするべきです。
- rokurokubi/s08/N3: ちが流れていないので、切られたようではありませんでした。 — 「ち」は「血」の誤字。血が流れていないと修正してください。
- rokurokubi/s11/N3: そうは若い木をぶきにして、首を強くなぐりました。 — The subject 'そう' is a misspelling of '僧' (monk). While the sound is the same, 'そう' as a standalone word typically means 'so' or 'that way', making the sentence unnatural. It should be '僧' or 'お坊さん'.
- hoichi/s03/N5: 芳一は琵琶がありました。 — Wrong particle. '琵琶がありました' means a biwa existed; should be '琵琶を持っていました' or '琵琶がありました (possession)' is unnatural here. Faithful correction: 芳一は琵琶を持っていました。
- hoichi/s05/N5: 「平家のはなしがきたいです」 — The verb is missing a syllable: はなしがきたい is unnatural here. The intended meaning is はなしがききたい, wanting to hear the story.
- hoichi/s05/N4: ある高いみぶんの人から、つたえに来ました。 — 「高い身分」は社会的地位が高い（えらい人）という意味だが、文脈的に不自然な言い回しになっているため、「身分が高い人」または「えらい人」とすべき。
- hoichi/s06/N5: 高い人のいえだとおもいました。 — 「高い身分」を「高い人」と訳しているが、これは地位が高い（えらい）という意味であり、身長が高いという意味に誤解される可能性があるため「えらい人の家」とするべきである。
- hoichi/s06/N3: じぶんのえんそうを聞きたいとのさまは、高いみぶんの人だと思ったので喜びました。 — 「高い身分」を「背が高い（tall）」という意味で使っている可能性があり、原文の「大した高い身分の人（high rank）」に合わせるなら「えらい人」とするべきです。
- hoichi/s09/N4: とのさまはれいをしたいと思いまし。 — The word 'thought' is cut off; it should be 'と思いました。'
- hoichi/s09/N4: た — This is a fragmented syllable remaining from the previous sentence; it should be merged to form 'と思いました。'
- hoichi/s10/N3: 次の夜にさむらいがまた来て、高い人の集まりに連れて行きました。 — 高貴な人の集まりを「高い人（tall person）」と表現しているため、「えらい人」または「身分の高い人」に修正すべき
