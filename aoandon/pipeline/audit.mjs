// Reproducible readability audit. Baseline is read from HEAD, never the working tree.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { tales, levels, sentenceCaps, targets } from './config.mjs';
import { kanjiMetrics, hasHardKanji, isKanji } from './check.mjs';
import { loadVocab } from './jlpt.mjs';
import { checkLadder, levelStats, mean, inDensityBand, illegalTokens, numberWordIssues } from './ladder.mjs';
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
  const vocab=loadVocab();
  const rows=await auditTales(input), before=JSON.parse(readFileSync('docs/readability-before.json','utf8')).rows;
  let report='# Readability audit\n\nVocabulary is mean stored scene coverage; kanji ratios count narrative characters. Length counts Unicode characters including punctuation, splitting at 。！？. Missing ruby counts hard-kanji tokens in narrative and questions using the actual reader decision. Names are IPADIC person-name candidates, not an exact person count. JLPT lists are approximate.\n';
  for (const level of levels) report+=`\n## ${level}\n\n${comparisonTable(rows,before,level)}\n`;
  report+='\n## Literary / keigo sentences\n\n'+(rows.flatMap(r=>r.hits.map(h=>`- ${r.tale}/${h.scene}/${r.level}: ${h.marker} — ${h.sentence}`)).join('\n')||'None detected.')+'\n';
  writeFileSync('docs/readability.md',report);
  writeFileSync('docs/readability-after.json',JSON.stringify(rows,null,2)+'\n');
  let samples='# Human readability samples\n\nRate each sample: easy / ok / hard. Parentheses show readings after hard-kanji words.\n';
  for (const [id,sceneId] of [['mujina','s01'],['hoichi','s05']]) for (const level of levels) {
    const r=input.find(t=>t.id===id).scenes.find(s=>s.id===sceneId).retellings[level];
    const stats=levelStats(r,vocab);
    samples+=`\n## ${id} ${sceneId} ${level}\n\nKanji density: ${(100*stats.kanjiDensity).toFixed(2)}%; mean sentence length: ${stats.meanLength.toFixed(2)} characters.\n\n`+r.sentences.map(s=>s.tokens.map(t=>t.s+(t.hk&&t.r?`（${t.r}）`:'')).join('')).join('\n\n')+'\n\nAuthor rating (easy / ok / hard): __________\n';
  }
  writeFileSync('docs/samples.md',samples);
  const failures=[];
  const p4cBaseline=existsSync('data/p4c-before.json')?JSON.parse(readFileSync('data/p4c-before.json','utf8')):[];
  let p4cPreserved=0,p4cFlagged=0;
  for(const unit of p4cBaseline)for(const level of ['N5','N4','N3']){
    const raw=readFileSync(`data/runs/hosted/${level}/${unit.tale}-${unit.scene}.json`);
    if(createHash('sha256').update(raw).digest('hex')===unit.hashes[level])p4cPreserved++;
    else {
      const run=JSON.parse(raw);
      if(run.p4cLadderRetry?.before?.ladderOk===false)p4cFlagged++;
      else failures.push(`${unit.tale}/${unit.scene}/${level}: changed without a five-level ladder flag`);
    }
  }
  report+=`\nP4c preservation: ${p4cPreserved} N5–N3 runs byte-identical to P4b; ${p4cFlagged} changed after a recorded five-level ladder failure.\n`;
  const ladder=input.flatMap(t=>t.scenes.map(s=>({tale:t.id,scene:s.id,...checkLadder(s.retellings,vocab)})));
  report+='\n## Scene ladder\n\nEach cell is N5 / N4 / N3 / N2 / N1. Vocabulary share counts N4–N1 entries among non-story content tokens, looking up their base form in the same JLPT vocabulary index.\n\n| Scene | Density | Mean sentence length | N4–N1 vocabulary share | ladderOk |\n|---|---|---|---|---|\n';
  const format=(row,key,pct=false)=>levels.map(l=>(row.stats[l][key]*(pct?100:1)).toFixed(2)+(pct?'%':'')).join(' / ');
  for(const row of ladder)report+=`| ${row.tale}/${row.scene} | ${format(row,'kanjiDensity',true)} | ${format(row,'meanLength')} | ${format(row,'advancedShare',true)} | ${row.ladderOk?'yes':row.reasons.join(', ')} |\n`;
  const rate=ladder.filter(r=>r.ladderOk).length/ladder.length;
  report+=`\nLadder pass rate: ${ladder.filter(r=>r.ladderOk).length}/${ladder.length} (${(rate*100).toFixed(2)}%).\n`;
  if(rate<.9)failures.push(`Ladder rate ${(rate*100).toFixed(2)}% is below 90%`);
  const summary=[];
  report+='\n## Level means and cumulative kanji compliance\n\nStory-word kanji are the explicit list exception, always with furigana. Distinct non-story kanji below must all belong to the cumulative list. Density includes story words and punctuation; coverage excludes story words.\n\n| Level | Density | Sentence length | Vocabulary coverage | N4–N1 share | Distinct non-story kanji | All distinct kanji | Illegal tokens |\n|---|---:|---:|---:|---:|---:|---:|---:|\n';
  for(const level of levels) {
    const runs=input.flatMap(t=>t.scenes.map(s=>s.retellings[level]));
    const stats=runs.map(r=>levelStats(r,vocab));
    const all=runs.flatMap(r=>[...r.sentences,r.question.prompt,...r.question.options].flatMap(s=>s.tokens));
    const distinct=tokens=>[...new Set(tokens.flatMap(t=>[...t.s].filter(isKanji)))].sort().join('');
    const used=distinct(all.filter(t=>t.k!=='story')),every=distinct(all),illegal=runs.flatMap(illegalTokens);
    const row={level,density:mean(stats.map(s=>s.kanjiDensity)),meanLength:mean(stats.map(s=>s.meanLength)),coverage:mean(runs.map(r=>r.metrics.finalCoverage)),advancedShare:mean(stats.map(s=>s.advancedShare)),distinctNonStory:[...used].length,distinctAll:[...every].length,illegal:illegal.length};
    summary.push(row);
    report+=`| ${level} | ${(100*row.density).toFixed(2)}% | ${row.meanLength.toFixed(2)} | ${(100*row.coverage).toFixed(2)}% | ${(100*row.advancedShare).toFixed(2)}% | ${row.distinctNonStory} | ${row.distinctAll} | ${illegal.length} |\n`;
    report+=`\n<!-- ${level} verified non-story set: ${used}; story exceptions: ${distinct(all.filter(t=>t.k==='story'))} -->\n`;
    if(!inDensityBand(row.density,level))failures.push(`${level} mean density outside band: ${row.density}`);
    if(illegal.length)failures.push(`${level}: ${illegal.length} illegal non-story kanji tokens`);
    for(const r of runs) {
      if(r.metrics.faithIssues===undefined)failures.push(`${level}: missing faithfulness review`);
      for(const sentence of [...r.sentences,r.question.prompt,...r.question.options]) {
        const text=sentence.tokens.map(t=>t.s).join('');
        if(numberWordIssues(text,sentence.tokens).length)failures.push(`${level}: kana number ${text}`);
        for(const token of sentence.tokens)if(token.k==='story'&&(!token.r||!showFurigana(token,'above-level')))failures.push(`${level}: story word without ruby`);
      }
    }
  }
  for(const key of ['density','meanLength']) if(!summary.slice(1).every((r,i)=>summary[i][key]<r[key]))failures.push(`Mean ${key} is not strictly increasing`);
  // These are the four regressions named in the brief, checked against the real output.
  for(const level of ['N4','N3']) {
    const text=input.find(t=>t.id==='mujina').scenes[0].retellings[level].sentences.flatMap(s=>s.tokens).map(t=>t.s).join('');
    if(!/(?:三十|30)年/.test(text)||!/(?:死|し)[んぬに]/.test(text))failures.push(`mujina/s01/${level}: merchant death date missing`);
    if(text.includes('さんにじゅう'))failures.push(`mujina/s01/${level}: malformed number`);
  }
  const rank=input.find(t=>t.id==='hoichi').scenes[4].retellings.N5.sentences.flatMap(s=>s.tokens).map(t=>t.s).join('');
  if(rank.includes('高い人'))failures.push('hoichi/s05/N5: rank confused with height');
  const snow=input.find(t=>t.id==='yukionna').scenes[2].retellings.N4.sentences.flatMap(s=>s.tokens).map(t=>t.s).join('');
  if(snow.includes('しぬようにしました'))failures.push('yukionna/s03/N4: unnatural death expression');
  writeFileSync('docs/ladder-after.json',JSON.stringify({summary,scenes:ladder,rate},null,2)+'\n');
  const beforeLadder=JSON.parse(readFileSync('data/ladder-before.json','utf8')).scenes;
  report+=`\nP4 baseline ladder: ${beforeLadder.filter(s=>s.ladderOk).length}/${beforeLadder.length}. Remaining failures: ${ladder.filter(s=>!s.ladderOk).map(s=>s.tale+'/'+s.scene).join(', ')||'none'}.\n`;
  let faith='# Faithfulness audit\n\nHosted gemma-4-31B-it compares each original scene and retelling. Before counts refer to the first review of the selected run before its targeted rewrite. Remaining counts combine the final hosted review and manual findings from data/faithfulness-manual.json. Raw calls live in each hosted run. Simplification may omit decorative detail. The model judge is fallible; its remaining findings include possible false positives. In particular, 紀伊国坂 is the accepted story-word spelling of 紀国坂.\n';
  const findings=[],initialFindings=[],counts={before:0,after:0};
  let preservedN5=0,flaggedN5=0;
  for(const tale of input)for(const scene of tale.scenes)for(const level of levels) {
    const file=`data/runs/hosted/${level}/${tale.id}-${scene.id}.json`,run=JSON.parse(readFileSync(file,'utf8'));
    if(!run.faithfulness?.reviews?.length)failures.push(`${tale.id}/${scene.id}/${level}: no hosted faithfulness call evidence`);
    counts.before+=run.faithfulness?.before?.length??0;
    initialFindings.push(...run.faithfulness?.before??[]);
    if(level==='N5') {
      const original=beforeLadder.find(s=>s.tale===tale.id&&s.scene===scene.id);
      const r=run.retelling,hash=createHash('sha256').update(JSON.stringify({sentences:r.sentences,question:r.question})).digest('hex');
      if(hash===original.n5Hash)preservedN5++;
      else if(run.faithfulness?.before?.length||run.ladderRetry||run.ladderSpellingRepair||run.questionRepairs?.length||run.p4cLadderRetry?.before?.ladderOk===false)flaggedN5++;
      else failures.push(`${tale.id}/${scene.id}/N5: content changed without a faithfulness or ladder flag`);
    }
    for(const issue of scene.retellings[level].metrics.faithIssues??[])findings.push({tale:tale.id,scene:scene.id,level,...issue});
  }
  counts.after=findings.length;
  faith+=`\nIssues before targeted rewrite: ${counts.before}. Remaining issues: ${counts.after}.\n`;
  faith+='\n| Kind | Before targeted rewrite | Remaining |\n|---|---:|---:|\n'+['number','who','event','death','invented','unnatural'].map(k=>`| ${k} | ${initialFindings.filter(f=>f.kind===k).length} | ${findings.filter(f=>f.kind===k).length} |`).join('\n')+'\n';
  report+=`\nN5 preservation: ${preservedN5} scenes retain identical narrative and question tokens; ${flaggedN5} changed only after a recorded faithfulness, number-word, or ladder flag. Hashes are in data/ladder-before.json.\n`;
  for(const kind of ['number','who','event','death','invented','unnatural']) {
    const list=findings.filter(f=>f.kind===kind);
    faith+=`\n## ${kind} (${list.length})\n\n`+(list.map(f=>`- ${f.tale}/${f.scene}/${f.level}: ${f.sentence} — ${f.problem}`).join('\n')||'None.')+'\n';
  }
  writeFileSync('docs/faithfulness.md',faith);
  const top=summary.map(r=>`${r.level}: density ${(100*r.density).toFixed(2)}%, mean sentence ${r.meanLength.toFixed(2)} chars`).join('; ');
  writeFileSync('docs/samples.md',samples.replace('# Human readability samples',`# Human readability samples\n\n${top}`));
  for (const r of rows) {
    if(r.missingRuby) failures.push(`${r.tale}/${r.level}: missing ruby`);
    if(r.meanLength>sentenceCaps[r.level]) failures.push(`${r.tale}/${r.level}: mean sentence length ${r.meanLength}`);
    if(r.scenes!==input.find(t=>t.id===r.tale).scenes.length) failures.push(`${r.tale}/${r.level}: incomplete`);
  }
  for(const tale of input) for(const scene of tale.scenes) for(const level of levels) {
    const r=scene.retellings[level];
    if(scene.ladderOk!==checkLadder(scene.retellings,vocab).ladderOk)failures.push(`${tale.id}/${scene.id}: stale ladderOk`);
    if(!r || r.provider!=='hosted' || r.model!=='gemma-4-31B-it' || r.metrics.kanjiCoverage===undefined || r.metrics.kanjiDensity===undefined)
      failures.push(`${tale.id}/${scene.id}/${level}: missing regenerated hosted evidence`);
  }
  const densities=input.flatMap(t=>t.scenes.map(s=>kanjiMetrics(s.retellings.N5.sentences.flatMap(s=>s.tokens),'N5').kanjiDensity));
  const density=densities.reduce((a,b)=>a+b,0)/densities.length;
  report+=`\nN5 mean scene kanji density: ${(100*density).toFixed(2)}%. Sentence means in each tale must be at most 20 / 28 / 40 / 55 / 70 for N5 / N4 / N3 / N2 / N1.\n`;
  writeFileSync('docs/readability.md',report);
  if(density>.12) failures.push(`N5 mean density ${density}`);
  console.log(failures.length?failures.join('\n'):`Readability gate passed; ladder ${ladder.filter(r=>r.ladderOk).length}/${ladder.length}; density ${summary.map(r=>r.level+' '+(100*r.density).toFixed(2)+'%').join(', ')}`);
  if(failures.length) process.exitCode=1;
}
if(process.argv[1]?.endsWith('audit.mjs')) await main();
