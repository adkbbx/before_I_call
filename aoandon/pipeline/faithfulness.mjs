// Semantic review is separate from lexical checks; every judgment keeps its evidence.
import { z } from 'zod';
import { plainOriginal, repairJson } from './retell.mjs';
import { numberWordIssues } from './ladder.mjs';
export const faithIssueShape=z.object({sentence:z.string(),problem:z.string().min(1),kind:z.enum(['number','who','event','death','invented','unnatural'])});
const reviewShape=z.object({issues:z.array(faithIssueShape)});
export function regressionIssues(retelling,{taleId,sceneId}={}) {
  return retelling.sentences.flatMap(s=>{
    const sentence=s.tokens.map(t=>t.s).join(''),issues=[];
    if(taleId==='hoichi'&&sceneId==='s05'&&/(?:高い|たかい)人/.test(sentence)&&!/(?:身分|しんぶん|地位|ちい)(?:の|が)(?:高い|たかい)人/.test(sentence))issues.push({sentence,kind:'who',problem:'The original means high social rank, not physical height. Use えらい人 or 身分の高い人.'});
    if(taleId==='yukionna'&&sceneId==='s03'&&sentence.includes('あなたをしぬようにしました'))issues.push({sentence,kind:'unnatural',problem:'Unnatural causative. The original means killed you. Use あなたをころしました, maintaining the original conditional and speaker.'});
    if(taleId==='yukionna'&&sceneId==='s03'&&/(?:自分|じぶん)と同じ/.test(sentence))issues.push({sentence,kind:'who',problem:'The source compares Minokichi to the OTHER WOODCUTTER she has just killed, not to the woman herself. Say she thought of killing him like the older woodcutter.'});
    if(numberWordIssues(sentence).length)issues.push({sentence,kind:'number',problem:'Write number words in digits or permitted kanji, never kana. Preserve their numerical value.'});
    return issues;
  });
}
export async function askJson(provider, messages, shape, evidence) {
  for(let i=0;i<3;i++) {
    const raw=await provider.call(messages,{type:'object'});
    evidence.push({messages:structuredClone(messages),response:raw});
    try{return shape.parse(repairJson(raw));}catch(error){
      if(i===2)throw new Error(`Invalid structured response: ${error.message.slice(0,200)}`);
      messages=[...messages,{role:'assistant',content:raw},{role:'user',content:`Return valid JSON only. Validation: ${error.message.slice(0,600)}`}];
    }
  }
}
export async function reviewFaithfulness({scene,retelling,provider,evidence=[]}) {
  const sentences=retelling.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
  const original=plainOriginal(scene);
  const clarification=original.includes('私は今ひとりの人のように') ? '\nSource clarification: 「今ひとりの人のように、あなたをしようか」 refers to doing to Minokichi what she had just done to the OTHER WOODCUTTER. It threatens death, not making Minokichi like the woman herself. Do not change the referent to 自分 or the woman.' : '';
  const unquote=s=>s.replace(/[「」『』]/gu,'').trim();
  const shape=reviewShape.transform(v=>({issues:v.issues.map(issue=>{
    if(sentences.includes(issue.sentence))return issue;
    const matches=sentences.filter(s=>unquote(s)===unquote(issue.sentence));
    return matches.length===1?{...issue,sentence:matches[0]}:issue;
  })})).refine(v=>v.issues.every(issue=>sentences.includes(issue.sentence)),{message:`Every sentence must exactly match one of these strings, including punctuation: ${JSON.stringify(sentences)}`});
  return (await askJson(provider,[
    {role:'system',content:'Compare a simplified Japanese ghost-story retelling with its original. Return JSON {"issues":[{"sentence":"exact retelling sentence","problem":"specific error and faithful correction","kind":"number|who|event|death|invented|unnatural"}]}. Use only one of those six kind values. Check numbers, who did what, event order, deaths versus sightings, invented claims, and unnatural Japanese or a word used with the wrong meaning. High rank is えらい人, not a tall 高い人. 約三十年前に死んだ means died about 30 years ago, NOT saw a ghost 30 years ago. Number words must not be spelled in kana. Simplification, omitted decorative details, ordinary contemporary spelling, and using roles instead of names are acceptable. 紀伊国坂 is the canonical story-word spelling of 紀国坂 and is explicitly correct. Do not demand advanced vocabulary. Report only concrete errors supported by the original. Return an empty array if there are none. Copy the exact sentence from the retelling including punctuation; never quote or combine fragments. For a missing necessary event use the closest existing sentence and explain what to restore.'},
    {role:'user',content:`原文:\n${original}${clarification}\n\n語り直しの文（JSON配列。sentenceは必ずこの配列の文字列をそのままコピーする）:\n${JSON.stringify(sentences)}`}
  ],shape,evidence)).issues;
}
export async function targetedRewrite({scene,retelling,issues,provider,evidence=[]}) {
  const sentences=retelling.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
  const indexes=[...new Set(issues.map(issue=>sentences.indexOf(issue.sentence)))];
  if(indexes.includes(-1))throw new Error('Faithfulness judge cited a sentence absent from the retelling');
  const shape=z.object({rewrites:z.array(z.object({index:z.number().int(),sentence:z.string().min(1)}))}).refine(v=>v.rewrites.length===indexes.length&&new Set(v.rewrites.map(r=>r.index)).size===indexes.length&&v.rewrites.every(r=>indexes.includes(r.index)),{message:`Rewrite exactly indexes ${indexes.join(',')}`});
  const {rewrites}=await askJson(provider,[
    {role:'system',content:`Repair only the specified sentences at JLPT ${retelling.level}. Preserve all other sentences and events. Use natural Japanese, numeric digits for numbers, and maintain the meaning of the original. Return only JSON {"rewrites":[{"index":0,"sentence":"..."}]}.`},
    {role:'user',content:`Original:\n${plainOriginal(scene)}\nSentences:\n${sentences.map((s,i)=>`${i}: ${s}`).join('\n')}\nIssues:\n${JSON.stringify(issues)}\nRewrite exactly indexes: ${indexes.join(',')}`}
  ],shape,evidence);
  for(const row of rewrites)sentences[row.index]=row.sentence;
  return sentences;
}

export async function repairFaithfulness({run,taleId,scene,storyWords,vocab,provider}) {
  const started=performance.now(),priorSeconds=run.metrics.seconds;
  const evidence=run.faithfulness??={reviews:[],rewrites:[]};
  const issues=[...await reviewFaithfulness({scene,retelling:run.retelling,provider,evidence:evidence.reviews}),...regressionIssues(run.retelling,{taleId,sceneId:scene.id})];
  evidence.before??=issues;
  if(issues.length&&evidence.before.length===0)evidence.before=issues;
  if(issues.length) {
    const texts=await targetedRewrite({scene,retelling:run.retelling,issues,provider,evidence:evidence.rewrites});
    const {repairLevel}=await import('./level-repair.mjs');
    await repairLevel({run,scene,storyWords,vocab,provider,texts});
    evidence.after=await reviewFaithfulness({scene,retelling:run.retelling,provider,evidence:evidence.reviews});
  }else evidence.after=[];
  run.metrics.faithIssues=evidence.after;
  run.metrics.seconds=priorSeconds+(performance.now()-started)/1000;
  run.retelling.metrics=structuredClone(run.metrics);
  return run;
}
