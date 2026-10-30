// P4b resumable hosted build. Every changed sentence and judgment has raw evidence.
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { paths,tales,levels,providers } from './config.mjs';
import { loadVocab } from './jlpt.mjs';
import { createProvider,retellScene,readSource,readStoryWords } from './retell.mjs';
import { repairFaithfulness,regressionIssues } from './faithfulness.mjs';
import { repairLevel,repairQuestionNumbers } from './level-repair.mjs';
import { checkLadder,levelStats,illegalTokens } from './ladder.mjs';
import { kanjiMetrics,measure,hasHardKanji } from './check.mjs';

const args=process.argv.slice(2),mode=args[0]??'all';
const workers=Number(args.find(a=>a.startsWith('--workers='))?.split('=')[1]??3);
if(!['all','generate','faith','spelling','ladder','n5-ladder','questions','measure'].includes(mode)||!Number.isInteger(workers)||workers<1||workers>8)throw new Error('Choose a valid build phase and 1–8 workers');
if(providers.hosted.model!=='gemma-4-31B-it'||!providers.hosted.apiKey)throw new Error('Hosted gemma-4-31B-it configuration is required');
const provider=createProvider(providers.hosted),vocab=loadVocab();
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const fileFor=(tale,scene,level)=>join(paths.runs,'hosted',level,`${tale}-${scene}.json`);
const save=(file,value)=>writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const units=tales.flatMap(tale=>readSource(tale.id).scenes.map(scene=>({tale,scene})));
const onlyTales=args.find(a=>a.startsWith('--tales='))?.split('=')[1].split(',');
const onlyScenes=args.find(a=>a.startsWith('--scenes='))?.split('=')[1].split(',');
const onlyLevels=args.find(a=>a.startsWith('--levels='))?.split('=')[1].split(',');
if(onlyLevels?.some(l=>!levels.includes(l)))throw new Error('Invalid level');
const selected=units.filter(({tale,scene})=>(!onlyTales||onlyTales.includes(tale.id))&&(!onlyScenes||onlyScenes.includes(scene.id))&&(!args.includes('--sample')||(tale.id==='mujina'&&scene.id==='s01'))&&(!args.includes('--rest')||tale.id!=='mujina'||scene.id!=='s01'));
if(!selected.length)throw new Error('No matching scenes');
if(!existsSync('data/ladder-before.json')) {
  save('data/ladder-before.json',{scenes:units.map(({tale,scene})=>{
    const retellings=Object.fromEntries(levels.map(l=>[l,read(fileFor(tale.id,scene.id,l)).retelling]));
    return {tale:tale.id,scene:scene.id,n5Hash:createHash('sha256').update(JSON.stringify({sentences:retellings.N5.sentences,question:retellings.N5.question})).digest('hex'),...checkLadder(retellings,vocab)};
  })});
}
async function parallel(jobs,work,count=workers) {
  const queue=[...jobs],failures=[];
  await Promise.all(Array.from({length:count},async()=>{
    while(queue.length){const job=queue.shift();try{await work(job);}catch(error){const label=`${job.tale.id}/${job.scene.id}/${job.level??''}`;console.error(`${label}: ${error.message}`);failures.push(label);}}
  }));
  if(failures.length)throw new Error(`Failed jobs: ${failures.join(', ')}`);
}
async function review(run,unit) {
  const {scene,tale}=unit,storyWords=readStoryWords(tale.id);
  return repairFaithfulness({run,taleId:tale.id,scene,storyWords,vocab,provider});
}
if(['all','generate'].includes(mode)) {
  await parallel(selected.flatMap(unit=>['N4','N3'].map(level=>({...unit,level}))),async unit=>{
    const {tale,scene,level}=unit,file=fileFor(tale.id,scene.id,level);
    if(!args.includes('--force')&&read(file).ladderBuild==='P4b')return;
    const run=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider});
    if(run.failed){save(file+'.failed',run);throw new Error(run.error);}
    await repairLevel({run,scene,storyWords:readStoryWords(tale.id),vocab,provider});
    await review(run,unit);
    run.ladderBuild='P4b';save(file,run);
    console.log(`Generated ${tale.id}/${scene.id}/${level}: ${JSON.stringify(levelStats(run.retelling,vocab))}; faith ${run.metrics.faithIssues.length}`);
  });
}
if(['all','faith'].includes(mode)) {
  await parallel(selected.flatMap(unit=>(onlyLevels??(args.includes('--n5')?['N5']:levels)).map(level=>({...unit,level}))),async unit=>{
    const {tale,scene,level}=unit,file=fileFor(tale.id,scene.id,level),run=read(file);
    if(run.faithfulness&&!args.includes('--force')&&!regressionIssues(run.retelling,{taleId:tale.id,sceneId:scene.id}).length)return;
    try{await review(run,unit);}catch(error){save(file+'.failed',run);throw error;}save(file,run);
    console.log(`Reviewed ${tale.id}/${scene.id}/${level}: ${run.faithfulness.before.length} → ${run.metrics.faithIssues.length}`);
  });
}
if(['all','spelling'].includes(mode))for(const {tale,scene} of selected) {
  const file=fileFor(tale.id,scene.id,'N5'),run=read(file),r=run.retelling;
  const changes=[];
  const originalFlag=read('data/ladder-before.json').scenes.find(s=>s.tale===tale.id&&s.scene===scene.id);
  for(const token of [...r.sentences,r.question.prompt,...r.question.options].flatMap(s=>s.tokens)) {
    const word=readStoryWords(tale.id).find(w=>w.text===token.b);
    if(token.k==='story'&&word&&token.s!==word.text) {
      if(originalFlag.ladderOk&&!run.faithfulness?.before?.length)throw new Error(`${tale.id}/${scene.id}: unflagged N5 spelling change refused`);
      changes.push({before:token.s,after:word.text});token.s=word.text;
      if(hasHardKanji(token.s,'N5'))token.hk=true;
    }
  }
  if(changes.length){run.ladderSpellingRepair={originalFlag,changes};save(file,run);}
}
if(['all','ladder','n5-ladder'].includes(mode)) {
  await parallel(selected,async unit=>{
    const {tale,scene}=unit;
    const runs=Object.fromEntries(levels.map(l=>[l,read(fileFor(tale.id,scene.id,l))]));
    const check=()=>checkLadder(Object.fromEntries(levels.map(l=>[l,runs[l].retelling])),vocab);
    const before=check();
    const originalFlag=read('data/ladder-before.json').scenes.find(s=>s.tale===tale.id&&s.scene===scene.id);
    const illegalN5=illegalTokens(runs.N5.retelling).length;
    if(before.ladderOk&&!illegalN5&&!args.includes('--force'))return;
    if((illegalN5||(!before.ladderOk&&(before.stats.N5.kanjiDensity>.12||before.stats.N5.advancedShare>before.stats.N4.advancedShare)))&&(!before.ladderOk||!originalFlag.ladderOk)&&!runs.N5.ladderRetry) {
      const advanced=runs.N5.retelling.sentences.flatMap(s=>s.tokens).filter(t=>['N4','N3'].includes(vocab.lookup(t.b??t.s)?.level)).map(t=>t.b??t.s);
      const feedback=`The scene ladder failed. The N5 text has ${illegalN5} forbidden non-story kanji tokens and density ${before.stats.N5.kanjiDensity}. Its N4+N3 vocabulary share is ${before.stats.N5.advancedShare}, and must be at most N4's ${before.stats.N4.advancedShare}. Replace these advanced words with basic N5 expressions while preserving the meaning: ${[...new Set(advanced)].join('、')}. Use only N5 kanji, numeric digits, short simple sentences, and basic N5 vocabulary. Keep density below 12%, and make it clearly easier than N4. Avoid repeating long story names; use the main name once and then simple roles or omit the subject when clear.`;
      const run=await retellScene({taleId:tale.id,scene,level:'N5',storyWords:readStoryWords(tale.id),vocab,provider,feedback});
      if(run.failed)throw new Error(run.error);
      run.ladderRetry={before,originalFlag,feedback};
      await repairLevel({run,scene,storyWords:readStoryWords(tale.id),vocab,provider});
      await review(run,unit);runs.N5=run;save(fileFor(tale.id,scene.id,'N5'),run);
    }
    // Regenerate the offending level once, starting with N4 then N3. N5 is
    // eligible only when the N5→N4 comparison itself fails.
    for(const level of ['N4','N3']) {
      if(mode==='n5-ladder')continue;
      if(runs[level].ladderRetry&&!args.includes('--force'))continue;
      const current=check(),s=current.stats;
      const prior=level==='N4'?'N5':'N4';
      if(level==='N4'&&s.N5.kanjiDensity<s.N4.kanjiDensity&&s.N5.meanLength<s.N4.meanLength&&s.N5.advancedShare<=s.N4.advancedShare)continue;
      if(level==='N3'&&current.ladderOk)continue;
      const feedback=`This ${level} retelling must be harder than ${prior}. ${prior} measurements: ${JSON.stringify(s[prior])}. Make kanji density and mean sentence length strictly larger, and N4+N3 vocabulary share ${level==='N4'?'at least as large':'strictly larger'} than ${s[prior].advancedShare}. Use longer connected sentences and relevant ${level} vocabulary, preserving the original meaning. Current ladder failures: ${current.reasons.join(', ')}.`;
      const run=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider,feedback});
      if(run.failed)throw new Error(run.error);
      run.ladderBuild='P4b';run.ladderRetry={before,feedback};
      await repairLevel({run,scene,storyWords:readStoryWords(tale.id),vocab,provider});
      await review(run,unit);runs[level]=run;save(fileFor(tale.id,scene.id,level),run);
    }
    // If N3's one regeneration still leaves N4 too rich, N4 itself is the
    // offending middle level. It too gets at most one ladder regeneration.
    const remaining=check();
    if(mode!=='n5-ladder'&&!remaining.ladderOk&&!runs.N4.ladderRetry) {
      const feedback=`The scene's middle level is too difficult relative to N3. Place N4 strictly between these measurements in kanji density and mean sentence length: N5 ${JSON.stringify(remaining.stats.N5)}, N3 ${JSON.stringify(remaining.stats.N3)}. Its N4+N3 vocabulary share must be >= ${remaining.stats.N5.advancedShare} and < ${remaining.stats.N3.advancedShare}. Use easier words than N3. Preserve all events.`;
      const run=await retellScene({taleId:tale.id,scene,level:'N4',storyWords:readStoryWords(tale.id),vocab,provider,feedback});
      if(run.failed)throw new Error(run.error);
      run.ladderBuild='P4b';run.ladderRetry={before,feedback};
      await repairLevel({run,scene,storyWords:readStoryWords(tale.id),vocab,provider});
      await review(run,unit);runs.N4=run;save(fileFor(tale.id,scene.id,'N4'),run);
    }
    const after=check();
    console.log(`Ladder ${tale.id}/${scene.id}: ${after.ladderOk?'PASS':after.reasons.join(', ')}`);
  });
}
if(['all','questions'].includes(mode))await parallel(selected.flatMap(unit=>levels.map(level=>({...unit,level}))),async({tale,scene,level})=>{
  const file=fileFor(tale.id,scene.id,level),run=read(file);
  await repairQuestionNumbers({run,storyWords:readStoryWords(tale.id),vocab,provider});save(file,run);
});
if(['all','measure'].includes(mode))for(const {tale,scene} of selected)for(const level of levels) {
  const file=fileFor(tale.id,scene.id,level),run=read(file),tokens=run.retelling.sentences.flatMap(s=>s.tokens);
  Object.assign(run.metrics,kanjiMetrics(tokens,level),{finalCoverage:measure(tokens).coverage});
  run.metrics.ghostWords=[...new Set([...run.retelling.sentences,run.retelling.question.prompt,...run.retelling.question.options].flatMap(s=>s.tokens).filter(t=>t.k==='ghost').map(t=>t.b??t.s))];
  const manual=existsSync('data/faithfulness-manual.json')?read('data/faithfulness-manual.json'):[];
  const texts=run.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join(''));
  const additions=manual.filter(i=>i.tale===tale.id&&i.scene===scene.id&&i.level===level&&texts.includes(i.sentence)).map(({sentence,problem,kind})=>({sentence,problem,kind}));
  run.metrics.faithIssues=[...new Map([...(run.metrics.faithIssues??[]),...additions].map(i=>[JSON.stringify(i),i])).values()];
  run.retelling.metrics=structuredClone(run.metrics);save(file,run);
}
