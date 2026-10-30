import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeForLevel } from '../pipeline/check.mjs';
import { loadVocab } from '../pipeline/jlpt.mjs';

const vocab = loadVocab();

test('a kana spelling of a word whose kanji is above the level stays one word', async () => {
  const { tokens } = await tokenizeForLevel('このさかのとなりには広い濠があります。', 'N4', { vocab, storyWords: [{ text: '濠', reading: 'ほり', gloss: 'moat' }] });
  const saka = tokens.find(t => t.s === 'さか');
  assert.ok(saka, JSON.stringify(tokens.map(t => t.s)));
  assert.equal(saka.b, '坂');
  assert.ok(!tokens.some(t => t.s === 'さ'), JSON.stringify(tokens.map(t => t.s)));
});

test('a verb stem and its ending are not merged into a noun (いた is not 板)', async () => {
  const { tokens } = await tokenizeForLevel('それは貉がそこにいたからです。', 'N4', { vocab, storyWords: [{ text: '貉', reading: 'むじな', gloss: 'mujina' }] });
  assert.ok(!tokens.some(t => t.b === '板'), JSON.stringify(tokens.map(t => [t.s, t.b, t.k])));
  assert.ok(!tokens.some(t => t.s === 'いた' && t.k === 'ghost'), JSON.stringify(tokens.map(t => [t.s, t.k])));
});

test('single kana and nominalising の are never marked as hard words', async () => {
  const { tokens } = await tokenizeForLevel('人は一人で歩くのをきらいました。', 'N4', { vocab });
  const ghosts = tokens.filter(t => t.k === 'ghost').map(t => t.s);
  assert.ok(ghosts.every(s => [...s].length > 1), JSON.stringify(ghosts));
  assert.ok(!ghosts.includes('の'), JSON.stringify(ghosts));
});
