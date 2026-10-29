// Reproducible readability audit. Baseline is read from HEAD, never the working tree.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tales, levels, sentenceCaps } from './config.mjs';
import { kanjiMetrics, hasHardKanji } from './check.mjs';
import { getTokenizer } from './tokenize.mjs';
import { showFurigana } from '../src/lib/reader.ts';
import { taleSchema } from '../src/lib/schema.ts';

export const markers = /申し|申す|申さ|申せ|参り|参る|参っ|いたし|いたす|ござ|けり|べし|(?:せ|ら|れ|わ|か|が|さ|た|な|ば|ま|み|り)ぬ(?=[。、」]|$)|(?:せ|ら|れ|わ|か|が|さ|た|な|ば|ま)ず(?=[、に。])/gu;
const bannedLemmas=new Set(['申す','もうす','参る','まいる','致す','いたす','ござる','御座る','ぬ','けり','べし']);
export async function auditTales(input) {
  const tokenizer = await getTokenizer(), rows = [];
  for (const level of levels) for (const tale of input) {
    let tokens = [], lengths = [], coverages = [], missingRuby = 0;
    const hits = [], names = new Set();
    for (const scene of tale.scenes) {
      const r = scene.retellings[level]; if (!r) continue;
      coverages.push(r.metrics.finalCoverage);
      const narrative=r.sentences.flatMap(s=>s.tokens);
      tokens.push(...narrative);
      // Split the joined scene, not array elements: a model can split one
      // grammatical sentence across two array rows, or put several in one row.
      const sentenceTexts=narrative.map(t=>t.s).join('').match(/[^。！？]+[。！？」』]*|[。！？]+/gu) ?? [];
      lengths.push(...sentenceTexts.map(s=>[...s].length));
      for (const text of sentenceTexts) {
        const parsed=tokenizer.tokenize(text),found=new Set([...text.matchAll(markers)].map(m=>m[0]));
        // IPADIC can misread kana water/wound/cloth/death words as negative
        // auxiliaries. Do not report those ordinary lexical spans as literary.
        const lexical=[...text.matchAll(/みず|きず|しずむ|しずん|しずか|しずけさ|しぬ|ぬの|いぬ/gu)].map(m=>[m.index,m.index+m[0].length]);
        for(const t of parsed) {
          const start=t.word_position-1,ordinary=lexical.some(([a,b])=>start>=a&&start+t.surface_form.length<=b);
          if(!ordinary && bannedLemmas.has(t.basic_form) && (t.basic_form!=='ぬ'||['ぬ','ず'].includes(t.surface_form))) found.add(t.surface_form);
          if(t.pos_detail_2==='人名') names.add(t.surface_form);
        }
        if(found.size) hits.push({scene:scene.id,marker:[...found].join('、'),sentence:text});
      }
      // Ruby must work in questions too; density/length measure narrative only.
      for (const s of [...r.sentences,r.question.prompt,...r.question.options]) for (const t of s.tokens)
        if (hasHardKanji(t.s,level) && !showFurigana(t,'above-level')) missingRuby++;
    }
    const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
    rows.push({tale:tale.id,level,coverage:mean(coverages),...kanjiMetrics(tokens,level),meanLength:mean(lengths),maxLength:Math.max(0,...lengths),missingRuby,hits,names:[...names],scenes:coverages.length});
  }
  return rows;
}
export function comparisonTable(rows,before,level) {
  const pct = x => `${(100*x).toFixed(1)}%`, num = x => x.toFixed(1);
  const pair = (old,row,key,format=pct) => `${old ? format(old[key]) : '—'} → ${format(row[key])}`;
  return ['| Tale | Vocabulary before → after | Kanji coverage before → after | Kanji density before → after | Mean length before → after | Max length before → after | Hard tokens without ruby | Literary / keigo hits | Named people (tokenizer candidates) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...rows.filter(r=>r.level===level).map(r=>{const old=before.find(b=>b.tale===r.tale&&b.level===level);return `| ${r.tale} | ${pair(old,r,'coverage')} | ${pair(old,r,'kanjiCoverage')} | ${pair(old,r,'kanjiDensity')} | ${pair(old,r,'meanLength',num)} | ${pair(old,r,'maxLength',num)} | ${r.missingRuby} | ${r.hits.length} | ${r.names.join('、') || '—'} |`;})].join('\n');
}
async function main() {
  if (process.argv.includes('--before')) {
    if (existsSync('docs/readability-before.json')) throw new Error('Baseline already exists; refusing to overwrite');
    const git = args => execFileSync('git',['-c',`safe.directory=${resolve('..').replaceAll('\\','/')}`,...args],{encoding:'utf8',maxBuffer:32*1024*1024}).trim();
    const prefix = git(['rev-parse','--show-prefix']);
    const input = tales.map(t=>JSON.parse(git(['show',`HEAD:${prefix}public/tales/${t.id}.json`])));
    const hostedMetrics=input.flatMap(t=>t.scenes.flatMap(s=>levels.flatMap(level=>s.retellings[level]?.provider==='hosted'?[{tale:t.id,scene:s.id,level,metrics:s.retellings[level].metrics}]:[])));
    writeFileSync('docs/readability-before.json',JSON.stringify({commit:git(['rev-parse','HEAD']),method:'HEAD public hosted retellings; stored vocabulary coverage; independently measured kanji and sentences',hostedMetrics,rows:await auditTales(input)},null,2)+'\n');
    console.log('HEAD readability baseline saved'); return;
  }
  const input=tales.map(t=>taleSchema.parse(JSON.parse(readFileSync(`public/tales/${t.id}.json`,'utf8'))));
  const rows=await auditTales(input), before=JSON.parse(readFileSync('docs/readability-before.json','utf8')).rows;
  let report='# Readability audit\n\nVocabulary is mean stored scene coverage; kanji ratios count narrative characters. Length counts Unicode characters including punctuation, splitting at 。！？. Missing ruby counts hard-kanji tokens in narrative and questions using the actual reader decision. Names are IPADIC person-name candidates, not an exact person count. JLPT lists are approximate.\n';
  for (const level of levels) report+=`\n## ${level}\n\n${comparisonTable(rows,before,level)}\n`;
  report+='\n## Literary / keigo sentences\n\n'+(rows.flatMap(r=>r.hits.map(h=>`- ${r.tale}/${h.scene}/${r.level}: ${h.marker} — ${h.sentence}`)).join('\n')||'None detected.')+'\n';
  writeFileSync('docs/readability.md',report);
  writeFileSync('docs/readability-after.json',JSON.stringify(rows,null,2)+'\n');
  let samples='# Human readability samples\n\nRate each sample: easy / ok / hard. Parentheses show readings after hard-kanji words.\n';
  for (const [id,sceneId] of [['mujina','s01'],['hoichi','s05']]) for (const level of levels) {
    const r=input.find(t=>t.id===id).scenes.find(s=>s.id===sceneId).retellings[level];
    samples+=`\n## ${id} ${sceneId} ${level}\n\n`+r.sentences.map(s=>s.tokens.map(t=>t.s+(t.hk&&t.r?`（${t.r}）`:'')).join('')).join('\n\n')+'\n\nAuthor rating (easy / ok / hard): __________\n';
  }
  writeFileSync('docs/samples.md',samples);
  const failures=[];
  for (const r of rows) {
    if(r.missingRuby) failures.push(`${r.tale}/${r.level}: missing ruby`);
    if(r.meanLength>sentenceCaps[r.level]) failures.push(`${r.tale}/${r.level}: mean sentence length ${r.meanLength}`);
    if(r.scenes!==input.find(t=>t.id===r.tale).scenes.length) failures.push(`${r.tale}/${r.level}: incomplete`);
  }
  for(const tale of input) for(const scene of tale.scenes) for(const level of levels) {
    const r=scene.retellings[level];
    if(!r || r.provider!=='hosted' || r.model!=='gemma-4-31B-it' || r.metrics.kanjiCoverage===undefined || r.metrics.kanjiDensity===undefined)
      failures.push(`${tale.id}/${scene.id}/${level}: missing regenerated hosted evidence`);
  }
  const densities=input.flatMap(t=>t.scenes.map(s=>kanjiMetrics(s.retellings.N5.sentences.flatMap(s=>s.tokens),'N5').kanjiDensity));
  const density=densities.reduce((a,b)=>a+b,0)/densities.length;
  report+=`\nN5 mean scene kanji density: ${(100*density).toFixed(2)}%. Sentence means in each tale must be at most 20 / 28 / 40 for N5 / N4 / N3.\n`;
  writeFileSync('docs/readability.md',report);
  if(density>.12) failures.push(`N5 mean density ${density}`);
  console.log(failures.length?failures.join('\n'):`Readability gate passed; N5 mean density ${(100*density).toFixed(2)}%`);
  if(failures.length) process.exitCode=1;
}
if(process.argv[1]?.endsWith('audit.mjs')) await main();
