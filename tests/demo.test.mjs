import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCallCard, nextTurn } from '../src/demo-flow.mjs';
const demo = JSON.parse(readFileSync(new URL('../src/demo.json', import.meta.url), 'utf8'));

test('demo reaches completion only after all four answers and has playable local audio', () => {
  for (let i = 0; i < demo.turns.length; i++) {
    const turn = demo.turns[i];
    const audio = readFileSync(new URL(`../public/audio/${turn.id}.wav`, import.meta.url));
    assert.equal(audio.subarray(0, 4).toString(), 'RIFF');
    assert.ok(audio.length > 10000);
    assert.ok(turn.meaning && turn.answer && turn.answerMeaning);
    assert.deepEqual(nextTurn(i, demo.turns.length), i === demo.turns.length - 1 ? { kind: 'finished' } : { kind: 'turn', index: i + 1 });
  }
  assert.throws(() => nextTurn(4, 4), RangeError);
});

test('export preserves the user situation and transcript, and never claims a booking', () => {
  const card = buildCallCard({ scenario: demo.scenario, messages: [{ role: 'user', text: '夜７時以降なら家にいます。' }] });
  assert.ok(card.includes(demo.scenario));
  assert.ok(card.includes('夜７時以降なら家にいます。'));
  assert.ok(card.includes('No real appointment has been booked.'));
  assert.ok(!card.includes('もう一度お願いできますか？'));
});

test('prepared learner replies have playable local audio', () => {
  for (const turn of demo.turns) {
    const audio = readFileSync(new URL(`../public/audio/${turn.id}-reply.wav`, import.meta.url));
    assert.equal(audio.subarray(0, 4).toString(), 'RIFF');
    assert.ok(audio.length > 10000);
  }
});

test('curated readings cover every kanji in the scripted dialogue and answers', () => {
  const lexicon = JSON.parse(readFileSync(new URL('../src/japanese-lexicon.json', import.meta.url), 'utf8'));
  for (const text of [demo.opening, ...demo.turns.flatMap(turn => [turn.japanese, turn.answer])]) {
    const remainder = lexicon.reduce((value, word) => value.split(word.text).join(''), text);
    assert.ok(!/[\u4e00-\u9fff]/.test(remainder), `Missing reading in ${text}: ${remainder}`);
  }
});

test('call card exports only the supplied conversation content', () => {
  const phrase = { japanese: '水が漏れています。', romaji: 'mizu ga morete imasu.', role: 'user', turn: 1 };
  const card = buildCallCard({ scenario: 'Repair', messages: [{ role: 'user', text: phrase.japanese }], phrases: [phrase], words: [{ japanese: '水', romaji: 'mizu', meaning: 'water' }] });
  assert.ok(card.includes(phrase.japanese));
  assert.ok(card.includes(phrase.romaji));
  assert.ok(card.includes('水 · mizu · water'));
  assert.ok(!card.includes('もう一度'));
  assert.ok(!card.includes('排水'));
});
