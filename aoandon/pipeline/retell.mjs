// Retelling provider adapters, bounded repair/retry loop and evidence CLI.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { paths, providers, tales, levels, targets, sentenceCaps, sentenceBands, densityBands, maxRetries } from './config.mjs';
import { retellingSchema } from '../src/lib/schema.ts';
import { loadVocab } from './jlpt.mjs';
import { tokenizeForLevel, measure, kanjiMetrics, kanjiLevels } from './check.mjs';
import { inDensityBand, numberWordIssues } from './ladder.mjs';
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
      signal:AbortSignal.timeout(180000), body:JSON.stringify(local ? {model:config.model,messages,stream:false,think:false,format:schema,options:{temperature:0.4,num_ctx:8192,num_predict:1536,repeat_penalty:1.15}} : {model:config.model,messages,response_format:{type:'json_object'},temperature:0.4,max_tokens:4096})
    });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const data = await response.json(); const content = local ? data.message?.content : data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Provider returned no content'); return content;
  } };
}
export function repairJson(raw) {
  // Gemma occasionally emits this exact malformed field name even in JSON mode.
  // Repair only that unambiguous key; validation still rejects missing fields.
  raw = raw.replace(/"sentences\(\["\s*:/g, '"sentences":');
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
  const rules = {
    N5: 'Picture-book style. Use です/ます and ました/ませんでした only, with ～て, ～たい, ～から and ～が (but). One idea per sentence. Replace personal names with roles (おさむらい, おぼうさん, おじいさん, わかい男), except the one main character listed as a story word.',
    N4: 'Use です/ます and polite past forms. Use ～とき, ～たら, ～ている, ～と思います where natural. Write sentences of 15–28 characters. At most two named people per tale; use roles for the rest.',
    N3: 'Plain past narration with connected sentences of 22–40 characters, using ～て, ～ので, ～のに, ～ようだ and the passive where natural. Use N3 vocabulary where it fits the original meaning.',
    N2: 'Plain-form narration with connected clauses, sentences of 30–55 characters, N2 vocabulary and natural N2 grammar such as ～ものの, ～わけではない, ～にもかかわらず, ～ばかりか, ～に違いない.',
    N1: 'Plain-form literary-leaning modern prose close to the original translator register, sentences of 35–70 characters. Narration uses である/だった/した, never です/ます/おります. N1 grammar such as ～ともなく, ～ずにはいられない, ～をものともせず, ～んばかり is allowed where faithful. Classical forms only inside quoted speech when present in the original.'
  };
  const allowed = Object.entries(kanjiLevels).filter(([,n]) => level==='N3' ? n===3 : n >= Number(level.slice(1))).map(([c])=>c).join('');
  return `You are Koizumi Setsu. Retell a Japanese ghost story aloud to a foreign friend learning JLPT ${level}.
${rules[level]}
Use only vocabulary at or below ${level}. ${level==='N1' ? 'Literary modern prose is allowed. Classical forms only inside quoted speech when the original has them.' : level==='N2' ? 'Use modern plain-form narration, no classical forms.' : 'No classical or literary forms (～ぬ, ～ず, ～けり, ～べし). No keigo beyond です/ます (no 申す, 参る, いたす, ござる). No idioms.'} No modern slang.
Each sentence is at most ${sentenceCaps[level]} characters, including punctuation. Split long sentences into several short sentences.
Keep every event in the same order. Do not add events, people, feelings or explanations.
Grammar examples are optional: use a construction only when its exact logical relation matches the original. Never introduce a negation, contrast, certainty or conjecture just to demonstrate grammar. Join related original propositions into longer connected sentences at advanced levels.
${['N2','N1'].includes(level)?'Use indirect reported speech to connect dialogue naturally to narration. Avoid sentence-final punctuation inside quotations: every 。！？ counts as a sentence boundary, even inside dialogue. Prefer one final 。 per array item.':''}
Story words, in importance order: ${storyWords.map(w=>w.text+'（'+w.reading+'）').join('、') || 'なし'}. Keep their exact kanji when needed; the reader always supplies furigana. Do not insert unused words.
Write normal Japanese with no spaces between words. Use ONLY these kanji: ${allowed}.${Number(level.slice(1))<=3 ? ` All kanji from easier levels (${['N5','N4','N3','N2'].filter(l=>Number(l.slice(1))>Number(level.slice(1))).join(', ')}) are also allowed.` : ''} This restriction excludes the listed story words. Write words with above-level kanji in kana. Write at-level words in kanji as normal Japanese does, never a kana-only retelling. Use simple roles instead of difficult names.
Narrative kanji density, including story words, must be ${densityBands[level].map(n=>Math.round(100*n)).join('–')} percent. Aim for ${level==='N5' ? 8 : level==='N4' ? 14 : level==='N3' ? 23 : level==='N2' ? 30 : 36} percent and mean sentence length ${sentenceBands[level].join('–')} characters.
Never spell numbers in kana. Write 三十年 or 30年, not さんじゅうねん. If a number word has above-level kanji, preserve it with furigana. Do not confuse rank (えらい人) with height (高い人), or the date someone died with when they saw a ghost.
Then write one question at the same level, with three short options and one correct answer.
Return only JSON: {"sentences":["..."],"question":{"prompt":"...","options":["...","...","..."],"answer":0}}`;
}
export const needsRetry = (tokens, level) => {
  const m = {...measure(tokens), ...kanjiMetrics(tokens, level)};
  return m.coverage < targets[level] || m.kanjiCoverage < 1 || !inDensityBand(m.kanjiDensity,level) || numberWordIssues(tokens.map(t=>t.s).join(''),tokens).length>0;
};
export const plainOriginal = scene => scene.original.map(p=>p.map(r=>r.base).join('')).join('\n');
// A provider sometimes puts a whole scene in one array item. Normalise before
// indexed repairs so a request to rewrite index 0 cannot discard the whole scene.
export const splitNarrative = text => text.match(/[^。]+。[」』]*|[^。]+$/gu) ?? [text];
export async function retellScene({ taleId, scene, level, storyWords = [], vocab, provider, previous = '', feedback = '' }) {
  const started = performance.now(), responses = [];
  const messages = [{role:'system',content:systemPrompt(level,storyWords)},{role:'user',content:`前の場面（やさしく語り直したもの）: ${previous || 'なし'}\n\n場面（原文）:\n${plainOriginal(scene)}\n${feedback}`}];
  const request = {model:provider.model,messages:structuredClone(messages)};
  const evidence = {request,responses};
  async function ask(shape, schema) {
    for (let attempt=0;attempt<2;attempt++) {
      const raw = await provider.call(messages,schema); responses.push(raw); messages.push({role:'assistant',content:raw});
      try { return shape.parse(repairJson(raw)); } catch (error) {
        if (attempt) throw new Error('Invalid model JSON after repair and re-ask');
        const details = error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : 'Invalid JSON syntax';
        messages.push({role:'user',content:`The response is invalid: ${details}. Return only valid JSON matching the requested schema. Correct missing fields and types.`});
      }
    }
  }
  const check = text => tokenizeForLevel(text,level,{storyWords,vocab});
  try {
    const draft = await ask(draftShape,draftJson);
    draft.sentences=draft.sentences.flatMap(splitNarrative);
    let checked = await Promise.all(draft.sentences.map(check));
    const first = measure(checked.flatMap(s=>s.tokens)); let retries = 0;
    while ((needsRetry(checked.flatMap(s=>s.tokens), level) || draft.sentences.some(s=>[...s].length > sentenceCaps[level])) && retries < maxRetries) {
      const density=kanjiMetrics(checked.flatMap(s=>s.tokens),level).kanjiDensity;
      const densityBad=!inDensityBand(density,level);
      const offending = checked.map((s,index)=>({s,index})).filter(({s,index})=>s.offending.length || s.tokens.some(t=>t.hk&&t.k!=='story') || [...draft.sentences[index]].length > sentenceCaps[level] || densityBad || numberWordIssues(draft.sentences[index]).length);
      messages.push({role:'user',content:`Level check: vocabulary target ${targets[level]}; non-story kanji coverage must be 1.0. Density ${(100*density).toFixed(1)}%, required ${densityBands[level].map(n=>100*n).join('–')}%. ${density<densityBands[level][0] ? 'Write at-level words in kanji, for example 人、見、来、言、年、時、話、思、知、夜、道、家、声、顔、死 where allowed. Do not replace these with kana.' : 'If density is too high, use simpler faithful expressions and permitted kana, never remove events.'} These sentences need repair: ${offending.map(({s,index})=>`${index}: "${draft.sentences[index]}" (words to avoid: ${s.offending.join(', ')}; write these kanji words in hiragana: ${s.tokens.filter(t=>t.hk&&t.k!=='story').map(t=>t.s+' → '+(t.r ?? 'hiragana')).join(', ')}; maximum ${sentenceCaps[level]} characters)`).join(' ')} Rewrite only these sentences, with the same meaning and the same rules. Never merge indexes or return empty strings. Preserve each sentence separately; short dialogue is acceptable during indexed repair. Never spell numbers in kana. Return only JSON: {"rewrites": [{"index": n, "sentence": "..."}]}`});
      const valid = new Set(offending.map(o=>o.index));
      const shape = z.object({rewrites:z.array(z.object({index:z.number().int(),sentence:string})).refine(rows=>rows.length===valid.size && new Set(rows.map(r=>r.index)).size===valid.size && rows.every(r=>valid.has(r.index)), {message:`Expected exactly one rewrite for each index: ${[...valid].join(', ')}. Do not include any other indexes`})});
      const result = await ask(shape,rewriteJson);
      for (const row of result.rewrites) draft.sentences[row.index] = row.sentence;
      draft.sentences=draft.sentences.flatMap(splitNarrative);
      checked = await Promise.all(draft.sentences.map(check)); retries++;
    }
    let question = draft.question;
    let qChecked = await Promise.all([question.prompt,...question.options].map(check));
    if (qChecked.some(s=>s.offending.length || s.tokens.some(t=>t.hk&&t.k!=='story') || numberWordIssues(s.tokens.map(t=>t.s).join('')).length)) {
      messages.push({role:'user',content:`Simplify only the question and its options to JLPT ${level}. Avoid: ${qChecked.flatMap(s=>s.offending).join(', ')}. Write hard kanji in hiragana: ${qChecked.flatMap(s=>s.tokens.filter(t=>t.hk&&t.k!=='story').map(t=>t.s+' → '+t.r)).join(', ')}. Write number words in numeric digits, never kana. Preserve the correct answer and meaning. Return only JSON: {"question":{"prompt":"...","options":["...","...","..."],"answer":0}}`});
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
    const metrics = {...kanjiMetrics(checked.flatMap(s=>s.tokens),level),firstCoverage:first.coverage,finalCoverage:final.coverage,retries,seconds:(performance.now()-started)/1000,offendingFirst:first.offending,ghostWords:[...new Set(all.filter(t=>t.k==='ghost').map(t=>t.b ?? t.s))]};
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
  const jobs=tales.filter(t=>selectedTales.includes('all') || selectedTales.includes(t.id)).flatMap(tale=>selectedLevels.map(level=>({tale,level})));
  async function worker() { while(jobs.length) { const {tale,level}=jobs.shift();
    let previous='';
    for (const scene of readSource(tale.id).scenes) {
      const directory=join(paths.runs,name,level), file=join(directory,`${tale.id}-${scene.id}.json`);
      if (!selectedScenes.includes('all') && !selectedScenes.includes(scene.id)) continue;
      if (existsSync(file) && !args.includes('--force')) { const old=JSON.parse(readFileSync(file,'utf8')); if (old.retelling) { previous=old.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')).join(''); console.log(`${tale.id}/${scene.id}/${level}: skipped`); continue; } }
      const result=await retellScene({taleId:tale.id,scene,level,storyWords:readStoryWords(tale.id),vocab,provider,previous});
      if(name==='hosted'&&!result.failed) {
        const {repairLevel}=await import('./level-repair.mjs');
        const {repairFaithfulness}=await import('./faithfulness.mjs');
        const storyWords=readStoryWords(tale.id);
        await repairLevel({run:result,scene,storyWords,vocab,provider});
        await repairFaithfulness({run:result,taleId:tale.id,scene,storyWords,vocab,provider});
      }
      mkdirSync(directory,{recursive:true}); writeFileSync(file,JSON.stringify(result,null,2)+'\n');
      if (result.failed) { failed=true; console.error(`${tale.id}/${scene.id}/${level}: FAILED: ${result.error}`); }
      else { previous=result.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')).join(''); console.log(`${tale.id}/${scene.id}/${level}: ${result.metrics.firstCoverage.toFixed(3)} → ${result.metrics.finalCoverage.toFixed(3)}, ${result.metrics.seconds.toFixed(1)}s`); }
    }
  }
  }
  await Promise.all(Array.from({length:3},()=>worker()));
  if (failed) process.exitCode=1;
}
if (process.argv[1]?.endsWith('retell.mjs')) runCli().catch(e=>{console.error(e.message);process.exitCode=1;});

