import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creditLine, taleSchema } from '../src/lib/schema.ts';
import { addGhost, blowOut, DEMO_START_OUT, initialNight, isRevealed, lanternIntensity, litCandles, loadNight, removeGhost, roomBrightness, saveNight, sceneKey, TOTAL_CANDLES } from '../src/lib/night.ts';
import { toAnkiTsv, toCsv } from '../src/lib/anki.ts';
import { parseRoute, routeHref } from '../src/lib/route.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/tale.fixture.json', import.meta.url), 'utf8'));

test('fixture tale passes the shared schema and has a credit line', () => {
  const tale = taleSchema.parse(fixture);
  assert.equal(creditLine(tale), 'Lafcadio Hearn, tr. テスト, Aozora Bunko');
});

test('a retelling stored under the wrong level is rejected', () => {
  const broken = structuredClone(fixture);
  broken.scenes[0].retellings.N4.level = 'N3';
  assert.equal(taleSchema.safeParse(broken).success, false);
});

test('blowing out a scene counts once per scene and level', () => {
  const key = sceneKey('mujina', 's01', 'N4');
  const once = blowOut(initialNight(), key);
  assert.equal(litCandles(once), TOTAL_CANDLES - 1);
  assert.equal(blowOut(once, key), once);
  assert.equal(litCandles(blowOut(once, sceneKey('mujina', 's01', 'N3'))), TOTAL_CANDLES - 2);
});

test('the demo night starts at the 99th tale and reveals after one more scene', () => {
  const demo = initialNight('N4', true);
  assert.equal(demo.out, DEMO_START_OUT);
  assert.equal(isRevealed(demo), false);
  const revealed = blowOut(demo, sceneKey('mujina', 's09', 'N4'));
  assert.equal(isRevealed(revealed), true);
  assert.equal(blowOut(revealed, sceneKey('chawan', 's01', 'N4')), revealed);
});

test('room brightness and lantern intensity follow DESIGN.md', () => {
  assert.equal(roomBrightness(1), 1);
  assert.equal(roomBrightness(0), 0.35);
  assert.equal(roomBrightness(2), 1);
  assert.equal(lanternIntensity(1), 0.55);
  assert.equal(lanternIntensity(0), 1);
});

test('ghost words are de-duplicated and removable', () => {
  const ghost = { word: '黄昏', reading: 'たそがれ', gloss: 'dusk', source: 'jlpt' as const, sentence: '黄昏のころ。', taleId: 'mujina' };
  const state = addGhost(addGhost(initialNight(), ghost), ghost);
  assert.equal(state.ghosts.length, 1);
  assert.equal(removeGhost(state, '黄昏').ghosts.length, 0);
});

test('storage that throws or holds junk still gives a working night', () => {
  const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadNight(false, throwing), initialNight());
  assert.equal(saveNight(initialNight(), throwing), false);
  const junk = { getItem: () => '{"version":1,"out":-4}', setItem: () => {} };
  assert.deepEqual(loadNight(false, junk), initialNight());
  const memory = new Map<string, string>();
  const store = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
  const saved = blowOut(initialNight(), 'a/s01/N4');
  assert.equal(saveNight(saved, store), true);
  assert.deepEqual(loadNight(false, store), saved);
  assert.deepEqual(loadNight(true, store), initialNight('N4', true));
});

test('Anki and CSV exports escape tabs, newlines, quotes and HTML', () => {
  const ghosts = [{ word: '物の怪', reading: 'もののけ', gloss: 'a "spirit"\tthat\nhaunts', source: 'model' as const, sentence: '<b>物の怪</b>が出た。', taleId: 'hoichi' }];
  const tsv = toAnkiTsv(ghosts, id => `credit ${id}`);
  const lines = tsv.trimEnd().split('\n');
  assert.deepEqual(lines.slice(0, 4), ['#separator:tab', '#html:true', '#columns:Front\tBack\tTags', '#tags column:3']);
  assert.equal(lines[4].split('\t').length, 3);
  assert.match(lines[4], /&lt;b&gt;/);
  assert.match(lines[4], /Gemma gloss/);
  const csv = toCsv(ghosts, id => `credit ${id}`);
  assert.match(csv, /"a ""spirit""\tthat\nhaunts"/);
});

test('hash routes round-trip', () => {
  for (const route of [{ name: 'room' as const }, { name: 'shelf' as const }, { name: 'reader' as const, taleId: 'yukionna' }, { name: 'about' as const }]) {
    assert.deepEqual(parseRoute(routeHref(route)), route);
  }
  assert.deepEqual(parseRoute('#/tale/../etc'), { name: 'room' });
});
