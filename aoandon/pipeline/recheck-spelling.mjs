// Recover final spellings from hosted responses, undoing the old story matcher
// which silently replaced kana repairs with hard kanji. No text is authored here.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths, tales, levels } from './config.mjs';
import { readStoryWords, repairJson, splitNarrative } from './retell.mjs';
import { loadVocab } from './jlpt.mjs';
import { tokenizeForLevel, measure, kanjiMetrics } from './check.mjs';
import { retellingSchema } from '../src/lib/schema.ts';
const vocab=loadVocab();let count=0,changed=0;
const selected=process.argv.includes('--tales')?process.argv[process.argv.indexOf('--tales')+1].split(','):tales.map(t=>t.id);
for(const tale of tales.filter(t=>selected.includes(t.id))) for(const level of levels) for(const scene of JSON.parse(readFileSync(join(paths.source,`${tale.id}.json`),'utf8')).scenes) {
  const file=join(paths.runs,'hosted',level,`${tale.id}-${scene.id}.json`),run=JSON.parse(readFileSync(file,'utf8'));
  if(!run.retelling) throw new Error(`${file}: failed run must be retried first`);
  const r=run.retelling,storyWords=readStoryWords(tale.id),candidates=new Map();
  for(const raw of run.responses) {
    let value;try{value=repairJson(raw);}catch{continue;}
    const narrativeTexts=[...(Array.isArray(value.sentences)?value.sentences:[]),...(value.rewrites??[]).map(r=>r.sentence)].filter(t=>typeof t==='string');
    const texts=[...narrativeTexts.flatMap(text=>[text,...splitNarrative(text)]),...(value.question?[value.question.prompt,...(value.question.options??[])]:[])].filter(t=>typeof t==='string');
    for(const text of texts) {
      const checked=await tokenizeForLevel(text,level,{vocab,storyWords});
      const canonical=checked.tokens.map(t=>t.k==='story'?t.b:t.s).join('');
      candidates.set(canonical,checked.tokens);
      candidates.set(checked.tokens.map(t=>t.s).join(''),checked.tokens);
    }
  }
  const sentences=[...r.sentences,r.question.prompt,...r.question.options];
  const glosses=new Map(sentences.flatMap(s=>s.tokens).filter(t=>t.g).map(t=>[t.b??t.s,{g:t.g,gs:t.gs}]));
  for(const sentence of sentences) {
    const target=sentence.tokens.map(t=>t.s).join(''),tokens=candidates.get(target);
    if(!tokens) throw new Error(`${tale.id}/${scene.id}/${level}: no response proves final sentence: ${target}`);
    if(tokens.map(t=>t.s).join('')!==target) changed++;
    sentence.tokens=structuredClone(tokens);
    for(const token of sentence.tokens) if(token.k==='ghost'&&!token.g) {
      const gloss=glosses.get(token.b??token.s);if(!gloss)throw new Error(`Missing retained gloss: ${token.s}`);
      Object.assign(token,gloss);
    }
  }
  const narrative=r.sentences.flatMap(s=>s.tokens);
  Object.assign(r.metrics,{finalCoverage:measure(narrative).coverage,...kanjiMetrics(narrative,level),ghostWords:[...new Set(sentences.flatMap(s=>s.tokens).filter(t=>t.k==='ghost').map(t=>t.b??t.s))]});
  run.metrics=r.metrics;run.retelling=retellingSchema.parse(r);
  run.spellingRecheck='Final spellings recovered verbatim from saved hosted responses; canonical story identity retained in token.b.';
  writeFileSync(file,JSON.stringify(run,null,2)+'\n');count++;
}
console.log(`Rechecked ${count} hosted retellings; restored response spellings in ${changed} sentences and question fields.`);
