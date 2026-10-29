// Retry each failed hosted scene once, preserving its failure evidence for review.
import { readFileSync, writeFileSync } from 'node:fs';
import { paths, tales, levels, providers } from './config.mjs';
import { join } from 'node:path';
import { retellScene, readSource, readStoryWords, createProvider } from './retell.mjs';
import { loadVocab } from './jlpt.mjs';
const provider=createProvider(providers.hosted),vocab=loadVocab();
let failures=0;
for(const tale of tales) for(const level of levels) {
  let previous='';
  for(const scene of readSource(tale.id).scenes) {
    const file=join(paths.runs,'hosted',level,`${tale.id}-${scene.id}.json`);
    let run=JSON.parse(readFileSync(file,'utf8'));
    if(run.failed) {
      if(run.failedSceneRetry) { failures++; console.log(`${tale.id}/${scene.id}/${level}: already retried once`); continue; }
      writeFileSync(`docs/failed-first-${tale.id}-${scene.id}-${level}.json`,JSON.stringify(run,null,2)+'\n');
      run=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider,previous});
      run.failedSceneRetry=true;
      writeFileSync(file,JSON.stringify(run,null,2)+'\n');
      console.log(`${tale.id}/${scene.id}/${level}: ${run.failed ? 'FAILED '+run.error : 'retry passed'}`);
      if(run.failed) failures++;
    }
    if(run.retelling) previous=run.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')).join('');
  }
}
if(failures) process.exitCode=1;
