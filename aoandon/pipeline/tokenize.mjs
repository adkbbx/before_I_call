// Memoised kuromoji IPADIC tokenizer and content-word classification.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import kuromoji from 'kuromoji';
const require = createRequire(import.meta.url);
let tokenizer;
export function getTokenizer() {
  return tokenizer ??= new Promise((resolve, reject) => kuromoji.builder({ dicPath: join(dirname(require.resolve('kuromoji/package.json')), 'dict') }).build((error, value) => error ? reject(error) : resolve(value)));
}
export function toHiragana(text) { return text.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
export function isContentWord(t) {
  if (['ます', 'です', 'た'].includes(t.basic_form)) return false;
  if (t.pos === '名詞') return !['固有名詞', '数', '代名詞'].includes(t.pos_detail_1);
  return ['動詞', '形容詞', '副詞'].includes(t.pos);
}
