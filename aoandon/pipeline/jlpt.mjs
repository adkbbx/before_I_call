// P2: JLPT vocabulary. `node pipeline/jlpt.mjs --download` saves config.jlptSources to data/jlpt/n5.csv .. n1.csv
// (MIT, jamsinclair/open-anki-jlpt-decks, derived from Jonathan Waller's tanos.co.uk lists; credit both).
// CSV columns: expression,reading,meaning,tags,guid.
// Contract:
//   loadVocab() -> { byLevel: { N5: Entry[], ... N1 }, cumulative(level) -> Set<string> of expressions and readings,
//                    lookup(word) -> { level, reading, meaning } | undefined (lowest level wins) }
//   Expressions with alternatives (for example "私・わたし" or "〜屋") must be split and normalised.

export function loadVocab() {
  throw new Error('TODO(P2): loadVocab');
}

if (process.argv[1]?.endsWith('jlpt.mjs')) {
  console.error('TODO(P2): implement --download.');
  process.exitCode = 1;
}
