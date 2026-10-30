import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeForLevel, kanjiMetrics, hasHardKanji } from '../pipeline/check.mjs';
import { vocabFromRows, loadVocab } from '../pipeline/jlpt.mjs';
import { needsRetry, systemPrompt, repairJson, retellScene } from '../pipeline/retell.mjs';
import { auditTales } from '../pipeline/audit.mjs';

test('unlisted lamp variant is modernized before tokenization and level spelling checks',async()=>{
  const r=await tokenizeForLevel('燈が消えた。','N1',{vocab:loadVocab()});
  assert.ok(!r.tokens.some(t=>t.s.includes('燈')));
  assert.equal(r.kanjiCoverage,1);
});

for (const [word, reading, expression] of [['僧','そう','そう'],['死','し','し'],['霊','れい','れい'],['復讐','ふくしゅう','復習']]) {
  test(`kanji vocabulary cannot borrow a homophone: ${word}`,async()=>{
    const vocab=vocabFromRows({N5:[{expression,reading,meaning:'different word'}]});
    const result=await tokenizeForLevel(word,'N5',{vocab});
    assert.ok(result.tokens.some(t=>t.k==='ghost'),JSON.stringify(result));
    assert.ok(!result.tokens.some(t=>t.k==='known'),JSON.stringify(result));
    const kana=await tokenizeForLevel(reading,'N5',{vocab});
    assert.ok(kana.tokens.some(t=>t.k==='known'));
  });
}
test('hard kanji includes story words and unlisted Han, independently of vocabulary',async()=>{
  const result=await tokenizeForLevel('芳一は驚きました。','N5',{vocab:loadVocab(),storyWords:[{text:'芳一',reading:'ほういち',gloss:'musician'}]});
  assert.equal(result.tokens[0].hk,true);
  assert.equal(result.tokens[0].r,'ほういち');
  assert.ok(result.tokens.some(t=>t.s.includes('驚')&&t.hk));
  assert.equal(hasHardKanji('𠀀','N3'),true);
  assert.equal(hasHardKanji('山','N5'),false);
});
test('kanji coverage and density count characters, including repeats and no-kanji text',()=>{
  assert.deepEqual(kanjiMetrics([{s:'山芳あ。'}],'N5'),{kanjiCoverage:.5,kanjiDensity:.5});
  assert.deepEqual(kanjiMetrics([{s:'かな。'}],'N5'),{kanjiCoverage:1,kanjiDensity:0});
  assert.deepEqual(kanjiMetrics([],'N5'),{kanjiCoverage:1,kanjiDensity:0});
});
test('retry independently enforces vocabulary, hard kanji and N5 density',()=>{
  assert.equal(needsRetry([{s:'あ',k:'ghost'}],'N4'),true);
  assert.equal(needsRetry([{s:'芳',k:'known'}],'N4'),true);
  assert.equal(needsRetry([{s:'山山',k:'known'}],'N5'),true);
  assert.equal(needsRetry([{s:'山山',k:'known'}],'N4'),true);
  assert.equal(needsRetry([{s:'山なのです。',k:'known'}],'N4'),false);
  assert.equal(needsRetry([{s:'かな',k:'known'}],'N5'),false);
});
test('level prompts specify stricter sentence, grammar and kanji rules',()=>{
  for(const [level,cap] of [['N5',20],['N4',28],['N3',40]]) {
    const prompt=systemPrompt(level,[]);
    assert.ok(prompt.includes(`at most ${cap} characters`));
    assert.ok(prompt.includes('No idioms'));
    assert.ok(prompt.includes('申す'));
  }
  assert.ok(systemPrompt('N5',[]).includes('Picture-book'));
  for(const [level,cap,grammar] of [['N2',55,'～ものの'],['N1',70,'～ともなく']]){
    const prompt=systemPrompt(level,[]);
    assert.ok(prompt.includes(`at most ${cap} characters`));
    assert.ok(prompt.includes(grammar));
    assert.ok(prompt.includes('No modern slang'));
    assert.ok(prompt.includes('All kanji from easier levels'));
  }
});

test('kanji-only retries are bounded at three and retain hard-kanji readings',async()=>{
  const requests=[];
  const question={prompt:'人ですか。',options:['人','人。','人！'],answer:0};
  const provider={name:'hosted',model:'fake',async call(messages){
    requests.push(messages.at(-1).content);
    return JSON.stringify(requests.length===1?{sentences:['驚く。'],question}:{rewrites:[{index:0,sentence:'驚く。'}]});
  }};
  const vocab=vocabFromRows({N5:[{expression:'驚く',reading:'おどろく',meaning:'be surprised'},{expression:'人',reading:'ひと',meaning:'person'}]});
  const run=await retellScene({taleId:'sample',scene:{id:'s01',original:[[{base:'驚く。'}]]},level:'N4',vocab,provider});
  assert.equal(run.failed,undefined,run.error);
  assert.equal(run.metrics.retries,3);
  assert.equal(requests.length,4);
  assert.ok(requests[1].includes('write these kanji words in hiragana: 驚く'));
  assert.equal(run.retelling.sentences[0].tokens[0].hk,true);
  assert.ok(run.retelling.sentences[0].tokens[0].r);
});

test('audit checks actual ruby decisions in both narrative and questions',async()=>{
  const token={s:'芳',r:'ほう',k:'known'},sentence={tokens:[token,{s:'。',k:'plain'}]};
  const tale={id:'sample',scenes:[{id:'s01',retellings:{N5:{sentences:[sentence],question:{prompt:sentence,options:[sentence,sentence,sentence]},metrics:{finalCoverage:1}}}}]};
  let row=(await auditTales([tale]))[0];assert.equal(row.missingRuby,5);
  token.hk=true;
  row=(await auditTales([tale]))[0];assert.equal(row.missingRuby,0);
  assert.equal(row.kanjiCoverage,0);assert.equal(row.kanjiDensity,.5);
  assert.equal(row.meanLength,2);
});

test('local repair handles the observed malformed Gemma sentence key only',()=>{
  assert.deepEqual(repairJson('{"sentences([": ["人です。"]}'),{sentences:['人です。']});
  assert.deepEqual(repairJson('{"different": 1}'),{different:1});
});

test('audit distinguishes literary negatives from polite negatives and the verb die',async()=>{
  const texts=['犬は死ぬ。','いきませんでした。','みずをのみます。しぬまえに、ぬのをください。きずがあります。','見ぬ。','食べずに。','もうしました。'];
  const sentence=s=>({tokens:[{s,k:'plain'}]});
  const tale={id:'test',scenes:[{id:'s01',retellings:{N5:{sentences:texts.map(sentence),question:{prompt:sentence('人ですか。'),options:[]},metrics:{finalCoverage:1}}}}]};
  const row=(await auditTales([tale]))[0];
  assert.deepEqual(row.hits.map(h=>h.sentence),texts.slice(3));
});

test('audit joins model array fragments before measuring sentence length',async()=>{
  const sentence=s=>({tokens:[{s,k:'plain'}]});
  const texts=['人は、','山にいます。'];
  const tale={id:'test',scenes:[{id:'s01',retellings:{N5:{sentences:texts.map(sentence),question:{prompt:sentence('人？'),options:[]},metrics:{finalCoverage:1}}}}]};
  const row=(await auditTales([tale]))[0];
  assert.equal(row.meanLength,[...texts.join('')].length);
  assert.equal(row.maxLength,[...texts.join('')].length);
});

test('a full scene in one draft array entry retains all events during indexed repair',async()=>{
  const question={prompt:'人ですか。',options:['人','人。','人！'],answer:0};
  let calls=0;
  const provider={name:'hosted',model:'fake',async call(messages){
    if(!calls++)return JSON.stringify({sentences:['人です。驚くですからです。山です。'],question});
    assert.ok(messages.at(-1).content.includes('1: "驚くですからです。"'));
    assert.ok(!messages.at(-1).content.includes('0: "人です。'));
    return JSON.stringify({rewrites:[{index:1,sentence:'おどろくですからです。'}]});
  }};
  const vocab=vocabFromRows({N5:[{expression:'人',reading:'ひと',meaning:'person'},{expression:'山',reading:'やま',meaning:'mountain'},{expression:'驚く',reading:'おどろく',meaning:'be surprised'}]});
  const run=await retellScene({taleId:'sample',scene:{id:'s01',original:[[{base:'人です。驚く。山です。'}]]},level:'N4',vocab,provider});
  assert.equal(run.failed,undefined,run.error);
  assert.deepEqual(run.retelling.sentences.map(s=>s.tokens.map(t=>t.s).join('')),['人です。','おどろくですからです。','山です。']);
});

