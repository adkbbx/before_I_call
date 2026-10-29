import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeText,tokenizeForLevel} from '../pipeline/check.mjs';
import {loadVocab} from '../pipeline/jlpt.mjs';
import {readStoryWords,systemPrompt} from '../pipeline/retell.mjs';
import {parseRubyLine} from '../pipeline/aozora.mjs';
const vocab=loadVocab(),storyWords=readStoryWords('mujina');
const check=text=>tokenizeForLevel(text,'N4',{vocab,storyWords});
const runSentences=[
  'とうきょうに きこくざかという さかがあります。',
  'さかの となりには、ふかい 濠があります。',
  'もう ひとつの となりには、ながい かべがあります。',
  'むかし、よるの このみちは とても しずかでした。',
  'だから、ひとりで あるく ひとは いませんでした。',
  'みんな とおまわりしました。',
  'なぜなら、そこに 貉が いたからです。',
  'さんじゅうねんまえに、ある しょうにんが 貉を みました。',
  'そのひとの はなしを します。',
];
for(const [index,sentence]of runSentences.entries()) test(`saved hosted draft ${index+1}: spacing is removed before tokenisation`,async()=>{
  const result=await check(sentence);
  assert.deepEqual(result,await check(sentence.replaceAll(' ','')));
  assert.ok(result.tokens.every(t=>!/[ 　]/.test(t.s)));
});
test('prompt requests normal spelling, numbers, kanji and exact story words with readings',()=>{
  const prompt=systemPrompt('N4',storyWords);
  assert.ok(prompt.includes('Write normal Japanese with no spaces between words. Use kanji for words a N4 learner reads in kanji and for every story word; write other words in hiragana. The reader shows furigana, so do not avoid kanji the learner knows. Write numbers as 三十年 or 30年, never as kana.'));
  assert.ok(prompt.includes('紀伊国坂（きいのくにざか）'));
  assert.ok(prompt.includes('Copy every story word exactly in kanji'));
});
test('full-width spaces and digits normalise without changing punctuation',async()=>{
  assert.equal(normalizeText('　３０ 年 前！ ?'),'30年前！?');
  const result=await check('３０ 年 前に、ある 商人が 貉を 見ました。');
  assert.deepEqual(result,await check('30年前に、ある商人が貉を見ました。'));
  assert.ok(result.tokens.some(t=>t.s==='30'));
  assert.ok(result.tokens.some(t=>t.s==='年'));
  assert.ok(!result.offending.some(w=>/ゅうねん|さんじ/.test(w)));
});
test('normal Japanese versions of draft sentences have complete lexical words',async()=>{
  for(const text of ['坂の隣には、深い濠があります。','昔、夜のこの道はとても静かでした。','だから、一人で歩く人はいませんでした。']) {
    const result=await check(text);
    assert.equal(result.coverage,1,JSON.stringify(result));
    assert.ok(!result.offending.some(w=>['さ','の','であるく'].includes(w)));
  }
});
test('kana story-word readings match complete spans and display canonical kanji',async()=>{
  const kana=await check('きいのくにざかには、むじながいました。');
  const kanji=await check('紀伊国坂には、貉がいました。');
  assert.deepEqual(kana,kanji);
  const first=kana.tokens[0];assert.deepEqual(first,{s:'紀伊国坂',r:'きいのくにざか',b:'紀伊国坂',k:'story',g:storyWords.find(w=>w.text==='紀伊国坂').gloss});
  const spaced=await check('きいの くにざかには、む　じながいました。');assert.deepEqual(spaced,kanji);
  assert.equal(kana.coverage,1);
});
test('longest story reading wins and empty readings never create zero-length matches',async()=>{
  const words=[{text:'芳一',reading:'ほういち',gloss:'a musician'},{text:'芳',reading:'ほう',gloss:'a name'},{text:'空',reading:'',gloss:'empty'}];
  const result=await tokenizeForLevel('ほういちは来ました。','N4',{vocab,storyWords:words});
  assert.equal(result.tokens[0].s,'芳一');assert.equal(result.tokens[0].k,'story');
});
test('story words agree with source ruby wherever ruby is supplied',()=>{
  const data=JSON.parse(readFileSync(new URL('../pipeline/story-words.json',import.meta.url),'utf8'));
  for(const [id,entry]of Object.entries(data)){
    const source=JSON.parse(readFileSync(new URL(`../data/source/${id}.json`,import.meta.url),'utf8'));
    const runs=source.paragraphs.flat(),text=runs.map(r=>r.base).join('');
    for(const word of entry.words){
      if(word.text==='紀伊国坂') {assert.ok(text.includes('紀国坂'));continue;}
      assert.ok(text.includes(word.text),`${id}: ${word.text} absent from source`);
      for(const ruby of runs.filter(r=>r.base===word.text&&r.rt)) assert.equal(word.reading,ruby.rt,`${id}: ${word.text}`);
    }
    assert.equal(entry.reviewed,false);
  }
});
test('Aozora named exclamation gaiji resolve; unknown gaiji retain warnings',()=>{
  const warnings=[];
  assert.deepEqual(parseRubyLine('※［＃感嘆符二つ、1-8-75］※［＃感嘆符三つ、231-8］※［＃「廴＋囘」、第4水準2-12-11］',warnings),[{base:'‼！！！〓'}]);
  assert.equal(warnings.length,1);assert.match(warnings[0],/廴＋囘/);
});

test('nearby そば stays ordinary vocabulary instead of becoming noodle kanji',async()=>{
  const result=await check('濠のそばに、蕎麦屋がいました。');
  assert.ok(result.tokens.some(t=>t.s==='そば'&&t.k==='known'));
  assert.ok(!result.tokens.some(t=>t.s==='蕎麦'));
  assert.ok(result.tokens.some(t=>t.s==='蕎麦屋'&&t.k==='story'));
});
