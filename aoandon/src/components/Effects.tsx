import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GhostWord } from '../lib/night.ts';
import { FIRST_SHADOW_MS, easeToward, flicker, igniteDelay, igniteProgress, nextShadowDelay, parallaxOffset, wispPath } from '../lib/alive.ts';
type Asset = { file: string; name: string; alt: string; blend: string; width: number };
let assets: Asset[] = [];
export function useAssets() {
  const [value, setValue] = useState(assets);
  useEffect(() => { const c = new AbortController(); fetch('/assets/manifest.json', { signal: c.signal }).then(r => r.json()).then((a: Asset[]) => { assets = a; setValue(a); }).catch(() => {}); return () => c.abort(); }, []);
  return value;
}
export function useReducedMotion() {
  const [reduced, set] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const m = matchMedia('(prefers-reduced-motion: reduce)'), update = () => set(m.matches); m.addEventListener('change', update); return () => m.removeEventListener('change', update); }, []);
  return reduced;
}
export function AssetImage({ file, className = '', decorative = false }: { file: string; className?: string; decorative?: boolean }) {
  const all = useAssets(), name = file.replace(/^\/?assets\//, ''), asset = all.find(a => a.file === name);
  return <img className={className} src={`/assets/${name}`} alt={decorative ? '' : asset?.alt ?? ''} style={{ mixBlendMode: asset?.blend as CSSProperties['mixBlendMode'] }} />;
}
export function Lantern({ intensity }: { intensity: number }) {
  return <div className={`lantern ${intensity > .865 ? 'lantern-low' : ''}`} style={{ '--intensity': intensity } as CSSProperties}><div className="lantern-pool" aria-hidden="true" /><div className="lantern-glow" /><AssetImage file="lantern.webp" /></div>;
}
export function Hitodama({ ghosts }: { ghosts: GhostWord[] }) {
  return <div className="hitodama">{ghosts.slice(0, 24).map((g, i) => <button key={g.word} className="wisp" aria-label={g.word} style={{ '--angle': `${i * 137.5}deg`, '--radius': `${60 + i % 5 * 20}px`, '--period': `${3 + i % 5 * .5}s` } as CSSProperties}><span lang="ja">{g.word}</span><i /><i /><i /></button>)}{ghosts.length > 24 && <span className="wisp-overflow">+{ghosts.length - 24}</span>}</div>;
}
// One shared requestAnimationFrame loop for every Room effect. It stops while the tab is hidden.
const frameSubscribers = new Set<(time: number) => void>();
let frameHandle = 0;
function pump(time: number) { frameHandle = 0; if (document.hidden || !frameSubscribers.size) return; frameSubscribers.forEach(fn => fn(time)); frameHandle = requestAnimationFrame(pump); }
function kick() { if (!frameHandle && !document.hidden && frameSubscribers.size) frameHandle = requestAnimationFrame(pump); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frameHandle); frameHandle = 0; } else kick(); });
function subscribeFrame(fn: (time: number) => void) { frameSubscribers.add(fn); kick(); return () => { frameSubscribers.delete(fn); if (!frameSubscribers.size) { cancelAnimationFrame(frameHandle); frameHandle = 0; } }; }

export function CandleField({ out, wave }: { out: number; wave: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), reduced = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext('2d')!;
    let width = 0, height = 0, begin = -1, last = -1, seconds = 0;
    const halo = document.createElement('canvas'); halo.width = halo.height = 80; const h = halo.getContext('2d')!, gradient = h.createRadialGradient(40, 40, 0, 40, 40, 40); gradient.addColorStop(0, 'rgba(255,180,76,.22)'); gradient.addColorStop(1, 'rgba(255,180,76,0)'); h.fillStyle = gradient; h.fillRect(0, 0, 80, 80);
    // The light pool is a radial gradient squashed to an ellipse, stretched across a candle row when drawn.
    const pool = document.createElement('canvas'); pool.width = 256; pool.height = 64; const p = pool.getContext('2d')!; p.scale(1, .25); const poolGradient = p.createRadialGradient(128, 128, 0, 128, 128, 128); poolGradient.addColorStop(0, 'rgba(255,170,70,.55)'); poolGradient.addColorStop(.5, 'rgba(255,150,60,.2)'); poolGradient.addColorStop(1, 'rgba(255,150,60,0)'); p.fillStyle = poolGradient; p.fillRect(0, 0, 256, 256);
    const flick = new Float32Array(100), ignite = new Float32Array(100);
    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const columns = width < 680 ? 25 : 50, rows = 100 / columns, step = (height - 62) / rows, bottom = height - 32, inset = 44, dim = Math.min(1, 2 / rows);
      // The centre gap leaves room for the five level seals and their labels.
      const gap = width >= 1024 ? 620 : 0, still = reduced;
      const rowSum = new Float32Array(rows), rowLit = new Float32Array(rows);
      for (let i = 0; i < 100; i++) {
        const row = Math.floor(i / columns), k = still || !wave ? 1 : igniteProgress(igniteDelay(i, columns), seconds);
        ignite[i] = i < out ? 0 : k; flick[i] = still ? .5 : flicker(i, seconds);
        if (i >= out) { rowSum[row] += flick[i] * k; rowLit[row] += k; }
      }
      for (let r = 0; r < rows; r++) {
        const base = bottom - r * step, average = rowLit[r] ? rowSum[r] / rowLit[r] : 0, strength = rowLit[r] / columns * (.2 + .34 * average) * dim;
        if (strength <= .001) continue;
        ctx.globalAlpha = Math.min(1, strength);
        const half = (width - gap) / 2;
        if (gap) { ctx.drawImage(pool, 0, base - 6, half + 24, 38); ctx.drawImage(pool, width - half - 24, base - 6, half + 24, 38); } else ctx.drawImage(pool, 0, base - 6, width, 38);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 100; i++) {
        const unit = (i % columns + .5) / columns, x = inset + unit * (width - inset * 2 - gap) + (unit >= .5 ? gap : 0), y = bottom - Math.floor(i / columns) * step;
        const seed = ((i * 1664525 + 1013904223) >>> 0) / 4294967296, f = flick[i], k = ignite[i];
        ctx.fillStyle = '#ddd0b5'; ctx.fillRect(x - 2, y, 4, 18); ctx.fillStyle = '#c9b994'; ctx.fillRect(x - 2, y, 4, 1); ctx.fillStyle = '#4b463d'; ctx.fillRect(x - .5, y - 3, 1, 4);
        if (k <= 0) continue;
        ctx.globalAlpha = (.45 + .5 * f) * k * dim; ctx.drawImage(halo, x - 40, y - 50); ctx.globalAlpha = (.8 + f * .2) * Math.min(1, k * 1.5);
        const gust = !still && seconds % 1 < .12 && ((Math.floor(seconds) * 17 + i * 13) % 41 < 1);
        ctx.save(); ctx.translate(x, y - 2); ctx.transform(1, 0, still ? 0 : Math.sin(seconds * 2.2 + seed * 99) * .11, (gust ? .7 : .78 + f * .42) * (.3 + .7 * k), 0, 0);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-6, -4, -3, -10, 0, -15); ctx.bezierCurveTo(4, -8, 5, -3, 0, 0); ctx.fillStyle = '#ffb44c'; ctx.fill(); ctx.fillStyle = '#fff3d1'; ctx.beginPath(); ctx.ellipse(0, -4, 1.7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff6a2a'; ctx.fillRect(-.5, -14, 1, 2); ctx.restore(); ctx.globalAlpha = 1;
      }
    };
    const observer = new ResizeObserver(entries => {
      const box = entries[0].contentRect, dpr = Math.min(devicePixelRatio, 2); width = box.width; height = box.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    });
    observer.observe(canvas);
    const stop = reduced ? () => {} : subscribeFrame(time => { if (time - last < 1000 / 30) return; last = time; if (begin < 0) begin = time; seconds = (time - begin) / 1000; draw(); });
    return () => { stop(); observer.disconnect(); };
  }, [out, reduced, wave]);
  return <div className="candle-field" data-depth="4"><canvas ref={ref} aria-hidden="true" /></div>;
}
const AMBIENT_SIZES = [26, 20, 15, 11];
export function RoomAmbient() {
  const layer = useRef<HTMLDivElement>(null), reduced = useReducedMotion();
  useEffect(() => {
    const host = layer.current!, wisps = [...host.children] as HTMLElement[], spirit = document.querySelector<HTMLElement>('.room-spirit'), background = document.querySelector<HTMLElement>('.room-background'), depths = [...document.querySelectorAll<HTMLElement>('[data-depth]')];
    let vw = innerWidth, vh = innerHeight, lx = vw / 2, ly = vh * .45, lh = 160, near = 0, shown = 0, tx = 0, ty = 0, cx = 0, cy = 0, begin = -1, lastX = 0, lastY = 0;
    // Layout is measured here, on resize and scroll only, never inside the frame loop.
    const measure = () => { vw = innerWidth; vh = innerHeight; if (spirit) { const r = spirit.getBoundingClientRect(); lx = r.left + r.width / 2; ly = r.top + r.height / 2; lh = r.height; } };
    const place = (seconds: number) => wisps.forEach((el, i) => { const w = wispPath(i, seconds), size = AMBIENT_SIZES[i % AMBIENT_SIZES.length]; el.style.transform = `translate3d(${w.x * vw - size / 2}px,${w.y * vh - size / 2}px,0)`; });
    measure(); place(10);
    const resizeObserver = new ResizeObserver(measure); if (spirit) resizeObserver.observe(spirit); addEventListener('resize', measure); addEventListener('scroll', measure, { passive: true });
    const cleanups = [() => { resizeObserver.disconnect(); removeEventListener('resize', measure); removeEventListener('scroll', measure); }];
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!reduced) {
      if (finePointer) { const move = (e: PointerEvent) => { const o = parallaxOffset(e.clientX, e.clientY, vw, vh, 1); tx = o.x; ty = o.y; }; addEventListener('pointermove', move, { passive: true }); cleanups.push(() => removeEventListener('pointermove', move)); }
      const stop = subscribeFrame(time => {
        if (begin < 0) begin = time; const seconds = (time - begin) / 1000 + 10; let closest = 0;
        wisps.forEach((el, i) => {
          const w = wispPath(i, seconds), size = AMBIENT_SIZES[i % AMBIENT_SIZES.length], x = w.x * vw, y = w.y * vh;
          el.style.transform = `translate3d(${x - size / 2}px,${y - size / 2}px,0)`;
          closest = Math.max(closest, Math.max(0, 1 - Math.hypot(x - lx, y - ly) / (lh * 1.1)) * (.5 + .5 * w.depth));
        });
        near = easeToward(near, closest, .04); if (Math.abs(near - shown) > .005) { shown = near; spirit?.style.setProperty('--near', near.toFixed(3)); }
        if (finePointer) {
          cx = easeToward(cx, tx, .06); cy = easeToward(cy, ty, .06);
          if (Math.abs(cx - lastX) + Math.abs(cy - lastY) > .0005) {
            lastX = cx; lastY = cy;
            if (background) background.style.transform = `translate3d(${-cx * 8}px,${-cy * 8}px,0)`;
            depths.forEach(el => { const d = Number(el.dataset.depth); el.style.transform = `translate3d(${cx * d}px,${cy * d}px,0)`; });
          }
        }
      });
      cleanups.push(stop);
    }
    return () => { cleanups.forEach(fn => fn()); if (background) background.style.transform = ''; depths.forEach(el => { el.style.transform = ''; }); spirit?.style.removeProperty('--near'); };
  }, [reduced]);
  return <><div className="onibi-layer" ref={layer} aria-hidden="true">{AMBIENT_SIZES.map((size, i) => <i key={i} className="onibi" style={{ width: size, height: size, '--blur': `${(3 - i) * .8}px`, '--alpha': .7 - i * .09 } as CSSProperties} />)}</div><div className="floor-mist" aria-hidden="true"><i /><i /></div></>;
}
export function ShojiShadow() {
  const reduced = useReducedMotion(), [visible, setVisible] = useState(false), [round, setRound] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let timer = 0;
    const arm = (delay: number) => { timer = window.setTimeout(() => { if (document.hidden) arm(5000); else setVisible(true); }, delay); };
    arm(round === 0 ? FIRST_SHADOW_MS : nextShadowDelay(Math.random()));
    return () => clearTimeout(timer);
  }, [round, reduced]);
  return visible && !reduced ? <div className="shoji-shadow" aria-hidden="true" onAnimationEnd={() => { setVisible(false); setRound(r => r + 1); }}><AssetImage file="shoji-silhouette.webp" decorative /></div> : null;
}
export function Smoke() {
  const ref = useRef<HTMLCanvasElement>(null), reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !ref.current) return;
    const canvas = ref.current, c = canvas.getContext('2d')!, start = performance.now(); let frame = 0;
    const draw = (now: number) => {
      if (document.hidden) { frame = requestAnimationFrame(draw); return; }
      const t = now - start - 300; const dpr = Math.min(devicePixelRatio, 2); canvas.width = 240 * dpr; canvas.height = 240 * dpr; c.scale(dpr, dpr);
      if (t > 0) for (let i = 0; i < 22; i++) { const age = t - i * 25; if (age < 0) continue; const p = age / 2600; c.fillStyle = `rgba(239,230,210,${Math.max(0, .18 * (1 - p))})`; c.beginPath(); c.ellipse(120 + Math.sin(p * 6 + i) * p * 32, 220 - p * 200, 3 + p * 17, 5 + p * 12, 0, 0, Math.PI * 2); c.fill(); }
      if (t < 2600) frame = requestAnimationFrame(draw);
    }; frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, [reduced]);
  return reduced ? null : <canvas className="smoke" ref={ref} aria-hidden="true" />;
}
export function Candle({ out = false }: { out?: boolean }) {
  return <svg className={`candle ${out ? 'out' : ''}`} viewBox="0 0 52 90" aria-hidden="true"><path className="flame" fill="#ffb44c" d="M26 40C8 34 24 18 25 7c12 13 18 28 1 33Z" /><path className="flame" fill="#fff3d1" d="M26 40c-6-5-1-13 0-17 5 8 8 13 0 17Z" /><path stroke="#4b463d" d="M26 39v9" /><path fill="#ddd0b5" stroke="#c9b994" d="M19 47h14v35H19z" /><path className="ember" stroke="#ff6a2a" strokeWidth="2" d="M26 41v6" /></svg>;
}
