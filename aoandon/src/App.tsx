import { useEffect, useState } from 'react';
import { isDemoNight, routeHref, useRoute } from './lib/route.ts';
import { litCandles, loadNight, roomBrightness, saveNight, setLevel, TOTAL_CANDLES, type NightState } from './lib/night.ts';
import { levels, type Level } from './lib/schema.ts';

// Base shell (P0). Screens below Room are placeholders; P3 replaces them with the components named in PLAN.md.
const levelNames: Record<Level, string> = { N5: 'やさしい', N4: 'ふつう', N3: 'すこしむずかしい' };

export function App() {
  const route = useRoute();
  const demo = isDemoNight(location.search);
  const [night, setNight] = useState<NightState>(() => loadNight(demo));

  useEffect(() => { saveNight(night); }, [night]);
  useEffect(() => {
    const lit = litCandles(night) / TOTAL_CANDLES;
    document.documentElement.style.setProperty('--lit', String(lit));
    document.documentElement.style.setProperty('--room-brightness', String(roomBrightness(lit)));
  }, [night]);

  return (
    <div className="app">
      <header className="topbar">
        <a className="wordmark" href={routeHref({ name: 'room' })} lang="ja">青行灯</a>
        <nav className="topbar-actions" aria-label="Night">
          <a className="button-quiet" href={routeHref({ name: 'about' })}>About</a>
        </nav>
      </header>
      <main className="stage">
        {route.name === 'room' && <RoomPlaceholder night={night} onLevel={level => setNight(state => setLevel(state, level))} />}
        {route.name === 'shelf' && <Placeholder title="Shelf" />}
        {route.name === 'reader' && <Placeholder title={`Reader: ${route.taleId}`} />}
        {route.name === 'about' && <Placeholder title="About" />}
      </main>
    </div>
  );
}

function RoomPlaceholder({ night, onLevel }: { night: NightState; onLevel: (level: Level) => void }) {
  return (
    <section className="room" aria-labelledby="room-title">
      <h1 id="room-title" className="room-title" lang="ja">青行灯</h1>
      <p className="subtitle-en">Aoandon · a hundred ghost stories</p>
      <p className="room-line">In Edo Japan, friends told a hundred ghost stories by candlelight and put out one flame after each. Read real Meiji-era kaidan, retold at your level.</p>
      <div className="level-seals" role="radiogroup" aria-label="Your Japanese level">
        {levels.map(level => (
          <button key={level} type="button" role="radio" aria-checked={night.level === level} className={`level-seal ${night.level === level ? 'is-selected' : ''}`} onClick={() => onLevel(level)}>
            <span className="level-seal-mark">{level}</span>
            <span className="level-seal-name" lang="ja">{levelNames[level]}</span>
          </button>
        ))}
      </div>
      <div className="room-actions">
        <a className="button-primary" href={routeHref({ name: 'shelf' })}><span lang="ja">夜をはじめる</span> Begin the night</a>
        <a className="room-demo" href={`?night=demo${routeHref({ name: 'shelf' })}`}><span lang="ja">九十九話目から</span> Demo night: start at the 99th tale</a>
      </div>
      <p className="room-count" aria-live="polite">{litCandles(night)} / {TOTAL_CANDLES} candles still burning</p>
    </section>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="placeholder paper">
      <h1>{title}</h1>
      <p>Built in P3 from DESIGN.md.</p>
    </section>
  );
}
