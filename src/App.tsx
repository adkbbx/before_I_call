import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { VoiceConversation } from '@elevenlabs/client';
import scenarios from './scenarios.json';
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, Download, Headphones, HelpCircle, Laptop, Mic, MicOff, Moon, Sun, Pause, Phone, PhoneOff, Play, RotateCcw, Send, Volume2, X } from 'lucide-react';
import { z } from 'zod';
import demo from './demo.json';
import audioVersions from './audio-versions.json';
const audioVersion = new Map(Object.entries(audioVersions));
import extraDemos from './extra-demos.json';
const demos = [{ ...demo, id: 'repair', title: 'Home repair', partner: 'Tanaka / building manager' }, ...extraDemos];
const englishDemos = demos.map(item => ({ ...item, id: 'en-' + item.id, turns: item.turns.map(turn => ({ ...turn, id: 'en-' + turn.id, japanese: turn.meaning, meaning: turn.japanese, romaji: '', answer: turn.answerMeaning, answerMeaning: turn.answer, answerRomaji: '' })) }));
const allDemos = [...demos, ...englishDemos];
type Demo = typeof demos[number];
import { explainQuestion, helpSchema, type QuestionHelp } from './text-help';
import { Preparation } from './Preparation';
import { ExamplePicker } from './ExamplePicker';
import { ReportReply } from './ReportReply';
import { hasEndCallRequest, spokenText } from './spoken-text';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { track, trackVisit } from './analytics';
import { JapaneseText } from './JapaneseText';
import { buildCallCard, nextTurn } from './demo-flow.mjs';
import { errorDetail, healthSchema, localStartSchema, localTurnSchema, request, snapshotSchema, startSchema } from './api';

type Message = { role: 'user' | 'assistant'; text: string };
type StartedCall = z.infer<typeof startSchema>;
type LocalStarted = z.infer<typeof localStartSchema>;
type Health = z.infer<typeof healthSchema>;
type View = { kind: 'home' } | { kind: 'setup'; targetLanguage?: 'ja' | 'en' } | { kind: 'demo'; demoId: string } | { kind: 'live'; call: StartedCall; scenario: string } | { kind: 'local'; call: LocalStarted; scenario: string } | { kind: 'finished'; scenario: string; messages: Message[]; mode: 'demo' | 'live'; scenarioId?: string; targetLanguage: 'ja' | 'en'; trace?: CallTrace };
type CallTrace = { conversation: string; promptVersion?: string };
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
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    try { const saved = localStorage.getItem('before-i-call-theme'); return saved === 'light' || saved === 'dark' ? saved : 'system'; }
    catch { return 'system'; }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try { if (theme === 'system') localStorage.removeItem('before-i-call-theme'); else localStorage.setItem('before-i-call-theme', theme); } catch { /* Theme still works when storage is unavailable. */ }
  }, [theme]);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);

  const [view, setView] = useState<View>({ kind: 'home' });
  const [visits, setVisits] = useState<number | null>(null);
  const lastView = useRef<View | null>(null);
  useEffect(() => { trackVisit(); const timer = setTimeout(() => { request('/api/analytics/count', z.object({ visits: z.number() })).then(data => setVisits(data.visits)).catch(() => {}); }, 500); return () => clearTimeout(timer); }, []);
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => { request('/api/health', healthSchema).then(setHealth).catch(() => setHealth(null)); }, []);
  const finish = useCallback((scenario: string, messages: Message[], mode: 'demo' | 'live', scenarioId?: string, targetLanguage: 'ja' | 'en' = 'ja', trace?: CallTrace) => setView({ kind: 'finished', scenario, messages, mode, scenarioId, targetLanguage, trace }), []);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    track('page', { page: view.kind === 'local' ? 'live' : view.kind });
    if (view.kind === 'demo') track('demo_start', { mode: 'demo', language: view.demoId.startsWith('en-') ? 'en' : 'ja', scenario: analyticsScenario(view.demoId.replace('en-', '')) });
    if (view.kind === 'live' || view.kind === 'local') track('live_start', { mode: 'live', language: view.call.target_language, scenario: analyticsScenario(view.call.scenario_id) });
  }, [view]);
  const home = () => setView({ kind: 'home' });
  const inCall = view.kind === 'demo' || view.kind === 'live' || view.kind === 'local';
  return <div className="app-shell">
    <header className="site-header"><Brand onClick={home} inCall={inCall} /><div className="header-tools"><span className="header-note">Japanese & English call practice</span>{health?.local_available && <span className="mode-pill" title="Whisper, Gemma and Kokoro run on this computer. Nothing is sent to a provider."><Laptop size={14} aria-hidden="true" />{health.live_available ? 'Local mode available' : 'Local mode'}</span>}<button className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></div></header>
    <main>
      {view.kind === 'home' && <Home onDemo={(demoId) => setView({ kind: 'demo', demoId })} onLive={(targetLanguage) => setView({ kind: 'setup', targetLanguage })} />}
      {view.kind === 'setup' && <Setup initialTarget={view.targetLanguage ?? 'ja'} health={health} onBack={home} onDemo={() => setView({ kind: 'demo', demoId: 'repair' })} onStart={(call, scenario) => setView({ kind: 'live', call, scenario })} onStartLocal={(call, scenario) => setView({ kind: 'local', call, scenario })} />}
      {view.kind === 'demo' && <DemoCall demo={allDemos.find(item => item.id === view.demoId) ?? demos[0]} onFinish={(messages) => finish((allDemos.find(item => item.id === view.demoId) ?? demos[0]).scenario, messages, 'demo', undefined, view.demoId.startsWith('en-') ? 'en' : 'ja')} />}
      {view.kind === 'live' && <LiveCall call={view.call} scenario={view.scenario} onFinish={(messages) => finish(view.scenario, messages, 'live', view.call.scenario_id, view.call.target_language, view.call.conversation_ref ? { conversation: view.call.conversation_ref, promptVersion: view.call.prompt_version } : undefined)} />}
      {view.kind === 'local' && <LocalCall call={view.call} scenario={view.scenario} onFinish={(messages) => finish(view.scenario, messages, 'live', view.call.scenario_id, view.call.target_language)} />}
      {view.kind === 'finished' && <Finished onHome={home} trace={view.trace} targetLanguage={view.targetLanguage} scenarioId={view.scenarioId} scenario={view.scenario} messages={view.messages} mode={view.mode} onDemo={() => setView({ kind: 'demo', demoId: 'repair' })} onLive={() => setView({ kind: 'setup' })} />}
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

function Setup({ initialTarget, health, onBack, onDemo, onStart, onStartLocal }: { initialTarget: 'ja' | 'en'; health: Health | null; onBack: () => void; onDemo: () => void; onStart: (call: StartedCall, scenario: string) => void; onStartLocal: (call: LocalStarted, scenario: string) => void }) {
  const [selected, setSelected] = useState('custom');
  const [scenario, setScenario] = useState('');
  const preset = scenarios.find(item => item.id === selected);
  const [language, setLanguage] = useState<'English' | 'Japanese'>(initialTarget === 'en' ? 'Japanese' : 'English');
  const [targetLanguage, setTargetLanguage] = useState(initialTarget);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [engine, setEngine] = useState<'cloud' | 'local'>('cloud');
  // Free local voice is used when it is the only voice, or when the learner picks it.
  const usesLocal = (available: Health | null) => (available?.local_available ?? false) && (engine === 'local' || !available?.live_available);
  const local = usesLocal(health);
  const start = async () => {
    setError(''); setBusy(true);
    try {
      const availability = await request('/api/health', healthSchema);
      const useLocal = usesLocal(availability);
      if (!availability.live_available && !useLocal) throw new Error('Live voice isn’t connected yet. Open the guided demo below to hear both sides of the repair call.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost. You can still try the demo.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      const body = JSON.stringify({ scenario, scenario_id: selected, language, target_language: targetLanguage, access_code: code, partner: preset?.partner ?? 'service staff', greeting: targetLanguage === 'en' ? 'Hello, how can I help you today?' : preset?.greeting ?? 'もしもし。どうされましたか？' });
      if (useLocal) { onStartLocal(await request('/api/local/start', localStartSchema, { method: 'POST', body }), scenario); return; }
      const call = await request('/api/start', startSchema, { method: 'POST', body });
      onStart(call, scenario);
    } catch (e) { setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Your microphone was blocked. Allow it in browser settings, then retry, or try the demo.' : errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <section className="setup-layout simple-setup"><div className="setup-intro"><button className="back-link" onClick={onBack}><ArrowLeft size={16} />Back</button><h1>What call do you want to practice?</h1><p>Start with an example, or describe the call you want to practise.</p></div><form className="setup-form" onSubmit={event => { event.preventDefault(); void start(); }}><ExamplePicker disabled={busy} onSelect={(id, situation) => { setSelected(id); setScenario(situation); }} /><label htmlFor="scenario">Your situation</label><Preparation situation={scenario} language={language} target={targetLanguage} code={code} disabled={busy} available={selected === 'custom' && (health?.preparation_available ?? false)} onApply={value => { setScenario(value); setSelected('custom'); }} /><details className="setup-disclosure setup-language-settings"><summary><span className="setup-language-summary">{targetLanguage === 'ja' ? 'Japanese' : 'English'} practice · explanations in {language}</span><span className="setup-language-change">Change<ChevronDown size={14} aria-hidden="true" /></span></summary>{health?.live_available && health?.local_available && <fieldset className="language-choice setup-language-choice"><legend>Voice</legend><div role="group" aria-label="Voice"><button type="button" disabled={busy} aria-pressed={engine === 'cloud'} onClick={() => setEngine('cloud')}>ElevenLabs{engine === 'cloud' && <Check size={16} aria-hidden="true" />}</button><button type="button" disabled={busy} aria-pressed={engine === 'local'} onClick={() => setEngine('local')}>Free local{engine === 'local' && <Check size={16} aria-hidden="true" />}</button></div></fieldset>}<fieldset className="language-choice setup-language-choice"><legend>Practice language</legend><div role="group" aria-label="Practice language"><button type="button" disabled={busy} aria-pressed={targetLanguage === 'ja'} onClick={() => { setTargetLanguage('ja'); setLanguage('English'); }}>Japanese{targetLanguage === 'ja' && <Check size={16} aria-hidden="true" />}</button><button type="button" disabled={busy} aria-pressed={targetLanguage === 'en'} onClick={() => { setTargetLanguage('en'); setLanguage('Japanese'); }}>English{targetLanguage === 'en' && <Check size={16} aria-hidden="true" />}</button></div></fieldset><fieldset className="language-choice setup-language-choice"><legend>Explain replies in</legend><div role="group" aria-label="Explanation language"><button type="button" disabled={busy} aria-pressed={language === 'English'} onClick={() => setLanguage('English')}>English{language === 'English' && <Check size={16} aria-hidden="true" />}</button><button type="button" disabled={busy} aria-pressed={language === 'Japanese'} onClick={() => setLanguage('Japanese')}>Japanese{language === 'Japanese' && <Check size={16} aria-hidden="true" />}</button></div></fieldset><details className="setup-privacy"><summary>How your audio is handled</summary><p className="small-note">{local ? 'Everything runs on this computer. Whisper hears you, Gemma answers through Ollama and Kokoro speaks. Nothing is sent to a provider, and nothing is saved to disk.' : 'Audio is processed by ElevenLabs. After practice, text from your transcript is sent to DigitalOcean to select useful vocabulary. This app does not save recordings or transcripts to disk; provider retention follows their privacy settings.'}</p></details></details>{health?.access_code_required && <><label htmlFor="access-code">Practice access code</label><input id="access-code" type="password" value={code} onChange={event => setCode(event.target.value)} disabled={busy} required autoComplete="off" /></>}
      {(!health || (!health.live_available && !health.local_available)) && <div className="notice"><p>Live practice is unavailable right now.</p><button type="button" className="back-link" onClick={onDemo}>Try a guided example<ArrowRight size={15} /></button></div>}
      {local && <div className="local-notice"><Laptop size={18} aria-hidden="true" /><p><strong>Free local mode.</strong> Whisper hears you, Gemma answers through Ollama and Kokoro speaks, all on this computer. Nothing is sent to a provider.</p></div>}
      {error && <p className="error" role="alert">{error}</p>}<button className="button primary wide" disabled={busy || scenario.trim().length < 10}><Mic size={18} />{busy ? 'Connecting…' : 'Start voice practice'}</button><p className="small-note">{local ? 'Free local voice runs on this computer.' : `Up to ${Math.ceil((health?.max_call_seconds ?? 120) / 60)} minutes per live practice.`} Allow your microphone when asked.</p>
    </form></section>;
}

function CallLayout({ mode, scenario, phase, onEnd, children, controls, explanation, messages, step, speakingLabel, demoTitle, turnCount, timing, modeLabel, statusText }: { mode: 'demo' | 'live'; scenario: string; phase: Phase; onEnd: () => void; children: ReactNode; controls: ReactNode; explanation: ReactNode; messages: Message[]; step?: number; speakingLabel?: string; demoTitle?: string; turnCount?: number; timing?: { elapsed: number; limit: number }; modeLabel?: string; statusText?: string }) {
  return <section className="call-layout"><aside className="scenario-rail"><div className="mode-tag"><Headphones size={16} />{modeLabel ?? (mode === 'demo' ? 'Guided demo · scripted' : 'Live AI practice')}</div><h2>Your practice call</h2><div className="scenario-facts"><span className="rail-label">Your situation</span><p>{scenario}</p></div><div className="rail-tip"><Headphones size={20} /><p>You can pause at any time.<br />Your partner will wait.</p></div>{step !== undefined && <div className="demo-progress"><span>Conversation {step + 1} of {turnCount ?? 4}</span><div>{Array.from({ length: turnCount ?? 4 }, (_, i) => <span key={i} className={i <= step ? 'complete' : ''} />)}</div></div>}</aside><div className="call-workspace"><div className="call-heading"><div className="call-heading-info"><span>{mode === 'demo' ? demoTitle ?? 'Tanaka' : 'Practice partner'} <span className="muted">/ {mode === 'demo' ? 'guided conversation' : 'your chosen situation'}</span></span><span className={`call-status ${phase}`} role="status"><span />{statusText ?? (phase === 'speaking' && speakingLabel ? speakingLabel : statusLabels[phase])}</span>{timing && <div className={`call-timer ${timing.limit - timing.elapsed <= 30 ? 'time-low' : ''}`} role="timer" aria-label="Call time"><span>{formatTime(timing.elapsed)} elapsed</span><span>{formatTime(Math.max(0, timing.limit - timing.elapsed))} remaining</span></div>}</div></div><div className="conversation-area">{children}</div><div className={`call-controls ${mode === 'demo' ? 'demo-call-controls' : ''}`}>{controls}<button className="end-call-button" onClick={onEnd}><PhoneOff size={20} aria-hidden="true" />End call</button></div>{explanation}<details className="transcript"><summary>Conversation transcript <ChevronDown size={15} /></summary><div>{messages.map((message, i) => <p key={i}><span>{message.role === 'assistant' ? (mode === 'demo' ? 'Partner' : 'Partner') : 'You'}</span><span lang="ja"><JapaneseText text={message.text} /></span></p>)}{messages.length === 0 && <p>The transcript will appear when the conversation begins.</p>}</div></details></div></section>;
}

function DemoCall({ demo, onFinish }: { demo: Demo; onFinish: (messages: Message[]) => void }) {
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: demo.turns[0].japanese }]);
  const [phase, setPhase] = useState<Phase>('listening');
  const [explain, setExplain] = useState(false);
  const [error, setError] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyPaused, setReplyPaused] = useState(false);
  const [replyHeard, setReplyHeard] = useState(false);
  const [voice, setVoice] = useState<'partner' | 'you'>('partner');
  const [slowQuestion, setSlowQuestion] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const nextReply = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedReplyTime = useRef(0);
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
  const pause = () => { if (replying) { if (nextReply.current) { clearTimeout(nextReply.current); nextReply.current = null; } if (audio.current) { pausedReplyTime.current = audio.current.ended ? 0 : audio.current.currentTime; audio.current.onended = null; audio.current.pause(); } setReplying(false); setReplyPaused(true); } else if (!replyPaused) stop(); setPhase('paused'); };
  const advance = () => {
    stop(); setReplyHeard(false);
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
      const sound = audio.current;
      sound.currentTime = pausedReplyTime.current;
      sound.onended = () => { if (audio.current !== sound) return; setPhase('listening'); setReplying(false); setReplyHeard(true); };
      setReplying(true); setVoice('you'); setPhase('speaking');
      void audio.current.play().catch(() => { setReplying(false); setReplyPaused(true); setPhase('paused'); setError('Audio couldn’t resume. Tap Continue to try again.'); });
      return;
    }
    track('action', { mode: 'demo', action: 'reply' }); setReplyHeard(false); setReplying(true); play(`${turn.id}-reply`, 'you', false, () => { setReplying(false); setReplyHeard(true); });
  };
  return <CallLayout mode="demo" demoTitle={demo.partner} turnCount={demo.turns.length} speakingLabel={voice === 'you' ? 'Your prepared reply is playing' : undefined} scenario={demo.scenario} phase={phase} step={index} messages={messages} onEnd={() => { track('practice_finish', { mode: 'demo', result: 'ended', language: demo.id.startsWith('en-') ? 'en' : 'ja', duration: Math.floor((Date.now() - demoStarted.current) / 1000) }); stop(); onFinish(messages); }} controls={<button className="control-button" onClick={() => { track('action', { mode: 'demo', action: 'explain' }); pause(); setExplain(true); }}><HelpCircle size={18} />Explain question</button>} explanation={explain && <Explanation onClose={() => { setExplain(false); setPhase('listening'); }}><h3>What the question means</h3><p>{turn.meaning}</p><p className="explanation-note">{turn.note}</p><div className="suggested-reply"><span>You could say</span><p lang="ja"><JapaneseText text={turn.answer} /></p><p>{turn.answerMeaning}</p></div><button className="back-link" onClick={() => { setExplain(false); setPhase('listening'); }}>Back to practice <ArrowRight size={16} /></button></Explanation>}><p className="speaker-label">{phase === 'speaking' && voice === 'you' ? 'Listen to your prepared reply.' : `${demo.partner} asks…`}</p><div className="demo-question-stack"><div className="demo-question-active"><h2 lang="ja" className="japanese-reply"><JapaneseText text={turn.japanese} /></h2><div className={`waveform call-wave ${phase === 'speaking' ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <span key={i} style={{ height: `${7 + ((i * 17 + 3) % 27)}px`, animationDelay: `${i * 0.037}s` }} />)}</div><div className="question-audio-controls"><button className="audio-replay" onClick={() => { if (phase === 'speaking' && voice === 'partner') pause(); else { stop(); track('action', { mode: 'demo', action: slowQuestion ? 'slow' : 'retry' }); play(turn.id, 'partner', slowQuestion); } }}>{phase === 'speaking' && voice === 'partner' ? <Pause size={16} /> : <Play size={16} />}{phase === 'speaking' && voice === 'partner' ? 'Pause question' : 'Replay question'}</button><label className="question-speed"><input type="checkbox" role="switch" checked={slowQuestion} onChange={event => setSlowQuestion(event.target.checked)} />Slower</label></div></div>{demo.turns.filter(item => item.id !== turn.id).map(item => <div className="demo-size-reserve demo-question-reserve" key={item.id} aria-hidden="true" inert><div className="japanese-reply"><JapaneseText text={item.japanese} /></div><div className="demo-audio-reserve" /></div>)}</div>{error && <div className="error" role="alert"><p>{error}</p><button onClick={advance}>Continue without audio <ArrowRight size={16} /></button></div>}<div className="demo-answer"><p className="eyebrow">Your prepared reply</p><div className="demo-answer-stack"><div><p lang="ja" className="answer-japanese"><JapaneseText text={turn.answer} /></p><p className="answer-meaning">{turn.answerMeaning}</p></div>{demo.turns.filter(item => item.id !== turn.id).map(item => <div className="demo-size-reserve" key={item.id} aria-hidden="true" inert><p className="answer-japanese"><JapaneseText text={item.answer} /></p><p className="answer-meaning">{item.answerMeaning}</p></div>)}</div><p className="demo-next-hint">{replying ? 'Listen to your reply. Continue when you’re ready for the next question.' : replyPaused ? 'Reply paused. Resume to finish listening, or Continue to the next question.' : 'Listen to your reply, then Continue to the next question.'}</p><div className="answer-actions"><button className={`button ${replyHeard && !replyPaused && !replying ? 'reply-playback' : 'primary'}`} onClick={next}>{replying ? <Pause size={17} /> : <Play size={17} />}{replying ? 'Pause reply' : replyPaused ? 'Resume reply' : 'Play reply'}</button><button className={`button ${replyHeard && !replyPaused && !replying ? 'primary' : 'reply-playback'}`} onClick={advance}>Continue<ArrowRight size={18} /></button></div></div><details className="demo-history" key={index}><summary>Previous dialogue{previousTurns.length > 0 ? ` (${previousTurns.length})` : ''}<ChevronDown size={15} aria-hidden="true" /></summary><div className="demo-history-list">{previousTurns.length === 0 ? <p>Completed questions and replies will appear here as you practice.</p> : previousTurns.map(previous => <div className="demo-history-reply" key={previous.id}><section className="history-turn history-partner" aria-label="Partner question"><p className="history-speaker">Partner asked</p><p lang={demo.id.startsWith('en-') ? 'en' : 'ja'}><JapaneseText text={previous.japanese} showRomaji={false} /></p>{previous.romaji && <p className="history-romaji">{previous.romaji}</p>}<p className="history-meaning">{previous.meaning}</p><button className="audio-replay" onClick={() => { stop(); play(previous.id, 'partner'); }}><Volume2 size={16} />Hear question</button></section><section className="history-turn history-user" aria-label="Your reply"><p className="history-speaker">You replied</p><p lang={demo.id.startsWith('en-') ? 'en' : 'ja'}><JapaneseText text={previous.answer} showRomaji={false} /></p>{previous.answerRomaji && <p className="history-romaji">{previous.answerRomaji}</p>}<p className="history-meaning">{previous.answerMeaning}</p><button className="audio-replay" onClick={() => { stop(); play(`${previous.id}-reply`, 'you'); }}><Volume2 size={16} />Hear your reply</button></section></div>)}</div></details></CallLayout>;
}

function Explanation({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className="explanation-panel explanation-modal" aria-label="Question explanation" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); onClose(); }}><button className="close-explanation" onClick={onClose} aria-label="Close explanation" autoFocus><X size={18} /></button>{children}</dialog>;
}

function LiveCall({ call, scenario, onFinish }: { call: StartedCall; scenario: string; onFinish: (messages: Message[]) => void }) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastReply, setLastReply] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [help, setHelp] = useState<string | null>(null);
  const [helpData, setHelpData] = useState<QuestionHelp | null>(null);
  const helpRequest = useRef<AbortController | null>(null);
  const helpCache = useRef(new Map<string, QuestionHelp>());
  const [helpListening, setHelpListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const inputWave = useRef<HTMLDivElement | null>(null);
  const conversation = useRef<VoiceConversation | null>(null);
  const savedMessages = useRef<Message[]>([]);
  const pausedRef = useRef(false);
  const replayAudio = useRef<HTMLAudioElement | null>(null);
  const replayUrl = useRef<string | null>(null);
  const ending = useRef(false);
  const liveStarted = useRef(Date.now());
  useEffect(() => {
    let stopped = false;
    let client: VoiceConversation | null = null;
    let completionPending = false;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const ticker = setInterval(() => setElapsed(Math.min(call.max_call_seconds, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    const timer = setTimeout(() => { void end('timeout'); }, call.max_call_seconds * 1000);
    void import('@elevenlabs/client').then(({ Conversation }) => Conversation.startSession({
      conversationToken: call.conversation_token, connectionType: 'webrtc', textOnly: false, customLlmExtraBody: { purpose: 'call', conversation: call.conversation_ref, prompt_version: call.prompt_version },
      overrides: { agent: { prompt: { prompt: call.prompt }, firstMessage: call.greeting, language: call.target_language }, ...(call.voice_id ? { tts: { voiceId: call.voice_id } } : {}) },
      onConnect: () => { if (!stopped) { track('live_connected', { mode: 'live', language: call.target_language }); setPhase('listening'); } },
      onModeChange: ({ mode }) => { if (!stopped && !pausedRef.current) { setPhase(mode === 'speaking' ? 'speaking' : 'listening'); if (mode === 'listening' && completionPending) void end('completed'); } },
      onMessage: ({ message, source, event_id }) => {
        if (stopped) return;
        if (source === 'ai' && !pausedRef.current && hasEndCallRequest(message) && !completionPending) {
          completionPending = true;
          // Let the farewell finish; bound the wait if no playback-end event arrives.
          completionTimer = setTimeout(() => { if (!stopped) void end('completed'); }, 15000);
        }
        const text = source === 'ai' ? spokenText(message) : message;
        if (!text) return;
        const item: Message = { role: source === 'ai' ? 'assistant' : 'user', text };
        const eventKey = `${source}:${event_id}`;
        const existing = eventMessages.get(eventKey);
        if (existing !== undefined) savedMessages.current[existing] = item;
        else { eventMessages.set(eventKey, savedMessages.current.length); savedMessages.current.push(item); }
        setMessages([...savedMessages.current]);
        if (source === 'ai' && !pausedRef.current) setLastReply(text);
      },
      onDisconnect: ({ reason }) => { if (!stopped) { if (reason !== 'error' && !ending.current) { ending.current = true; track('practice_finish', { mode: 'live', result: 'completed', language: call.target_language, duration: Math.floor((Date.now() - liveStarted.current) / 1000) }); onFinish([...savedMessages.current]); return; } setPhase(reason === 'error' ? 'error' : 'ended'); setMuted(true); if (reason === 'error') setError('The voice connection ended. Your transcript is still available.'); } },
      onError: () => { if (!stopped) { track('call_error', { mode: 'live', result: 'error' }); setError('ElevenLabs could not connect. Check your agent’s authentication and allow prompt, first-message and language overrides in its Security settings.'); setPhase('error'); } },
    })).then(async value => { client = value; if (stopped) { await value.endSession(); return; } conversation.current = value; }).catch(() => { if (!stopped) { setPhase('error'); setError('Voice could not start. Check microphone permission and your ElevenLabs agent configuration, then start a new practice.'); } });
    const eventMessages = new Map<string, number>();
    return () => { stopped = true; helpRequest.current?.abort(); clearTimeout(completionTimer); clearTimeout(timer); clearInterval(ticker); replayAudio.current?.pause(); if (replayUrl.current) URL.revokeObjectURL(replayUrl.current); void client?.endSession(); conversation.current = null; void fetch(`/api/sessions/${call.session_id}`, { method: 'DELETE', keepalive: true }); };
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
  const end = async (result: 'ended' | 'timeout' | 'completed' = 'ended') => { if (ending.current) return; ending.current = true; track('practice_finish', { mode: 'live', result, language: call.target_language, duration: Math.floor((Date.now() - liveStarted.current) / 1000) }); replayAudio.current?.pause(); try { await conversation.current?.endSession(); } finally { onFinish([...savedMessages.current]); } };
  const setMic = (enabled: boolean) => { conversation.current?.setMicMuted(!enabled); setMuted(!enabled); };
  const pause = () => { track('action', { mode: 'live', action: 'pause' }); pausedRef.current = true; setPaused(true); setMic(false); conversation.current?.setVolume({ volume: 0 }); conversation.current?.sendUserActivity(); setPhase('paused'); };
  const resume = () => { helpRequest.current?.abort(); setHelpListening(false); replayAudio.current?.pause(); pausedRef.current = false; setPaused(false); setHelp(null); setHelpData(null); conversation.current?.setVolume({ volume: 1 }); setMic(true); conversation.current?.sendContextualUpdate('The learner has left help mode. Continue the same role-play situation.'); setPhase('listening'); };
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
        pause(); setHelpData(null); setHelpListening(false);
        setHelp('Preparing a text explanation…'); setBusy(true);
        const cacheKey = JSON.stringify([lastReply, call.target_language, call.language]);
        const cached = helpCache.current.get(cacheKey);
        if (cached) { helpRequest.current = new AbortController(); setHelpData(cached); setHelp(''); return; }
        helpRequest.current?.abort();
        const controller = new AbortController(); helpRequest.current = controller;
        try {
          const result = await explainQuestion(call.session_id, lastReply, call.target_language, call.language, controller.signal, call.conversation_ref);
          if (controller.signal.aborted || ending.current) return;
          if (helpCache.current.size >= 20) helpCache.current.clear();
          helpCache.current.set(cacheKey, result);
          setHelpData(result); setHelp('');
        } catch (error) {
          if (!controller.signal.aborted) setHelp(errorMessage(error));
        }
      } else {
        resume(); conversation.current.sendUserMessage('Please repeat your last role-play question exactly, slowly, so I can try again.'); setPhase('thinking');
      }
    } catch (e) { if (kind === 'explain') resume(); setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const listenHelp = async () => {
    if (helpListening) { replayAudio.current?.pause(); setHelpListening(false); return; }
    if (!helpData) return;
    setBusy(true); setError('');
    const controller = helpRequest.current;
    try {
      const response = await fetch(`/api/sessions/${call.session_id}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: helpData.meaning + ' ' + helpData.note, language: call.language === 'Japanese' ? 'ja' : 'en' }) });
      if (!response.ok) throw new Error('Explanation audio is unavailable. You can still read it here.');
      const blob = await response.blob();
      if (controller?.signal.aborted || ending.current) return;
      replayAudio.current?.pause(); if (replayUrl.current) URL.revokeObjectURL(replayUrl.current);
      replayUrl.current = URL.createObjectURL(blob);
      const sound = new Audio(replayUrl.current); replayAudio.current = sound;
      sound.onended = () => setHelpListening(false);
      sound.onerror = () => { setHelpListening(false); setError('Explanation audio could not play.'); };
      await sound.play(); setHelpListening(true);
    } catch (error) { setHelpListening(false); setError(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <CallLayout mode="live" timing={{ elapsed, limit: call.max_call_seconds }} scenario={scenario} phase={phase} messages={messages} onEnd={() => void end()} controls={<><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('explain')}><HelpCircle size={18} /> Explain question</button><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('slow')}><Volume2 size={18} /> Slow replay</button><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('retry')}><RotateCcw size={18} /> Repeat question</button></>} explanation={help !== null && <Explanation onClose={resume}><h3>What the question means</h3>{helpData ? <><p className="live-explanation">{helpData.meaning}</p>{helpData.note && <p className="explanation-note">{helpData.note}</p>}<div className="suggested-reply"><span>You could say</span><p lang={call.target_language}><JapaneseText text={helpData.reply} /></p><p>{helpData.replyMeaning}</p></div></> : <p role="status">{help}</p>}<div className="explanation-actions">{helpData && <button className="control-button" disabled={terminal || busy} onClick={() => void listenHelp()}>{helpListening ? <Pause size={16} /> : <Volume2 size={16} />}{helpListening ? 'Stop listening' : 'Listen to explanation'}</button>}<button className="button primary" onClick={resume} disabled={terminal}>Resume practice<ArrowRight size={16} /></button></div></Explanation>}><p className="speaker-label">Your AI practice partner</p><h2 className="japanese-reply" lang="ja"><JapaneseText text={lastReply || call.greeting} sessionId={call.session_id} /></h2><p className="romaji">{call.target_language === 'en' ? 'Practice in English. Ask for help in English or Japanese whenever you need it.' : 'Speak in Japanese or English. Your partner will wait for your answer.'}</p><div className="live-input-activity"><div ref={inputWave} className={`waveform live-input-wave ${inputActive ? '' : 'inactive'}`} role="img" aria-label={inputActive ? 'Your microphone voice activity' : 'Microphone activity inactive'}>{Array.from({ length: 23 }, (_, index) => <span key={index} />)}</div></div><div className="live-mic-row"><button className={`mic-button ${!muted ? 'on' : ''}`} disabled={terminal || phase === 'connecting' || paused || help !== null} aria-label={muted ? 'Turn microphone on' : 'Mute microphone'} onClick={() => setMic(muted)}>{muted ? <MicOff size={23} /> : <Mic size={23} />}</button><span>{muted ? 'Microphone off' : 'Microphone on. Take your time.'}</span></div><button className="audio-replay" disabled={terminal || phase === 'connecting'} onClick={paused ? resume : pause}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume practice' : 'Pause practice'}</button>{error && <p className="error" role="alert">{error}</p>}<form className="typed-answer" onSubmit={event => { event.preventDefault(); if (!text.trim() || !conversation.current) return; resume(); conversation.current.sendUserMessage(text.trim()); setText(''); setPhase('thinking'); }}><label htmlFor="typed-answer">Or type your answer</label><div><input id="typed-answer" value={text} onChange={event => { setText(event.target.value); conversation.current?.sendUserActivity(); }} maxLength={1000} disabled={terminal || phase === 'connecting'} placeholder="Japanese or English is fine" /><button disabled={terminal || phase === 'connecting' || !text.trim()} aria-label="Send typed answer"><Send size={18} /></button></div></form></CallLayout>;
}

function LocalCall({ call, scenario, onFinish }: { call: LocalStarted; scenario: string; onFinish: (messages: Message[]) => void }) {
  const [phase, setPhase] = useState<Phase>('speaking');
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: call.greeting }]);
  const [lastReply, setLastReply] = useState(call.greeting);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [help, setHelp] = useState<string | null>(null);
  const [helpData, setHelpData] = useState<QuestionHelp | null>(null);
  const [text, setText] = useState('');
  const savedMessages = useRef<Message[]>([{ role: 'assistant', text: call.greeting }]);
  const lastAudio = useRef(call.audio);
  const player = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const meter = useRef<{ context: AudioContext; analyser: AnalyserNode } | null>(null);
  const inputWave = useRef<HTMLDivElement | null>(null);
  const ending = useRef(false);
  const started = useRef(Date.now());
  const stopAudio = useCallback(() => { if (player.current) { player.current.onended = null; player.current.pause(); player.current = null; } }, []);
  const play = useCallback((source: string, after?: () => void) => {
    stopAudio();
    const sound = new Audio(source); player.current = sound;
    setPhase('speaking');
    const done = () => { if (player.current !== sound) return; player.current = null; setPhase('listening'); after?.(); };
    sound.onended = done;
    void sound.play().catch(done);
  }, [stopAudio]);
  const finish = useRef((result: 'ended' | 'timeout' | 'completed') => { void result; });
  finish.current = result => {
    if (ending.current) return;
    ending.current = true;
    track('practice_finish', { mode: 'live', result, language: call.target_language, duration: Math.floor((Date.now() - started.current) / 1000) });
    stopAudio();
    if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
    onFinish([...savedMessages.current]);
  };
  useEffect(() => {
    play(call.audio);
    const ticker = setInterval(() => setElapsed(Math.min(call.max_call_seconds, Math.floor((Date.now() - started.current) / 1000))), 1000);
    const timer = setTimeout(() => finish.current('timeout'), call.max_call_seconds * 1000);
    return () => {
      clearInterval(ticker); clearTimeout(timer); stopAudio();
      if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
      microphone.current?.getTracks().forEach(track => track.stop());
      void meter.current?.context.close();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      void fetch(`/api/local/sessions/${call.session_id}`, { method: 'DELETE', keepalive: true });
    };
  }, [call, play, stopAudio]);
  useEffect(() => {
    const bars = inputWave.current?.querySelectorAll('span');
    if (!bars) return;
    const reset = () => bars.forEach(bar => { bar.style.transform = 'scaleY(0.1)'; });
    reset();
    const analyser = meter.current?.analyser;
    if (!recording || !analyser) return;
    const levels = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const draw = () => {
      analyser.getByteFrequencyData(levels);
      bars.forEach((bar, index) => { bar.style.transform = `scaleY(${Math.max(0.1, (levels[Math.floor(index * (levels.length / bars.length))] ?? 0) / 255)})`; });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); reset(); };
  }, [recording]);
  const send = async (body: Blob | string) => {
    setBusy(true); setError(''); setPhase('thinking');
    try {
      const response = await fetch(`/api/local/sessions/${call.session_id}/turn`, typeof body === 'string'
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: body }) }
        : { method: 'POST', headers: { 'Content-Type': body.type || 'audio/webm' }, body });
      if (!response.ok) throw new Error(await errorDetail(response, 'Your answer could not be processed. Try again.'));
      const result = localTurnSchema.parse(await response.json());
      if (ending.current) return;
      savedMessages.current = [...savedMessages.current, { role: 'user', text: result.heard }, { role: 'assistant', text: result.reply }];
      setMessages(savedMessages.current); setLastReply(result.reply); lastAudio.current = result.audio;
      if (result.ended) {
        // Let the farewell play, but never wait on it forever.
        const fallback = setTimeout(() => finish.current('completed'), 15000);
        play(result.audio, () => { clearTimeout(fallback); finish.current('completed'); });
      } else play(result.audio);
    } catch (e) { if (!ending.current) { setError(errorMessage(e)); setPhase('listening'); } }
    finally { setBusy(false); }
  };
  const toggleRecording = async () => {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    setError(''); stopAudio(); setPhase('listening');
    try {
      if (!microphone.current) {
        microphone.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        const context = new AudioContext();
        const analyser = context.createAnalyser(); analyser.fftSize = 64;
        context.createMediaStreamSource(microphone.current).connect(analyser);
        meter.current = { context, analyser };
      }
      const chunks: Blob[] = [];
      const next = new MediaRecorder(microphone.current);
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        recorder.current = null;
        const blob = new Blob(chunks, { type: next.mimeType || 'audio/webm' });
        if (blob.size) void send(blob); else setError('Nothing was recorded. Tap to speak and try again.');
      };
      recorder.current = next; next.start(); setRecording(true);
    } catch (e) { setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Your microphone was blocked. Allow it in browser settings, or type your answer.' : errorMessage(e)); }
  };
  const speak = async (body: { text: string; slow?: boolean; language?: 'ja' | 'en' }) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/local/sessions/${call.session_id}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(await errorDetail(response, 'Audio is unavailable right now.'));
      const url = URL.createObjectURL(await response.blob());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;
      play(url);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const explain = async () => {
    track('action', { mode: 'live', action: 'explain', language: call.target_language });
    stopAudio(); setPhase('paused'); setHelpData(null); setHelp('Preparing a text explanation…'); setBusy(true);
    try {
      const response = await fetch(`/api/local/sessions/${call.session_id}/explain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: lastReply }) });
      if (!response.ok) throw new Error(await errorDetail(response, 'The explanation could not be prepared. Try again.'));
      setHelpData(helpSchema.parse(await response.json())); setHelp('');
    } catch (e) { setHelp(errorMessage(e)); } finally { setBusy(false); }
  };
  const closeHelp = () => { stopAudio(); setHelp(null); setHelpData(null); setPhase('listening'); };
  const statusText = recording ? 'Recording. Tap again to send.' : phase === 'thinking' ? 'Your partner is thinking…' : undefined;
  return <CallLayout mode="live" modeLabel="Free local practice" statusText={statusText} timing={{ elapsed, limit: call.max_call_seconds }} scenario={scenario} phase={phase} messages={messages} onEnd={() => finish.current('ended')} controls={<><button className="control-button" disabled={busy || recording} onClick={() => void explain()}><HelpCircle size={18} /> Explain question</button><button className="control-button" disabled={busy || recording} onClick={() => { track('action', { mode: 'live', action: 'slow', language: call.target_language }); void speak({ text: lastReply, slow: true }); }}><Volume2 size={18} /> Slow replay</button><button className="control-button" disabled={busy || recording} onClick={() => { track('action', { mode: 'live', action: 'retry', language: call.target_language }); play(lastAudio.current); }}><RotateCcw size={18} /> Repeat question</button></>} explanation={help !== null && <Explanation onClose={closeHelp}><h3>What the question means</h3>{helpData ? <><p className="live-explanation">{helpData.meaning}</p>{helpData.note && <p className="explanation-note">{helpData.note}</p>}<div className="suggested-reply"><span>You could say</span><p lang={call.target_language}><JapaneseText text={helpData.reply} /></p><p>{helpData.replyMeaning}</p></div></> : <p role="status">{help}</p>}<div className="explanation-actions">{helpData && <button className="control-button" disabled={busy} onClick={() => void speak({ text: `${helpData.meaning} ${helpData.note}`, language: call.language === 'Japanese' ? 'ja' : 'en' })}><Volume2 size={16} />Listen to explanation</button>}<button className="button primary" onClick={closeHelp}>Resume practice<ArrowRight size={16} /></button></div></Explanation>}><p className="speaker-label">Your AI practice partner · {call.model} on this computer</p><h2 className="japanese-reply" lang={call.target_language}><JapaneseText text={lastReply} sessionId={call.session_id} /></h2><p className="romaji">{call.target_language === 'en' ? 'Answer in English. Tap the microphone, speak, then tap again to send.' : 'Answer in Japanese or English. Tap the microphone, speak, then tap again to send.'}</p><div className="live-input-activity"><div ref={inputWave} className={`waveform live-input-wave ${recording ? '' : 'inactive'}`} role="img" aria-label={recording ? 'Your microphone voice activity' : 'Microphone activity inactive'}>{Array.from({ length: 23 }, (_, index) => <span key={index} />)}</div></div><div className="live-mic-row"><button className={`mic-button ${recording ? 'on' : ''}`} disabled={busy && !recording} aria-pressed={recording} aria-label={recording ? 'Send your answer' : 'Speak your answer'} onClick={() => void toggleRecording()}>{recording ? <Send size={23} /> : <Mic size={23} />}</button><span>{recording ? 'Recording. Tap to send.' : busy ? 'Your partner is thinking…' : 'Tap to speak.'}</span></div>{error && <p className="error" role="alert">{error}</p>}<form className="typed-answer" onSubmit={event => { event.preventDefault(); if (!text.trim() || busy) return; stopAudio(); void send(text.trim()); setText(''); }}><label htmlFor="typed-answer">Or type your answer</label><div><input id="typed-answer" value={text} onChange={event => setText(event.target.value)} maxLength={1000} disabled={busy || recording} placeholder="Japanese or English is fine" /><button disabled={busy || recording || !text.trim()} aria-label="Send typed answer"><Send size={18} /></button></div></form></CallLayout>;
}

const callCardSchema = z.object({
  phrases: z.array(z.object({ japanese: z.string(), romaji: z.string(), meaning: z.string().optional(), role: z.enum(['user', 'assistant']), turn: z.number().int() })),
  words: z.array(z.object({ japanese: z.string(), romaji: z.string(), meaning: z.string() })),
});

function Finished({ scenario, messages, mode, onLive, targetLanguage, onHome, trace }: { onHome: () => void; trace?: CallTrace; targetLanguage: 'ja' | 'en'; scenarioId?: string; scenario: string; messages: Message[]; mode: 'demo' | 'live'; onDemo: () => void; onLive: () => void }) {
  const [cardState, setCardState] = useState<{ kind: 'loading' } | { kind: 'ready'; data: z.infer<typeof callCardSchema> } | { kind: 'error'; message: string }>({ kind: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    request('/api/call-card', callCardSchema, { method: 'POST', body: JSON.stringify({ enrich_vocabulary: mode === 'live', target_language: targetLanguage, messages: messages.filter(message => message.text.trim()).slice(-100) }), signal: controller.signal })
      .then(data => setCardState({ kind: 'ready', data }))
      .catch(error => { if (!controller.signal.aborted) setCardState({ kind: 'error', message: errorMessage(error) }); });
    return () => controller.abort();
  }, [messages, targetLanguage, mode]);
  const phrases = cardState.kind === 'ready' ? cardState.data.phrases : [];
  const [cardView, setCardView] = useState<'conversation' | 'words'>('conversation');
  const [cardPage, setCardPage] = useState(0);
  const words = cardState.kind === 'ready' ? cardState.data.words : [];
  const pageCount = cardView === 'words' ? Math.ceil(words.length / 3) : messages.length;
  const message = messages[cardPage];
  const phrase = message ? phrases.find(item => item.role === message.role && item.japanese === message.text) : undefined;
  const card = buildCallCard({ scenario, messages, phrases: cardState.kind === 'ready' ? cardState.data.phrases : [], words: cardState.kind === 'ready' ? cardState.data.words : [] });
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    track('action', { action: 'download', mode, language: targetLanguage });
    setDownloading(true);
    let file = new Blob([card], { type: 'text/plain;charset=utf-8' });
    let name = 'before-i-call-practice-card.txt';
    try {
      const today = new Date();
      const response = await fetch('/api/call-card.pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        scenario, mode, target_language: targetLanguage,
        practiced_on: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        messages: messages.filter(item => item.text.trim()).slice(-100).map(item => {
          const match = phrases.find(entry => entry.role === item.role && entry.japanese === item.text);
          return { role: item.role, text: item.text, romaji: match?.romaji ?? '', meaning: match?.meaning ?? '' };
        }),
        words: words.slice(0, 60),
      }) });
      if (response.ok) { file = await response.blob(); name = 'before-i-call-practice-card.pdf'; }
    } catch { /* The text card still downloads when the PDF service is unreachable. */ } finally { setDownloading(false); }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="finished-layout"><div className="finished-summary"><button className="back-link" onClick={onHome}><ArrowLeft size={16} />Back to home</button><div className="completion-label"><Check size={18} aria-hidden="true" /><span>Practice finished</span></div><h1>Keep what you learned.</h1><p>Review your conversation or save it for your next call.</p><div className="home-actions finished-actions"><button className="button primary" disabled={cardState.kind === 'loading' || downloading} onClick={() => void download()}><Download size={17} />{downloading ? 'Preparing PDF…' : 'Download call card'}</button><button className="button text-button" onClick={onLive}>Practice another call<ArrowRight size={17} /></button></div><p className="small-note">Practice only. No real call or booking was made.</p></div><div className="finished-card compact-call-card"><h2>Your call card</h2><p>Review what you said. The download includes everything.</p><div className="card-view-options" role="group" aria-label="Call card view"><button aria-pressed={cardView === 'conversation'} onClick={() => { setCardView('conversation'); setCardPage(0); }}>Conversation</button><button aria-pressed={cardView === 'words'} onClick={() => { setCardView('words'); setCardPage(0); }}>Words</button></div><div className="card-page-content">
      {cardView === 'words' && cardState.kind === 'loading' && <p role="status">Preparing your call card…</p>}
      {cardState.kind === 'error' && <p role="alert">Reading support is unavailable. Your conversation is still shown below.</p>}

      {cardView === 'words' && cardState.kind === 'ready' && <div className="compact-vocabulary">{words.length === 0 ? <p>No words yet.</p> : words.slice(cardPage * 3, cardPage * 3 + 3).map(word => <div key={word.japanese}><p lang={targetLanguage}><JapaneseText text={word.japanese} showRomaji={false} /></p>{targetLanguage === 'ja' && <p className="card-romaji">{word.romaji}</p>}<p className="card-meaning">{word.meaning}</p></div>)}</div>}
      {cardView === 'conversation' && (message ? <div className="call-card-phrase"><span>{message.role === 'assistant' ? 'Partner' : 'You'}</span><p lang={targetLanguage}><JapaneseText text={message.text} showRomaji={!phrase?.romaji} /></p>{phrase?.romaji && <p className="card-romaji">{phrase.romaji}</p>}{phrase?.meaning && <p className="card-meaning">{phrase.meaning}</p>}{mode === 'live' && trace && message.role === 'assistant' && <ReportReply key={cardPage} conversation={trace.conversation} promptVersion={trace.promptVersion} replyNumber={messages.slice(0, cardPage + 1).filter(item => item.role === 'assistant').length} reply={message.text} language={targetLanguage} />}</div> : <p>No conversation yet.</p>)}
    </div><nav className="card-pagination" aria-label="Call card pages"><button className="control-button" aria-label="Previous card page" disabled={cardPage === 0} onClick={() => setCardPage(page => page - 1)}><ArrowLeft size={16} /></button><span aria-live="polite">{pageCount > 0 ? `${cardPage + 1} of ${pageCount}` : '0 of 0'}</span><button className="control-button" aria-label="Next card page" disabled={cardPage + 1 >= pageCount} onClick={() => setCardPage(page => page + 1)}><ArrowRight size={16} /></button></nav></div></section>;
}

function analyticsScenario(value: string): 'repair' | 'clinic' | 'delivery' | 'city' | 'food' | 'lost' | 'bill' | 'custom' { switch (value) { case 'repair': case 'clinic': case 'delivery': case 'city': case 'food': case 'lost': case 'bill': return value; default: return 'custom'; } }

function formatTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export default App;


