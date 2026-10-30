// Bounded sentence-level ladder repairs; no second whole-scene regeneration.
import {readFileSync,writeFileSync} from 'node:fs';
import {z} from 'zod';
import {levels,tales,providers,sentenceCaps} from './config.mjs';
import {readSource,readStoryWords,createProvider,plainOriginal} from './retell.mjs';
import {loadVocab} from './jlpt.mjs';
import {checkLadder,levelStats,sentenceTexts} from './ladder.mjs';
import {checkedSentences,repairLevel} from './level-repair.mjs';
import {askJson,repairFaithfulness} from './faithfulness.mjs';

const vocab=loadVocab(),provider=createProvider(providers.hosted);
const file=(t,s,l)=>`data/runs/hosted/${l}/${t}-${s}.json`;
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const keys=['kanjiDensity','meanLength','advancedShare'];
const score=check=>levels.slice(1).reduce((sum,l,i)=>sum+keys.reduce((n,k)=>{
  const d=check.stats[levels[i]][k]-check.stats[l][k];return n+(d>=0?10+d/(k==='meanLength'?20:.2):0);
},0),0);
const queue=tales.flatMap(tale=>readSource(tale.id).scenes.map(scene=>({tale,scene})));
await Promise.all(Array.from({length:8},async()=>{while(queue.length){const {tale,scene}=queue.shift();try{
  const runs=Object.fromEntries(levels.map(l=>[l,read(file(tale.id,scene.id,l))]));
  const check=()=>checkLadder(Object.fromEntries(levels.map(l=>[l,runs[l].retelling])),vocab);
  const before=check();if(before.ladderOk)continue;
  const words=readStoryWords(tale.id),changed=new Set();
  for(let round=0;round<3&&!check().ladderOk;round++){
    const current=check();
    const pair=levels.slice(1).findIndex((l,i)=>keys.some(k=>current.stats[levels[i]][k]>=current.stats[l][k]));
    const low=levels[pair],high=levels[pair+1],r=runs[high].retelling;
    const texts=r.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
    // Joining two adjacent statements preserves propositions while increasing
    // the actual grammatical sentence length; the model supplies conjugation.
    if(current.stats[high].meanLength<=current.stats[low].meanLength&&texts.length>1){
      const pairs=texts.slice(1).map((s,i)=>({i,length:[...texts[i]+s].length})).filter(p=>p.length<=sentenceCaps[high]+12).sort((a,b)=>a.length-b.length);
      if(pairs.length){
        const i=pairs[0].i,evidence=runs[high].localRepairs??=[];
        const result=await askJson(provider,[{role:'system',content:`Join exactly these two adjacent Japanese sentences into ONE natural connected sentence at JLPT ${high}. Preserve every proposition, subject, number and event. Change only conjunctions, inflections and reporting style. No added explanations. Use indirect reported speech, no quotation marks and no internal 。！？. Exactly one final 。, at most ${sentenceCaps[high]} characters. Return JSON {"sentence":"..."}.`},{role:'user',content:JSON.stringify([texts[i],texts[i+1]])}],z.object({sentence:z.string().min(1)}).superRefine((v,ctx)=>{
          const count=sentenceTexts({sentences:[{tokens:[{s:v.sentence}]}]}).length,length=[...v.sentence].length;
          if(count!==1||length>sentenceCaps[high])ctx.addIssue({code:z.ZodIssueCode.custom,message:`You returned ${count} sentences and ${length} characters. Return exactly ONE sentence with no internal 。！？, at most ${sentenceCaps[high]} characters. Use indirect reported speech and preserve the two statements.`});
        }),evidence);
        texts.splice(i,2,result.sentence);r.sentences=await checkedSentences(texts,high,words,vocab);changed.add(high);continue;
      }
    }
    const selected=[low,high];
    const options=selected.map(level=>{
      const retelling=runs[level].retelling;
      const ranked=retelling.sentences.map((s,index)=>({index,text:s.tokens.map(t=>t.s).join(''),length:s.tokens.map(t=>t.s).join('').length})).sort((a,b)=>b.length-a.length);
      return {level,...ranked[round%ranked.length]};
    });
    const evidence=runs[high].localRepairs??=[];
    const callStart=evidence.length;
    const shape=z.preprocess(v=>v&&Array.isArray(v.candidates)?{...v,candidates:v.candidates.flat(Infinity)}:v,z.object({candidates:z.array(z.object({level:z.enum(levels),index:z.number().int(),sentence:z.string().min(1)})).min(2).max(12)})).refine(v=>v.candidates.every(c=>options.some(o=>o.level===c.level&&o.index===c.index)),{message:`Use exactly these level/index pairs: ${options.map(o=>o.level+'/'+o.index).join(', ')}`});
    const result=await askJson(provider,[{role:'system',content:'Propose alternative wordings of ONLY the specified individual sentences in a Japanese story. Preserve every fact and event, do not pad or invent. Return JSON {"candidates":[{"level":"N2","index":0,"sentence":"..."}]}. Give three alternatives per specified sentence. The lower level must remain easier, the higher level richer. Prefer precise harder vocabulary from the original for the higher level; use simpler synonyms for the lower level. Keep normal permitted kanji spellings. No modern slang.'},{role:'user',content:`Original:\n${plainOriginal(scene)}\nCurrent five-level measurements: ${JSON.stringify(current.stats)}\nRequired: kanji density, mean sentence length, and N4–N1 vocabulary share all increase strictly. Repair the reversal between ${low} and ${high}. Sentences to reword: ${JSON.stringify(options)}. Higher-level alternatives can use faithful formal equivalents (e.g. その時 → その瞬間, 言う → 伝える/告げる, 急に → 突然) ONLY when appropriate to the original. Sentence caps: ${JSON.stringify(sentenceCaps)}.`}],shape,evidence);
    let best={score:score(current)};
    for(const c of result.candidates){
      const sentences=await checkedSentences([c.sentence],c.level,words,vocab);
      const next=structuredClone(Object.fromEntries(levels.map(l=>[l,runs[l].retelling])));
      next[c.level].sentences.splice(c.index,1,...sentences);
      const after=checkLadder(next,vocab),value=score(after);
      if(value<best.score)best={score:value,level:c.level,sentences:next[c.level].sentences};
    }
    if(best.level){
      runs[best.level].retelling.sentences=best.sentences;
      if(best.level!==high)(runs[best.level].localRepairs??=[]).push(...structuredClone(evidence.slice(callStart)));
      changed.add(best.level);
    }
  }
  for(const level of changed){
    const run=runs[level];
    if(!run.p4cLadderRetry)run.p4cLadderRetry={before,feedback:'Bounded sentence-level repair of the recorded five-level reversal.'};
    run.localLadderBefore=before;delete run.ladderGoal;delete run.strictLadder;
    await repairLevel({run,scene,storyWords:words,vocab,provider,rounds:0});
    await repairFaithfulness({run,taleId:tale.id,scene,storyWords:words,vocab,provider});
    writeFileSync(file(tale.id,scene.id,level),JSON.stringify(run,null,2)+'\n');
  }
  console.log(`Local ${tale.id}/${scene.id}: ${check().ladderOk?'PASS':check().reasons.join(', ')}`);
}catch(error){console.error(`Local ${tale.id}/${scene.id}: ${error.message}`);}}}));
