import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { isDemoNight, useRoute } from './lib/route.ts';
import { isRevealed, litCandles, loadNight, roomBrightness, saveNight, setLevel, type NightState } from './lib/night.ts';
import { type Level, type Tale, type TaleIndex } from './lib/schema.ts';
import { loadTale, loadTaleIndex } from './lib/tales.ts';
import { loadPrefs, savePrefs, type Prefs } from './lib/prefs.ts';
import { setSound } from './lib/sound.ts';
import { Reader } from './components/Reader.tsx';
import { Room, Shelf, Reveal, About, ExportPanel } from './components/Screens.tsx';
export function App() {
  const route = useRoute(), demo = isDemoNight(location.search);
  const [night, setNight] = useState(() => loadNight(demo)), [prefs, setPrefs] = useState<Prefs>(loadPrefs), [index, setIndex] = useState<TaleIndex>({ tales: [] }), [tales, setTales] = useState<Tale[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [exporting, setExporting] = useState(false);
  const update = useCallback((f: (n: NightState) => NightState) => setNight(f), []), closeExport = useCallback(() => setExporting(false), []);
  useEffect(() => { saveNight(night); }, [night]); useEffect(() => { savePrefs(prefs); }, [prefs]);
  useEffect(() => { const c = new AbortController(); setLoading(true); loadTaleIndex(c.signal).then(async i => { setIndex(i); const all = await Promise.all(i.tales.map(t => loadTale(t.id, c.signal))); setTales(all); }).catch(e => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load tales.'); }).finally(() => { if (!c.signal.aborted) setLoading(false); }); return () => c.abort(); }, []);
  useEffect(() => { const hidden = () => { document.documentElement.classList.toggle('effects-paused', document.hidden); void setSound(!document.hidden && prefs.sound && navigator.userActivation.hasBeenActive).catch(() => {}); }; document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden); }, [prefs.sound]);
  const select = (l: Level) => setNight(n => setLevel(n, l)), lit = litCandles(night) / 100, reveal = isRevealed(night) && route.name !== 'about';
  const tale = route.name === 'reader' ? tales.find(t => t.id === route.taleId) : undefined;
  return <div className={`app ${reveal ? 'revealed' : ''}`} style={{ '--lit': lit, '--room-brightness': roomBrightness(lit), '--vignette': .35 + .5 * (1 - lit) } as CSSProperties} onPointerDown={() => { if (prefs.sound) void setSound(true).catch(() => {}); }} onKeyDown={() => { if (prefs.sound) void setSound(true).catch(() => {}); }}>
    <div className="room-background" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a><header className="topbar"><a className="wordmark" href="#/" lang="ja">青行灯</a><nav className="topbar-actions" aria-label="Main"><button className="topbar-ghost" onClick={() => setExporting(true)} aria-label={`Words that followed you: ${night.ghosts.length}`}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3c0 5-7 7-7 12a7 7 0 0 0 14 0c0-4-4-6-7-12Z" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>{night.ghosts.length}</button><button aria-pressed={prefs.sound} onClick={() => { const sound = !prefs.sound; setPrefs({ ...prefs, sound }); void setSound(sound).catch(() => {}); }}>Sound {prefs.sound ? 'on' : 'off'}</button><a href="#/about">About</a></nav></header>
    <main id="main" className="stage" tabIndex={-1}>{reveal ? <Reveal night={night} exportWords={() => setExporting(true)} /> : route.name === 'room' ? <Room night={night} select={select} /> : loading ? <p className="empty" role="status">The tales are being brought to the room…</p> : error ? <div className="empty" role="alert"><h1>The shelf could not be opened.</h1><p>{error}</p><button className="button-quiet" onClick={() => location.reload()}>Try again</button></div> : route.name === 'shelf' ? <Shelf index={index} night={night} select={select} /> : route.name === 'about' ? <About tales={tales} /> : tale ? <Reader key={tale.id} tale={tale} night={night} update={update} prefs={prefs} setPrefs={setPrefs} /> : <div className="empty"><h1>This tale is not ready yet.</h1><a href="#/shelf">Back to tales</a></div>}</main>
    {exporting && <ExportPanel night={night} index={index} update={update} close={closeExport} />}
  </div>;
}
