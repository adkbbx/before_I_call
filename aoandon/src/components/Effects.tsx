import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GhostWord } from '../lib/night.ts';
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
  return <div className={`lantern ${intensity > .865 ? 'lantern-low' : ''}`} style={{ '--intensity': intensity } as CSSProperties}><div className="lantern-glow" /><AssetImage file="lantern.webp" /></div>;
}
export function Hitodama({ ghosts }: { ghosts: GhostWord[] }) {
  return <div className="hitodama">{ghosts.slice(0, 24).map((g, i) => <button key={g.word} className="wisp" aria-label={g.word} style={{ '--angle': `${i * 137.5}deg`, '--radius': `${60 + i % 5 * 20}px`, '--period': `${3 + i % 5 * .5}s` } as CSSProperties}><span lang="ja">{g.word}</span><i /><i /><i /></button>)}{ghosts.length > 24 && <span className="wisp-overflow">+{ghosts.length - 24}</span>}</div>;
}
export function CandleField({ out }: { out: number }) {
  const ref = useRef<HTMLCanvasElement>(null), reduced = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext('2d')!; let frame = 0, last = 0;
    const halo = document.createElement('canvas'); halo.width = halo.height = 80; const h = halo.getContext('2d')!, gradient = h.createRadialGradient(40, 40, 0, 40, 40, 40); gradient.addColorStop(0, 'rgba(255,180,76,.22)'); gradient.addColorStop(1, 'rgba(255,180,76,0)'); h.fillStyle = gradient; h.fillRect(0, 0, 80, 80);
    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2), width = rect.width, height = rect.height;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const columns = width < 680 ? 25 : 50, rows = 100 / columns;
      for (let i = 0; i < 100; i++) {
        // The centre gap leaves room for the five level seals and their labels.
        const gap = width >= 1024 ? 620 : 0, unit = (i % columns + .5) / columns;
        const x = 10 + unit * (width - 20 - gap) + (unit >= .5 ? gap : 0), y = height - 16 - Math.floor(i / columns) * (height - 46) / rows;
        const seed = ((i * 1664525 + 1013904223) >>> 0) / 4294967296, wave = reduced ? .5 : (Math.sin(time / (2800 + seed * 1800) * Math.PI * 2 + seed * 40) + 1) / 2;
        ctx.fillStyle = '#ddd0b5'; ctx.fillRect(x - 2, y, 4, 18); ctx.fillStyle = '#c9b994'; ctx.fillRect(x - 2, y, 4, 1); ctx.fillStyle = '#4b463d'; ctx.fillRect(x - .5, y - 3, 1, 4);
        if (i < out) continue;
        ctx.globalAlpha = .6 + .3 * wave; ctx.drawImage(halo, x - 40, y - 50); ctx.globalAlpha = .85 + wave * .15;
        const gust = !reduced && time % 1000 < 120 && ((Math.floor(time / 1000) * 17 + i * 13) % 41 < 1);
        ctx.save(); ctx.translate(x, y - 2); ctx.transform(1, 0, reduced ? 0 : Math.sin(time / 500 + seed * 99) * .052, gust ? .8 : .92 + wave * .14, 0, 0);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-6, -4, -3, -10, 0, -15); ctx.bezierCurveTo(4, -8, 5, -3, 0, 0); ctx.fillStyle = '#ffb44c'; ctx.fill(); ctx.fillStyle = '#fff3d1'; ctx.beginPath(); ctx.ellipse(0, -4, 1.7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff6a2a'; ctx.fillRect(-.5, -14, 1, 2); ctx.restore(); ctx.globalAlpha = 1;
      }
    };
    const tick = (time: number) => { if (time - last >= 1000 / 30) { draw(time); last = time; } frame = requestAnimationFrame(tick); };
    const resume = () => { cancelAnimationFrame(frame); if (!document.hidden) { draw(0); if (!reduced) frame = requestAnimationFrame(tick); } };
    const observer = new ResizeObserver(resume); observer.observe(canvas); document.addEventListener('visibilitychange', resume); resume();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', resume); };
  }, [out, reduced]);
  return <div className="candle-field"><canvas ref={ref} aria-hidden="true" /><p role="status">{100 - out} / 100 candles still burning</p></div>;
}
let lastShadow = -Infinity;
export function ShojiShadow({ lit }: { lit: number }) {
  const reduced = useReducedMotion(), [visible, setVisible] = useState(false);
  useEffect(() => {
    if (reduced || lit >= 30) return;
    const check = () => { if (!document.hidden && Date.now() - lastShadow >= 90000) { lastShadow = Date.now(); setVisible(true); } };
    check(); const timer = setInterval(check, 90000); return () => clearInterval(timer);
  }, [lit, reduced]);
  return visible && !reduced ? <div className="shoji-shadow" onAnimationEnd={() => setVisible(false)}><AssetImage file="shoji-silhouette.webp" decorative /></div> : null;
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
