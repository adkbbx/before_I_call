import { z } from 'zod';
import { tokenizeForLevel, kanjiMetrics, measure, hasHardKanji } from './check.mjs';
import { needsRetry, systemPrompt, splitNarrative, plainOriginal, questionShape } from './retell.mjs';
import { sentenceCaps, densityBands } from './config.mjs';
import { askJson } from './faithfulness.mjs';
import { levelStats, numberWordIssues } from './ladder.mjs';

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
    const initial=await tokenizeForLevel(text,level,{storyWords,vocab});
    const normalized=initial.tokens.map(t=>t.k==='story' ? (storyWords.find(w=>w.text===t.b)?.text ?? t.s) : hasHardKanji(t.s,level) ? (t.r ?? t.s) : t.s).join('');
    return {tokens:(await tokenizeForLevel(normalized,level,{storyWords,vocab})).tokens};
  }));
}
export async function repairLevel({run,scene,storyWords,vocab,provider,texts,feedback='',rounds=3}) {
  const started=performance.now();
  const r=run.retelling,level=r.level,evidence=run.levelRepairs ??= [];
  await repairQuestionNumbers({run,storyWords,vocab,provider});
  if(texts)r.sentences=await checkedSentences(texts,level,storyWords,vocab);
  for(let i=0;i<rounds;i++) {
    const tokens=r.sentences.flatMap(s=>s.tokens), stats=levelStats(r,vocab);
    if(!needsRetry(tokens,level)&&r.sentences.every(s=>[...s.tokens.map(t=>t.s).join('')].length<=sentenceCaps[level])&&!feedback)break;
    const current=r.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
    const result=await askJson(provider,[
      {role:'system',content:systemPrompt(level,storyWords)},
      {role:'user',content:`Original:\n${plainOriginal(scene)}\nCurrent retelling:\n${current.join('\n')}\nRepair this retelling, preserving the original events. Current measurements: ${JSON.stringify(stats)}; vocabulary ${measure(tokens).coverage}. Required kanji density ${densityBands[level].join('–')}, kanji coverage 1.0. Above-level vocabulary: ${measure(tokens).offending.join('、')}. Write at-level words in kanji, hard words in kana, story words in their exact kanji. Sentences at most ${sentenceCaps[level]} characters. Numbers in digits. ${feedback}\nReturn JSON {"sentences":["..."]}.`}
    ],z.object({sentences:z.array(z.string().min(1)).min(1)}),evidence);
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
