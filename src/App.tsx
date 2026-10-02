import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, Download, Headphones, HelpCircle, Mic, MicOff, Pause, Phone, PhoneOff, Play, RotateCcw, Send, Volume2, X } from 'lucide-react';
import { z } from 'zod';
import demo from './demo.json';
import { JapaneseText } from './JapaneseText';
import { buildCallCard, nextTurn } from './demo-flow.mjs';
import { repairOpening, politeOpening, slowPhrase, repeatPhrase, repairWords, callWords } from './call-phrases.mjs';
import { command, explanationSchema, healthSchema, request, snapshotSchema, startSchema } from './api';

type Message = { role: 'user' | 'assistant'; text: string };
type StartedCall = z.infer<typeof startSchema>;
type Health = z.infer<typeof healthSchema>;
type View = { kind: 'home' } | { kind: 'setup' } | { kind: 'demo' } | { kind: 'live'; call: StartedCall; scenario: string } | { kind: 'finished'; scenario: string; messages: Message[]; mode: 'demo' | 'live' };
type Phase = z.infer<typeof snapshotSchema>['status'];

const statusLabels: Record<Phase, string> = { connecting: 'Connecting your practice partner', listening: 'Your turn. Take your time.', thinking: 'Considering your answer', speaking: 'Tanaka is speaking', paused: 'Paused. There is no rush.', ended: 'Practice finished', error: 'The connection was interrupted' };

function Brand({ onClick, inCall }: { onClick: () => void; inCall: boolean }) {
  const content = <><span className="brand-mark"><AudioLines size={20} /></span>before i call<span className="brand-dot">.</span></>;
  return inCall ? <span className="brand">{content}</span> : <button className="brand" onClick={onClick} aria-label="Before I Call home">{content}</button>;
}

function App() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => { request('/api/health', healthSchema).then(setHealth).catch(() => setHealth(null)); }, []);
  const finish = useCallback((scenario: string, messages: Message[], mode: 'demo' | 'live') => setView({ kind: 'finished', scenario, messages, mode }), []);
  const home = () => setView({ kind: 'home' });
  const inCall = view.kind === 'demo' || view.kind === 'live';
  return <div className="app-shell">
    <header className="site-header"><Brand onClick={home} inCall={inCall} /><span className="header-note">A little practice. A little more courage.</span><span className="language-label">日本語 <span>/</span> EN</span></header>
    <main>
      {view.kind === 'home' && <Home onDemo={() => setView({ kind: 'demo' })} onLive={() => setView({ kind: 'setup' })} />}
      {view.kind === 'setup' && <Setup health={health} onBack={home} onDemo={() => setView({ kind: 'demo' })} onStart={(call, scenario) => setView({ kind: 'live', call, scenario })} />}
      {view.kind === 'demo' && <DemoCall onFinish={(messages) => finish(demo.scenario, messages, 'demo')} />}
      {view.kind === 'live' && <LiveCall call={view.call} scenario={view.scenario} onFinish={(messages) => finish(view.scenario, messages, 'live')} />}
      {view.kind === 'finished' && <Finished scenario={view.scenario} messages={view.messages} mode={view.mode} onDemo={() => setView({ kind: 'demo' })} onLive={() => setView({ kind: 'setup' })} />}
    </main>
    <footer className="site-footer"><span>Made for the moments between knowing and saying.</span><span>Tokyo ↔ everywhere</span></footer>
  </div>;
}

function Home({ onDemo, onLive }: { onDemo: () => void; onLive: () => void }) {
  return <section className="home-grid">
    <div className="home-intro"><h1>A little practice.<br />Then, <span>moshi moshi.</span></h1><p>The washing machine’s leaking. You need to call the building manager. Let’s work out what to say, and what they might say back.</p><div className="home-actions"><button className="button primary" onClick={onDemo}><Play size={18} /> Try the guided demo <ArrowRight size={18} /></button><button className="button text-button" onClick={onLive}>Practice my own call <ArrowRight size={18} /></button></div><p className="small-note">About a minute. No signup. No microphone.</p><div className="home-detail"><Headphones size={24} /><span>A patient practice partner.<br />An explanation whenever you need one.</span></div></div>
    <div className="home-preview"><div className="preview-scene"><Headphones className="lesson-icon" size={32} /><div><span className="eyebrow">THE REPAIR CALL</span><p>One question you might hear.</p></div></div><div className="preview-dialogue"><p className="preview-speaker">“Will you be home tomorrow afternoon?”</p><p lang="ja" className="preview-japanese"><JapaneseText text="明日の午後はご在宅ですか？" /></p><p className="word-hint">Hover or tap the underlined words.<br />The small letters help you read them.</p></div><button className="preview-explain" onClick={onDemo}><Headphones size={20} /><span>Let’s rehearse this together</span><ArrowRight size={20} /></button><div className="preview-bottom"><span>Listen. Take a breath. Reply.</span><span lang="ja">大丈夫。</span></div></div>
    <div className="home-bottom"><p>Room to get<br /><span>your words out.</span></p><p>No scores. No streaks. Pause, ask what a sentence means, and leave with a call card you can keep beside you.</p><span className="home-japanese" lang="ja">もしもし。</span></div>
  </section>;
}

function Setup({ health, onBack, onDemo, onStart }: { health: Health | null; onBack: () => void; onDemo: () => void; onStart: (call: StartedCall, scenario: string) => void }) {
  const [scenario, setScenario] = useState(demo.scenario);
  const [language, setLanguage] = useState('English');
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
      const call = await request('/api/start', startSchema, { method: 'POST', body: JSON.stringify({ scenario, language, access_code: code }) });
      onStart(call, scenario);
    } catch (e) { setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Your microphone was blocked. Allow it in browser settings, then retry, or try the demo.' : errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <section className="setup-layout"><div className="setup-intro"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button><h1>Let’s get you<br />ready to call.</h1><p>Tell us what happened and what you need. Your practice partner will ask the questions you might hear on the other end.</p><div className="setup-aside"><Phone size={22} /><p>A conversation with an AI.<br />No phone numbers. No real bookings.</p></div></div><form className="setup-form" onSubmit={event => { event.preventDefault(); void start(); }}><label htmlFor="scenario">Your situation</label><textarea id="scenario" maxLength={2000} minLength={10} value={scenario} onChange={event => setScenario(event.target.value)} rows={6} disabled={busy} required /><p className="field-hint">Include your availability and any facts you want to explain. Leave out private identifying details.</p><label htmlFor="explanation-language">Explain difficult replies in</label><div className="select-wrap"><select id="explanation-language" value={language} onChange={event => setLanguage(event.target.value)} disabled={busy}><option>English</option><option>Hindi</option></select><ChevronDown size={17} /></div>{health?.access_code_required && <><label htmlFor="access-code">Live practice access code</label><input id="access-code" type="password" value={code} onChange={event => setCode(event.target.value)} disabled={busy} required autoComplete="off" /></>}
      {(!health || !health.live_available) && <div className="notice"><p>Live voice isn’t connected on this server yet.</p><span>The guided demo is ready to try. Live practice needs provider configuration on the Render backend.</span><button type="button" className="back-link" onClick={onDemo}>Open the guided demo <ArrowRight size={15} /></button></div>}
      {error && <p className="error" role="alert">{error}</p>}<button className="button primary wide" disabled={busy || scenario.trim().length < 10}><Mic size={18} />{busy ? 'Connecting your practice partner…' : 'Start voice practice'}</button><p className="small-note">Microphone access starts when you press this button. Audio is processed by voice providers. This app does not save recordings.</p>
    </form></section>;
}

function CallLayout({ mode, scenario, phase, onEnd, children, controls, explanation, messages, step, speakingLabel }: { mode: 'demo' | 'live'; scenario: string; phase: Phase; onEnd: () => void; children: ReactNode; controls: ReactNode; explanation: ReactNode; messages: Message[]; step?: number; speakingLabel?: string }) {
  return <section className="call-layout"><aside className="scenario-rail"><div className="mode-tag"><Headphones size={16} />{mode === 'demo' ? 'Guided demo · scripted' : 'Live AI practice'}</div><h2>You’ve got<br />time to practise.</h2><div className="scenario-facts"><span className="rail-label">Your situation</span><p>{scenario}</p></div><div className="rail-tip"><Headphones size={20} /><p>You can pause at any time.<br />Your partner will wait.</p></div>{step !== undefined && <div className="demo-progress"><span>Conversation {step + 1} of {demo.turns.length}</span><div>{demo.turns.map((turn, i) => <span key={turn.id} className={i <= step ? 'complete' : ''} />)}</div></div>}<button className="end-link" onClick={onEnd}><PhoneOff size={16} /> End practice</button></aside><div className={`call-workspace ${explanation ? 'has-explanation' : ''}`}><div className="call-heading"><span>Tanaka <span className="muted">/ building manager</span></span><span className={`call-status ${phase}`} role="status"><span />{phase === 'speaking' && speakingLabel ? speakingLabel : statusLabels[phase]}</span></div><div className="conversation-area">{children}</div><div className="call-controls">{controls}</div>{explanation}<details className="transcript"><summary>Conversation transcript <ChevronDown size={15} /></summary><div>{messages.map((message, i) => <p key={i}><span>{message.role === 'assistant' ? 'Tanaka' : 'You'}</span><span lang="ja"><JapaneseText text={message.text} /></span></p>)}{messages.length === 0 && <p>The transcript will appear when the conversation begins.</p>}</div></details></div></section>;
}

function DemoCall({ onFinish }: { onFinish: (messages: Message[]) => void }) {
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: demo.turns[0].japanese }]);
  const [phase, setPhase] = useState<Phase>('listening');
  const [explain, setExplain] = useState(false);
  const [error, setError] = useState('');
  const [replying, setReplying] = useState(false);
  const [voice, setVoice] = useState<'partner' | 'you'>('partner');
  const audio = useRef<HTMLAudioElement | null>(null);
  const turn = demo.turns[index];
  const stop = useCallback(() => { if (audio.current) { audio.current.onended = null; audio.current.pause(); audio.current = null; } setReplying(false); }, []);
  const play = useCallback((id: string, speaker: 'partner' | 'you' = 'partner', slow = false, complete?: () => void) => {
    if (audio.current) { audio.current.onended = null; audio.current.pause(); }
    const sound = new Audio(`/audio/${id}.wav`);
    audio.current = sound; sound.playbackRate = slow ? 0.72 : 1;
    setVoice(speaker); setError(''); setPhase('speaking');
    sound.onended = () => { setPhase('listening'); setReplying(false); complete?.(); };
    const failed = () => { if (audio.current !== sound) return; setPhase('listening'); setReplying(false); setError('Audio couldn’t play. Tap to try again, or continue without audio.'); };
    sound.onerror = failed;
    void sound.play().catch(failed);
  }, []);
  useEffect(() => { play(demo.turns[0].id); return () => { if (audio.current) { audio.current.onended = null; audio.current.pause(); } }; }, [play]);
  const pause = () => { stop(); setPhase('paused'); };
  const advance = () => {
    stop();
    const updated: Message[] = [...messages, { role: 'user', text: turn.answer }];
    const target = nextTurn(index, demo.turns.length);
    if (target.kind === 'finished') { onFinish(updated); return; }
    setMessages([...updated, { role: 'assistant', text: demo.turns[target.index].japanese }]);
    setIndex(target.index); setExplain(false); play(demo.turns[target.index].id);
  };
  const next = () => { if (replying) return; setReplying(true); setExplain(false); play(`${turn.id}-reply`, 'you', false, advance); };
  return <CallLayout mode="demo" speakingLabel={voice === 'you' ? 'Your prepared reply is playing' : undefined} scenario={demo.scenario} phase={phase} step={index} messages={messages} onEnd={() => { stop(); onFinish(messages); }} controls={<><button className="control-button" onClick={() => { pause(); setExplain(true); }}><HelpCircle size={18} /> Explain that</button><button className="control-button" onClick={() => { stop(); play(turn.id, 'partner', true); }}><Volume2 size={18} /> Speak slower</button><button className="control-button" onClick={() => { stop(); setExplain(false); play(turn.id); }}><RotateCcw size={18} /> Try again</button></>} explanation={explain && <Explanation onClose={() => { setExplain(false); setPhase('listening'); }}><h3>Here’s what they mean.</h3><p>{turn.meaning}</p><p className="explanation-note">{turn.note}</p><div className="suggested-reply"><span>You could say</span><p lang="ja"><JapaneseText text={turn.answer} /></p><p>{turn.answerMeaning}</p></div><button className="back-link" onClick={() => { setExplain(false); setPhase('listening'); }}>Back to the call <ArrowRight size={16} /></button></Explanation>}><p className="speaker-label">{phase === 'speaking' && voice === 'you' ? 'Listen to your prepared reply.' : 'Tanaka asks…'}</p><h2 lang="ja" className="japanese-reply"><JapaneseText text={turn.japanese} /></h2><p className="romaji">{turn.romaji}</p><div className={`waveform call-wave ${phase === 'speaking' ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <span key={i} style={{ height: `${7 + ((i * 17 + 3) % 27)}px`, animationDelay: `${i * 0.037}s` }} />)}</div><button className="audio-replay" onClick={() => { if (phase === 'speaking') pause(); else play(turn.id); }}>{phase === 'speaking' ? <Pause size={16} /> : <Play size={16} />}{phase === 'speaking' ? 'Pause audio' : 'Hear the reply'}</button>{error && <div className="error" role="alert"><p>{error}</p><button onClick={advance}>Continue without audio <ArrowRight size={16} /></button></div>}<div className="demo-answer"><p className="eyebrow">YOUR REPLY · PREPARED FOR THIS DEMO</p><p lang="ja" className="answer-japanese"><JapaneseText text={turn.answer} /></p><p className="answer-meaning">{turn.answerMeaning}</p><div className="answer-actions"><button className="control-button" disabled={replying} onClick={() => play(`${turn.id}-reply`, 'you')}><Volume2 size={18} /> Hear my reply</button><button className="button primary" disabled={replying} onClick={next}>{replying ? 'Playing your reply…' : 'Reply & continue'} <ArrowRight size={18} /></button></div></div></CallLayout>;
}

function Explanation({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <section className="explanation-panel" aria-label="Explanation"><button className="close-explanation" onClick={onClose} aria-label="Close explanation"><X size={18} /></button>{children}</section>;
}

function LiveCall({ call, scenario, onFinish }: { call: StartedCall; scenario: string; onFinish: (messages: Message[]) => void }) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState('');
  const [help, setHelp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [text, setText] = useState('');
  const daily = useRef<DailyCall | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const replayAudio = useRef<HTMLAudioElement | null>(null);
  const savedMessages = useRef<Message[]>([]);
  const ending = useRef(false);
  const pausedRef = useRef(false);
  const audioUrl = useRef<string | null>(null);
  useEffect(() => {
    let client: DailyCall | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const attachAudio = () => {
      if (!client) return;
      for (const participant of Object.values(client.participants())) {
        const track = participant.tracks.audio.persistentTrack;
        if (!participant.local && track && remoteAudio.current) {
          remoteAudio.current.srcObject = new MediaStream([track]);
          remoteAudio.current.muted = pausedRef.current;
          void remoteAudio.current.play().catch(() => setError('Tap “Enable sound” to hear your practice partner.'));
        }
      }
    };
    void import('@daily-co/daily-js').then(async ({ default: Daily }) => {
      if (stopped) return;
      client = Daily.createCallObject({ audioSource: true, videoSource: false });
      daily.current = client;
      client.on('participant-updated', attachAudio);
      client.on('participant-joined', attachAudio);
      client.on('error', () => { if (!stopped) { setError('The voice connection failed. End practice and retry, or use the guided demo.'); setPhase('error'); } });
      await client.join({ url: call.room_url, token: call.token });
      attachAudio();
    }).catch(e => { if (!stopped) { setError(errorMessage(e)); setPhase('error'); } });
    const poll = async () => {
      try {
        const snapshot = await request(`/api/sessions/${call.session_id}`, snapshotSchema, { signal: controller.signal });
        if (stopped) return;
        savedMessages.current = snapshot.messages;
        setMessages(snapshot.messages); setLastReply(snapshot.last_reply);
        if (!pausedRef.current) setPhase(snapshot.status);
        if (snapshot.status === 'ended' || snapshot.status === 'error') {
          setPhase(snapshot.status);
          await client?.setLocalAudio(false); setMuted(true);
          if (snapshot.status === 'error') setError('The practice service stopped. Your transcript is still available.');
          return;
        }
        setError(current => current.startsWith('Connection lost') ? '' : current);
      } catch (e) { if (!stopped) setError('Connection lost while checking the call. Reconnecting; you can still end practice.'); }
      if (!stopped) timer = setTimeout(() => void poll(), 800);
    };
    void poll();
    return () => {
      stopped = true; controller.abort(); clearTimeout(timer);
      replayAudio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      void client?.destroy(); daily.current = null;
      void fetch(`/api/sessions/${call.session_id}`, { method: 'DELETE', keepalive: true });
    };
  }, [call.room_url, call.token, call.session_id]);
  const end = async () => {
    if (ending.current) return;
    ending.current = true;
    replayAudio.current?.pause();
    if (remoteAudio.current) remoteAudio.current.muted = true;
    try { await daily.current?.setLocalAudio(false); }
    catch { /* Leaving still destroys the call object and releases its microphone. */ }
    finally { onFinish(savedMessages.current); }
  };
  const setMic = async (enabled: boolean) => {
    try { await daily.current?.setLocalAudio(enabled); setMuted(!enabled); }
    catch { setError('Your microphone could not be changed. Check browser permissions.'); }
  };
  const pause = async () => {
    pausedRef.current = true;
    if (remoteAudio.current) remoteAudio.current.muted = true;
    await setMic(false); setPhase('paused');
    await command(call.session_id, 'pause');
  };
  const resume = async () => {
    replayAudio.current?.pause();
    await command(call.session_id, 'resume');
    pausedRef.current = false;
    if (remoteAudio.current) remoteAudio.current.muted = false;
    setHelp(null); setPhase('listening');
    await setMic(!pushToTalk);
  };
  const action = async (kind: 'explain' | 'slow' | 'retry') => {
    setBusy(true); setError('');
    try {
      await pause();
      if (kind === 'explain') {
        setHelp('Loading the explanation…');
        const result = await request(`/api/sessions/${call.session_id}/explain`, explanationSchema, { method: 'POST' });
        setHelp(result.explanation);
      } else if (kind === 'slow') {
        const response = await fetch(`/api/sessions/${call.session_id}/speech`);
        if (!response.ok) throw new Error('Audio replay failed. Read the transcript or try again.');
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        audioUrl.current = URL.createObjectURL(await response.blob());
        replayAudio.current?.pause();
        replayAudio.current = new Audio(audioUrl.current);
        await replayAudio.current.play();
        setHelp('Listen at a slower pace. Resume whenever you’re ready.');
      } else {
        await command(call.session_id, 'retry');
        pausedRef.current = false;
        if (remoteAudio.current) remoteAudio.current.muted = false;
        setHelp(null); setPhase('thinking'); await setMic(!pushToTalk);
      }
    } catch (e) { setError(errorMessage(e)); if (kind === 'explain') setHelp('The explanation could not load. Try “Explain that” again, or resume the call.'); }
    finally { setBusy(false); }
  };
  const terminal = phase === 'ended' || phase === 'error';
  return <CallLayout mode="live" scenario={scenario} phase={phase} onEnd={() => void end()} messages={messages} controls={<><button className="control-button" disabled={busy || !lastReply || terminal} onClick={() => void action('explain')}><HelpCircle size={18} /> Explain that</button><button className="control-button" disabled={busy || !lastReply || terminal} onClick={() => void action('slow')}><Volume2 size={18} /> Speak slower</button><button className="control-button" disabled={busy || !lastReply || terminal} onClick={() => void action('retry')}><RotateCcw size={18} /> Try again</button></>} explanation={help !== null && <Explanation onClose={() => void resume().catch(e => setError(errorMessage(e)))}><h3>The call can wait.</h3><p className="live-explanation">{help}</p><button className="back-link" disabled={busy || terminal} onClick={() => void resume().catch(e => setError(errorMessage(e)))}>Resume the call <ArrowRight size={16} /></button></Explanation>}><audio ref={remoteAudio} autoPlay /><p className="speaker-label">Your AI practice partner</p><h2 lang="ja" className="japanese-reply">{lastReply ? <JapaneseText text={lastReply} sessionId={call.session_id} /> : 'もしもし。'}</h2>{!lastReply && <p className="romaji">Your practice partner is joining. You’ll hear their greeting shortly.</p>}<div className={`waveform call-wave ${phase === 'speaking' ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: 31 }, (_, i) => <span key={i} style={{ height: `${7 + ((i * 17 + 3) % 27)}px` }} />)}</div><div className="live-mic-row"><button className={`mic-button ${!muted ? 'on' : ''}`} disabled={terminal || phase === 'connecting' || pausedRef.current} onClick={() => void setMic(muted)} aria-label={muted ? 'Turn microphone on' : 'Mute microphone'}>{muted ? <MicOff size={23} /> : <Mic size={23} />}</button><span>{pushToTalk ? muted ? 'Tap the mic to speak, then tap to finish.' : 'Speaking. Tap the mic when you finish.' : muted ? 'Microphone off' : 'Hands-free. Pause naturally between answers.'}</span></div><label className="push-to-talk"><input type="checkbox" checked={pushToTalk} disabled={terminal || busy || pausedRef.current} onChange={event => { setPushToTalk(event.target.checked); void setMic(!event.target.checked); }} /> I prefer to tap to speak</label>{pausedRef.current && !help && !terminal && <button className="back-link" onClick={() => void resume().catch(e => setError(errorMessage(e)))}>Resume practice <ArrowRight size={16} /></button>}{error && <div className="error" role="alert"><p>{error}</p>{error.includes('Enable sound') && <button onClick={() => void remoteAudio.current?.play().then(() => setError('')).catch(() => setError('Sound is still blocked. Check your browser audio settings.'))}>Enable sound</button>}</div>}<form className="typed-answer" onSubmit={event => { event.preventDefault(); setBusy(true); void command(call.session_id, 'text', text).then(() => { setText(''); pausedRef.current = false; if (remoteAudio.current) remoteAudio.current.muted = false; setHelp(null); setPhase('thinking'); }).catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); }}><label htmlFor="typed-answer">Or type your answer</label><div><input id="typed-answer" value={text} onChange={event => setText(event.target.value)} maxLength={1000} placeholder="Japanese or English is fine" disabled={busy || terminal} /><button disabled={busy || terminal || !text.trim()} aria-label="Send typed answer"><Send size={18} /></button></div></form></CallLayout>;
}

function Finished({ scenario, messages, mode, onDemo, onLive }: { scenario: string; messages: Message[]; mode: 'demo' | 'live'; onDemo: () => void; onLive: () => void }) {
  const opening = mode === 'demo' ? repairOpening : politeOpening;
  const words = mode === 'demo' ? repairWords : callWords;
  const card = buildCallCard({ scenario, messages, opening: opening.japanese, openingRomaji: opening.romaji, openingMeaning: opening.meaning, words });
  const download = () => {
    const url = URL.createObjectURL(new Blob([card], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'before-i-call-practice-card.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="finished-layout"><div><span className="finished-check"><Check size={26} /></span><h1>That’s one call<br />under your belt.</h1><p>You don’t need perfect Japanese to make the call. Take the useful phrases with you, and give yourself time to think.</p><div className="home-actions"><button className="button primary" onClick={download}><Download size={17} /> Download my call card</button><button className="button text-button" onClick={mode === 'demo' ? onLive : onDemo}>{mode === 'demo' ? 'Practice my own call' : 'Try the guided demo'} <ArrowRight size={17} /></button></div><p className="small-note">This was a rehearsal. No real appointment was booked.</p></div><div className="finished-card"><h2>Keep this close.</h2><div><span>Open the conversation</span><p lang="ja"><JapaneseText text={opening.japanese} /></p><p className="card-romaji">{opening.romaji}</p><p>{opening.meaning}</p></div><div><span>Ask for a little more time</span><p lang="ja"><JapaneseText text={slowPhrase.japanese} /></p><p className="card-romaji">{slowPhrase.romaji}</p><p>{slowPhrase.meaning}</p></div><div><span>Ask them to repeat</span><p lang="ja"><JapaneseText text={repeatPhrase.japanese} /></p><p className="card-romaji">{repeatPhrase.romaji}</p><p>{repeatPhrase.meaning}</p></div><div><span>Your situation</span><p>{scenario}</p></div><div className="card-vocabulary"><h3>Words to keep handy</h3><p>A few useful words for this call.</p><table><caption className="visually-hidden">Useful Japanese words and their pronunciation</caption><thead><tr><th scope="col">Japanese</th><th scope="col">Romaji</th><th scope="col">Meaning</th></tr></thead><tbody>{words.map(word => <tr key={word.japanese}><th scope="row"><JapaneseText text={word.japanese} /></th><td className="word-romaji">{word.romaji}</td><td>{word.meaning}</td></tr>)}</tbody></table></div><details><summary>Your practice transcript <ChevronDown size={15} /></summary>{messages.map((message, i) => <p key={i}><strong>{message.role === 'assistant' ? 'Tanaka' : 'You'}:</strong> {message.text}</p>)}</details></div></section>;
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export default App;
