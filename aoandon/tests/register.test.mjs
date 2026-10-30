import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modernNarration} from '../pipeline/register.mjs';
test('N1 narration modernizes clear classical negatives while retaining quoted register and lexical words',()=>{
  assert.equal(modernNarration('見知らぬ男は、息も聞こえぬほど静かだった。'),'見知らない男は、息も聞こえないほど静かだった。');
  assert.equal(modernNarration('男は「知らぬ」と答えた。'),'男は「知らぬ」と答えた。');
  assert.equal(modernNarration('しぬ前に相手をけり倒した。'),'しぬ前に相手をけり倒した。');
});
