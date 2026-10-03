import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { VoiceConversation } from '@elevenlabs/client';
import scenarios from './scenarios.json';
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, Download, Headphones, HelpCircle, Mic, MicOff, Pause, Phone, PhoneOff, Play, RotateCcw, Send, Volume2, X } from 'lucide-react';
import { z } from 'zod';
import demo from './demo.json';
import audioVersions from './audio-versions.json';
const audioVersion = new Map(Object.entries(audioVersions));
import extraDemos from './extra-demos.json';
const demos = [{ ...demo, id: 'repair', title: 'Home repair', partner: 'Tanaka / building manager' }, ...extraDemos];
const englishDemos = demos.map(item => ({ ...item, id: 'en-' + item.id, turns: item.turns.map(turn => ({ ...turn, id: 'en-' + turn.id, japanese: turn.meaning, meaning: turn.japanese, romaji: '', answer: turn.answerMeaning, answerMeaning: turn.answer, answerRomaji: '' })) }));
const allDemos = [...demos, ...englishDemos];
type Demo = typeof demos[number];
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { track, trackVisit } from './analytics';
import { JapaneseText } from './JapaneseText';
import { buildCallCard, nextTurn } from './demo-flow.mjs';
import { healthSchema, request, snapshotSchema, startSchema } from './api';

type Message = { role: 'user' | 'assistant'; text: string };
type StartedCall = z.infer<typeof startSchema>;
type Health = z.infer<typeof healthSchema>;
type View = { kind: 'home' } | { kind: 'setup'; targetLanguage?: 'ja' | 'en' } | { kind: 'demo'; demoId: string } | { kind: 'live'; call: StartedCall; scenario: string } | { kind: 'finished'; scenario: string; messages: Message[]; mode: 'demo' | 'live'; scenarioId?: string; targetLanguage: 'ja' | 'en' };
type Phase = z.infer<typeof snapshotSchema>['status'];

const statusLabels: Record<Phase, string> = { connecting: 'Connecting your practice partner', listening: 'Your turn. Take your time.', thinking: 'Considering your answer', speaking: 'Your partner is speaking', paused: 'Paused. There is no rush.', ended: 'Practice finished', error: 'The connection was interrupted' };
const explanationReadingsSchema = z.object({
  segments: z.array(z.object({ text: z.string(), reading: z.string(), meaning: z.string() })),
  romaji: z.string(),
});

function Brand({ onClick, inCall }: { onClick: () => void; inCall: boolean }) {
  const content = <><span className="brand-mark"><AudioLines size={20} /></span>before i call<span className="brand-dot">.</span></>;
  return inCall ? <span className="brand">{content}</span> : <button className="brand" onClick={onClick} aria-label="Before I Call home">{content}</button>;
}

function App() {
  if (window.location.pathname === '/analytics') return <AnalyticsDashboard />;
  return <PracticeApp />;
}

function PracticeApp() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [visits, setVisits] = useState<number | null>(null);
  const lastView = useRef<View | null>(null);
  useEffect(() => { trackVisit(); const timer = setTimeout(() => { request('/api/analytics/count', z.object({ visits: z.number() })).then(data => setVisits(data.visits)).catch(() => {}); }, 500); return () => clearTimeout(timer); }, []);
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => { request('/api/health', healthSchema).then(setHealth).catch(() => setHealth(null)); }, []);
  const finish = useCallback((scenario: string, messages: Message[], mode: 'demo' | 'live', scenarioId?: string, targetLanguage: 'ja' | 'en' = 'ja') => setView({ kind: 'finished', scenario, messages, mode, scenarioId, targetLanguage }), []);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    track('page', { page: view.kind });
    if (view.kind === 'demo') track('demo_start', { mode: 'demo', language: view.demoId.startsWith('en-') ? 'en' : 'ja', scenario: analyticsScenario(view.demoId.replace('en-', '')) });
    if (view.kind === 'live') track('live_start', { mode: 'live', language: view.call.target_language, scenario: analyticsScenario(view.call.scenario_id) });
  }, [view]);
  const home = () => setView({ kind: 'home' });
  const inCall = view.kind === 'demo' || view.kind === 'live';
  return <div className="app-shell">
    <header className="site-header"><Brand onClick={home} inCall={inCall} /><span className="header-note">Japanese & English call practice</span></header>
    <main>
      {view.kind === 'home' && <Home onDemo={(demoId) => setView({ kind: 'demo', demoId })} onLive={(targetLanguage) => setView({ kind: 'setup', targetLanguage })} />}
      {view.kind === 'setup' && <Setup initialTarget={view.targetLanguage ?? 'ja'} health={health} onBack={home} onDemo={() => setView({ kind: 'demo', demoId: 'repair' })} onStart={(call, scenario) => setView({ kind: 'live', call, scenario })} />}
      {view.kind === 'demo' && <DemoCall demo={allDemos.find(item => item.id === view.demoId) ?? demos[0]} onFinish={(messages) => finish((allDemos.find(item => item.id === view.demoId) ?? demos[0]).scenario, messages, 'demo', undefined, view.demoId.startsWith('en-') ? 'en' : 'ja')} />}
      {view.kind === 'live' && <LiveCall call={view.call} scenario={view.scenario} onFinish={(messages) => finish(view.scenario, messages, 'live', view.call.scenario_id, view.call.target_language)} />}
      {view.kind === 'finished' && <Finished onHome={home} targetLanguage={view.targetLanguage} scenarioId={view.scenarioId} scenario={view.scenario} messages={view.messages} mode={view.mode} onDemo={() => setView({ kind: 'demo', demoId: 'repair' })} onLive={() => setView({ kind: 'setup' })} />}
    </main>
    <footer className="site-footer product-footer"><div><p>Built by Akshay Dilip Kumar</p><nav aria-label="Creator and contribution links"><a href="https://www.linkedin.com/in/akshaydilipkumar/" target="_blank" rel="noopener noreferrer" onClick={() => track('action', { action: 'linkedin' })}>LinkedIn</a><a href="https://github.com/adkbbx" target="_blank" rel="noopener noreferrer" onClick={() => track('action', { action: 'github' })}>GitHub</a><a href="https://github.com/adkbbx/before_I_call-/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" onClick={() => track('action', { action: 'contribute' })}>Contribute</a></nav></div><div className="footer-support"><a href="https://github.com/adkbbx/before_I_call-" target="_blank" rel="noopener noreferrer" onClick={() => track('action', { action: 'star' })}>Finding it useful? Star the repo ↗</a><div className="footer-meta"><span>{visits === null ? 'Visit count loading…' : `${visits.toLocaleString()} visits`}</span><small>Usage analytics don’t store your conversations.</small></div></div></footer>
  </div>;
}

function Home({ onDemo, onLive }: { onDemo: (id: string) => void; onLive: (language: 'ja' | 'en') => void }) {
  const [demoId, setDemoId] = useState('repair');
  const [practiceLanguage, setPracticeLanguage] = useState<'ja' | 'en'>('ja');
  const availableDemos = practiceLanguage === 'en' ? englishDemos : demos;
  const selected = availableDemos.find(item => item.id === demoId) ?? demos[0];
  return <section className="home-grid product-home">
    <div className="home-intro"><p className="eyebrow">Before the real call</p><h1>Practice a phone call.<br />Know what to say.</h1><p>Speak with an AI partner in Japanese or English. Get help with replies you don’t understand.</p><fieldset className="language-choice"><legend>I want to practice in</legend><div role="group" aria-label="Practice language"><button type="button" aria-pressed={practiceLanguage === 'ja'} onClick={() => { setPracticeLanguage('ja'); setDemoId('repair'); }}>Japanese{practiceLanguage === 'ja' && <Check size={16} aria-hidden="true" />}</button><button type="button" aria-pressed={practiceLanguage === 'en'} onClick={() => { setPracticeLanguage('en'); setDemoId('en-repair'); }}>English{practiceLanguage === 'en' && <Check size={16} aria-hidden="true" />}</button></div></fieldset><div className="home-actions"><button className="button primary" onClick={() => onLive(practiceLanguage)}>Start practice<ArrowRight size={18} /></button></div><p className="small-note">Choose a situation, then speak using your microphone.</p><p className="practice-boundary">Practice with AI. No real calls or bookings.</p></div>
    <aside className="home-preview demo-launcher"><div className="preview-scene"><div><h2>Try a guided example</h2><p>Listen to a prepared conversation.<br />No microphone or signup needed.</p></div></div><fieldset className="example-choice"><legend>Example call</legend><div role="group" aria-label="Example call">{availableDemos.map(item => <button type="button" key={item.id} aria-pressed={demoId === item.id} onClick={() => setDemoId(item.id)}><span>{item.title}</span>{demoId === item.id ? <Check size={16} aria-hidden="true" /> : <span className="choice-circle" aria-hidden="true" />}</button>)}</div></fieldset><div className="demo-situation-stack"><p className="demo-situation">{selected.scenario}</p>{allDemos.filter(item => item.id !== selected.id).map(item => <p className="demo-situation demo-size-reserve" key={item.id} aria-hidden="true" inert>{item.scenario}</p>)}</div><button className="button demo-start" onClick={() => onDemo(demoId)}><Play size={18} />Play guided example</button><p className="word-hint">{selected.turns.length} short exchanges · {practiceLanguage === 'ja' ? 'Japanese' : 'English'}</p></aside>
  </section>;
}

function SituationDropdown({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled: boolean }) {
  const menu = useRef<HTMLDetailsElement | null>(null);
  const title = scenarios.find(item => item.id === value)?.title ?? 'Something else';
  return <details className="situation-dropdown" ref={menu} onKeyDown={event => { if (event.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } }} onBlur={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}><summary aria-disabled={disabled} onClick={event => { if (disabled) event.preventDefault(); }}><span>{title}</span><ChevronDown size={17} /></summary><div className="situation-options" role="group" aria-label="Choose a situation">{[...scenarios.map(item => ({ id: item.id, title: item.title })), { id: 'custom', title: 'Something else' }].map(item => <button type="button" key={item.id} disabled={disabled} aria-pressed={value === item.id} onClick={() => { onChange(item.id); if (menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } }}><span>{item.title}</span>{value === item.id && <Check size={16} />}</button>)}</div></details>;
}

function Setup({ initialTarget, health, onBack, onDemo, onStart }: { initialTarget: 'ja' | 'en'; health: Health | null; onBack: () => void; onDemo: () => void; onStart: (call: StartedCall, scenario: string) => void }) {
  const [selected, setSelected] = useState('repair');
  const [scenario, setScenario] = useState(scenarios[0].situation);
  const preset = scenarios.find(item => item.id === selected);
  const [language, setLanguage] = useState(initialTarget === 'en' ? 'Japanese' : 'English');
  const [targetLanguage, setTargetLanguage] = useState(initialTarget);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const start = async () => {
    setError(''); setBusy(true);
    try {
      const availability = await request('/api/health', healthSchema);
      if (!availability.live_available) throw new Error('Live voice isn’t connected yet. Open the guided demo below to hear both sides of the repair call.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost. You can still try the demo.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      const call = await request('/api/start', startSchema, { method: 'POST', body: JSON.stringify({ scenario, scenario_id: selected, language, target_language: targetLanguage, access_code: code, partner: preset?.partner ?? 'service staff', greeting: targetLanguage === 'en' ? 'Hello, how can I help you today?' : preset?.greeting ?? 'もしもし。どうされましたか？' }) });
      onStart(call, scenario);
    } catch (e) { setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Your microphone was blocked. Allow it in browser settings, then retry, or try the demo.' : errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <section className="setup-layout simple-setup"><div className="setup-intro"><button className="back-link" onClick={onBack}><ArrowLeft size={16} />Back</button><h1>What call do you want to practice?</h1><p>Choose a situation. Your AI partner will start the conversation.</p></div><form className="setup-form" onSubmit={event => { event.preventDefault(); void start(); }}><fieldset className="scenario-picker"><legend>Choose a situation</legend><SituationDropdown value={selected} disabled={busy} onChange={id => { setSelected(id); setScenario(scenarios.find(item => item.id === id)?.situation ?? ''); }} /></fieldset><details className="setup-disclosure" key={selected} open={selected === 'custom' ? true : undefined}><summary>{selected === 'custom' ? 'Describe your situation' : 'Edit situation details'}<ChevronDown size={16} /></summary><label className="visually-hidden" htmlFor="scenario">Your situation</label><textarea id="scenario" maxLength={2000} minLength={10} value={scenario} onChange={event => setScenario(event.target.value)} rows={4} disabled={busy} required /><p className="field-hint">Add what you need and when you’re available. Leave out private details.</p></details><details className="setup-disclosure"><summary>{targetLanguage === 'ja' ? 'Japanese' : 'English'} practice · Help in {language}<ChevronDown size={16} /></summary><label htmlFor="call-language">Practice language</label><div className="select-wrap"><select id="call-language" value={targetLanguage} onChange={event => { setTargetLanguage(event.target.value === 'en' ? 'en' : 'ja'); setLanguage(event.target.value === 'en' ? 'Japanese' : 'English'); }} disabled={busy}><option value="ja">Japanese</option><option value="en">English</option></select><ChevronDown size={17} /></div><label htmlFor="explanation-language">Explain replies in</label><div className="select-wrap"><select id="explanation-language" value={language} onChange={event => setLanguage(event.target.value)} disabled={busy}><option>English</option><option>Japanese</option></select><ChevronDown size={17} /></div></details>{health?.access_code_required && <><label htmlFor="access-code">Practice access code</label><input id="access-code" type="password" value={code} onChange={event => setCode(event.target.value)} disabled={busy} required autoComplete="off" /></>}
      {(!health || !health.live_available) && <div className="notice"><p>Live practice is unavailable right now.</p><button type="button" className="back-link" onClick={onDemo}>Try a guided example<ArrowRight size={15} /></button></div>}
      {error && <p className="error" role="alert">{error}</p>}<button className="button primary wide" disabled={busy || scenario.trim().length < 10}><Mic size={18} />{busy ? 'Connecting…' : 'Start voice practice'}</button><p className="small-note">Allow your microphone when asked. This is practice with AI.</p><details className="setup-privacy"><summary>How your audio is handled</summary><p className="small-note">Audio is processed by ElevenLabs. This app does not save recordings; provider retention follows the agent’s privacy settings.</p></details>
    </form></section>;
}

function CallLayout({ mode, scenario, phase, onEnd, children, controls, explanation, messages, step, speakingLabel, demoTitle, turnCount, timing }: { mode: 'demo' | 'live'; scenario: string; phase: Phase; onEnd: () => void; children: ReactNode; controls: ReactNode; explanation: ReactNode; messages: Message[]; step?: number; speakingLabel?: string; demoTitle?: string; turnCount?: number; timing?: { elapsed: number; limit: number } }) {
  return <section className="call-layout"><aside className="scenario-rail"><div className="mode-tag"><Headphones size={16} />{mode === 'demo' ? 'Guided demo · scripted' : 'Live AI practice'}</div><h2>Your practice call</h2><div className="scenario-facts"><span className="rail-label">Your situation</span><p>{scenario}</p></div><div className="rail-tip"><Headphones size={20} /><p>You can pause at any time.<br />Your partner will wait.</p></div>{step !== undefined && <div className="demo-progress"><span>Conversation {step + 1} of {turnCount ?? 4}</span><div>{Array.from({ length: turnCount ?? 4 }, (_, i) => <span key={i} className={i <= step ? 'complete' : ''} />)}</div></div>}</aside><div className={`call-workspace ${explanation ? 'has-explanation' : ''}`}><div className="call-heading"><div className="call-heading-info"><span>{mode === 'demo' ? demoTitle ?? 'Tanaka' : 'Practice partner'} <span className="muted">/ {mode === 'demo' ? 'guided conversation' : 'your chosen situation'}</span></span><span className={`call-status ${phase}`} role="status"><span />{phase === 'speaking' && speakingLabel ? speakingLabel : statusLabels[phase]}</span>{timing && <div className={`call-timer ${timing.limit - timing.elapsed <= 30 ? 'time-low' : ''}`} role="timer" aria-label="Call time"><span>{formatTime(timing.elapsed)} elapsed</span><span>{formatTime(Math.max(0, timing.limit - timing.elapsed))} remaining</span></div>}</div></div><div className="conversation-area">{children}</div><div className={`call-controls ${mode === 'demo' ? 'demo-call-controls' : ''}`}>{controls}<button className="end-call-button" onClick={onEnd}><PhoneOff size={20} aria-hidden="true" />End call</button></div>{explanation}<details className="transcript"><summary>Conversation transcript <ChevronDown size={15} /></summary><div>{messages.map((message, i) => <p key={i}><span>{message.role === 'assistant' ? (mode === 'demo' ? 'Partner' : 'Partner') : 'You'}</span><span lang="ja"><JapaneseText text={message.text} /></span></p>)}{messages.length === 0 && <p>The transcript will appear when the conversation begins.</p>}</div></details></div></section>;
}

function DemoCall({ demo, onFinish }: { demo: Demo; onFinish: (messages: Message[]) => void }) {
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: demo.turns[0].japanese }]);
  const [phase, setPhase] = useState<Phase>('listening');
  const [explain, setExplain] = useState(false);
  const [error, setError] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyPaused, setReplyPaused] = useState(false);
  const [voice, setVoice] = useState<'partner' | 'you'>('partner');
  const [slowQuestion, setSlowQuestion] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const nextReply = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = demo.turns[index];
  const previousTurns = demo.turns.slice(0, index);
  const demoStarted = useRef(Date.now());
  const stop = useCallback(() => { if (nextReply.current) { clearTimeout(nextReply.current); nextReply.current = null; } if (audio.current) { audio.current.onended = null; audio.current.pause(); audio.current = null; } setReplying(false); setReplyPaused(false); }, []);
  const play = useCallback((id: string, speaker: 'partner' | 'you' = 'partner', slow = false, complete?: () => void) => {
    if (nextReply.current) { clearTimeout(nextReply.current); nextReply.current = null; }
    if (audio.current) { audio.current.onended = null; audio.current.pause(); }
    const sound = new Audio(`/audio/${id}.wav?v=${audioVersion.get(id) ?? ''}`);
    audio.current = sound; sound.playbackRate = slow ? 0.72 : 1;
    setVoice(speaker); setError(''); setPhase('speaking');
    sound.onended = () => { setPhase('listening'); if (complete) nextReply.current = setTimeout(complete, 550); else setReplying(false); };
    const failed = () => { if (audio.current !== sound) return; setPhase('listening'); setReplying(false); setError('Audio couldn’t play. Tap to try again, or continue without audio.'); };
    sound.onerror = failed;
    void sound.play().catch(failed);
  }, []);
  useEffect(() => { play(demo.turns[0].id); return () => { if (nextReply.current) clearTimeout(nextReply.current); if (audio.current) { audio.current.onended = null; audio.current.pause(); } }; }, [play, demo]);
  const pause = () => { if (replying) { if (nextReply.current) { clearTimeout(nextReply.current); nextReply.current = null; } audio.current?.pause(); setReplying(false); setReplyPaused(true); } else if (!replyPaused) stop(); setPhase('paused'); };
  const advance = () => {
    stop();
    const updated: Message[] = [...messages, { role: 'user', text: turn.answer }];
    const target = nextTurn(index, demo.turns.length);
    if (target.kind === 'finished') { track('practice_finish', { mode: 'demo', result: 'completed', language: demo.id.startsWith('en-') ? 'en' : 'ja', duration: Math.floor((Date.now() - demoStarted.current) / 1000) }); onFinish(updated); return; }
    setMessages([...updated, { role: 'assistant', text: demo.turns[target.index].japanese }]);
    setIndex(target.index); setExplain(false); play(demo.turns[target.index].id);
  };
  const next = () => {
    if (replying) { pause(); return; }
    setExplain(false);
    if (replyPaused && audio.current) {
      setReplyPaused(false);
      if (audio.current.ended) { advance(); return; }
      setReplying(true); setVoice('you'); setPhase('speaking');
      void audio.current.play().catch(() => { setReplying(false); setReplyPaused(true); setPhase('paused'); setError('Audio couldn’t resume. Tap Continue to try again.'); });
      return;
    }
    track('action', { mode: 'demo', action: 'reply' }); setReplying(true); play(`${turn.id}-reply`, 'you', false, advance);
  };
  return <CallLayout mode="demo" demoTitle={demo.partner} turnCount={demo.turns.length} speakingLabel={voice === 'you' ? 'Your prepared reply is playing' : undefined} scenario={demo.scenario} phase={phase} step={index} messages={messages} onEnd={() => { track('practice_finish', { mode: 'demo', result: 'ended', language: demo.id.startsWith('en-') ? 'en' : 'ja', duration: Math.floor((Date.now() - demoStarted.current) / 1000) }); stop(); onFinish(messages); }} controls={<button className="control-button" onClick={() => { track('action', { mode: 'demo', action: 'explain' }); pause(); setExplain(true); }}><HelpCircle size={18} />Explain question</button>} explanation={explain && <Explanation onClose={() => { setExplain(false); setPhase('listening'); }}><h3>What the question means</h3><p>{turn.meaning}</p><p className="explanation-note">{turn.note}</p><div className="suggested-reply"><span>You could say</span><p lang="ja"><JapaneseText text={turn.answer} /></p><p>{turn.answerMeaning}</p></div><button className="back-link" onClick={() => { setExplain(false); setPhase('listening'); }}>Back to the call <ArrowRight size={16} /></button></Explanation>}><p className="speaker-label">{phase === 'speaking' && voice === 'you' ? 'Listen to your prepared reply.' : `${demo.partner} asks…`}</p><div className="demo-question-stack"><div className="demo-question-active"><h2 lang="ja" className="japanese-reply"><JapaneseText text={turn.japanese} /></h2><div className={`waveform call-wave ${phase === 'speaking' ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <span key={i} style={{ height: `${7 + ((i * 17 + 3) % 27)}px`, animationDelay: `${i * 0.037}s` }} />)}</div><div className="question-audio-controls"><button className="audio-replay" onClick={() => { if (phase === 'speaking' && voice === 'partner') pause(); else { stop(); track('action', { mode: 'demo', action: slowQuestion ? 'slow' : 'retry' }); play(turn.id, 'partner', slowQuestion); } }}>{phase === 'speaking' && voice === 'partner' ? <Pause size={16} /> : <Play size={16} />}{phase === 'speaking' && voice === 'partner' ? 'Pause question' : 'Replay question'}</button><label className="question-speed"><input type="checkbox" role="switch" checked={slowQuestion} onChange={event => setSlowQuestion(event.target.checked)} />Slower</label></div></div>{demo.turns.filter(item => item.id !== turn.id).map(item => <div className="demo-size-reserve demo-question-reserve" key={item.id} aria-hidden="true" inert><div className="japanese-reply"><JapaneseText text={item.japanese} /></div><div className="demo-audio-reserve" /></div>)}</div>{error && <div className="error" role="alert"><p>{error}</p><button onClick={advance}>Continue without audio <ArrowRight size={16} /></button></div>}<div className="demo-answer"><p className="eyebrow">Your prepared reply</p><div className="demo-answer-stack"><div><p lang="ja" className="answer-japanese"><JapaneseText text={turn.answer} /></p><p className="answer-meaning">{turn.answerMeaning}</p></div>{demo.turns.filter(item => item.id !== turn.id).map(item => <div className="demo-size-reserve" key={item.id} aria-hidden="true" inert><p className="answer-japanese"><JapaneseText text={item.answer} /></p><p className="answer-meaning">{item.answerMeaning}</p></div>)}</div><p className="demo-next-hint">{replying ? 'Your answer is playing. Pause whenever you need.' : replyPaused ? 'Reply paused. Continue when you’re ready.' : 'Play your reply to continue to the next question.'}</p><div className="answer-actions"><button className="button primary" onClick={next}>{replying ? <Pause size={17} /> : <Play size={17} />}{replying ? 'Pause reply' : replyPaused ? 'Continue' : 'Reply'}{!replying && <ArrowRight size={18} />}</button></div></div><details className="demo-history" key={index}><summary>Previous dialogue{previousTurns.length > 0 ? ` (${previousTurns.length})` : ''}<ChevronDown size={15} aria-hidden="true" /></summary><div className="demo-history-list">{previousTurns.length === 0 ? <p>Completed questions and replies will appear here as you practice.</p> : previousTurns.map(previous => <div className="demo-history-reply" key={previous.id}><p className="history-speaker">Partner asked</p><p lang={demo.id.startsWith('en-') ? 'en' : 'ja'}><JapaneseText text={previous.japanese} showRomaji={false} /></p>{previous.romaji && <p className="history-romaji">{previous.romaji}</p>}<p className="history-meaning">{previous.meaning}</p><button className="audio-replay" onClick={() => { stop(); play(previous.id, 'partner'); }}><Volume2 size={16} />Hear question</button><p className="history-speaker">You replied</p><p lang={demo.id.startsWith('en-') ? 'en' : 'ja'}><JapaneseText text={previous.answer} showRomaji={false} /></p>{previous.answerRomaji && <p className="history-romaji">{previous.answerRomaji}</p>}<p className="history-meaning">{previous.answerMeaning}</p><button className="audio-replay" onClick={() => { stop(); play(`${previous.id}-reply`, 'you'); }}><Volume2 size={16} />Hear your reply</button></div>)}</div></details></CallLayout>;
}

function Explanation({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <section className="explanation-panel" aria-label="Explanation"><button className="close-explanation" onClick={onClose} aria-label="Close explanation"><X size={18} /></button>{children}</section>;
}

function LiveCall({ call, scenario, onFinish }: { call: StartedCall; scenario: string; onFinish: (messages: Message[]) => void }) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastReply, setLastReply] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [help, setHelp] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const inputWave = useRef<HTMLDivElement | null>(null);
  const conversation = useRef<VoiceConversation | null>(null);
  const savedMessages = useRef<Message[]>([]);
  const helpMode = useRef(false);
  const pausedRef = useRef(false);
  const replayAudio = useRef<HTMLAudioElement | null>(null);
  const replayUrl = useRef<string | null>(null);
  const ending = useRef(false);
  const liveStarted = useRef(Date.now());
  useEffect(() => {
    let stopped = false;
    let client: VoiceConversation | null = null;
    const startedAt = Date.now();
    const ticker = setInterval(() => setElapsed(Math.min(call.max_call_seconds, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    const timer = setTimeout(() => { void end('timeout'); }, call.max_call_seconds * 1000);
    void import('@elevenlabs/client').then(({ Conversation }) => Conversation.startSession({
      conversationToken: call.conversation_token, connectionType: 'webrtc', textOnly: false,
      overrides: { agent: { prompt: { prompt: call.prompt }, firstMessage: call.greeting, language: call.target_language }, ...(call.voice_id ? { tts: { voiceId: call.voice_id } } : {}) },
      onConnect: () => { if (!stopped) { track('live_connected', { mode: 'live', language: call.target_language }); setPhase('listening'); } },
      onModeChange: ({ mode }) => { if (!stopped && !pausedRef.current) setPhase(mode === 'speaking' ? 'speaking' : 'listening'); },
      onMessage: ({ message, source, event_id }) => {
        if (stopped) return;
        const item: Message = { role: source === 'ai' ? 'assistant' : 'user', text: message };
        const existing = eventMessages.get(event_id);
        if (existing !== undefined) savedMessages.current[existing] = item;
        else { eventMessages.set(event_id, savedMessages.current.length); savedMessages.current.push(item); }
        setMessages([...savedMessages.current]);
        if (source === 'ai') { if (helpMode.current) setHelp(message); else setLastReply(message); }
      },
      onDisconnect: ({ reason }) => { if (!stopped) { if (reason !== 'error' && !ending.current) { ending.current = true; track('practice_finish', { mode: 'live', result: 'completed', language: call.target_language, duration: Math.floor((Date.now() - liveStarted.current) / 1000) }); onFinish([...savedMessages.current]); return; } setPhase(reason === 'error' ? 'error' : 'ended'); setMuted(true); if (reason === 'error') setError('The voice connection ended. Your transcript is still available.'); } },
      onError: () => { if (!stopped) { track('call_error', { mode: 'live', result: 'error' }); setError('ElevenLabs could not connect. Check your agent’s authentication and allow prompt, first-message and language overrides in its Security settings.'); setPhase('error'); } },
    })).then(async value => { client = value; if (stopped) { await value.endSession(); return; } conversation.current = value; }).catch(() => { if (!stopped) { setPhase('error'); setError('Voice could not start. Check microphone permission and your ElevenLabs agent configuration, then start a new practice.'); } });
    const eventMessages = new Map<number, number>();
    return () => { stopped = true; clearTimeout(timer); clearInterval(ticker); replayAudio.current?.pause(); if (replayUrl.current) URL.revokeObjectURL(replayUrl.current); void client?.endSession(); conversation.current = null; void fetch(`/api/sessions/${call.session_id}`, { method: 'DELETE', keepalive: true }); };
  }, [call]);
  const terminal = phase === 'ended' || phase === 'error';
  const inputActive = !muted && !paused && help === null && !terminal && phase !== 'connecting';
  useEffect(() => {
    const bars = inputWave.current?.querySelectorAll('span');
    if (!bars) return;
    const reset = () => bars.forEach(bar => { bar.style.transform = 'scaleY(0.1)'; });
    reset();
    if (!inputActive) return;
    let frame = 0;
    const draw = () => {
      const frequencies = conversation.current?.getInputByteFrequencyData();
      bars.forEach((bar, index) => {
        const bin = frequencies?.[Math.floor(index * (frequencies.length / bars.length))] ?? 0;
        bar.style.transform = `scaleY(${Math.max(0.1, bin / 255)})`;
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); reset(); };
  }, [inputActive]);
  const end = async (result: 'ended' | 'timeout' = 'ended') => { if (ending.current) return; ending.current = true; track('practice_finish', { mode: 'live', result, language: call.target_language, duration: Math.floor((Date.now() - liveStarted.current) / 1000) }); replayAudio.current?.pause(); try { await conversation.current?.endSession(); } finally { onFinish([...savedMessages.current]); } };
  const setMic = (enabled: boolean) => { conversation.current?.setMicMuted(!enabled); setMuted(!enabled); };
  const pause = () => { track('action', { mode: 'live', action: 'pause' }); pausedRef.current = true; setPaused(true); setMic(false); conversation.current?.setVolume({ volume: 0 }); conversation.current?.sendUserActivity(); setPhase('paused'); };
  const resume = () => { replayAudio.current?.pause(); helpMode.current = false; pausedRef.current = false; setPaused(false); setHelp(null); conversation.current?.setVolume({ volume: 1 }); setMic(true); conversation.current?.sendContextualUpdate('The learner has left help mode. Continue the same role-play situation.'); setPhase('listening'); };
  const action = async (kind: 'explain' | 'slow' | 'retry') => {
    track('action', { mode: 'live', action: kind, language: call.target_language });
    if (!conversation.current) return;
    setError('');
    try {
      if (kind === 'slow') {
        pause(); setBusy(true);
        const response = await fetch(`/api/sessions/${call.session_id}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: lastReply }) });
        if (!response.ok) {
          // The connected agent can still speak if the replay lease expired
          // or standalone TTS is unavailable. Keep the primary action useful.
          resume();
          conversation.current.sendUserMessage(`Repeat this exact ${call.target_language === 'en' ? 'English' : 'Japanese'} sentence slowly, with clear pauses between phrases. Do not explain or change the question: ${lastReply}`);
          setPhase('thinking');
          return;
        }
        replayAudio.current?.pause(); if (replayUrl.current) URL.revokeObjectURL(replayUrl.current);
        replayUrl.current = URL.createObjectURL(await response.blob());
        const sound = new Audio(replayUrl.current); replayAudio.current = sound; await sound.play();
      } else if (kind === 'explain') {
        replayAudio.current?.pause(); helpMode.current = true; pausedRef.current = false; setPaused(false); setMic(false);
        setHelp('Your partner is preparing an explanation…'); conversation.current.setVolume({ volume: 1 });
        setBusy(true);
        const readings = await request('/api/readings', explanationReadingsSchema, { method: 'POST', body: JSON.stringify({ text: lastReply }) });
        const glossary = readings.segments.filter(word => word.meaning && !word.meaning.startsWith('Reading shown.')).map(word => `${word.text} (${word.reading}): ${word.meaning}`).join('\n');
        if (ending.current) return;
        conversation.current.sendUserMessage(`Pause the role-play. Explain ONLY the exact ${call.target_language === 'en' ? 'English' : 'Japanese'} sentence below in ${call.language}. Use the supplied vocabulary. ${call.target_language === 'ja' ? 'Use Japanese readings, not Chinese readings.' : 'Treat this as English language learning. Do not convert English words into Japanese readings.'} Do not substitute similar-sounding words. If a meaning is uncertain, say so. Then suggest one ${call.target_language === 'en' ? 'English reply with meaning' : 'Japanese reply with romaji and meaning'}.\nSentence: ${lastReply}\n${call.target_language === 'en' ? 'English text' : 'Japanese pronunciation'}: ${readings.romaji}\nVerified vocabulary:\n${glossary}`); setPhase('thinking');
      } else {
        resume(); conversation.current.sendUserMessage('Please repeat your last role-play question exactly, slowly, so I can try again.'); setPhase('thinking');
      }
    } catch (e) { if (kind === 'explain') resume(); setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <CallLayout mode="live" timing={{ elapsed, limit: call.max_call_seconds }} scenario={scenario} phase={phase} messages={messages} onEnd={() => void end()} controls={<><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('explain')}><HelpCircle size={18} /> Explain question</button><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('slow')}><Volume2 size={18} /> Slow replay</button><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('retry')}><RotateCcw size={18} /> Repeat question</button></>} explanation={help !== null && <Explanation onClose={resume}><h3>What the question means</h3><p className="live-explanation">{help.split('\n').map((line, i) => <span className="help-line" key={i}>{/[\u3040-\u30ff\u4e00-\u9fff]/.test(line) ? <JapaneseText text={line} sessionId={call.session_id} /> : line}</span>)}</p><button className="back-link" onClick={resume} disabled={terminal}>Resume practice <ArrowRight size={16} /></button></Explanation>}><p className="speaker-label">Your AI practice partner</p><h2 className="japanese-reply" lang="ja"><JapaneseText text={lastReply || call.greeting} sessionId={call.session_id} /></h2><p className="romaji">{call.target_language === 'en' ? 'Practice in English. Ask for help in English or Japanese whenever you need it.' : 'Speak in Japanese or English. Your partner will wait for your answer.'}</p><div className="live-input-activity"><div ref={inputWave} className={`waveform live-input-wave ${inputActive ? '' : 'inactive'}`} role="img" aria-label={inputActive ? 'Your microphone voice activity' : 'Microphone activity inactive'}>{Array.from({ length: 23 }, (_, index) => <span key={index} />)}</div></div><div className="live-mic-row"><button className={`mic-button ${!muted ? 'on' : ''}`} disabled={terminal || phase === 'connecting' || paused || help !== null} aria-label={muted ? 'Turn microphone on' : 'Mute microphone'} onClick={() => setMic(muted)}>{muted ? <MicOff size={23} /> : <Mic size={23} />}</button><span>{muted ? 'Microphone off' : 'Microphone on. Take your time.'}</span></div><button className="audio-replay" disabled={terminal || phase === 'connecting'} onClick={paused ? resume : pause}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume practice' : 'Pause practice'}</button>{error && <p className="error" role="alert">{error}</p>}<form className="typed-answer" onSubmit={event => { event.preventDefault(); if (!text.trim() || !conversation.current) return; resume(); conversation.current.sendUserMessage(text.trim()); setText(''); setPhase('thinking'); }}><label htmlFor="typed-answer">Or type your answer</label><div><input id="typed-answer" value={text} onChange={event => { setText(event.target.value); conversation.current?.sendUserActivity(); }} maxLength={1000} disabled={terminal || phase === 'connecting'} placeholder="Japanese or English is fine" /><button disabled={terminal || phase === 'connecting' || !text.trim()} aria-label="Send typed answer"><Send size={18} /></button></div></form></CallLayout>;
}

const callCardSchema = z.object({
  phrases: z.array(z.object({ japanese: z.string(), romaji: z.string(), meaning: z.string().optional(), role: z.enum(['user', 'assistant']), turn: z.number().int() })),
  words: z.array(z.object({ japanese: z.string(), romaji: z.string(), meaning: z.string() })),
});

function Finished({ scenario, messages, mode, onLive, targetLanguage, onHome }: { onHome: () => void; targetLanguage: 'ja' | 'en'; scenarioId?: string; scenario: string; messages: Message[]; mode: 'demo' | 'live'; onDemo: () => void; onLive: () => void }) {
  const [cardState, setCardState] = useState<{ kind: 'loading' } | { kind: 'ready'; data: z.infer<typeof callCardSchema> } | { kind: 'error'; message: string }>({ kind: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    request('/api/call-card', callCardSchema, { method: 'POST', body: JSON.stringify({ target_language: targetLanguage, messages: messages.filter(message => message.text.trim()).slice(-100) }), signal: controller.signal })
      .then(data => setCardState({ kind: 'ready', data }))
      .catch(error => { if (!controller.signal.aborted) setCardState({ kind: 'error', message: errorMessage(error) }); });
    return () => controller.abort();
  }, [messages, targetLanguage]);
  const phrases = cardState.kind === 'ready' ? cardState.data.phrases : [];
  const [cardView, setCardView] = useState<'conversation' | 'words'>('conversation');
  const [cardPage, setCardPage] = useState(0);
  const words = cardState.kind === 'ready' ? cardState.data.words : [];
  const pageCount = cardView === 'words' ? Math.ceil(words.length / 3) : messages.length;
  const message = messages[cardPage];
  const phrase = message ? phrases.find(item => item.role === message.role && item.japanese === message.text) : undefined;
  const card = buildCallCard({ scenario, messages, phrases: cardState.kind === 'ready' ? cardState.data.phrases : [], words: cardState.kind === 'ready' ? cardState.data.words : [] });
  const download = () => {
    track('action', { action: 'download', mode, language: targetLanguage });
    const url = URL.createObjectURL(new Blob([card], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'before-i-call-practice-card.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="finished-layout"><div className="finished-summary"><button className="back-link" onClick={onHome}><ArrowLeft size={16} />Back to home</button><div className="completion-label"><Check size={18} aria-hidden="true" /><span>Practice finished</span></div><h1>Keep what you learned.</h1><p>Review your conversation or save it for your next call.</p><div className="home-actions finished-actions"><button className="button primary" disabled={cardState.kind === 'loading'} onClick={download}><Download size={17} />Download call card</button><button className="button text-button" onClick={onLive}>Practice another call<ArrowRight size={17} /></button></div><p className="small-note">Practice only. No real call or booking was made.</p></div><div className="finished-card compact-call-card"><h2>Your call card</h2><p>Review what you said. The download includes everything.</p><div className="card-view-options" role="group" aria-label="Call card view"><button aria-pressed={cardView === 'conversation'} onClick={() => { setCardView('conversation'); setCardPage(0); }}>Conversation</button><button aria-pressed={cardView === 'words'} onClick={() => { setCardView('words'); setCardPage(0); }}>Words</button></div><div className="card-page-content">
      {cardView === 'words' && cardState.kind === 'loading' && <p role="status">Preparing your call card…</p>}
      {cardState.kind === 'error' && <p role="alert">Reading support is unavailable. Your conversation is still shown below.</p>}

      {cardView === 'words' && cardState.kind === 'ready' && <div className="compact-vocabulary">{words.length === 0 ? <p>No words yet.</p> : words.slice(cardPage * 3, cardPage * 3 + 3).map(word => <div key={word.japanese}><p lang={targetLanguage}><JapaneseText text={word.japanese} showRomaji={false} /></p>{targetLanguage === 'ja' && <p className="card-romaji">{word.romaji}</p>}<p className="card-meaning">{word.meaning}</p></div>)}</div>}
      {cardView === 'conversation' && (message ? <div className="call-card-phrase"><span>{message.role === 'assistant' ? 'Partner' : 'You'}</span><p lang={targetLanguage}><JapaneseText text={message.text} showRomaji={!phrase?.romaji} /></p>{phrase?.romaji && <p className="card-romaji">{phrase.romaji}</p>}{phrase?.meaning && <p className="card-meaning">{phrase.meaning}</p>}</div> : <p>No conversation yet.</p>)}
    </div><nav className="card-pagination" aria-label="Call card pages"><button className="control-button" aria-label="Previous card page" disabled={cardPage === 0} onClick={() => setCardPage(page => page - 1)}><ArrowLeft size={16} /></button><span aria-live="polite">{pageCount > 0 ? `${cardPage + 1} of ${pageCount}` : '0 of 0'}</span><button className="control-button" aria-label="Next card page" disabled={cardPage + 1 >= pageCount} onClick={() => setCardPage(page => page + 1)}><ArrowRight size={16} /></button></nav></div></section>;
}

function analyticsScenario(value: string): 'repair' | 'clinic' | 'delivery' | 'city' | 'food' | 'lost' | 'bill' | 'custom' { switch (value) { case 'repair': case 'clinic': case 'delivery': case 'city': case 'food': case 'lost': case 'bill': return value; default: return 'custom'; } }

function formatTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export default App;


