// Token kinds and coverage follow PLAN.md; story spans are protected before tokenisation.
import { getTokenizer, toHiragana, isContentWord } from './tokenize.mjs';
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
      const reading = toHiragana(t.reading ?? s), keys = [b, s, reading, ...(t.pos === '副詞' ? [b + 'と', reading + 'と'] : [])];
      const content = isContentWord(t), entry = keys.map(k => vocab.lookup(k)).find(Boolean);
      const token = { s, k: content ? keys.some(k => allowed.has(k)) ? 'known' : 'ghost' : 'plain' };
      if (/[一-龯々〆ヵヶ]/u.test(s) && t.reading) token.r = reading;
      if (content) { token.b = b; if (entry) { token.g = entry.meaning; token.gs = 'jlpt'; } }
      tokens.push(token);
    }
  }
  let start = 0, cursor = 0;
  while (cursor < text.length) {
    const matched = words.find(w => text.startsWith(w.match, cursor));
    const word = matched?.word;
    if (!word) { cursor++; continue; }
    segment(text.slice(start, cursor));
    tokens.push({ s: word.text, ...(/[一-龯々〆ヵヶ]/u.test(word.text) ? { r: toHiragana(word.reading) } : {}), b: word.text, k: 'story', g: word.gloss });
    cursor += matched.match.length; start = cursor;
  }
  segment(text.slice(start));
  return { tokens, ...measure(tokens) };
}
