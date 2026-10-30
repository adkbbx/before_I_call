import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBlowDetector } from '../src/lib/blow.ts';
import { loadPrefs, savePrefs } from '../src/lib/prefs.ts';
import { aggregateMetrics, availableLevels, coverageLine, firstUnread, nextScene, placeGloss, sceneFinished, showFurigana } from '../src/lib/reader.ts';
import { blowOut, initialNight, sceneKey } from '../src/lib/night.ts';
import { taleSchema, type Token } from '../src/lib/schema.ts';
const fixture = taleSchema.parse(JSON.parse(readFileSync(new URL('./fixtures/tale.fixture.json', import.meta.url), 'utf8')));
test('blow: calibration never fires even with loud input; sustained blow fires once', () => {
  const d = createBlowDetector({ frameMs: 50, minMs: 250, marginDb: 10 });
  for (let i = 0; i < 10; i++) assert.equal(d(-40), false);
  for (let i = 0; i < 4; i++) assert.equal(d(-20), false);
  assert.equal(d(-20), true); for (let i = 0; i < 20; i++) assert.equal(d(-10), false);
});
test('blow: short bursts reset and noise at threshold does not fire', () => {
  const d = createBlowDetector({ frameMs: 50 }); for (let i = 0; i < 10; i++) d(-60);
  for (let burst = 0; burst < 4; burst++) { for (let i = 0; i < 4; i++) assert.equal(d(-20), false); assert.equal(d(-48), false); }
  for (let i = 0; i < 4; i++) assert.equal(d(-20), false); assert.equal(d(-20), true);
});
test('blow: defaults, invalid frames and invalid timing', () => {
  const d = createBlowDetector(); assert.equal(d(NaN), false); for (let i = 0; i < 25; i++) assert.equal(d(-70), false);
  for (let i = 0; i < 12; i++) assert.equal(d(-20), false); assert.equal(d(-20), true);
  assert.throws(() => createBlowDetector({ frameMs: 0 }));
});
test('furigana: every token kind and mode, including story readings in off mode', () => {
  const expected = { known: [false, true, false], story: [true, true, true], ghost: [false, true, false], plain: [false, false, false] };
  for (const k of ['known', 'story', 'ghost', 'plain'] as const) for (const [i, mode] of (['above-level', 'all', 'off'] as const).entries()) {
    assert.equal(showFurigana({ s: '語', r: 'ご', k } satisfies Token, mode), expected[k][i]);
    assert.equal(showFurigana({ s: '語', k }, mode), false);
  }
});

test('hard kanji gets above-level ruby even in known and plain tokens', () => {
  for (const k of ['known', 'plain', 'ghost'] as const) {
    const token: Token = { s: '驚', r: 'おどろき', k, hk: true };
    assert.equal(showFurigana(token, 'above-level'), true);
    assert.equal(showFurigana(token, 'all'), true);
    assert.equal(showFurigana(token, 'off'), false);
    assert.equal(showFurigana({ ...token, r: undefined }, 'above-level'), false);
  }
});
test('progression: a completed scene cannot consume another candle; final scene ends tale', () => {
  const night = initialNight('N4'); assert.equal(firstUnread(fixture, night), 0); assert.equal(sceneFinished(night, fixture, 0), false);
  const key = sceneKey(fixture.id, fixture.scenes[0].id, 'N4'), next = blowOut(night, key);
  assert.equal(sceneFinished(next, fixture, 0), true); assert.equal(blowOut(next, key), next); assert.equal(nextScene(fixture, 0), null);
  const two = { ...fixture, scenes: [...fixture.scenes, { ...fixture.scenes[0], id: 's02' }] };
  assert.equal(nextScene(two, 0), 1); assert.equal(firstUnread(two, next), 1); assert.deepEqual(availableLevels(fixture), ['N4']);
});
test('gloss placement: edges and oversized slips stay inside either writing mode', () => {
  for (const mode of ['horizontal', 'vertical'] as const) for (const width of [100, 360, 1440]) for (const left of [0, width - 10]) for (const top of [0, 720]) {
    const p = placeGloss({ left, top, width: 30, height: 40 }, { width: 260, height: 900 }, { width, height: 740 }, mode);
    assert.ok(p.left >= 8 && p.top >= 8); assert.ok(p.left + p.width <= width - 8); assert.ok(p.top + p.maxHeight <= 732);
  }
});
test('prefs tolerate blocked storage, malformed JSON and invalid values', () => {
  const denied = { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } };
  assert.deepEqual(loadPrefs(denied), { sound: true, furigana: 'above-level' }); assert.equal(savePrefs({ sound: true, furigana: 'all' }, denied), false);
  for (const raw of ['null', 'false', '{', '{"writing":"diagonal","furigana":"bad","sound":"true"}']) { const p = loadPrefs({ getItem: () => raw, setItem: () => {} }); assert.equal(p.sound, true); assert.equal(p.furigana, 'above-level'); }
  assert.equal(loadPrefs({ getItem: () => '{"sound":false}', setItem: () => {} }).sound, false, 'a saved false is respected');
  let raw = ''; const store = { getItem: () => raw, setItem: (_: string, v: string) => { raw = v; } };
  assert.equal(savePrefs({ sound: true, furigana: 'off', writing: 'vertical' }, store), true); assert.deepEqual(loadPrefs(store), { sound: true, furigana: 'off', writing: 'vertical' });
});
test('metrics mean first/final coverage and ghosts per scene per model and level', () => {
  const copy = structuredClone(fixture); const r = copy.scenes[0].retellings.N4!; r.metrics.firstCoverage = .4; r.metrics.finalCoverage = .8; r.metrics.ghostWords = ['語', '声'];
  const rows = aggregateMetrics([fixture, copy]); assert.equal(rows.length, 1); assert.equal(rows[0].count, 2); assert.ok(Math.abs(rows[0].first - .6) < .0001); assert.equal(rows[0].final, .9); assert.equal(rows[0].ghosts, 1); assert.deepEqual(aggregateMetrics([]), []);
});
test('shelf coverage distinguishes zero coverage from absent levels', () => {
  const tale = { ...fixture, scenes: 7, coverage: { N4: .96, N5: 0 } }; assert.equal(coverageLine(tale, 'N4'), '7 scenes · 96% N4 words'); assert.equal(coverageLine(tale, 'N5'), '7 scenes · 0% N5 words'); assert.equal(coverageLine(tale, 'N3'), 'N3 is not available · Available: N5, N4');
});
