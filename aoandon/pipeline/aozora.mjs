// P2: fetch an Aozora card's text zip, decode Shift_JIS, parse ruby and notes, split into scenes.
// Output: data/source/<taleId>.json = { id, colophon, paragraphs: Ruby[][], scenes: { id, original: Ruby[][] }[] }
// Contract (PLAN.md "Aozora parsing"):
//   - Find the text zip link on the card page (the "テキストファイル(ルビあり)" row), download to data/source/<id>.zip.
//   - Decode with iconv-lite (Shift_JIS). Strip the header block between the two lines of hyphens; keep the
//     colophon (from 底本： to the end) as `colophon`.
//   - Ruby forms: ｜base《reading》 and 漢字《よみ》 (the ruby applies to the run of kanji before 《). Drop ［＃…］ notes.
//     Keep paragraph breaks. Gaiji notes ※［＃…］ must not leave a stray ※.
//   - Scenes: consecutive paragraphs grouped to 250..500 characters, never splitting a paragraph; ids s01, s02, ...
//   - Pure functions are exported for tests: parseRubyLine, stripHeaderAndColophon, splitScenes.

export function parseRubyLine(_line) {
  throw new Error('TODO(P2): parseRubyLine');
}

export function stripHeaderAndColophon(_text) {
  throw new Error('TODO(P2): stripHeaderAndColophon');
}

export function splitScenes(_paragraphs, _min = 250, _max = 500) {
  throw new Error('TODO(P2): splitScenes');
}

if (process.argv[1]?.endsWith('aozora.mjs')) {
  console.error('TODO(P2): implement the Aozora fetch CLI (npm run fetch:aozora).');
  process.exitCode = 1;
}
