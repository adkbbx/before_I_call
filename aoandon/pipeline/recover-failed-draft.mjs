// Resume a preserved, repairable draft when the one fresh scene retry failed.
// This never requests another full-scene draft: response zero is replayed from
// evidence, followed only by the normal bounded rewrite/question/gloss calls.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { tales, levels, paths, providers } from './config.mjs';
import { readSource, readStoryWords, retellScene, createProvider, repairJson, questionShape } from './retell.mjs';
import { loadVocab } from './jlpt.mjs';
const hosted=createProvider(providers.hosted),vocab=loadVocab();
const draft=z.object({sentences:z.array(z.string().min(1)).min(1),question:questionShape});
for(const tale of tales) for(const level of levels) {
  let previous='';
  for(const scene of readSource(tale.id).scenes) {
    const file=join(paths.runs,'hosted',level,`${tale.id}-${scene.id}.json`);
    let run=JSON.parse(readFileSync(file,'utf8'));
    if(run.failed && run.failedSceneRetry) {
      const firstFile=`docs/failed-first-${tale.id}-${scene.id}-${level}.json`;
      const sources=[...(existsSync(firstFile)?[{file:firstFile,run:JSON.parse(readFileSync(firstFile,'utf8'))}]:[]),{file,run}];
      let cached;
      for(const source of sources) for(const [index,raw] of source.run.responses.entries()) {
        try{draft.parse(repairJson(raw));cached={raw,index,file:source.file,request:source.run.request};}catch{}
      }
      if(!cached) throw new Error(`${tale.id}/${scene.id}/${level}: no preserved draft can be repaired`);
      writeFileSync(`docs/failed-retry-${tale.id}-${scene.id}-${level}.json`,JSON.stringify(run,null,2)+'\n');
      let replayed=false;
      const provider={name:hosted.name,model:hosted.model,call:async(messages,schema)=>{
        if(!replayed){replayed=true;return cached.raw;}
        return hosted.call(messages,schema);
      }};
      run=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider,previous});
      run.failedSceneRetry=true;
      run.recoveredDraft={file:cached.file,responseIndex:cached.index,request:cached.request,note:'Response zero was replayed from this preserved draft; subsequent responses are hosted repairs. No further full-scene draft was requested.'};
      writeFileSync(file,JSON.stringify(run,null,2)+'\n');
      if(run.failed) throw new Error(`${tale.id}/${scene.id}/${level}: draft recovery failed: ${run.error}`);
      console.log(`${tale.id}/${scene.id}/${level}: preserved draft recovered`);
    }
    if(run.retelling) previous=run.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')).join('');
  }
}
