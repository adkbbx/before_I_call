// Select a monotone chain from actual hosted draft/repair responses, never synthetic text.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {levels,tales,densityBands,sentenceBands,providers} from './config.mjs';
import {readSource,readStoryWords,repairJson,createProvider} from './retell.mjs';
import {checkedSentences,repairLevel} from './level-repair.mjs';
import {repairFaithfulness} from './faithfulness.mjs';
import {checkLadder,levelStats} from './ladder.mjs';
import {loadVocab} from './jlpt.mjs';

export const rises=(a,b)=>['kanjiDensity','meanLength','advancedShare'].every(k=>a[k]<b[k]);
export function chooseChain(pools){
  let paths=pools[0].map(c=>({cost:c.cost,chain:[c]}));
  for(const pool of pools.slice(1))paths=pool.flatMap(c=>{
    const prior=paths.filter(p=>rises(p.chain.at(-1).stats,c.stats)).sort((a,b)=>a.cost-b.cost)[0];
    return prior?[{cost:prior.cost+c.cost,chain:[...prior.chain,c]}]:[];
  });
  return paths.sort((a,b)=>a.cost-b.cost)[0]?.chain;
}
async function main(){
  if(providers.hosted.model!=='gemma-4-31B-it')throw new Error('Hosted Gemma required');
  const vocab=loadVocab(),provider=createProvider(providers.hosted);
  const file=(id,scene,l)=>`data/runs/hosted/${l}/${id}-${scene}.json`;
  const read=p=>JSON.parse(readFileSync(p,'utf8'));
  const only=process.argv.find(a=>a.startsWith('--tales='))?.split('=')[1].split(',');
  const queue=tales.flatMap(tale=>readSource(tale.id).scenes.map(scene=>({tale,scene}))).filter(({tale,scene})=>(!only||only.includes(tale.id))&&levels.every(l=>existsSync(file(tale.id,scene.id,l))));
  const failures=[];
  await Promise.all(Array.from({length:8},async()=>{while(queue.length){const {tale,scene}=queue.shift();try{
    const runs=Object.fromEntries(levels.map(l=>[l,read(file(tale.id,scene.id,l))]));
    const before=checkLadder(Object.fromEntries(levels.map(l=>[l,runs[l].retelling])),vocab);
    if(before.ladderOk)continue;
    const words=readStoryWords(tale.id),pools=[];
    for(const level of levels){
      const run=runs[level],current=run.retelling,seen=new Set(),pool=[];
      const rejected=new Set((run.rejectedCandidates??[]).map(c=>c.hash));
      if(run.candidateSelections?.length&&run.faithfulness?.before?.length)rejected.add(run.candidateSelections.at(-1).hash);
      async function add(texts,source){
        const sentences=source.current?current.sentences:await checkedSentences(texts,level,words,vocab);
        const text=sentences.map(s=>s.tokens.map(t=>t.s).join('')).join('');
        const hash=createHash('sha256').update(text).digest('hex');if(seen.has(hash)||(!source.current&&rejected.has(hash)))return;seen.add(hash);
        const stats=levelStats({level,sentences},vocab),[low,high]=densityBands[level];
        const cost=(source.current?0:.1)+(stats.kanjiDensity<low?(low-stats.kanjiDensity)*100:stats.kanjiDensity>high?(stats.kanjiDensity-high)*100:0)+Math.max(0,sentenceBands[level][0]-stats.meanLength)*.05;
        pool.push({sentences,stats,cost,source,hash});
      }
      await add([], {current:true});
      // N5 remains preserved; N4/N3 alternatives are eligible only for this failed scene.
      if(level!=='N5')for(const suffix of ['', '.failed','.refine-failed','.selection-failed']){
        const p=file(tale.id,scene.id,level)+suffix;if(!existsSync(p))continue;
        const evidence=read(p);
        if(evidence.retelling)await add(evidence.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')),{file:p,kind:'retelling'});
        const responses=[...(evidence.responses??[]).map(raw=>({raw,kind:'draft'})),...(evidence.levelRepairs??[]).map(r=>({raw:r.response,kind:'level repair'}))];
        for(const [index,{raw,kind}] of responses.entries())try{
          const parsed=repairJson(raw);
          if(Array.isArray(parsed.sentences)&&parsed.sentences.length&&parsed.sentences.every(s=>typeof s==='string'&&s.trim()))await add(parsed.sentences,{file:p,index,kind,rawResponse:raw});
        }catch{}
      }
      pools.push(pool);
    }
    const chain=chooseChain(pools);
    if(!chain){console.log(`No chain ${tale.id}/${scene.id}: ${pools.map(p=>p.length).join('/')}`);continue;}
    for(const [i,candidate] of chain.entries()){
      if(candidate.source.current)continue;
      const level=levels[i],run=runs[level];
      run.candidateSelections??=[];run.candidateSelections.push({before,source:candidate.source,stats:candidate.stats,hash:candidate.hash});
      if(['N4','N3'].includes(level)&&!run.p4cLadderRetry)run.p4cLadderRetry={before,feedback:'Selected a strictly ordered hosted repair candidate for this failed scene.'};
      delete run.ladderGoal;delete run.strictLadder;
      run.retelling.sentences=candidate.sentences;
      // Recompute glosses/metrics, then review this exact selected text against the source.
      await repairLevel({run,scene,storyWords:words,vocab,provider,rounds:0});
      if(run.faithfulness)(run.faithfulnessHistory??=[]).push(run.faithfulness);
      delete run.faithfulness;run.metrics.faithIssues=[];
      try{await repairFaithfulness({run,taleId:tale.id,scene,storyWords:words,vocab,provider});}
      catch(error){writeFileSync(file(tale.id,scene.id,level)+'.selection-failed',JSON.stringify(run,null,2)+'\n');throw error;}
      if(run.faithfulness.before?.length)(run.rejectedCandidates??=[]).push({hash:candidate.hash,issues:run.faithfulness.before});
      writeFileSync(file(tale.id,scene.id,level),JSON.stringify(run,null,2)+'\n');
    }
    const after=checkLadder(Object.fromEntries(levels.map(l=>[l,runs[l].retelling])),vocab);
    console.log(`Selected ${tale.id}/${scene.id}: ${after.ladderOk?'PASS':after.reasons.join(', ')}`);
  }catch(error){failures.push(`${tale.id}/${scene.id}: ${error.message}`);console.error(failures.at(-1));}}}));
  if(failures.length)throw new Error(failures.join('\n'));
}
if(process.argv[1]?.endsWith('select-ladder.mjs'))await main();
