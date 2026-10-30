// Assemble validated static tales; hosted evidence takes precedence per scene and level.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths, tales, levels } from './config.mjs';
import { taleSchema, taleIndexSchema } from '../src/lib/schema.ts';
import { readStoryWords } from './retell.mjs';
import { loadVocab } from './jlpt.mjs';
import { checkLadder } from './ladder.mjs';
const vocab=loadVocab();
const read = file => JSON.parse(readFileSync(file,'utf8'));
export function assembleTale(config, source, storyWords, getRun) {
  const scenes = source.scenes.map(scene => {
    const retellings = {};
    for (const level of levels) for (const provider of ['hosted','ollama']) {
      const run = getRun(provider,level,scene.id);
      if (run && !run.failed && run.retelling) { retellings[level] = run.retelling; break; }
    }
    return {id:scene.id,original:scene.original,retellings,ladderOk:checkLadder(retellings,vocab).ladderOk};
  });
  if (scenes.some(s=>!Object.keys(s.retellings).length)) return null;
  return taleSchema.parse({...config,colophon:source.colophon,illustration:`assets/tale-${config.id}.webp`,storyWords,scenes});
}
export function makeIndex(output) {
  return taleIndexSchema.parse({tales:output.map(tale=>{
    const coverage = {};
    for (const level of levels) { const runs=tale.scenes.map(s=>s.retellings[level]).filter(Boolean); if(runs.length) coverage[level]=runs.reduce((n,r)=>n+r.metrics.finalCoverage,0)/runs.length; }
    const {id,titleJa,titleEn,translator,illustration}=tale;
    return {id,titleJa,titleEn,translator,illustration,scenes:tale.scenes.length,coverage};
  })});
}
export function buildTales() {
  const output=[]; let invalid=false; mkdirSync(paths.publicTales,{recursive:true});
  for (const config of tales) {
    const sourceFile=join(paths.source,`${config.id}.json`); if(!existsSync(sourceFile)) continue;
    try {
      const tale=assembleTale(config,read(sourceFile),readStoryWords(config.id),(provider,level,scene)=>{
        const file=join(paths.runs,provider,level,`${config.id}-${scene}.json`); return existsSync(file)?read(file):undefined;
      });
      if (!tale) { console.log(`${config.id}: incomplete, skipped`); continue; }
      writeFileSync(join(paths.publicTales,`${config.id}.json`),JSON.stringify(tale,null,2)+'\n'); output.push(tale); console.log(`${config.id}: validated, ${tale.scenes.length} scenes`);
    } catch(e) { invalid=true; console.error(`${config.id}: invalid: ${e.message}`); }
  }
  writeFileSync(join(paths.publicTales,'index.json'),JSON.stringify(makeIndex(output),null,2)+'\n');
  if(invalid) process.exitCode=1;
  return output;
}
if(process.argv[1]?.endsWith('build-tales.mjs')) buildTales();
