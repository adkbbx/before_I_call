import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMBIENT_WISPS, WAVE_SECONDS, flicker, igniteDelay, igniteOrder, igniteProgress, nextShadowDelay, parallaxOffset, wispPath } from '../src/lib/alive.ts';

test('candle wave ignites from the centre outward and fits the wave window', () => {
  const columns = 50, order = igniteOrder(100, columns);
  assert.equal(order.length, 100);
  const first = order.slice(0, 4).map(i => i % columns);
  assert.ok(first.every(c => c === 24 || c === 25), 'centre candles go first');
  assert.ok([0, 49, 50, 99].includes(order[99]), 'an edge candle goes last');
  for (let i = 1; i < order.length; i++) assert.ok(igniteDelay(order[i], columns) >= igniteDelay(order[i - 1], columns));
  for (let i = 0; i < 100; i++) assert.ok(igniteDelay(i, columns) >= 0 && igniteDelay(i, columns) + .4 <= WAVE_SECONDS + .05);
  assert.equal(igniteProgress(1, 0), 0);
  assert.equal(igniteProgress(.2, 3), 1);
  assert.ok(igniteProgress(.2, .4) > 0 && igniteProgress(.2, .4) < 1);
});

test('flicker stays in range and differs per candle', () => {
  const values = new Set<number>();
  for (let i = 0; i < 100; i++) for (let t = 0; t < 10; t += .25) { const v = flicker(i, t); assert.ok(v >= 0 && v <= 1); values.add(Math.round(v * 100)); }
  assert.ok(values.size > 30);
  assert.notEqual(flicker(3, 2), flicker(4, 2));
});

test('ambient wisp paths stay inside the room, are smooth, and drift slowly', () => {
  for (let i = 0; i < AMBIENT_WISPS; i++) {
    let previous = wispPath(i, 0);
    for (let t = .1; t < 300; t += .1) {
      const p = wispPath(i, t);
      assert.ok(p.x > .05 && p.x < .95 && p.y > .1 && p.y < .85, `wisp ${i} at ${t}`);
      assert.ok(Math.hypot(p.x - previous.x, p.y - previous.y) < .01, 'no jumps');
      previous = p;
    }
  }
  assert.equal(wispPath(0, 5).x, wispPath(0, 5).x);
  assert.ok(wispPath(0, 0).depth < wispPath(AMBIENT_WISPS - 1, 0).depth);
});

test('parallax is clamped to the maximum shift', () => {
  assert.deepEqual(parallaxOffset(720, 450, 1440, 900, 8), { x: 0, y: 0 });
  assert.deepEqual(parallaxOffset(1440, 900, 1440, 900, 8), { x: 8, y: 8 });
  assert.deepEqual(parallaxOffset(-500, 5000, 1440, 900, 4), { x: -4, y: 4 });
  assert.deepEqual(parallaxOffset(10, 10, 0, 0, 8), { x: 0, y: 0 });
});

test('shoji shadow returns every 60 to 90 seconds', () => {
  assert.equal(nextShadowDelay(0), 60000);
  assert.equal(nextShadowDelay(1), 90000);
  assert.equal(nextShadowDelay(7), 90000);
});
