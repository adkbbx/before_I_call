// Resumable P4c build. Older levels are eligible only after a recorded ladder failure.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {paths,tales,levels,providers,densityBands,sentenceBands} from './config.mjs';
import {join} from 'node:path';
import {createProvider,retellScene,readSource,readStoryWords} from './retell.mjs';
import {loadVocab} from './jlpt.mjs';
import {repairLevel} from './level-repair.mjs';
import {repairFaithfulness} from './faithfulness.mjs';
import {checkLadder,levelStats} from './ladder.mjs';
import {normalizeText} from './check.mjs';
import {atLevelSpelling} from './spelling.mjs';
import {modernNarration} from './register.mjs';

const args=process.argv.slice(2),phase=args[0]??'generate';
if(!['generate','ladder','refine','spelling'].includes(phase))throw new Error('Choose generate, ladder, refine or spelling');
if(providers.hosted.model!=='gemma-4-31B-it'||!providers.hosted.apiKey)throw new Error('Hosted gemma-4-31B-it required');
const provider=createProvider(providers.hosted),vocab=loadVocab();
const file=(t,s,l)=>join(paths.runs,'hosted',l,`${t}-${s}.json`);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,r)=>writeFileSync(p,JSON.stringify(r,null,2)+'\n');
const units=tales.flatMap(tale=>readSource(tale.id).scenes.map(scene=>({tale,scene})));
const bounds=(lower,upper)=>({lower,...(upper&&['kanjiDensity','meanLength','advancedShare'].every(k=>lower[k]<upper[k])?{upper}:{})});
async function generate({tale,scene},level,feedback='',ladderGoal) {
  const storyWords=readStoryWords(tale.id);
  const run=await retellScene({taleId:tale.id,scene,level,storyWords,vocab,provider,feedback});
  if(run.failed){save(file(tale.id,scene.id,level)+'.failed',run);throw new Error(run.error);}
  if(ladderGoal)run.ladderGoal=ladderGoal;
  try{
    await repairLevel({run,scene,storyWords,vocab,provider,feedback});
    await repairFaithfulness({run,taleId:tale.id,scene,storyWords,vocab,provider});
  }catch(error){run.failed=true;run.error=error.message;save(file(tale.id,scene.id,level)+'.failed',run);throw error;}
  run.ladderBuild='P4c';return run;
}
const onlyTales=args.find(a=>a.startsWith('--tales='))?.split('=')[1].split(',');
const queue=units.filter(({tale,scene})=>(!onlyTales||onlyTales.includes(tale.id))&&(phase==='generate'||!args.includes('--complete')||levels.every(l=>existsSync(file(tale.id,scene.id,l))))),failures=[];
const workers=Number(args.find(a=>a.startsWith('--workers='))?.split('=')[1]??8);
if(!Number.isInteger(workers)||workers<1||workers>8)throw new Error('Choose 1–8 workers');
await Promise.all(Array.from({length:workers},async()=>{
  while(queue.length){const unit=queue.shift(),{tale,scene}=unit;try{
    if(phase==='generate')for(const level of ['N2','N1']){
      mkdirSync(join(paths.runs,'hosted',level),{recursive:true});
      const p=file(tale.id,scene.id,level);
      if(existsSync(p)&&!args.includes('--force'))continue;
      const prior=level==='N2'?'N3':'N2';
      const priorStats=levelStats(read(file(tale.id,scene.id,prior)).retelling,vocab);
      const feedback=`The ${prior} retelling has measurements ${JSON.stringify(priorStats)}. This ${level} retelling must exceed ALL THREE: kanji density, mean sentence length, and N4–N1 vocabulary share. Aim near the center of your own density band, use connected clauses, and preserve the events without padding.`;
      const run=await generate(unit,level,feedback,{lower:priorStats});save(p,run);
      console.log(`Generated ${tale.id}/${scene.id}/${level}`);
    }
    else if(phase==='spelling')for(const level of ['N2','N1']){
      const p=file(tale.id,scene.id,level),run=read(p),storyWords=readStoryWords(tale.id);
      const before=run.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
      const beforeQuestion=JSON.stringify(run.retelling.question);
      const allTexts=[...before,...[run.retelling.question.prompt,...run.retelling.question.options].map(s=>s.tokens.map(t=>t.s).join(''))];
      const normalize=text=>atLevelSpelling(level==='N1'?modernNarration(normalizeText(text)):normalizeText(text),level);
      if(allTexts.every(text=>normalize(text)===text))continue;
      await repairLevel({run,scene,storyWords,vocab,provider,texts:before,rounds:0});
      const after=run.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
      const changes=before.flatMap((s,i)=>s!==after[i]?[{before:s,after:after[i]}]:[]);
      const questionChanged=beforeQuestion!==JSON.stringify(run.retelling.question);
      if(changes.length||questionChanged){
        (run.spellingNormalizations??=[]).push({changes,questionChanged});
        for(const issue of run.metrics.faithIssues??[])issue.sentence=changes.find(c=>c.before===issue.sentence)?.after??issue.sentence;
        run.retelling.metrics=structuredClone(run.metrics);save(p,run);
      }
    }
    else {
      const runs=Object.fromEntries(levels.map(l=>[l,read(file(tale.id,scene.id,l))]));
      const check=()=>checkLadder(Object.fromEntries(levels.map(l=>[l,runs[l].retelling])),vocab);
      const before=check();
      if(!before.ladderOk&&runs.N5.retelling.sentences.flatMap(s=>s.tokens).every(t=>!/[\p{Letter}]/u.test(t.s))&&!runs.N5.p4cLadderRetry){
        const feedback='The five-level scene check failed, and the N5 narrative has lost all words. Restore a faithful complete N5 retelling of the original, with simple short sentences and permitted kanji.';
        const run=await generate(unit,'N5',feedback);run.p4cLadderRetry={before,feedback};runs.N5=run;save(file(tale.id,scene.id,'N5'),run);
      }
      for(let i=1;i<levels.length;i++){
        const level=levels[i],prior=levels[i-1],current=check();
        const bad=['kanjiDensity','meanLength','advancedShare'].some(k=>current.stats[prior][k]>=current.stats[level][k]);
        if(phase==='refine'){
          const stat=current.stats[level],band=densityBands[level];
          const needs=bad||(['N2','N1'].includes(level)&&(stat.kanjiDensity<band[0]||stat.kanjiDensity>band[1]||stat.meanLength<sentenceBands[level][0]));
          if(!needs||runs[level].p4cRefinement?.version===3)continue;
          const run=runs[level],storyWords=readStoryWords(tale.id),next=levels[i+1];
          run.ladderGoal=bounds(current.stats[prior],next?current.stats[next]:undefined);
          const chars=run.retelling.sentences.flatMap(s=>s.tokens).map(t=>t.s).join('').length;
          const maxSentences=Math.max(1,Math.floor(chars/Math.max(sentenceBands[level][0],current.stats[prior].meanLength+3)));
          const feedback=`Preserve the existing retelling's meaning. Join related propositions into AT MOST ${maxSentences} complete sentences, including quoted full stops in this count. Use indirect reported speech when needed to avoid short quoted sentences. Keep each sentence under the level cap. Restore normal at-level kanji spellings. Required density ${band.join('–')}; all three ladder measurements strictly above ${JSON.stringify(current.stats[prior])}. Do not introduce claims just to use grammar examples.`;
          if(run.p4cRefinement)(run.p4cRefinementHistory??=[]).push(run.p4cRefinement);
          run.p4cRefinement={version:3,before:current,feedback};run.strictLadder=true;
          try{
            await repairLevel({run,scene,storyWords,vocab,provider,feedback});
            await repairFaithfulness({run,taleId:tale.id,scene,storyWords,vocab,provider});
          }catch(error){save(file(tale.id,scene.id,level)+'.refine-failed',run);throw error;}
          if(Number(level.slice(1))>=3&&!run.p4cLadderRetry)run.p4cLadderRetry={before:current,feedback};
          save(file(tale.id,scene.id,level),run);continue;
        }
        if(!bad||runs[level].p4cLadderRetry)continue;
        const next=levels[i+1];
        const feedback=`Five-level ladder failed: ${JSON.stringify(current.stats)}. This ${level} must have strictly greater kanji density, mean sentence length and harder vocabulary share (N4 through N1 content entries) than ${prior}, and ${next?`strictly less than ${next}`:'be the hardest level'}. Use natural connected clauses and relevant at-level vocabulary, preserve all original events. Meet your density band and sentence length band. Do not pad, invent feelings, or add events.`;
        const run=await generate(unit,level,feedback,bounds(current.stats[prior],next?current.stats[next]:undefined));run.p4cLadderRetry={before,feedback};
        runs[level]=run;save(file(tale.id,scene.id,level),run);
      }
      console.log(`Ladder ${tale.id}/${scene.id}: ${JSON.stringify(check())}`);
    }
  }catch(e){failures.push(`${tale.id}/${scene.id}: ${e.message}`);console.error(failures.at(-1));}}
}));
if(failures.length)throw new Error(failures.join('\n'));
