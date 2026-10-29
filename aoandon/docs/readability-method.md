# Readability checks

The word checker and kanji checker answer separate questions. A vocabulary word
can be familiar while its spelling is too difficult. Reading-only vocabulary
matches are allowed only for surfaces without kanji. Story words are excluded
from vocabulary coverage, but their kanji count in both kanji metrics.

Kanji coverage counts permitted kanji characters divided by all kanji characters;
it is 1 for kana-only text. Density counts kanji divided by all Unicode characters,
including punctuation. Unlisted Han characters and 々 count as level 0. The kanji
data and its MIT notice are in `data/jlpt/`.

The retelling loop retries vocabulary below 95% / 95% / 97%, kanji coverage below
95% / 95% / 97%, and N5 kanji density above 12%. It also requests repairs for
sentences above 20 / 28 / 40 characters. It stops after three rewrite rounds.
Targets are requests to the model, not claims that every final scene meets them.
Remaining hard kanji receive `hk: true` and furigana in Above level mode, even on
otherwise known or plain tokens. Story words always carry readings.

Story matching preserves a model's hiragana spelling. Its canonical identity is
stored in `b`. The previous matcher silently converted hiragana back to kanji,
undoing repairs. `pipeline/recheck-spelling.mjs` restores final spellings only
when they can be recovered from saved hosted responses and matched to the final
sentence. It authors no text, changes no answers, and makes no model calls.

`docs/readability-before.json` preserves the HEAD commit, its hosted scene metrics,
and independently measured narrative readability. Before vocabulary uses the old
stored checker values, so the comparison includes the homophone correction.
After values come from the regenerated hosted evidence. Narrative measurements
exclude questions; missing-ruby checks include questions and all three options.
Sentence length splits on 。！？ and includes punctuation and closing quotation
marks. Literary/keigo detection combines marker patterns with IPADIC lemmas, and
lists every flagged sentence. Person names are tokenizer candidates, not a
verified inventory of people.

## Reproduction

```text
node pipeline/audit.mjs --before
npm run retell -- --provider hosted --levels N5,N4,N3 --tales all --force
node pipeline/retry-failed.mjs
node pipeline/recover-failed-draft.mjs
node pipeline/repair-sentence-arrays.mjs
node pipeline/recheck-spelling.mjs
npm run build:tales
npm run report
npm run audit
npm test
npm run typecheck
npm run build
npm run screenshots
node pipeline/verify-readability-browser.mjs
```

The baseline command refuses to overwrite an existing baseline. Failed-scene
retries preserve the first failure under `docs/failed-first-*.json` and record
that the single retry was used. The browser check uses real shipped data,
including known/plain hard-kanji tokens, and saves hoichi s05 screenshots at all
three levels. Vite's runner config loader avoids ancestor-directory access by
the default bundler in restricted Windows workspaces.

These checks do not establish natural Japanese, exact grammar level, complete
plot preservation, or correct contextual readings. The six samples leave space
for the author's easy / ok / hard ratings. All story-word lists remain unreviewed.

The failed-draft recovery command replays a usable draft from preserved evidence;
it makes no additional full-scene generation request. The array repair command
finds drafts that packed at least three sentences into one array row and lost
more than 20% of their sentence stops during indexed repairs. It resumes those
full drafts after sentence normalization, reusing applicable hosted rewrite rows
verbatim. Fresh calls, when needed, are bounded repair/question/gloss requests.
Both commands record the provenance of replayed responses in the run JSON and
preserve the previous evidence under `docs/`.
