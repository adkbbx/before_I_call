import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseChain} from '../pipeline/select-ladder.mjs';
const candidate=(n,cost=0)=>({stats:{kanjiDensity:n,meanLength:n,advancedShare:n},cost});
test('candidate selection requires every adjacent metric to rise and retains lowest cost evidence',()=>{
  const pools=[[candidate(1)],[candidate(4),candidate(2,1)],[candidate(3)],[candidate(4)],[candidate(5)]];
  assert.deepEqual(chooseChain(pools).map(c=>c.stats.meanLength),[1,2,3,4,5]);
  assert.equal(chooseChain([[candidate(1)],[candidate(1)]]),undefined);
  const bad=candidate(2);bad.stats.advancedShare=0;
  assert.equal(chooseChain([[candidate(1)],[bad]]),undefined);
});
