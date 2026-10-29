import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRubyLine, stripHeaderAndColophon, splitScenes, parseAozora } from '../pipeline/aozora.mjs';
import { normalize, parseCsv, vocabFromRows, loadVocab } from '../pipeline/jlpt.mjs';
import { tokenizeForLevel, measure } from '../pipeline/check.mjs';
import { isContentWord } from '../pipeline/tokenize.mjs';
import { retellScene, repairJson, shuffleQuestion, createProvider, systemPrompt } from '../pipeline/retell.mjs';
import { assembleTale, makeIndex } from '../pipeline/build-tales.mjs';
import { createLiveServer } from '../server/live.mjs';
import { taleSchema, retellingSchema } from '../src/lib/schema.ts';
const vocab=loadVocab();
const scene={id:'s01',original:[[{base:'人が来ました。'}]]};
const question={prompt:'何が来ましたか。',options:['人','犬','猫'],answer:0};
const provider=(answers)=>({name:'ollama',model:'fake',call:async()=>{assert.ok(answers.length,'unexpected model call');return answers.shift();}});
const draft=(sentences, q=question)=>JSON.stringify({sentences,question:q});

test('Aozora ruby: explicit bases, trailing kanji, repetition and kana variants',()=>{
  assert.deepEqual(parseRubyLine('前｜かな交じり《よみ》後、漢字々〆ヵヶ《かんじ》。'),[{base:'前'},{base:'かな交じり',rt:'よみ'},{base:'後、'},{base:'漢字々〆ヵヶ',rt:'かんじ'},{base:'。'}]);
  assert.deepEqual(parseRubyLine('かな漢字《かんじ》'),[{base:'かな'},{base:'漢字',rt:'かんじ'}]);
});
test('Aozora header, colophon, notes, gaiji and paragraph stripping',()=>{
  const raw='題\r\n著者\r\n------\r\n【テキスト中に現れる記号について】\r\n説明\r\n------\r\n\r\n本文［＃注］※［＃U+20000］\r\n\r\n※［＃不明］\r\n底本：本\r\n入力：人';
  assert.equal(stripHeaderAndColophon(raw).colophon,'底本：本\n入力：人');
  const parsed=parseAozora(raw,'sample');assert.deepEqual(parsed.paragraphs,[[{base:'本文𠀀'}],[{base:'〓'}]]);assert.match(parsed.warnings[0],/Unresolved/);
  assert.deepEqual(stripHeaderAndColophon('本文'),{text:'本文',colophon:''});
});
test('scene partition respects 250..500 bounds whenever paragraph boundaries permit',()=>{
  const paragraphs=[200,100,200,250,250].map(n=>[{base:'あ'.repeat(n)}]);
  const scenes=splitScenes(paragraphs);assert.deepEqual(scenes.map(s=>s.original.flat().reduce((n,r)=>n+r.base.length,0)),[500,500]);
  assert.deepEqual(scenes.flatMap(s=>s.original),paragraphs);assert.equal(scenes[1].id,'s02');
  assert.equal(splitScenes([[{base:'あ'.repeat(501)}]])[0].original[0][0].base.length,501);
  assert.deepEqual(splitScenes([]),[]);
});
test('CSV quoting, alternatives, notes, lowest level and cumulative vocabulary',()=>{
  assert.deepEqual(parseCsv('expression,reading,meaning\n"私・わたし",わたし,"I, me"\n')[1],['私・わたし','わたし','I, me']);
  assert.deepEqual(normalize('〜屋（接尾）・店、家;館/～室[注]'),['屋','店','家','館','室']);
  const v=vocabFromRows({N5:[{expression:'来る/くる',reading:'くる',meaning:'come'}],N4:[{expression:'来る',reading:'くる',meaning:'come again'},{expression:'港',reading:'みなと',meaning:'port'}]});
  assert.equal(v.lookup('くる').level,'N5');assert.equal(v.lookup('来る').meaning,'come');assert.ok(v.cumulative('N4').has('くる'));assert.ok(v.cumulative('N4').has('港'));assert.ok(!v.cumulative('N5').has('港'));
});
const pairs=[['来る','くる'],['ある','ある'],['有る','ある'],['食べました','食べる'],['お茶','おちゃ'],['静か','しずか'],['ゆっくり','ゆっくり'],['行きました','行く'],['見ました','見る'],['飲みました','飲む'],['買いました','買う'],['書きました','書く'],['読みました','読む'],['聞きました','聞く'],['話しました','話す'],['帰りました','帰る'],['大きい','おおきい'],['小さい','ちいさい'],['新しい','あたらしい'],['古い','ふるい'],['高い','たかい'],['安い','やすい'],['長い','ながい'],['短い','みじかい'],['白い','しろい'],['黒い','くろい'],['赤い','あかい'],['青い','あおい'],['暑い','あつい'],['寒い','さむい'],['水','みず'],['猫','ねこ'],['犬','いぬ'],['学校','がっこう']];
for(const [surface,key] of pairs) test(`checker recognises ${surface} via ${key}`,async()=>{
  const result=await tokenizeForLevel(surface,'N4',{vocab});assert.ok(result.tokens.some(t=>t.k==='known'),JSON.stringify(result));assert.equal(result.offending.length,0,JSON.stringify(result));
});
test('coverage maths, plain kinds, story span protection, readings and JLPT glosses',async()=>{
  assert.deepEqual(measure([{s:'a',k:'known'},{s:'b',b:'b',k:'ghost'},{s:'c',k:'story'},{s:'。',k:'plain'}]),{coverage:0.5,offending:['b']});
  assert.equal(measure([{k:'story'}]).coverage,1);
  const result=await tokenizeForLevel('芳一はお茶を飲みました。','N4',{vocab,storyWords:[{text:'芳一',reading:'ほういち',gloss:'a musician'}]});
  assert.equal(result.tokens[0].s,'芳一');assert.equal(result.tokens[0].k,'story');assert.equal(result.tokens[0].g,'a musician');assert.equal(result.coverage,1);
  assert.ok(result.tokens.some(t=>t.s==='は'&&t.k==='plain'));assert.ok(result.tokens.some(t=>t.s==='まし'&&t.k==='plain'));
  assert.ok(result.tokens.filter(t=>!/[一-龯]/.test(t.s)).every(t=>!t.r));assert.ok(result.tokens.some(t=>t.k==='known'&&t.gs==='jlpt'&&t.g));
  for(const pos_detail_1 of ['固有名詞','数','代名詞']) assert.equal(isContentWord({pos:'名詞',pos_detail_1}),false);
});
test('retell retries replace only offending sentences, preserving first metrics',async()=>{
  const v=vocabFromRows({N5:[{expression:'猫',reading:'ねこ',meaning:'cat'}]});
  const q={prompt:'猫？',options:['猫','猫。','猫！'],answer:0};
  const result=await retellScene({taleId:'sample',scene,level:'N4',vocab:v,provider:provider([draft(['猫。','魑魅。'],q),JSON.stringify({rewrites:[{index:1,sentence:'猫！'}]})])});
  assert.ok(!result.failed,result.error);assert.equal(result.metrics.firstCoverage,0.5);assert.equal(result.metrics.finalCoverage,1);assert.equal(result.metrics.retries,1);assert.deepEqual(result.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')),['猫。','猫！']);
});
test('ghost glosses use higher JLPT entries and one model batch; question leftovers are ghosts',async()=>{
  const v=vocabFromRows({N5:[{expression:'猫',reading:'ねこ',meaning:'cat'}],N2:[{expression:'魑魅',reading:'ちみ',meaning:'mountain spirit'}]});
  const q={prompt:'魑魅？',options:['猫','猫。','猫！'],answer:0};
  const result=await retellScene({taleId:'sample',scene,level:'N4',vocab:v,provider:provider([draft(['魑魅。魍魎。'],q),'{"rewrites":[{"index":0,"sentence":"魑魅。魍魎。"}]}','{"rewrites":[{"index":0,"sentence":"魑魅。魍魎。"}]}',JSON.stringify({question:q}),'{"glosses":{"魍魎":"wandering spirit"}}'])});
  assert.ok(!result.failed,result.error);const tokens=result.retelling.sentences.flatMap(s=>s.tokens);assert.ok(tokens.some(t=>t.k==='ghost'&&t.gs==='jlpt'));assert.ok(tokens.some(t=>t.k==='ghost'&&t.gs==='model'));assert.ok(result.retelling.question.prompt.tokens.some(t=>t.k==='ghost'));
});
test('JSON local repair, re-ask and failed evidence are bounded',async()=>{
  assert.deepEqual(repairJson('text ```json\n{"ok":true}\n``` text'),{ok:true});
  const answers=['bad',draft(['猫。'])];const good=await retellScene({taleId:'sample',scene,level:'N4',vocab,provider:provider(answers)});assert.ok(!good.failed,good.error);assert.equal(good.responses.length,2);
  const bad=await retellScene({taleId:'sample',scene,level:'N4',vocab,provider:provider(['bad','still bad'])});assert.equal(bad.failed,true);assert.equal(bad.responses.length,2);assert.ok(bad.metrics.seconds>=0);
});
test('deterministic option shuffle preserves answer for every seed',()=>{
  for(let n=0;n<30;n++){const q=shuffleQuestion(question,`sample/s${n}/N4`);assert.deepEqual(q,shuffleQuestion(question,`sample/s${n}/N4`));assert.equal(q.options[q.answer],question.options[question.answer]);}
  assert.match(systemPrompt('N4',[]),/Use です\/ます and polite past forms/);
});
test('provider HTTP payloads use correct schemas, timeout and mocked hosted key only',async()=>{
  for(const name of ['hosted','ollama']) {
    const p=createProvider({name,baseUrl:'http://example.invalid/v1/',model:'fake',apiKey:'fake-test-key'},async(url,options)=>{
      assert.ok(options.signal);const body=JSON.parse(options.body);assert.equal(body.model,'fake');
      if(name==='hosted'){assert.equal(url,'http://example.invalid/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer fake-test-key');assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.max_tokens,1536);}else{assert.equal(body.think,false);assert.equal(body.stream,false);assert.deepEqual(body.options,{temperature:0.4,num_ctx:8192,num_predict:1536,repeat_penalty:1.15});assert.deepEqual(body.format,{type:'object'});}
      return {ok:true,json:async()=>name==='ollama'?{message:{content:'{}'}}:{choices:[{message:{content:'{}'}}]}};
    });assert.equal(await p.call([],{type:'object'}),'{}');
  }
});
test('build validates fixture evidence, prefers hosted and calculates index means',async()=>{
  const run=await retellScene({taleId:'sample',scene,level:'N4',vocab,provider:provider([draft(['猫。'])])});
  retellingSchema.parse(run.retelling);
  const config={id:'sample',titleJa:'話',titleEn:'Tale',translator:'テスト',aozoraCard:'https://example.invalid/card'};
  const source={colophon:'credit',scenes:[scene]};
  const tale=assembleTale(config,source,[],(p,l)=>l==='N4'?{retelling:{...run.retelling,provider:p}}:undefined);
  assert.equal(tale.scenes[0].retellings.N4.provider,'hosted');taleSchema.parse(tale);assert.equal(makeIndex([tale]).tales[0].coverage.N4,1);
  assert.equal(assembleTale(config,source,[],()=>undefined),null);
  assert.throws(()=>assembleTale(config,source,[],()=>({retelling:{bad:true}})));
});
test('live API health, malformed body, unknown scene, busy 429 and schema-valid success',async()=>{
  const run=await retellScene({taleId:'mujina',scene,level:'N4',vocab,provider:provider([draft(['猫。'])])});
  let release,entered;const begun=new Promise(r=>entered=r);const gate=new Promise(r=>release=r);
  const server=createLiveServer({provider:{model:'fake'},vocab,source:()=>({scenes:[scene]}),storyWords:()=>[],run:async()=>{entered();await gate;return run;}});
  const {Readable}=await import('node:stream');
  const call=(method,path,body)=>new Promise(resolve=>{
    const req=Readable.from(body?[Buffer.from(body)]:[]);req.method=method;req.url=path;
    const res={writeHead(status){this.status=status;},end(raw){resolve({status:this.status,body:JSON.parse(raw)});}};
    server.emit('request',req,res);
  });
  try {
    assert.equal((await call('GET','/api/health')).body.model,'fake');assert.equal((await call('POST','/api/retell','bad')).status,400);assert.equal((await call('POST','/api/retell',JSON.stringify({taleId:'mujina',sceneId:'s99',level:'N4'}))).status,400);
    const body=JSON.stringify({taleId:'mujina',sceneId:'s01',level:'N4'});const pending=call('POST','/api/retell',body);await begun;assert.equal((await call('POST','/api/retell',body)).status,429);release();const response=await pending;assert.equal(response.status,200);retellingSchema.parse(response.body);
  } finally {release();server.close();}
});

test('JSON re-ask identifies missing rewrite indexes rather than repeating a generic error',async()=>{
  const v=vocabFromRows({N5:[{expression:'猫',reading:'ねこ',meaning:'cat'}]});
  const q={prompt:'猫？',options:['猫','猫。','猫！'],answer:0};
  const answers=[draft(['猫。','魑魅。'],q),'{"rewrites":[]}','{"rewrites":[{"index":1,"sentence":"猫。"}]}'];
  let corrected=false;
  const fake={name:'ollama',model:'fake',async call(messages){if(answers.length===1){assert.match(messages.at(-1).content,/Expected exactly one rewrite for each index: 1/);corrected=true;}return answers.shift();}};
  const result=await retellScene({taleId:'sample',scene,level:'N4',vocab:v,provider:fake});
  assert.equal(result.failed,undefined,result.error);assert.equal(corrected,true);assert.equal(result.metrics.retries,1);
});

test('gloss repair requires the exact requested keys and includes them in the prompt',async()=>{
  const v=vocabFromRows({N5:[{expression:'猫',reading:'ねこ',meaning:'cat'}]});
  const q={prompt:'猫？',options:['猫','猫。','猫！'],answer:0};
  const answers=[draft(['魍魎。'],q),'{"rewrites":[{"index":0,"sentence":"魍魎。"}]}','{"rewrites":[{"index":0,"sentence":"魍魎。"}]}','{"glosses":{"別の語":"wrong key"}}','{"glosses":{"魍魎":"wandering spirit"}}'];
  const fake={name:'ollama',model:'fake',async call(messages){if(answers.length===2)assert.match(messages.at(-1).content,/"魍魎":"English gloss"/);if(answers.length===1)assert.match(messages.at(-1).content,/required gloss key verbatim: 魍魎/);return answers.shift();}};
  const result=await retellScene({taleId:'sample',scene,level:'N4',vocab:v,provider:fake});
  assert.equal(result.failed,undefined,result.error);assert.equal(result.retelling.sentences[0].tokens[0].g,'wandering spirit');
});

test('local JSON repair restores only a missing final rewrite-string quote',()=>{
  const broken='{"rewrites":[{"index":14,"sentence":"「昔、武士だったのでしょう。」}]}';
  assert.deepEqual(repairJson(broken),{rewrites:[{index:14,sentence:'「昔、武士だったのでしょう。」'}]});
  const valid={rewrites:[{index:0,sentence:'「記号は }]} です。」'}]};assert.deepEqual(repairJson(JSON.stringify(valid)),valid);
  assert.throws(()=>repairJson('{"rewrites":[{"index":0,"sentence":"unfinished}]}'));
  assert.throws(()=>repairJson('{"other":"文。}]}'));
});
