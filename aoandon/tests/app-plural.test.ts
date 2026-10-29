import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plural } from '../src/lib/plural.ts';
import { coverageLine } from '../src/lib/reader.ts';

test('counts use singular only for one, with optional irregular plurals', () => {
  for (const noun of ['tale', 'scene', 'word', 'ghost word']) {
    assert.equal(plural(0, noun), `0 ${noun}s`);
    assert.equal(plural(1, noun), `1 ${noun}`);
    assert.equal(plural(5, noun), `5 ${noun}s`);
  }
  assert.equal(plural(2, 'person', 'people'), '2 people');
});
test('Shelf uses scene singular for a one-scene tale', () => {
  assert.equal(coverageLine({ id: 'mujina', titleJa: '貉', titleEn: 'Mujina', translator: '戸川明三', illustration: 'assets/tale-mujina.webp', scenes: 1, coverage: { N4: .96 } }, 'N4'), '1 scene · 96% N4 words');
});
