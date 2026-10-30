import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inDensityBand,checkLadder,numberWordIssues,illegalTokens} from '../pipeline/ladder.mjs';
import {kanjiMetrics,tokenizeForLevel,kanjiLevels,hasHardKanji} from '../pipeline/check.mjs';
import {targets} from '../pipeline/config.mjs';
import {loadVocab,vocabFromRows,normalize} from '../pipeline/jlpt.mjs';
import {checkedSentences} from '../pipeline/level-repair.mjs';
import {targetedRewrite,reviewFaithfulness,regressionIssues} from '../pipeline/faithfulness.mjs';

test('density bands include their boundaries and reject both outside edges',()=>{
  for(const [level,low,high] of [['N5',0,.12],['N4',.10,.18],['N3',.18,.28],['N2',.25,.35],['N1',.30,.42]]){
    assert.ok(inDensityBand(low,level));assert.ok(inDensityBand(high,level));
    assert.equal(inDensityBand(high+.0001,level),false);
    if(low)assert.equal(inDensityBand(low-.0001,level),false);
  }
});
test('story kanji count for density but never reduce cumulative-list coverage',()=>{
  assert.deepEqual(kanjiMetrics([{s:'芳一',k:'story'},{s:'山',k:'known'},{s:'。',k:'plain'}],'N5'),{kanjiCoverage:1,kanjiDensity:.75});
});
test('advanced levels use cumulative vocabulary and exclude unlisted kanji even at N1',()=>{
  const vocab=loadVocab();
  for(const level of ['N2','N1']){
    for(const l of ['N5','N4','N3',...level==='N1'?['N2','N1']:['N2']]){
      const entry=vocab.byLevel[l].find(e=>e.expression);
      for(const key of [...normalize(entry.expression),...normalize(entry.reading)])assert.ok(vocab.cumulative(level).has(key));
    }
    assert.equal(hasHardKanji('𠀀',level),true);
    for(const [c,n] of Object.entries(kanjiLevels))assert.equal(hasHardKanji(c,level),n<Number(level.slice(1)));
  }
  assert.equal(targets.N2,.97);assert.equal(targets.N1,.98);
});
test('above-level numeral glyphs retain their value and receive mandatory ruby',async()=>{
  const result=await tokenizeForLevel('壱年','N5',{vocab:loadVocab()});
  const numeral=result.tokens[0];
  assert.equal(numeral.s,'壱');assert.equal(numeral.r,'いち');assert.equal(numeral.k,'story');assert.equal(numeral.hk,true);
  assert.equal(result.kanjiCoverage,1);
});
const make=(level,length,kanji,words)=>({level,sentences:[{tokens:[...words.map(w=>({s:w,k:'known',b:w})),{s:'山'.repeat(kanji)+'あ'.repeat(length-kanji-words.join('').length-1)+'。',k:'plain'}]}]});
test('five-level ladder requires strict increases in all three independent measurements',()=>{
  const vocab=vocabFromRows({N5:[{expression:'人',reading:'ひと'}],N4:[{expression:'声',reading:'こえ'}],N3:[{expression:'突然',reading:'とつぜん'}]});
  const rs={N5:make('N5',20,1,['人']),N4:make('N4',25,3,['人','人','声']),N3:make('N3',30,6,['人','声']),N2:make('N2',40,10,['人','声','突然']),N1:make('N1',50,15,['声','突然'])};
  assert.equal(checkLadder(rs,vocab).ladderOk,true);
  const tied=structuredClone(rs);tied.N3=make('N3',30,6,['人']);
  assert.ok(checkLadder(tied,vocab).reasons.includes('advancedShare'));
  const short=structuredClone(rs);short.N3=make('N3',24,6,['人','声']);
  assert.ok(checkLadder(short,vocab).reasons.includes('meanLength'));
  const sparse=structuredClone(rs);sparse.N3=make('N3',30,0,['人','声']);
  assert.ok(checkLadder(sparse,vocab).reasons.includes('kanjiDensity'));
  assert.equal(checkLadder({N5:rs.N5},vocab).ladderOk,false);
});
test('number-word rule catches malformed and normal kana numbers without confusing particles or names',()=>{
  for(const text of ['さんにじゅうねんまえ','さんじゅうねん前','じゅうろくさいです。','ひとりで来た。','ふたつあります。'])assert.ok(numberWordIssues(text).length,text);
  for(const text of ['三十年前','30年まえ','そこに人がいます。','芳一さんが来た。','いっしょに行く。','さんぽしました。'])assert.deepEqual(numberWordIssues(text),[],text);
  assert.deepEqual(numberWordIssues('高いつつみ',[{s:'高い'},{s:'つつみ'}]),[]);
  assert.deepEqual(numberWordIssues('いつつあります。',[{s:'いつつ'},{s:'あります'},{s:'。'}]),['いつつ']);
});
test('level spelling repair preserves story kanji and converts only hard non-story tokens',async()=>{
  const words=[{text:'芳一',reading:'ほういち',gloss:'a musician'}];
  const sentences=await checkedSentences(['ほういちは驚きました。'],'N5',words,loadVocab());
  const r={level:'N5',sentences,question:{prompt:{tokens:[{s:'？',k:'plain'}]},options:[]}};
  assert.equal(illegalTokens(r).length,0);
  assert.equal(sentences[0].tokens[0].s,'芳一');assert.equal(sentences[0].tokens[0].r,'ほういち');
  assert.ok(sentences[0].tokens.map(t=>t.s).join('').includes('おどろき'));
});
test('faithfulness repairs only cited sentences and leaves the rest byte-identical',async()=>{
  const r={level:'N5',sentences:[{tokens:[{s:'高い人です。'}]},{tokens:[{s:'町にいます。'}]}]};
  const evidence=[],provider={call:async()=>JSON.stringify({rewrites:[{index:0,sentence:'えらい人です。'}]})};
  const result=await targetedRewrite({scene:{original:[[{base:'身分の高い方です。'}]]},retelling:r,issues:[{sentence:'高い人です。',problem:'rank, not height',kind:'who'}],provider,evidence});
  assert.deepEqual(result,['えらい人です。','町にいます。']);assert.equal(evidence.length,1);
});
test('faithfulness judgment rejects invented sentence citations and re-asks',async()=>{
  let calls=0;const evidence=[];
  const provider={call:async()=>JSON.stringify({issues:calls++?[]:[{sentence:'not in draft',problem:'wrong',kind:'invented'}]})};
  const issues=await reviewFaithfulness({scene:{original:[[{base:'人です。'}]]},retelling:{sentences:[{tokens:[{s:'人です。'}]}]},provider,evidence});
  assert.deepEqual(issues,[]);assert.equal(evidence.length,2);
});
test('known rank regression is contextual and cannot be missed by an empty model judgment',()=>{
  const r={sentences:[{tokens:[{s:'わたしの上の人は高い人です。'}]}]};
  assert.equal(regressionIssues(r,{taleId:'hoichi',sceneId:'s05'})[0].kind,'who');
  assert.deepEqual(regressionIssues(r,{taleId:'mujina',sceneId:'s05'}),[]);
});
test('Yuki-Onna comparison refers to the other woodcutter, not the woman herself',()=>{
  const r={sentences:[{tokens:[{s:'女はあなたをじぶんと同じようにしようと思ったと言いました。'}]}]};
  assert.equal(regressionIssues(r,{taleId:'yukionna',sceneId:'s03'})[0].kind,'who');
  assert.deepEqual(regressionIssues(r,{taleId:'mujina',sceneId:'s03'}),[]);
});
