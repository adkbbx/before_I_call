// Pure logic for the living Room: candle ignition wave, ambient onibi paths, parallax and shoji timing.
// No DOM access here so it can be tested under node.

export const WAVE_SECONDS = 1.6;
export const IGNITE_SECONDS = 0.4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Seconds after the Room opens at which candle `index` starts to light. Centre first, edges last. */
export function igniteDelay(index: number, columns: number): number {
  const column = index % columns, row = Math.floor(index / columns);
  const distance = Math.abs((column + .5) / columns - .5) * 2;
  return distance * (WAVE_SECONDS - IGNITE_SECONDS - .1) + row * .03;
}
/** 0 = unlit, 1 = fully lit, eased. */
export function igniteProgress(delay: number, elapsed: number): number {
  const k = clamp((elapsed - delay) / IGNITE_SECONDS, 0, 1);
  return k * k * (3 - 2 * k);
}
export function igniteOrder(total: number, columns: number): number[] {
  return Array.from({ length: total }, (_, i) => i).sort((a, b) => igniteDelay(a, columns) - igniteDelay(b, columns) || a - b);
}

/** Flame brightness 0..1 for one candle: two slow sines at unrelated rates, never in lockstep. */
export function flicker(index: number, seconds: number): number {
  const seed = ((index * 1664525 + 1013904223) >>> 0) / 4294967296;
  const slow = Math.sin(seconds / (2.6 + seed * 1.8) * Math.PI * 2 + seed * 40);
  const quick = Math.sin(seconds * (5.5 + seed * 3) + seed * 90);
  return clamp(.5 + .36 * slow + .14 * quick, 0, 1);
}

export type WispPoint = { x: number; y: number; depth: number };
export const AMBIENT_WISPS = 4;
/** Position of ambient onibi `index` at `seconds`, as fractions of the viewport. depth 0 is far, 1 is near. */
export function wispPath(index: number, seconds: number): WispPoint {
  const a = (index * .618034 + .13) % 1, b = (index * .381966 + .41) % 1;
  const x = .5 + .4 * Math.sin(seconds * (.045 + a * .03) + a * 6.283);
  const y = .46 + .27 * Math.sin(seconds * (.06 + b * .035) + b * 6.283 + Math.sin(seconds * .11 + a * 9) * .4);
  const depth = index / Math.max(1, AMBIENT_WISPS - 1);
  return { x, y, depth };
}

/** Pointer position to a clamped offset in px (pointer at the viewport edge gives `max`). */
export function parallaxOffset(pointerX: number, pointerY: number, width: number, height: number, max: number): { x: number; y: number } {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return { x: clamp((pointerX / width - .5) * 2, -1, 1) * max, y: clamp((pointerY / height - .5) * 2, -1, 1) * max };
}
export const easeToward = (current: number, target: number, rate: number) => current + (target - current) * clamp(rate, 0, 1);

export const FIRST_SHADOW_MS = 12000;
/** 60 to 90 seconds between shoji shadows. `random` is in [0,1). */
export const nextShadowDelay = (random: number) => 60000 + clamp(random, 0, 1) * 30000;
