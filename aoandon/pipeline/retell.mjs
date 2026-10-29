// Retelling provider adapters, bounded repair/retry loop and evidence CLI.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { paths, providers, tales, levels, targets, sentenceCaps, maxRetries } from './config.mjs';
import { retellingSchema } from '../src/lib/schema.ts';
import { loadVocab } from './jlpt.mjs';
import { tokenizeForLevel, measure } from './check.mjs';
const string = z.string().trim().min(1);
export const questionShape = z.object({ prompt: string, options: z.tuple([string,string,string]), answer: z.union([z.literal(0),z.literal(1),z.literal(2)]) });
const draftShape = z.object({ sentences: z.array(string).min(1), question: questionShape });
const questionJson = { type: 'object', properties: { prompt: {type:'string'}, options: {type:'array',items:{type:'string'},minItems:3,maxItems:3}, answer:{type:'integer',minimum:0,maximum:2} }, required:['prompt','options','answer'], additionalProperties:false };
export const draftJson = { type:'object', properties:{ sentences:{type:'array',items:{type:'string'},minItems:1}, question:questionJson },required:['sentences','question'],additionalProperties:false };
const rewriteJson = {type:'object',properties:{rewrites:{type:'array',items:{type:'object',properties:{index:{type:'integer'},sentence:{type:'string'}},required:['index','sentence'],additionalProperties:false}}},required:['rewrites'],additionalProperties:false};
export function createProvider(config, fetchImpl = fetch) {
  return { name: config.name, model: config.model, async call(messages, schema) {
    const local = config.name === 'ollama';
    const response = await fetchImpl(`${config.baseUrl.replace(/\/$/,'')}${local ? '/api/chat' : '/chat/completions'}`, {
      method:'POST', headers:{'content-type':'application/json', ...(!local ? {Authorization:`Bearer ${config.apiKey}`} : {})},
      signal:AbortSignal.timeout(180000), body:JSON.stringify(local ? {model:config.model,messages,stream:false,think:false,format:schema,options:{temperature:0.4,num_ctx:8192,num_predict:1536,repeat_penalty:1.15}} : {model:config.model,messages,response_format:{type:'json_object'},temperature:0.4,max_tokens:1536})
    });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const data = await response.json(); const content = local ? data.message?.content : data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Provider returned no content'); return content;
  } };
}
export function repairJson(raw) {
  try { return JSON.parse(raw); } catch {
    const clean = raw.replace(/```(?:json)?/g,'').trim();
    const object = clean.slice(clean.indexOf('{'),clean.lastIndexOf('}')+1);
    try { return JSON.parse(object); } catch {
      const repaired = object.replace(/("sentence"\s*:\s*"(?:[^"\\]|\\.)*[。！？」])(\s*\}\s*\]\s*\})$/u, '$1"$2');
      return JSON.parse(repaired);
    }
  }
}
export function shuffleQuestion(question, seed) {
  let state = 2166136261; for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0),16777619) >>> 0;
  const order = [0,1,2]; for (let i=2;i>0;i--) { state = (Math.imul(state,1664525)+1013904223) >>> 0; const j = state % (i+1); [order[i],order[j]]=[order[j],order[i]]; }
  return {...question,options:order.map(i=>question.options[i]),answer:order.indexOf(question.answer)};
}
export function systemPrompt(level, storyWords) {
  return `You are Koizumi Setsu. You are retelling a Japanese ghost story (kaidan) aloud to a foreign friend who is learning Japanese at JLPT ${level}.
Retell the scene in simple, natural storytelling Japanese. ${level === 'N3' ? 'Use plain past forms (～た) for narration.' : 'Use です/ます and polite past forms (～ました).'}
Rules:
1. Use only words a JLPT ${level} learner knows. If an idea needs a harder word, say it with easier words instead.
2. Every sentence is at most ${sentenceCaps[level]} characters.
3. Keep every event of the scene, in the same order. Do not add events, people, names, feelings or explanations that are not in the scene.
4. You may use these story words exactly as written: ${storyWords.map(w=>`${w.text}（${w.reading}）`).join('、') || 'なし'}. Copy every story word exactly in kanji, not in kana.
5. Write normal Japanese with no spaces between words. Use kanji for words a ${level} learner reads in kanji and for every story word; write other words in hiragana. The reader shows furigana, so do not avoid kanji the learner knows. Write numbers as 三十年 or 30年, never as kana.
6. Then write one question in Japanese at the same level about what happens in this scene, with three short answer options. Exactly one option is correct.
Return only JSON: {"sentences": ["..."], "question": {"prompt": "...", "options": ["...", "...", "..."], "answer": 0}}`;
}
export const plainOriginal = scene => scene.original.map(p=>p.map(r=>r.base).join('')).join('\n');
export async function retellScene({ taleId, scene, level, storyWords = [], vocab, provider, previous = '' }) {
  const started = performance.now(), responses = [];
  const messages = [{role:'system',content:systemPrompt(level,storyWords)},{role:'user',content:`前の場面（やさしく語り直したもの）: ${previous || 'なし'}\n\n場面（原文）:\n${plainOriginal(scene)}`}];
  const request = {model:provider.model,messages:structuredClone(messages)};
  const evidence = {request,responses};
  async function ask(shape, schema) {
    for (let attempt=0;attempt<2;attempt++) {
      const raw = await provider.call(messages,schema); responses.push(raw); messages.push({role:'assistant',content:raw});
      try { return shape.parse(repairJson(raw)); } catch (error) {
        if (attempt) throw new Error('Invalid model JSON after repair and re-ask');
        const details = error instanceof z.ZodError ? error.issues.map(issue => issue.message).join('; ') : 'Invalid JSON syntax';
        messages.push({role:'user',content:`The response is invalid: ${details}. Return only valid JSON matching the requested schema. Correct missing fields and types.`});
      }
    }
  }
  const check = text => tokenizeForLevel(text,level,{storyWords,vocab});
  try {
    const draft = await ask(draftShape,draftJson);
    let checked = await Promise.all(draft.sentences.map(check));
    const first = measure(checked.flatMap(s=>s.tokens)); let retries = 0;
    while (measure(checked.flatMap(s=>s.tokens)).coverage < targets[level] && retries < maxRetries) {
      const offending = checked.map((s,index)=>({s,index})).filter(({s})=>s.offending.length);
      messages.push({role:'user',content:`These sentences use words above ${level}: ${offending.map(({s,index})=>`${index}: "${draft.sentences[index]}" (avoid: ${s.offending.join(', ')})`).join(' ')} Rewrite only these sentences, with the same meaning and the same rules. Return only JSON: {"rewrites": [{"index": n, "sentence": "..."}]}`});
      const valid = new Set(offending.map(o=>o.index));
      const shape = z.object({rewrites:z.array(z.object({index:z.number().int(),sentence:string})).refine(rows=>rows.length===valid.size && new Set(rows.map(r=>r.index)).size===valid.size && rows.every(r=>valid.has(r.index)), {message:`Expected exactly one rewrite for each index: ${[...valid].join(', ')}. Do not include any other indexes`})});
      const result = await ask(shape,rewriteJson);
      for (const row of result.rewrites) draft.sentences[row.index] = row.sentence;
      checked = await Promise.all(draft.sentences.map(check)); retries++;
    }
    let question = draft.question;
    let qChecked = await Promise.all([question.prompt,...question.options].map(check));
    if (qChecked.some(s=>s.offending.length)) {
      messages.push({role:'user',content:`Simplify only the question and its options to JLPT ${level}. Avoid: ${qChecked.flatMap(s=>s.offending).join(', ')}. Preserve the correct answer and meaning. Return only JSON: {"question":{"prompt":"...","options":["...","...","..."],"answer":0}}`});
      question = (await ask(z.object({question:questionShape}),{type:'object',properties:{question:questionJson},required:['question'],additionalProperties:false})).question;
    }
    question = shuffleQuestion(question,`${taleId}/${scene.id}/${level}`);
    qChecked = await Promise.all([question.prompt,...question.options].map(check));
    const all = [...checked,...qChecked].flatMap(s=>s.tokens);
    const missing = [...new Set(all.filter(t=>t.k==='ghost' && !t.g).map(t=>t.b ?? t.s))];
    if (missing.length) {
      const example = JSON.stringify({glosses:Object.fromEntries(missing.map(word => [word, 'English gloss']))});
      messages.push({role:'user',content:`Give a short English gloss (at most 6 English words each) for these Japanese words in the scene: ${missing.join('、')}. Copy the gloss keys exactly. Return only JSON: ${example}`});
      const shape = z.object({glosses:z.record(string)}).refine(v=>missing.every(w=>v.glosses[w] && v.glosses[w].split(/\s+/).length<=6), {message:`Provide each required gloss key verbatim: ${missing.join(', ')}. Each gloss must have at most 6 English words`});
      const {glosses} = await ask(shape,{type:'object',properties:{glosses:{type:'object',properties:Object.fromEntries(missing.map(w=>[w,{type:'string'}])),required:missing,additionalProperties:false}},required:['glosses'],additionalProperties:false});
      for (const t of all) if (t.k==='ghost' && !t.g) { t.g = glosses[t.b ?? t.s]; t.gs = 'model'; }
    }
    const final = measure(checked.flatMap(s=>s.tokens));
    const metrics = {firstCoverage:first.coverage,finalCoverage:final.coverage,retries,seconds:(performance.now()-started)/1000,offendingFirst:first.offending,ghostWords:[...new Set(all.filter(t=>t.k==='ghost').map(t=>t.b ?? t.s))]};
    const retelling = retellingSchema.parse({level,model:provider.model,provider:provider.name,sentences:checked.map(s=>({tokens:s.tokens})),question:{prompt:{tokens:qChecked[0].tokens},options:qChecked.slice(1).map(s=>({tokens:s.tokens})),answer:question.answer},metrics});
    return {...evidence,metrics,retelling};
  } catch (error) { return {...evidence,failed:true,error:error.message,metrics:{seconds:(performance.now()-started)/1000}}; }
}
export function readStoryWords(taleId) { return JSON.parse(readFileSync(new URL('./story-words.json',import.meta.url),'utf8'))[taleId]?.words ?? []; }
export function readSource(taleId) { return JSON.parse(readFileSync(join(paths.source,`${taleId}.json`),'utf8')); }
export async function runCli(args = process.argv.slice(2)) {
  const flag = (name, fallback) => {const i=args.indexOf(`--${name}`); return i<0 ? fallback : args[i+1];};
  const name=flag('provider','ollama'), selectedLevels=flag('levels',levels.join(',')).split(','), selectedTales=flag('tales','all').split(','), selectedScenes=flag('scenes','all').split(',');
  if (!providers[name] || selectedLevels.some(l=>!levels.includes(l)) || selectedTales.some(t=>t!=='all' && !tales.some(x=>x.id===t))) throw new Error('Invalid provider, level or tale');
  const provider=createProvider(providers[name]), vocab=loadVocab(); let failed=false;
  for (const tale of tales.filter(t=>selectedTales.includes('all') || selectedTales.includes(t.id))) for (const level of selectedLevels) {
    let previous='';
    for (const scene of readSource(tale.id).scenes) {
      const directory=join(paths.runs,name,level), file=join(directory,`${tale.id}-${scene.id}.json`);
      if (!selectedScenes.includes('all') && !selectedScenes.includes(scene.id)) continue;
      if (existsSync(file) && !args.includes('--force')) { const old=JSON.parse(readFileSync(file,'utf8')); if (old.retelling) { previous=old.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')).join(''); console.log(`${tale.id}/${scene.id}/${level}: skipped`); continue; } }
      const result=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider,previous});
      mkdirSync(directory,{recursive:true}); writeFileSync(file,JSON.stringify(result,null,2)+'\n');
      if (result.failed) { failed=true; console.error(`${tale.id}/${scene.id}/${level}: FAILED: ${result.error}`); }
      else { previous=result.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')).join(''); console.log(`${tale.id}/${scene.id}/${level}: ${result.metrics.firstCoverage.toFixed(3)} → ${result.metrics.finalCoverage.toFixed(3)}, ${result.metrics.seconds.toFixed(1)}s`); }
    }
  }
  if (failed) process.exitCode=1;
}
if (process.argv[1]?.endsWith('retell.mjs')) await runCli().catch(e=>{console.error(e.message);process.exitCode=1;});
