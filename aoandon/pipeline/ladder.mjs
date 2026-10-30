// Shared independent measurements for generation, assembly and the release gate.
import { densityBands, levels } from './config.mjs';
import { kanjiMetrics, hasHardKanji } from './check.mjs';

export const sentenceTexts = r => r.sentences.flatMap(s => s.tokens).map(t => t.s).join('').match(/[^。！？]+[。！？」』]*|[。！？]+/gu) ?? [];
export const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
export const inDensityBand = (density, level) => density >= densityBands[level][0] && density <= densityBands[level][1];
export function numberWordIssues(text) {
  // Require a number/counter context, so さん (honorific), いつ (when), etc. stay legal.
  return [...text.matchAll(/(?:さんにじゅう|(?:さん|よん|ご|ろく|なな|はち|きゅう)?じゅう|ひゃく|せん|いち|に|さん|よん|し|ご|ろく|なな|はち|きゅう)(?=(?:ねん|年|にん|さい|歳|かげつ|ヶ月|か月|にち))|ひとり|ふたり|ひとつ|ふたつ|みっつ|よっつ|いつつ|むっつ|ななつ|やっつ|ここのつ/gu)].map(m=>m[0]);
}
export function levelStats(r, vocab) {
  const tokens = r.sentences.flatMap(s=>s.tokens);
  const content = tokens.filter(t=>t.k==='known'||t.k==='ghost');
  const advanced = content.filter(t=>['N4','N3'].includes(vocab.lookup(t.b ?? t.s)?.level));
  return {...kanjiMetrics(tokens,r.level),meanLength:mean(sentenceTexts(r).map(s=>[...s].length)),advancedShare:content.length?advanced.length/content.length:0};
}
export function checkLadder(retellings, vocab) {
  if (levels.some(l=>!retellings[l])) return {ladderOk:false, reasons:['missing level'],stats:{}};
  const stats=Object.fromEntries(levels.map(l=>[l,levelStats(retellings[l],vocab)]));
  const reasons=[];
  for(const key of ['kanjiDensity','meanLength','advancedShare']) {
    const [a,b,c]=levels.map(l=>stats[l][key]);
    if (!(key==='advancedShare' ? a<=b&&b<c : a<b&&b<c)) reasons.push(key);
  }
  return {ladderOk:reasons.length===0,reasons,stats};
}
export function illegalTokens(r) {
  return [...r.sentences,r.question.prompt,...r.question.options].flatMap(s=>s.tokens).filter(t=>t.k!=='story'&&hasHardKanji(t.s,r.level));
}

