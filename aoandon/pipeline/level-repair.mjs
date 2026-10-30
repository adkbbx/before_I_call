import { z } from 'zod';
import { tokenizeForLevel, kanjiMetrics, measure, hasHardKanji } from './check.mjs';
import { needsRetry, systemPrompt, splitNarrative, plainOriginal, questionShape } from './retell.mjs';
import { sentenceCaps, sentenceBands, densityBands } from './config.mjs';
import { askJson } from './faithfulness.mjs';
import { levelStats, numberWordIssues } from './ladder.mjs';
import {atLevelSpelling} from './spelling.mjs';
import {modernNarration} from './register.mjs';

export const questionHasKanaNumbers=r=>[r.question.prompt,...r.question.options].some(s=>numberWordIssues(s.tokens.map(t=>t.s).join('')).length);
export async function repairQuestionNumbers({run,storyWords,vocab,provider}) {
  const r=run.retelling;
  if(!questionHasKanaNumbers(r))return;
  const current={prompt:r.question.prompt.tokens.map(t=>t.s).join(''),options:r.question.options.map(s=>s.tokens.map(t=>t.s).join('')),answer:r.question.answer};
  const evidence=run.questionRepairs??=[];
  const result=await askJson(provider,[{role:'system',content:'Rewrite only kana number words into digits, e.g. ふたり → 2人, いつつ → 5つ. Preserve all meaning, option order and answer index. Return JSON {"question":{"prompt":"...","options":["...","...","..."],"answer":0}}.'},{role:'user',content:JSON.stringify(current)}],z.object({question:questionShape}).refine(v=>v.question.answer===current.answer),evidence);
  const check=async s=>({tokens:(await checkedSentences([s],r.level,storyWords,vocab)).flatMap(s=>s.tokens)});
  r.question={prompt:await check(result.question.prompt),options:await Promise.all(result.question.options.map(check)),answer:result.question.answer};
}

// Pure spelling repair, never lexical substitution: retain the tokenizer's reading.
export async function checkedSentences(texts,level,storyWords,vocab) {
  return Promise.all(texts.flatMap(splitNarrative).map(async text=>{
    if(level==='N1')text=modernNarration(text);
    text=atLevelSpelling(text,level);
    const initial=await tokenizeForLevel(text,level,{storyWords,vocab});
    const normalized=initial.tokens.map(t=>t.k==='story' ? (storyWords.find(w=>w.text===t.b)?.text ?? t.s) : hasHardKanji(t.s,level) ? (t.r ?? t.s) : t.s).join('');
    return {tokens:(await tokenizeForLevel(normalized,level,{storyWords,vocab})).tokens};
  }));
}
export async function repairLevel({run,scene,storyWords,vocab,provider,texts,feedback='',rounds=3}) {
  const started=performance.now();
  const r=run.retelling,level=r.level,evidence=run.levelRepairs ??= [];
  const originalTokens=(await tokenizeForLevel(plainOriginal(scene),level,{storyWords,vocab})).tokens;
  const sourceRich=[...new Set(originalTokens.filter(t=>['N4','N3','N2','N1'].includes(vocab.lookup(t.b??t.s)?.level)).map(t=>t.b??t.s))];
  await repairQuestionNumbers({run,storyWords,vocab,provider});
  if(texts)r.sentences=await checkedSentences(texts,level,storyWords,vocab);
  for(let i=0;i<rounds;i++) {
    const tokens=r.sentences.flatMap(s=>s.tokens), stats=levelStats(r,vocab);
    const tooShort=['N2','N1'].includes(level)&&stats.meanLength<sentenceBands[level][0];
    const goal=run.ladderGoal;
    const outsideGoal=goal&&['kanjiDensity','meanLength','advancedShare'].some(k=>stats[k]<=goal.lower[k]||(goal.upper&&stats[k]>=goal.upper[k]));
    if(!needsRetry(tokens,level)&&!tooShort&&!outsideGoal&&r.sentences.every(s=>[...s.tokens.map(t=>t.s).join('')].length<=sentenceCaps[level])&&!feedback)break;
    const current=r.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
    const spellings=[...new Set(tokens.filter(t=>!/[\p{Script=Han}]/u.test(t.s)&&t.k==='known').flatMap(t=>{
      const entry=vocab.lookup(t.b??t.s);
      return entry&&/[\p{Script=Han}]/u.test(entry.expression)&&!hasHardKanji(entry.expression,level)?[`${t.s}: ${entry.expression}`]:[];
    }))];
    const minimumMean=Math.max(['N2','N1'].includes(level)?sentenceBands[level][0]:0,goal?.lower.meanLength?goal.lower.meanLength+.01:0);
    const shape=z.object({sentences:z.array(z.string().min(1)).min(1)}).superRefine(async(v,ctx)=>{
      if(run.strictLadder){
        const checked=await checkedSentences(v.sentences,level,storyWords,vocab);
        const actual=levelStats({level,sentences:checked},vocab);
        const issues=[];
        if(actual.meanLength<minimumMean)issues.push(`mean sentence length ${actual.meanLength.toFixed(2)} must be >= ${minimumMean.toFixed(2)}`);
        if(goal)for(const key of ['kanjiDensity','meanLength','advancedShare']){
          if(actual[key]<=goal.lower[key])issues.push(`${key} ${actual[key].toFixed(4)} must be STRICTLY ABOVE ${goal.lower[key].toFixed(4)}`);
          if(goal.upper&&actual[key]>=goal.upper[key])issues.push(`${key} ${actual[key].toFixed(4)} must be STRICTLY BELOW ${goal.upper[key].toFixed(4)}`);
        }
        if(issues.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:issues.join('; ')+'. Use indirect reported speech with no internal 。！？ or quotation marks, merging related original propositions into connected clauses. Use harder source words for advancedShare. Preserve events.'});
        return;
      }
      // Ordinary level repairs remain bounded at three attempts. A draft may
      // miss a richness target after those attempts; the independent release
      // gate measures corpus means and every scene's full ladder afterward.
    });
    const result=await askJson(provider,[
      {role:'system',content:systemPrompt(level,storyWords)},
      {role:'user',content:`Relevant harder vocabulary from this original (reuse only where faithful): ${sourceRich.join('、')}. These dictionary entries count toward harder vocabulary share. Prefer these precise source words over basic paraphrases when your level permits.`},
      {role:'user',content:`Original:\n${plainOriginal(scene)}\nCurrent retelling:\n${current.join('\n')}\nRepair this retelling, preserving the original events. Current measurements: ${JSON.stringify(stats)}; vocabulary ${measure(tokens).coverage}. Required kanji density ${densityBands[level].join('–')}, kanji coverage 1.0. Above-level vocabulary: ${measure(tokens).offending.join('、')}. Write at-level words in kanji, hard words in kana, story words in their exact kanji. Possible at-level spellings (choose only where context and meaning match): ${spellings.join('、')}. Sentences at most ${sentenceCaps[level]} characters; aim for mean ${sentenceBands[level].join('–')} characters by joining related clauses naturally, never adding content. Numbers in digits. ${goal?`All three measurements MUST be STRICTLY ABOVE ${JSON.stringify(goal.lower)}${goal.upper?` and STRICTLY BELOW ${JSON.stringify(goal.upper)}`:''}. Harder vocabulary share counts N4–N1 entries among non-story content words. Use richer relevant vocabulary and natural kanji to exceed the lower measurements.`:''} ${feedback}\nReturn JSON {"sentences":["..."]}.`},
      ...(run.semanticCorrections?.length?[{role:'user',content:`These previously confirmed meaning corrections must survive every lexical/style repair: ${JSON.stringify(run.semanticCorrections)}`}]:[])
    ],shape,evidence);
    r.sentences=await checkedSentences(result.sentences,level,storyWords,vocab);
    run.metrics.retries++;
    feedback='';
  }
  // Question spelling is covered by the same cumulative-list rule.
  const q=[r.question.prompt,...r.question.options];
  // Options can contain punctuation; preserve each option's boundary.
  for(let i=0;i<q.length;i++)q[i].tokens=(await checkedSentences([q[i].tokens.map(t=>t.s).join('')],level,storyWords,vocab)).flatMap(s=>s.tokens);
  const tokens=r.sentences.flatMap(s=>s.tokens);
  Object.assign(run.metrics,kanjiMetrics(tokens,level),{finalCoverage:measure(tokens).coverage});
  const all=[...r.sentences,...q].flatMap(s=>s.tokens);
  const missing=[...new Set(all.filter(t=>t.k==='ghost'&&!t.g).map(t=>t.b??t.s))];
  if(missing.length) {
    const {glosses}=await askJson(provider,[{role:'user',content:`Give short English glosses for these Japanese words: ${missing.join('、')}. Return JSON {"glosses":{${missing.map(w=>JSON.stringify(w)+':"English gloss"').join(',')}}}. Copy keys exactly.`}],z.object({glosses:z.record(z.string().min(1))}).refine(x=>missing.every(w=>x.glosses[w])),evidence);
    for(const t of all)if(t.k==='ghost'&&!t.g){t.g=glosses[t.b??t.s];t.gs='model';}
  }
  run.metrics.ghostWords=[...new Set(all.filter(t=>t.k==='ghost').map(t=>t.b??t.s))];
  run.metrics.seconds+=(performance.now()-started)/1000;
  r.metrics=structuredClone(run.metrics);
  return run;
}
