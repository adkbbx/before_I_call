import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atLevelSpelling} from '../pipeline/spelling.mjs';
import {hasHardKanji} from '../pipeline/check.mjs';

test('canonical spellings use only cumulative permitted kanji',()=>{
  for(const level of ['N5','N4','N3','N2','N1']){
    const text=atLevelSpelling('じぶんはあかりを見て、おどろいた。',level);
    assert.equal(hasHardKanji(text,level),false);
  }
  // 分 is level 0 in the pinned list, so 自分 must stay kana even at N1.
  assert.equal(atLevelSpelling('じぶんはあかりを見て、おどろいた。','N1'),'じぶんは明かりを見て、驚いた。');
});
test('spelling normalization avoids ambiguous homophones and embedded strings',()=>{
  for(const text of ['箱につめた。','思い浮かべる。','おしょうがつ。','あやしき者。','おどろおどろしい。','がいとうする。'])assert.equal(atLevelSpelling(text,'N1'),text);
  assert.equal(atLevelSpelling('つめたいどうぐ。','N1'),'冷たいどうぐ。');
});
