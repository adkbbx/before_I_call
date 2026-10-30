// Token kinds and coverage follow PLAN.md; story spans are protected before tokenisation.
import { getTokenizer, toHiragana, isContentWord } from './tokenize.mjs';
import { readFileSync } from 'node:fs';
import { normalize } from './jlpt.mjs';
const kanaOnly = text => /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(text);
const readingIndexes = new WeakMap();
function readingIndex(vocab) {
  if (readingIndexes.has(vocab)) return readingIndexes.get(vocab);
  const index = new Map();
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) for (const entry of vocab.byLevel[level] ?? []) {
    const base = normalize(entry.expression).find(s => [...s].some(isKanji));
    if (!base) continue;
    for (const r of normalize(entry.reading).map(toHiragana)) {
      if (r.length < 2 || !kanaOnly(r)) continue;
      const bucket = index.get(r[0]) ?? [];
      if (!bucket.some(w => w.reading === r)) bucket.push({ reading: r, base, entry });
      index.set(r[0], bucket);
    }
  }
  for (const bucket of index.values()) bucket.sort((a, b) => b.reading.length - a.reading.length);
  readingIndexes.set(vocab, index);
  return index;
}
export function isKanaFragment(t) {
  return kanaOnly(t.surface_form) && ([...t.surface_form].length === 1 ||
    t.pos === '接頭詞' || ['接頭詞', '接尾', '非自立'].includes(t.pos_detail_1));
}
export const kanjiLevels = JSON.parse(readFileSync(new URL('../data/jlpt/kanji-levels.json', import.meta.url), 'utf8'));
export const isKanji = c => /\p{Script=Han}|々/u.test(c);
export const hasHardKanji = (text, level) => [...text].some(c => isKanji(c) && (kanjiLevels[c] ?? 0) < Number(level.slice(1)));
export function kanjiMetrics(tokens, level) {
  const chars = [...tokens.map(t => t.s).join('')], kanji = chars.filter(isKanji);
  const nonStory = [...tokens.filter(t=>t.k!=='story').map(t=>t.s).join('')].filter(isKanji);
  return { kanjiCoverage: nonStory.length ? nonStory.filter(c => !hasHardKanji(c, level)).length / nonStory.length : 1, kanjiDensity: chars.length ? kanji.length / chars.length : 0 };
}
export function normalizeText(text) {
  return text.replaceAll('燈','灯').replaceAll('閂','かんぬき').replace(/[ 　]/g, '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}
export function measure(tokens) {
  const counted = tokens.filter(t => t.k === 'known' || t.k === 'ghost');
  return { coverage: counted.length ? counted.filter(t => t.k === 'known').length / counted.length : 1, offending: [...new Set(tokens.filter(t => t.k === 'ghost').map(t => t.b ?? t.s))] };
}
export async function tokenizeForLevel(text, level, { storyWords = [], vocab }) {
  text = normalizeText(text);
  const tokenizer = await getTokenizer(), allowed = vocab.cumulative(level), tokens = [];
  const readings = readingIndex(vocab);
  const words = storyWords.flatMap(word => [...new Set([normalizeText(word.text), normalizeText(toHiragana(word.reading))])].filter(Boolean).map(match => ({ word, match }))).sort((a,b) => b.match.length - a.match.length);
  function segment(part) {
    const parsed = tokenizer.tokenize(part);
    for (let i = 0; i < parsed.length; i++) {
      const t = parsed[i];
      // Match dictionary readings before classifying kuromoji's fragments.
      // Whole token boundaries prevent cutting an inflected word in half;
      // particles and nominalisers cannot start a lexical span.
      // A verb or adjective stem plus its ending (い + た) is not a word to merge.
      const lexicalStart = ((isContentWord(t) && t.pos_detail_1 !== '非自立') || t.pos === '接頭詞') && !['動詞', '形容詞'].includes(t.pos);
      let merged;
      if (lexicalStart && kanaOnly(t.surface_form)) for (const word of readings.get(toHiragana(t.surface_form)[0]) ?? []) {
        let surface = '', end = i;
        while (end < parsed.length && kanaOnly(parsed[end].surface_form) && surface.length < word.reading.length) surface += parsed[end++].surface_form;
        if (toHiragana(surface) === word.reading) { merged = { ...word, surface, end }; break; }
      }
      if (merged) {
        tokens.push({ s: merged.surface, b: merged.base, k: allowed.has(merged.reading) ? 'known' : 'ghost', g: merged.entry.meaning, gs: 'jlpt' });
        i = merged.end - 1;
        continue;
      }
      const s = t.surface_form, b = t.basic_form === '*' ? s : t.basic_form;
      const reading = toHiragana(t.reading ?? s), kana = ![...s].some(isKanji);
      const keys = [b, s, ...(kana ? [reading] : []), ...(t.pos === '副詞' ? [b + 'と', ...(kana ? [reading + 'と'] : [])] : [])];
      const content = isContentWord(t) && !isKanaFragment(t), entry = keys.map(k => vocab.lookup(k)).find(Boolean);
      const token = { s, k: content ? keys.some(k => allowed.has(k)) ? 'known' : 'ghost' : 'plain' };
      if (/[一-龯々〆ヵヶ]/u.test(s) && t.reading) token.r = reading;
      if (content) { token.b = b; if (entry) { token.g = entry.meaning; token.gs = 'jlpt'; } }
      // Explicit number-word exception: hard numeral glyphs retain their
      // spelling with mandatory ruby, like protected story words.
      if((t.pos_detail_1==='数'||/^[一二三四五六七八九十百千万億兆零〇壱弐参拾廿卅]+$/u.test(s)) && hasHardKanji(s,level) && t.reading) {
        token.k='story';token.b=b;token.g='number';
      }
      tokens.push(token);
    }
  }
  let start = 0, cursor = 0;
  while (cursor < text.length) {
    const matched = words.find(w => text.startsWith(w.match, cursor));
    const word = matched?.word;
    if (!word) { cursor++; continue; }
    segment(text.slice(start, cursor));
    // Protected story words keep their canonical kanji at every level.
    tokens.push({ s: word.text, r: toHiragana(word.reading), b: word.text, k: 'story', g: word.gloss });
    cursor += matched.match.length; start = cursor;
  }
  segment(text.slice(start));
  for (const token of tokens) if (hasHardKanji(token.s, level)) token.hk = true;
  return { tokens, ...measure(tokens), ...kanjiMetrics(tokens, level) };
}
