// P2: kuromoji (IPADIC) wrapper. Build the tokenizer once and reuse it.
// Contract:
//   getTokenizer() -> Promise<{ tokenize(text) -> KuromojiToken[] }>
//   toHiragana(katakana) -> string
//   isContentWord(token) -> boolean   (rules in check.mjs header)
// kuromoji's dictionary lives at node_modules/kuromoji/dict; resolve it with createRequire, not a relative guess.

export function getTokenizer() {
  throw new Error('TODO(P2): getTokenizer');
}

export function toHiragana(text) {
  return text.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}
