import { plural } from '../lib/plural.ts';
import { Segmented } from './Segmented.tsx';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { creditLine, levels, retellingSchema, type Tale, type Level, type Token, type Sentence as SentenceData } from '../lib/schema.ts';
import { addGhost, blowOut, sceneKey, type NightState } from '../lib/night.ts';
import { availableLevels, firstUnread, levelMeterText, nextScene, placeGloss, sceneFinished, sentenceText, showFurigana } from '../lib/reader.ts';
import type { Prefs, WritingMode } from '../lib/prefs.ts';
import { startMicrophone } from '../lib/blow.ts';
import { playEvent } from '../lib/sound.ts';
import { AssetImage, Candle, Smoke, useReducedMotion } from './Effects.tsx';

export function Modal({ title, children, close, className = '' }: { title: string; children: ReactNode; close: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button,a,[tabindex="0"]')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') { const list = [...ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select,[tabindex="0"]')]; const first = list[0], last = list.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener('keydown', key); return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [close]);
  return <div className="scrim" onPointerDown={e => { if (e.target === e.currentTarget) close(); }}><div ref={ref} className={`modal paper ${className}`} role="dialog" aria-modal="true" aria-label={title}><button className="close button-quiet" onClick={close} aria-label={`Close ${title}`}>Close <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path stroke="currentColor" strokeWidth="1.5" d="m3 3 10 10M13 3 3 13" /></svg></button><h2>{title}</h2>{children}</div></div>;
}
export function Word({ token, mode, onWord }: { token: Token; mode: Prefs['furigana']; onWord?: (token: Token, element: HTMLElement) => void }) {
  const text = showFurigana(token, mode) ? <ruby>{token.s}<rt>{token.r}</rt></ruby> : token.s;
  return token.k === 'plain' || !onWord ? <span>{text}</span> : <button className={`word word-${token.k}`} onClick={e => onWord(token, e.currentTarget)}>{text}</button>;
}
export function Sentence({ sentence, mode, onWord, style, animate = false }: { sentence: SentenceData; mode: Prefs['furigana']; onWord?: (token: Token, element: HTMLElement) => void; style?: CSSProperties; animate?: boolean }) {
  return <span className={`sentence ${animate ? 'ink' : ''}`} style={style} lang="ja">{sentence.tokens.map((t, i) => <Word token={t} mode={mode} onWord={onWord} key={i} />)}</span>;
}
export function WordGloss({ word, anchor, writing, close }: { word: Token; anchor: HTMLElement; writing: WritingMode; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null), [position, setPosition] = useState({ left: 8, top: 8, width: 260, maxHeight: 300 });
  useLayoutEffect(() => {
    const place = () => { const a = anchor.getBoundingClientRect(), height = Math.min(ref.current!.scrollHeight + 2, innerHeight - 16); const result = placeGloss(a, { width: 260, height }, { width: innerWidth, height: innerHeight }, writing); setPosition({ ...result, maxHeight: innerHeight - 16 }); };
    const outside = (e: Event) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); anchor.focus(); } };
    place(); addEventListener('resize', place); document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', esc); document.addEventListener('scroll', place, true);
    return () => { removeEventListener('resize', place); document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', esc); document.removeEventListener('scroll', place, true); };
  }, [anchor, writing, close]);
  return <div ref={ref} className="gloss paper" role="note" aria-live="polite" style={position}><strong lang="ja">{word.s}</strong> <span lang="ja">{word.r}</span><p>{word.g ?? 'No gloss supplied for this word.'}</p><small>{word.gs === 'model' ? 'Gemma gloss' : word.k === 'story' ? 'Story word' : 'JLPT list'}</small><p className="followed">Words that followed you · Saved</p></div>;
}
export function BlowCandle({ number, enabled, done, onBlow, wrong }: { number: number; enabled: boolean; done: boolean; onBlow: () => void; wrong: number }) {
  const [holding, setHolding] = useState(false), [extinguishing, setExtinguishing] = useState(false), [mic, setMic] = useState(false), [meter, setMeter] = useState(0), [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), stopMic = useRef<(() => void) | undefined>(undefined), busy = useRef(false); const reduced = useReducedMotion();
  const cancel = () => { clearTimeout(timer.current); setHolding(false); };
  const fire = () => { if (busy.current || done || !enabled) return; busy.current = true; cancel(); stopMic.current?.(); setMic(false); setExtinguishing(true); playEvent('candle-blow'); finishTimer.current = setTimeout(onBlow, reduced ? 150 : 600); };
  const start = () => { if (!enabled || done || busy.current || timer.current) return; setHolding(true); timer.current = setTimeout(() => { timer.current = undefined; fire(); }, 800); };
  const release = () => { cancel(); timer.current = undefined; };
  useEffect(() => { const blur = () => release(); const hidden = () => { if (document.hidden) { release(); stopMic.current?.(); setMic(false); } }; addEventListener('blur', blur); document.addEventListener('visibilitychange', hidden); return () => { clearTimeout(timer.current); clearTimeout(finishTimer.current); stopMic.current?.(); removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hidden); }; }, []);
  async function microphone() { if (mic) { stopMic.current?.(); setMic(false); return; } setStatus('Calibrating microphone. Wait quietly for half a second.'); try { stopMic.current = await startMicrophone(fire, setMeter); setMic(true); } catch { setStatus('Mic is off, hold to blow instead'); } }
  return <div className={`blow ${holding ? 'holding' : ''} ${extinguishing ? 'extinguishing' : ''}`}>
    <div className="active-candle" key={wrong}><svg className="candle-hold-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /></svg><div className={wrong ? 'wrong-flare' : ''}><Candle out={done} /></div>{extinguishing && <Smoke />}</div>
    <button className="button-primary blow-button" aria-label={`Blow out the candle for scene ${number}`} disabled={!enabled || done || extinguishing} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start(); }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } }} onBlur={release}><svg className="hold-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" /></svg><span lang="ja">ろうそくを消す</span><span lang="en">{done ? 'Candle out' : 'Blow out the candle'}{!done && <small>Hold for 800 ms</small>}</span></button>
    {!done && <><p className="ui-small">{enabled ? 'Hold with Space, Enter or touch.' : 'Answer the question to light the blow control.'}</p><button className="button-quiet" disabled={!enabled || extinguishing} onClick={microphone}>{mic ? 'Turn mic off' : 'Use microphone'}</button>{mic && <meter aria-label="Microphone input" min="0" max="1" value={meter} />}</>}
    <p role="status" className="ui-small">{status}</p>
  </div>;
}
const viewed = new Set<string>();
export function Reader({ tale, night, update, prefs, setPrefs }: { tale: Tale; night: NightState; update: (f: (n: NightState) => NightState) => void; prefs: Prefs; setPrefs: (p: Prefs) => void }) {
  const [index, setIndex] = useState(() => firstUnread(tale, night)), [correct, setCorrect] = useState(false), [wrong, setWrong] = useState(0), [original, setOriginal] = useState(false), [meterInfo, setMeterInfo] = useState(false), [gloss, setGloss] = useState<{ word: Token; anchor: HTMLElement } | null>(null), [summary, setSummary] = useState(false), [api, setApi] = useState(false), [live, setLive] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const [localTale, setLocalTale] = useState(tale), [viewport, setViewport] = useState(() => innerWidth); const nextRef = useRef<HTMLButtonElement>(null), titleRef = useRef<HTMLHeadingElement>(null), flowRef = useRef<HTMLDivElement>(null), sceneView = useRef<string | undefined>(undefined);
  const scene = localTale.scenes[index], retelling = scene.retellings[night.level], done = sceneFinished(night, tale, index), available = availableLevels(localTale);
  const writing: WritingMode = viewport <= 680 ? 'horizontal' : prefs.writing ?? (viewport >= 1024 ? 'vertical' : 'horizontal');
  const key = sceneKey(tale.id, scene.id, night.level), [animate, setAnimate] = useState(() => !viewed.has(key));
  useEffect(() => { const change = () => setViewport(innerWidth); addEventListener('resize', change); return () => removeEventListener('resize', change); }, []);
  useEffect(() => { const c = new AbortController(); fetch('/api/health', { signal: c.signal }).then(async r => { if (r.ok && r.headers.get('content-type')?.includes('application/json')) { const health = await r.json(); setApi(health.ok === true); } }).catch(() => {}); return () => c.abort(); }, []);
  useEffect(() => { if (sceneView.current !== key) { setAnimate(!viewed.has(key)); viewed.add(key); sceneView.current = key; setCorrect(false); setWrong(0); setGloss(null); setLive(false); flowRef.current?.scrollTo(0, 0); } }, [key]);
  useEffect(() => { titleRef.current?.focus(); }, [index]);
  useEffect(() => { if (done) nextRef.current?.focus(); }, [done]);
  const onWord = (word: Token, anchor: HTMLElement, source: SentenceData) => { setGloss({ word, anchor }); if (!night.ghosts.some(g => g.word === word.s)) playEvent('word-added'); update(n => addGhost(n, { word: word.s, reading: word.r, gloss: word.g, source: word.gs ?? (word.k === 'story' ? 'story' : 'jlpt'), sentence: sentenceText(source), taleId: tale.id })); };
  const switchLevel = (level: Level) => { update(n => ({ ...n, level })); setSummary(false); };
  async function retell() { setBusy(true); setStatus('Retelling this scene…'); try { const response = await fetch('/api/retell', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taleId: tale.id, sceneId: scene.id, level: night.level }) }); if (!response.ok) throw new Error(); const r = retellingSchema.parse(await response.json()); if (r.level !== night.level) throw new Error(); setLocalTale(t => ({ ...t, scenes: t.scenes.map((s, i) => i === index ? { ...s, retellings: { ...s.retellings, [night.level]: r } } : s) })); setLive(true); setCorrect(false); setWrong(0); setStatus('Saved in this reading only.'); } catch { setStatus('Retelling failed. Try again when local Gemma is ready.'); } finally { setBusy(false); } }
  if (!retelling) return <section className="empty"><h1>{tale.titleJa}</h1><p>{night.level} is not available for this tale.</p><div className="controls">{available.map(l => <button className="button-quiet" key={l} onClick={() => switchLevel(l)}>Read at {l}</button>)}</div><a href="#/shelf">Back to tales</a></section>;
  if (summary) return <section className="paper tale-summary"><h1 lang="ja">{tale.titleJa}</h1><p>This tale is told.</p><p>{plural(tale.scenes.length, 'scene')} · {plural(night.ghosts.filter(g => g.taleId === tale.id).length, 'word')} followed you</p><p>{creditLine(tale)}</p><a className="button-quiet" href="#/shelf">Back to tales</a></section>;
  return <section className={`reader ${writing}`} aria-label={tale.titleEn}>
    <header className="reader-heading"><a href="#/shelf">Back to tales</a><h1 ref={titleRef} tabIndex={-1}><span lang="ja">{tale.titleJa}</span> <span className="subtitle-en">{tale.titleEn}</span></h1><span className="ui-small">Retold at {night.level}{live && ' · live'}</span></header>
    <div className="reader-sheet paper">
      <aside className="candle-rail" aria-label="Scene candles">{tale.scenes.map((s, i) => <span key={s.id} aria-label={`Candle for scene ${i + 1}, ${night.done.includes(sceneKey(tale.id, s.id, night.level)) ? 'out' : 'lit'}`} aria-current={i === index ? 'step' : undefined}><Candle out={night.done.includes(sceneKey(tale.id, s.id, night.level))} /><span>{i + 1}</span></span>)}</aside>
      <div className="reading-flow" ref={flowRef} tabIndex={0} aria-label="Story and question">
        <figure className="reader-art"><AssetImage file={tale.illustration} /></figure>
        <article className="story" lang="ja" aria-label={`Scene ${index + 1}`}>{retelling.sentences.map((s, i) => <p key={i}><Sentence sentence={s} mode={prefs.furigana} onWord={(w, a) => onWord(w, a, s)} animate={animate} style={{ animationDelay: `${i * 90}ms` }} /></p>)}</article>
        <section className="question" aria-label="Scene question"><h2 lang="ja"><Sentence sentence={retelling.question.prompt} mode={prefs.furigana} /></h2><div className="answer-options">{retelling.question.options.map((option, i) => <button key={i} className="button-quiet answer" onClick={() => { if (i === retelling.question.answer) { setCorrect(true); setWrong(0); } else { setCorrect(false); setWrong(n => n + 1); playEvent('wrong-answer'); } }}><Sentence sentence={option} mode={prefs.furigana} /></button>)}</div><p className="question-result" role="status">{correct ? 'Correct. The candle is ready.' : wrong ? <><span lang="ja">火が消えない</span><br />The flame won't go out</> : 'Choose one answer.'}</p>
        <BlowCandle key={key} number={index + 1} enabled={correct} done={done} wrong={wrong} onBlow={() => update(n => blowOut(n, key))} />
        {done && <button ref={nextRef} className="button-quiet next-scene" onClick={() => { playEvent('scene-turn'); const next = nextScene(tale, index); if (next === null) setSummary(true); else setIndex(next); }}>{nextScene(tale, index) === null ? 'Finish tale' : 'Next scene'}</button>}</section>
      </div>
      <footer className="reader-controls"><div className="controls"><Segmented label="Writing" value={writing} options={[{ value: 'vertical', label: <><span lang="ja">縦</span> Vertical</>, disabled: viewport <= 680 }, { value: 'horizontal', label: <><span lang="ja">横</span> Horizontal</> }]} onChange={writing => setPrefs({ ...prefs, writing })} /><Segmented label="Furigana" value={prefs.furigana} options={[{ value: 'above-level', label: 'Above level' }, { value: 'all', label: 'All' }, { value: 'off', label: 'Off' }]} onChange={furigana => setPrefs({ ...prefs, furigana })} /><Segmented label="Level" ariaLabel="Reading level" value={night.level} options={levels.filter(l => available.includes(l)).map(value => ({ value, label: value }))} onChange={switchLevel} seals /><button className="button-quiet" onClick={() => setOriginal(true)}><span lang="ja">原文</span> Original</button></div>
      <button className="level-meter" title="Ghost words are glossed. Story words keep furigana." onClick={() => setMeterInfo(!meterInfo)} aria-expanded={meterInfo}><span style={{ width: `${retelling.metrics.finalCoverage * 100}%` }} />{levelMeterText(night.level, retelling.metrics)}</button>
      {meterInfo && <p>JLPT lists check words and kanji. Ghost words are glossed; story words keep furigana. <a href="#/about">About the check</a></p>}<small>{creditLine(tale)}</small>{api && <button className="button-quiet" disabled={busy} onClick={retell}>Retell again (local Gemma)</button>}<span role="status">{status}</span></footer>
    </div>
    {gloss && <WordGloss word={gloss.word} anchor={gloss.anchor} writing={writing} close={() => setGloss(null)} />}
    {original && <Modal title="原文 · Original" close={() => setOriginal(false)} className="original-sheet"><div lang="ja" className="original-text">{scene.original.map((p, i) => <p key={i}>{p.map((r, j) => r.rt ? <ruby key={j}>{r.base}<rt>{r.rt}</rt></ruby> : <span key={j}>{r.base}</span>)}</p>)}</div><p>{creditLine(tale)}</p><p className="colophon">{tale.colophon}</p><a href={tale.aozoraCard} target="_blank" rel="noreferrer">Aozora Bunko source card</a></Modal>}
  </section>;
}
