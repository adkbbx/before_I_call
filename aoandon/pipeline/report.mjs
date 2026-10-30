// Aggregate committed run evidence into per-provider and level metrics tables.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { paths } from './config.mjs';
export function writeReport() {
  const groups=new Map(),models=new Set();
  for(const provider of readdirSync(paths.runs,{withFileTypes:true}).filter(d=>d.isDirectory())) for(const level of readdirSync(join(paths.runs,provider.name),{withFileTypes:true}).filter(d=>d.isDirectory())) {
    const runs=readdirSync(join(paths.runs,provider.name,level.name)).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(join(paths.runs,provider.name,level.name,f),'utf8')));
    for(const run of runs) if(run.request?.model) models.add(run.request.model);
    groups.set(`${provider.name} / ${level.name}`,runs);
  }
  let md=`# Retelling metrics\n\nDate: ${new Date().toISOString().slice(0,10)}\n\nModels: ${[...models].join(', ')}\n\nCoverage counts known content tokens; story words are excluded. Failed scenes are excluded from coverage means. Seconds are recorded pipeline timings; early P4b checkpoints measured the initial retell loop without the separate faithfulness and repair phases.\n`;
  for(const [name,runs] of groups) {
    const ok=runs.filter(r=>r.retelling),mean=key=>{
      const values=ok.map(r=>key==='ghostWords'?r.metrics.ghostWords.length:r.metrics[key]).filter(v=>typeof v==='number');
      return values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(3):'—';
    };
    const seconds=runs.length?(runs.reduce((n,r)=>n+r.metrics.seconds,0)/runs.length).toFixed(3):'—';
    md+=`\n## ${name}\n\n| Scenes | First vocabulary | Final vocabulary | Kanji coverage | Kanji density | Retries / scene | Seconds / scene | Ghost words / scene | Failed scenes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| ${runs.length} | ${mean('firstCoverage')} | ${mean('finalCoverage')} | ${mean('kanjiCoverage')} | ${mean('kanjiDensity')} | ${mean('retries')} | ${seconds} | ${mean('ghostWords')} | ${runs.length-ok.length} |\n`;
  }
  mkdirSync(dirname(paths.metrics),{recursive:true});writeFileSync(paths.metrics,md);console.log('Wrote docs/metrics.md');return md;
}
if(process.argv[1]?.endsWith('report.mjs')) writeReport();
