// Token kinds and coverage follow PLAN.md; story spans are protected before tokenisation.
import { getTokenizer, toHiragana, isContentWord } from './tokenize.mjs';
import { readFileSync } from 'node:fs';
export const kanjiLevels = JSON.parse(readFileSync(new URL('../data/jlpt/kanji-levels.json', import.meta.url), 'utf8'));
export const isKanji = c => /\p{Script=Han}|々/u.test(c);
export const hasHardKanji = (text, level) => [...text].some(c => isKanji(c) && (kanjiLevels[c] ?? 0) < Number(level.slice(1)));
export function kanjiMetrics(tokens, level) {
  const chars = [...tokens.map(t => t.s).join('')], kanji = chars.filter(isKanji);
  const nonStory = [...tokens.filter(t=>t.k!=='story').map(t=>t.s).join('')].filter(isKanji);
  return { kanjiCoverage: nonStory.length ? nonStory.filter(c => !hasHardKanji(c, level)).length / nonStory.length : 1, kanjiDensity: chars.length ? kanji.length / chars.length : 0 };
}
export function normalizeText(text) {
  return text.replace(/[ 　]/g, '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}
export function measure(tokens) {
  const counted = tokens.filter(t => t.k === 'known' || t.k === 'ghost');
  return { coverage: counted.length ? counted.filter(t => t.k === 'known').length / counted.length : 1, offending: [...new Set(tokens.filter(t => t.k === 'ghost').map(t => t.b ?? t.s))] };
}
export async function tokenizeForLevel(text, level, { storyWords = [], vocab }) {
  text = normalizeText(text);
  const tokenizer = await getTokenizer(), allowed = vocab.cumulative(level), tokens = [];
  const words = storyWords.flatMap(word => [...new Set([normalizeText(word.text), normalizeText(toHiragana(word.reading))])].filter(Boolean).map(match => ({ word, match }))).sort((a,b) => b.match.length - a.match.length);
  function segment(part) {
    for (const t of tokenizer.tokenize(part)) {
      const s = t.surface_form, b = t.basic_form === '*' ? s : t.basic_form;
      const reading = toHiragana(t.reading ?? s), kana = ![...s].some(isKanji);
      const keys = [b, s, ...(kana ? [reading] : []), ...(t.pos === '副詞' ? [b + 'と', ...(kana ? [reading + 'と'] : [])] : [])];
      const content = isContentWord(t), entry = keys.map(k => vocab.lookup(k)).find(Boolean);
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
