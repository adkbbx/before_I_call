// Assemble validated static tales; hosted evidence takes precedence per scene and level.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths, tales, levels } from './config.mjs';
import { taleSchema, taleIndexSchema } from '../src/lib/schema.ts';
import { readStoryWords } from './retell.mjs';
import { loadVocab } from './jlpt.mjs';
import { checkLadder } from './ladder.mjs';
import { tokenizeForLevel, measure, kanjiMetrics } from './check.mjs';
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
export async function retokenizeTale(tale) {
  for (const scene of tale.scenes) {
    for (const level of levels) {
      const r = scene.retellings[level]; if (!r) continue;
      for (const sentence of [...r.sentences, r.question.prompt, ...r.question.options]) {
        const text = sentence.tokens.map(t => t.s).join('');
        const old = sentence.tokens;
        const result = await tokenizeForLevel(text, level, { vocab, storyWords: tale.storyWords });
        if (result.tokens.map(t => t.s).join('') !== text) throw new Error('Retokenization changed displayed text');
        for (const t of result.tokens) if (t.k === 'ghost' && !t.g) {
          const previous = old.find(o => o.s === t.s && o.b === t.b && o.g);
          if (previous) { t.g = previous.g; t.gs = previous.gs; }
        }
        sentence.tokens = result.tokens;
      }
      const narrative = r.sentences.flatMap(s => s.tokens);
      const all = [...r.sentences, r.question.prompt, ...r.question.options].flatMap(s => s.tokens);
      r.metrics = { ...r.metrics, ...kanjiMetrics(narrative, level), finalCoverage: measure(narrative).coverage, ghostWords: measure(all).offending };
    }
    scene.ladderOk = checkLadder(scene.retellings, vocab).ladderOk;
  }
  return taleSchema.parse(tale);
}
export async function buildTales() {
  const output=[]; let invalid=false; mkdirSync(paths.publicTales,{recursive:true});
  for (const config of tales) {
    const sourceFile=join(paths.source,`${config.id}.json`); if(!existsSync(sourceFile)) continue;
    try {
      const tale=assembleTale(config,read(sourceFile),readStoryWords(config.id),(provider,level,scene)=>{
        const file=join(paths.runs,provider,level,`${config.id}-${scene}.json`); return existsSync(file)?read(file):undefined;
      });
      if (!tale) { console.log(`${config.id}: incomplete, skipped`); continue; }
      await retokenizeTale(tale);
      writeFileSync(join(paths.publicTales,`${config.id}.json`),JSON.stringify(tale,null,2)+'\n'); output.push(tale); console.log(`${config.id}: validated, ${tale.scenes.length} scenes`);
    } catch(e) { invalid=true; console.error(`${config.id}: invalid: ${e.message}`); }
  }
  writeFileSync(join(paths.publicTales,'index.json'),JSON.stringify(makeIndex(output),null,2)+'\n');
  if(invalid) process.exitCode=1;
  return output;
}
if(process.argv[1]?.endsWith('build-tales.mjs')) buildTales();
