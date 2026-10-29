// Resume full hosted drafts affected by the old one-array-item repair bug.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { tales, levels, paths, providers } from './config.mjs';
import { readSource, readStoryWords, retellScene, repairJson, createProvider, questionShape } from './retell.mjs';
import { loadVocab } from './jlpt.mjs';
const hosted=createProvider(providers.hosted),vocab=loadVocab();
const draft=z.object({sentences:z.array(z.string().min(1)).min(1),question:questionShape});
const jobs=[];
for(const tale of tales) for(const level of levels) for(const scene of readSource(tale.id).scenes) {
  const file=join(paths.runs,'hosted',level,`${tale.id}-${scene.id}.json`),run=JSON.parse(readFileSync(file,'utf8'));
  if(!run.retelling || run.metrics.kanjiCoverage===undefined) continue;
  let initial;
  for(const [index,raw]of run.responses.entries())try{const value=draft.parse(repairJson(raw));initial={value,index,raw};break;}catch{}
  if(!initial)continue;
  const count=s=>(s.match(/。/g)??[]).length;
  const initialCount=count(initial.value.sentences.join('')),finalCount=count(run.retelling.sentences.flatMap(s=>s.tokens.map(t=>t.s)).join(''));
  if(Math.max(...initial.value.sentences.map(count))>=3&&finalCount<initialCount*.8) jobs.push({tale,level,scene,file,run,initial});
}
async function worker(){while(jobs.length){
  const {tale,level,scene,file,run:old,initial}=jobs.shift();
  const sourceFile=`docs/array-repair-before-${tale.id}-${scene.id}-${level}.json`;
  writeFileSync(sourceFile,JSON.stringify(old,null,2)+'\n');
  const replayed=[],used=new Set();let first=true;
  const provider={name:hosted.name,model:hosted.model,call:async(messages,schema)=>{
    if(first){first=false;replayed.push({responseIndex:initial.index,kind:'full preserved draft'});return initial.raw;}
    const wanted=[...messages.at(-1).content.matchAll(/(?:^|\s)(\d+): "/g)].map(m=>Number(m[1]));
    if(wanted.length)for(const [index,raw]of old.responses.entries()){
      if(used.has(index))continue;
      let value;try{value=repairJson(raw);}catch{continue;}
      const rows=Array.isArray(value.rewrites)?value.rewrites.filter(r=>wanted.includes(r.index)):[];
      if(rows.length===wanted.length&&new Set(rows.map(r=>r.index)).size===wanted.length){used.add(index);replayed.push({responseIndex:index,kind:'preserved rewrites',indexes:wanted});return JSON.stringify({rewrites:rows});}
    }
    return hosted.call(messages,schema);
  }};
  const run=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider});
  run.arrayRepair={sourceFile,request:old.request,replayed,note:'Full draft split before indexed repairs. Replayed text is verbatim from hosted evidence; only requested rewrite rows were selected. Other responses are fresh hosted repair/gloss calls.'};
  if(old.failedSceneRetry)run.failedSceneRetry=true;
  if(run.failed)throw new Error(`${tale.id}/${scene.id}/${level}: array repair failed: ${run.error}`);
  writeFileSync(file,JSON.stringify(run,null,2)+'\n');
  console.log(`${tale.id}/${scene.id}/${level}: restored ${run.retelling.sentences.length} sentence entries`);
}}
await Promise.all(Array.from({length:3},()=>worker()));
