// Local-only API. A single retell job shares the offline checker loop; dependencies are injectable for tests.
import { createServer } from 'node:http';
import { livePort, providers, tales, levels } from '../pipeline/config.mjs';
import { createProvider, retellScene, readSource, readStoryWords } from '../pipeline/retell.mjs';
import { loadVocab } from '../pipeline/jlpt.mjs';
import { retellingSchema } from '../src/lib/schema.ts';
const send = (res,status,body) => { res.writeHead(status,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(body)); };
export function createLiveServer({provider=createProvider(providers.ollama),run=retellScene,source=readSource,storyWords=readStoryWords,vocab}={}) {
  let busy=false;
  return createServer(async(req,res)=>{
    if(req.method==='GET' && req.url==='/api/health') return send(res,200,{ok:true,provider:'ollama',model:provider.model});
    if(req.method!=='POST' || req.url!=='/api/retell') return send(res,404,{error:'Not found'});
    let body;
    try {
      let raw=''; for await(const chunk of req) { raw+=chunk; if(Buffer.byteLength(raw)>16384) throw new Error('Body too large'); }
      body=JSON.parse(raw);
      if(!body || !tales.some(t=>t.id===body.taleId) || !levels.includes(body.level) || !/^s\d{2}$/.test(body.sceneId) || Object.keys(body).some(k=>!['taleId','sceneId','level'].includes(k))) throw new Error('Invalid request');
    } catch { return send(res,400,{error:'Expected { taleId, sceneId, level }'}); }
    if(busy) return send(res,429,{error:'A retelling is already running'});
    let scene;
    try { scene=source(body.taleId).scenes.find(s=>s.id===body.sceneId); } catch { return send(res,400,{error:'Unknown tale'}); }
    if(!scene) return send(res,400,{error:'Unknown scene'});
    busy=true;
    try {
      const result=await run({taleId:body.taleId,scene,level:body.level,storyWords:storyWords(body.taleId),vocab:vocab??loadVocab(),provider});
      if(result.failed) return send(res,502,{error:'Retelling failed'});
      send(res,200,retellingSchema.parse(result.retelling));
    } catch { send(res,500,{error:'Retelling failed'}); } finally { busy=false; }
  });
}
if(process.argv[1]?.endsWith('live.mjs')) createLiveServer().listen(livePort,'127.0.0.1',()=>console.log(`Aoandon live API on http://127.0.0.1:${livePort}`));
