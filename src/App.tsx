import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { VoiceConversation } from '@elevenlabs/client';
import scenarios from './scenarios.json';
import { ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, Download, Headphones, HelpCircle, Mic, MicOff, Pause, Phone, PhoneOff, Play, RotateCcw, Send, Volume2, X } from 'lucide-react';
import { z } from 'zod';
import demo from './demo.json';
import extraDemos from './extra-demos.json';
const demos = [{ ...demo, id: 'repair', title: 'Home repair', partner: 'Tanaka / building manager' }, ...extraDemos];
type Demo = typeof demos[number];
import { JapaneseText } from './JapaneseText';
import { buildCallCard, nextTurn } from './demo-flow.mjs';
import { healthSchema, request, snapshotSchema, startSchema } from './api';

type Message = { role: 'user' | 'assistant'; text: string };
type StartedCall = z.infer<typeof startSchema>;
type Health = z.infer<typeof healthSchema>;
type View = { kind: 'home' } | { kind: 'setup' } | { kind: 'demo'; demoId: string } | { kind: 'live'; call: StartedCall; scenario: string } | { kind: 'finished'; scenario: string; messages: Message[]; mode: 'demo' | 'live'; scenarioId?: string };
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
  const [view, setView] = useState<View>({ kind: 'home' });
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => { request('/api/health', healthSchema).then(setHealth).catch(() => setHealth(null)); }, []);
  const finish = useCallback((scenario: string, messages: Message[], mode: 'demo' | 'live', scenarioId?: string) => setView({ kind: 'finished', scenario, messages, mode, scenarioId }), []);
  const home = () => setView({ kind: 'home' });
  const inCall = view.kind === 'demo' || view.kind === 'live';
  return <div className="app-shell">
    <header className="site-header"><Brand onClick={home} inCall={inCall} /><span className="header-note">Japanese conversation practice</span><span className="language-label">日本語 <span>/</span> EN</span></header>
    <main>
      {view.kind === 'home' && <Home onDemo={(demoId) => setView({ kind: 'demo', demoId })} onLive={() => setView({ kind: 'setup' })} />}
      {view.kind === 'setup' && <Setup health={health} onBack={home} onDemo={() => setView({ kind: 'demo', demoId: 'repair' })} onStart={(call, scenario) => setView({ kind: 'live', call, scenario })} />}
      {view.kind === 'demo' && <DemoCall demo={demos.find(item => item.id === view.demoId) ?? demos[0]} onFinish={(messages) => finish((demos.find(item => item.id === view.demoId) ?? demos[0]).scenario, messages, 'demo')} />}
      {view.kind === 'live' && <LiveCall call={view.call} scenario={view.scenario} onFinish={(messages) => finish(view.scenario, messages, 'live', view.call.scenario_id)} />}
      {view.kind === 'finished' && <Finished scenarioId={view.scenarioId} scenario={view.scenario} messages={view.messages} mode={view.mode} onDemo={() => setView({ kind: 'demo', demoId: 'repair' })} onLive={() => setView({ kind: 'setup' })} />}
    </main>
    <footer className="site-footer"><span>A rehearsal, before the real conversation.</span><span>Built for everyday life in Japan</span></footer>
  </div>;
}

function Home({ onDemo, onLive }: { onDemo: (id: string) => void; onLive: () => void }) {
  const [demoId, setDemoId] = useState('repair');
  const selected = demos.find(item => item.id === demoId) ?? demos[0];
  const preview = selected.turns[0];
  return <section className="home-grid product-home">
    <div className="home-intro"><h1>Make your next call<br /><span>in Japanese.</span></h1><p>Practise the conversation before you need it. Speak with an AI partner, understand their questions, and keep the phrases you actually used.</p><div className="home-actions"><button className="button primary" onClick={onLive}><Phone size={18} />Practice my own call<ArrowRight size={18} /></button></div><p className="small-note">Live voice · English explanations · Furigana and romaji</p><div className="home-detail"><Headphones size={24} /><span>For the delivery you missed, the appointment you need,<br />and the question you couldn’t quite ask.</span></div><div className="product-steps"><span>Speak at your pace</span><span>Ask for an explanation</span><span>Keep your call card</span></div></div>
    <div className="home-preview demo-launcher"><div className="preview-scene"><Headphones className="lesson-icon" size={28} /><div><h2>Start with a guided call</h2><p>Hear both sides. No microphone or signup.</p></div></div><div className="demo-options" role="group" aria-label="Choose a guided conversation">{demos.map(item => <button key={item.id} className={demoId === item.id ? 'selected' : ''} aria-pressed={demoId === item.id} onClick={() => setDemoId(item.id)}>{item.title}</button>)}</div><p className="demo-situation">{selected.scenario}</p><div className="preview-dialogue"><span className="preview-speaker">{selected.partner} asks</span><p lang="ja" className="preview-japanese"><JapaneseText text={preview.japanese} /></p><p className="preview-meaning">{preview.meaning}</p></div><button className="button primary demo-start" onClick={() => onDemo(demoId)}><Play size={18} />Try the guided demo<ArrowRight size={18} /></button><p className="word-hint">{selected.turns.length} short exchanges · Tap an underlined word for its meaning</p></div>
    <div className="home-bottom"><h2>Everyday Japanese.<br />A little more prepared.</h2><p>Choose a situation, rehearse it aloud, then take your own phrases with you. Pause or repeat whenever you need to.</p><p className="product-boundary">Practice only.<br />No real calls or bookings.</p></div>
  </section>;
}

function Setup({ health, onBack, onDemo, onStart }: { health: Health | null; onBack: () => void; onDemo: () => void; onStart: (call: StartedCall, scenario: string) => void }) {
  const [selected, setSelected] = useState('repair');
  const [scenario, setScenario] = useState(scenarios[0].situation);
  const preset = scenarios.find(item => item.id === selected);
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
      const call = await request('/api/start', startSchema, { method: 'POST', body: JSON.stringify({ scenario, scenario_id: selected, language, access_code: code, partner: preset?.partner ?? 'service staff', greeting: preset?.greeting ?? 'もしもし。どうされましたか？' }) });
      onStart(call, scenario);
    } catch (e) { setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Your microphone was blocked. Allow it in browser settings, then retry, or try the demo.' : errorMessage(e)); }
    finally { setBusy(false); }
  };
  return <section className="setup-layout"><div className="setup-intro"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button><h1>Let’s get you<br />ready to call.</h1><p>Tell us what happened and what you need. Your practice partner will ask the questions you might hear on the other end.</p><div className="setup-aside"><Phone size={22} /><p>A conversation with an AI.<br />No phone numbers. No real bookings.</p></div></div><div className="setup-right"><fieldset className="scenario-picker"><legend>What would you like to practise?</legend><div>{scenarios.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setScenario(item.situation); }}><strong>{item.title}</strong><span>{item.description}</span></button>)}<button type="button" aria-pressed={selected === 'custom'} onClick={() => { setSelected('custom'); setScenario(''); }}><strong>Something else</strong><span>Write your own everyday situation.</span></button></div></fieldset><form className="setup-form" onSubmit={event => { event.preventDefault(); void start(); }}><label htmlFor="scenario">Your situation</label><textarea id="scenario" maxLength={2000} minLength={10} value={scenario} onChange={event => setScenario(event.target.value)} rows={6} disabled={busy} required /><p className="field-hint">Include your availability and any facts you want to explain. Leave out private identifying details.</p><label htmlFor="explanation-language">Explain difficult replies in</label><div className="select-wrap"><select id="explanation-language" value={language} onChange={event => setLanguage(event.target.value)} disabled={busy}><option>English</option><option>Hindi</option></select><ChevronDown size={17} /></div>{health?.access_code_required && <><label htmlFor="access-code">Live practice access code</label><input id="access-code" type="password" value={code} onChange={event => setCode(event.target.value)} disabled={busy} required autoComplete="off" /></>}
      {(!health || !health.live_available) && <div className="notice"><p>Live voice isn’t connected on this server yet.</p><span>The guided demo is ready to try. Live practice needs your ElevenLabs Agent ID and an API key with ElevenAgents Read access.</span><button type="button" className="back-link" onClick={onDemo}>Open the guided demo <ArrowRight size={15} /></button></div>}
      {error && <p className="error" role="alert">{error}</p>}<button className="button primary wide" disabled={busy || scenario.trim().length < 10}><Mic size={18} />{busy ? 'Connecting your practice partner…' : 'Start voice practice'}</button><p className="small-note">Microphone access starts when you press this button. Audio is processed by ElevenLabs. This app does not save recordings; provider retention follows your agent’s privacy settings.</p>
    </form></div></section>;
}

function CallLayout({ mode, scenario, phase, onEnd, children, controls, explanation, messages, step, speakingLabel, demoTitle, turnCount }: { mode: 'demo' | 'live'; scenario: string; phase: Phase; onEnd: () => void; children: ReactNode; controls: ReactNode; explanation: ReactNode; messages: Message[]; step?: number; speakingLabel?: string; demoTitle?: string; turnCount?: number }) {
  return <section className="call-layout"><aside className="scenario-rail"><div className="mode-tag"><Headphones size={16} />{mode === 'demo' ? 'Guided demo · scripted' : 'Live AI practice'}</div><h2>You’ve got<br />time to practise.</h2><div className="scenario-facts"><span className="rail-label">Your situation</span><p>{scenario}</p></div><div className="rail-tip"><Headphones size={20} /><p>You can pause at any time.<br />Your partner will wait.</p></div>{step !== undefined && <div className="demo-progress"><span>Conversation {step + 1} of {turnCount ?? 4}</span><div>{Array.from({ length: turnCount ?? 4 }, (_, i) => <span key={i} className={i <= step ? 'complete' : ''} />)}</div></div>}</aside><div className={`call-workspace ${explanation ? 'has-explanation' : ''}`}><div className="call-heading"><div className="call-heading-info"><span>{mode === 'demo' ? demoTitle ?? 'Tanaka' : 'Practice partner'} <span className="muted">/ {mode === 'demo' ? 'guided conversation' : 'your chosen situation'}</span></span><span className={`call-status ${phase}`} role="status"><span />{phase === 'speaking' && speakingLabel ? speakingLabel : statusLabels[phase]}</span></div><button className="end-call-button" onClick={onEnd}><PhoneOff size={20} aria-hidden="true" />End call</button></div><div className="conversation-area">{children}</div><div className="call-controls">{controls}</div>{explanation}<details className="transcript"><summary>Conversation transcript <ChevronDown size={15} /></summary><div>{messages.map((message, i) => <p key={i}><span>{message.role === 'assistant' ? (mode === 'demo' ? 'Partner' : 'Partner') : 'You'}</span><span lang="ja"><JapaneseText text={message.text} /></span></p>)}{messages.length === 0 && <p>The transcript will appear when the conversation begins.</p>}</div></details></div></section>;
}

function DemoCall({ demo, onFinish }: { demo: Demo; onFinish: (messages: Message[]) => void }) {
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: demo.turns[0].japanese }]);
  const [phase, setPhase] = useState<Phase>('listening');
  const [explain, setExplain] = useState(false);
  const [error, setError] = useState('');
  const [replying, setReplying] = useState(false);
  const [voice, setVoice] = useState<'partner' | 'you'>('partner');
  const audio = useRef<HTMLAudioElement | null>(null);
  const nextReply = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = demo.turns[index];
  const stop = useCallback(() => { if (nextReply.current) { clearTimeout(nextReply.current); nextReply.current = null; } if (audio.current) { audio.current.onended = null; audio.current.pause(); audio.current = null; } setReplying(false); }, []);
  const play = useCallback((id: string, speaker: 'partner' | 'you' = 'partner', slow = false, complete?: () => void) => {
    if (audio.current) { audio.current.onended = null; audio.current.pause(); }
    const sound = new Audio(`/audio/${id}.wav`);
    audio.current = sound; sound.playbackRate = slow ? 0.72 : 1;
    setVoice(speaker); setError(''); setPhase('speaking');
    sound.onended = () => { setPhase('listening'); if (complete) nextReply.current = setTimeout(complete, 550); else setReplying(false); };
    const failed = () => { if (audio.current !== sound) return; setPhase('listening'); setReplying(false); setError('Audio couldn’t play. Tap to try again, or continue without audio.'); };
    sound.onerror = failed;
    void sound.play().catch(failed);
  }, []);
  useEffect(() => { play(demo.turns[0].id); return () => { if (nextReply.current) clearTimeout(nextReply.current); if (audio.current) { audio.current.onended = null; audio.current.pause(); } }; }, [play, demo]);
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
  return <CallLayout mode="demo" demoTitle={demo.partner} turnCount={demo.turns.length} speakingLabel={voice === 'you' ? 'Your prepared reply is playing' : undefined} scenario={demo.scenario} phase={phase} step={index} messages={messages} onEnd={() => { stop(); onFinish(messages); }} controls={<><button className="control-button" onClick={() => { pause(); setExplain(true); }}><HelpCircle size={18} /> Explain that</button><button className="control-button" onClick={() => { stop(); play(turn.id, 'partner', true); }}><Volume2 size={18} /> Speak slower</button><button className="control-button" onClick={() => { stop(); setExplain(false); play(turn.id); }}><RotateCcw size={18} /> Try again</button></>} explanation={explain && <Explanation onClose={() => { setExplain(false); setPhase('listening'); }}><h3>Here’s what they mean.</h3><p>{turn.meaning}</p><p className="explanation-note">{turn.note}</p><div className="suggested-reply"><span>You could say</span><p lang="ja"><JapaneseText text={turn.answer} /></p><p>{turn.answerMeaning}</p></div><button className="back-link" onClick={() => { setExplain(false); setPhase('listening'); }}>Back to the call <ArrowRight size={16} /></button></Explanation>}><p className="speaker-label">{phase === 'speaking' && voice === 'you' ? 'Listen to your prepared reply.' : `${demo.partner} asks…`}</p><h2 lang="ja" className="japanese-reply"><JapaneseText text={turn.japanese} /></h2><div className={`waveform call-wave ${phase === 'speaking' ? 'active' : ''}`} aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <span key={i} style={{ height: `${7 + ((i * 17 + 3) % 27)}px`, animationDelay: `${i * 0.037}s` }} />)}</div><button className="audio-replay" onClick={() => { if (phase === 'speaking') pause(); else play(turn.id); }}>{phase === 'speaking' ? <Pause size={16} /> : <Play size={16} />}{phase === 'speaking' ? 'Pause audio' : 'Hear the reply'}</button>{error && <div className="error" role="alert"><p>{error}</p><button onClick={advance}>Continue without audio <ArrowRight size={16} /></button></div>}<div className="demo-answer"><p className="eyebrow">YOUR REPLY · PREPARED FOR THIS DEMO</p><p lang="ja" className="answer-japanese"><JapaneseText text={turn.answer} /></p><p className="answer-meaning">{turn.answerMeaning}</p><div className="answer-actions"><button className="control-button" disabled={replying} onClick={() => play(`${turn.id}-reply`, 'you')}><Volume2 size={18} /> Hear my reply</button><button className="button primary" disabled={replying} onClick={next}>{replying ? 'Playing your reply…' : 'Reply & continue'} <ArrowRight size={18} /></button></div></div></CallLayout>;
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
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const conversation = useRef<VoiceConversation | null>(null);
  const savedMessages = useRef<Message[]>([]);
  const helpMode = useRef(false);
  const pausedRef = useRef(false);
  const replayAudio = useRef<HTMLAudioElement | null>(null);
  const replayUrl = useRef<string | null>(null);
  const ending = useRef(false);
  useEffect(() => {
    let stopped = false;
    let client: VoiceConversation | null = null;
    const timer = setTimeout(() => { setError('The practice time limit has been reached. Your call card is ready.'); setPhase('ended'); void conversation.current?.endSession(); }, call.max_call_seconds * 1000);
    void import('@elevenlabs/client').then(({ Conversation }) => Conversation.startSession({
      conversationToken: call.conversation_token, connectionType: 'webrtc', textOnly: false,
      overrides: { agent: { prompt: { prompt: call.prompt }, firstMessage: call.greeting, language: 'ja' } },
      onConnect: () => { if (!stopped) setPhase('listening'); },
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
      onDisconnect: ({ reason }) => { if (!stopped) { setPhase(reason === 'error' ? 'error' : 'ended'); setMuted(true); if (reason === 'error') setError('The voice connection ended. Your transcript is still available.'); } },
      onError: () => { if (!stopped) { setError('ElevenLabs could not connect. Check your agent’s authentication and allow prompt, first-message and language overrides in its Security settings.'); setPhase('error'); } },
    })).then(async value => { client = value; if (stopped) { await value.endSession(); return; } conversation.current = value; }).catch(() => { if (!stopped) { setPhase('error'); setError('Voice could not start. Check microphone permission and your ElevenLabs agent configuration, then start a new practice.'); } });
    const eventMessages = new Map<number, number>();
    return () => { stopped = true; clearTimeout(timer); replayAudio.current?.pause(); if (replayUrl.current) URL.revokeObjectURL(replayUrl.current); void client?.endSession(); conversation.current = null; void fetch(`/api/sessions/${call.session_id}`, { method: 'DELETE', keepalive: true }); };
  }, [call]);
  const terminal = phase === 'ended' || phase === 'error';
  const end = async () => { if (ending.current) return; ending.current = true; replayAudio.current?.pause(); try { await conversation.current?.endSession(); } finally { onFinish([...savedMessages.current]); } };
  const setMic = (enabled: boolean) => { conversation.current?.setMicMuted(!enabled); setMuted(!enabled); };
  const pause = () => { pausedRef.current = true; setPaused(true); setMic(false); conversation.current?.setVolume({ volume: 0 }); conversation.current?.sendUserActivity(); setPhase('paused'); };
  const resume = () => { replayAudio.current?.pause(); helpMode.current = false; pausedRef.current = false; setPaused(false); setHelp(null); conversation.current?.setVolume({ volume: 1 }); setMic(true); conversation.current?.sendContextualUpdate('The learner has left help mode. Continue the same role-play situation.'); setPhase('listening'); };
  const action = async (kind: 'explain' | 'slow' | 'retry') => {
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
          conversation.current.sendUserMessage(`Repeat this exact Japanese sentence slowly, with clear pauses between phrases. Do not explain or change the question: ${lastReply}`);
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
        conversation.current.sendUserMessage(`Pause the role-play. Explain ONLY the exact Japanese sentence below in ${call.language}. Use the Japanese reading and verified vocabulary below; do not reinterpret kanji as Chinese or substitute similar-sounding words. If a meaning is uncertain, say so. Then suggest one Japanese reply with romaji and meaning.\nSentence: ${lastReply}\nJapanese pronunciation: ${readings.romaji}\nVerified Japanese vocabulary:\n${glossary}`); setPhase('thinking');
      } else {
        resume(); conversation.current.sendUserMessage('Please repeat your last role-play question exactly, slowly, so I can try again.'); setPhase('thinking');
      }
    } catch (e) { if (kind === 'explain') resume(); setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return <CallLayout mode="live" scenario={scenario} phase={phase} messages={messages} onEnd={() => void end()} controls={<><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('explain')}><HelpCircle size={18} /> Explain that</button><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('slow')}><Volume2 size={18} /> Speak slower</button><button className="control-button" disabled={terminal || busy || !lastReply} onClick={() => void action('retry')}><RotateCcw size={18} /> Try again</button></>} explanation={help !== null && <Explanation onClose={resume}><h3>A little help.</h3><p className="live-explanation">{help.split('\n').map((line, i) => <span className="help-line" key={i}>{/[\u3040-\u30ff\u4e00-\u9fff]/.test(line) ? <JapaneseText text={line} sessionId={call.session_id} /> : line}</span>)}</p><button className="back-link" onClick={resume} disabled={terminal}>Resume practice <ArrowRight size={16} /></button></Explanation>}><p className="speaker-label">Your ElevenLabs AI practice partner</p><h2 className="japanese-reply" lang="ja"><JapaneseText text={lastReply || call.greeting} sessionId={call.session_id} /></h2><p className="romaji">Speak in Japanese or English. Your partner will wait for your answer.</p><div className="live-mic-row"><button className={`mic-button ${!muted ? 'on' : ''}`} disabled={terminal || phase === 'connecting' || paused || help !== null} aria-label={muted ? 'Turn microphone on' : 'Mute microphone'} onClick={() => setMic(muted)}>{muted ? <MicOff size={23} /> : <Mic size={23} />}</button><span>{muted ? 'Microphone off' : 'Microphone on. Take your time.'}</span></div><button className="audio-replay" disabled={terminal || phase === 'connecting'} onClick={paused ? resume : pause}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume practice' : 'Pause practice'}</button>{error && <p className="error" role="alert">{error}</p>}<form className="typed-answer" onSubmit={event => { event.preventDefault(); if (!text.trim() || !conversation.current) return; resume(); conversation.current.sendUserMessage(text.trim()); setText(''); setPhase('thinking'); }}><label htmlFor="typed-answer">Or type your answer</label><div><input id="typed-answer" value={text} onChange={event => { setText(event.target.value); conversation.current?.sendUserActivity(); }} maxLength={1000} disabled={terminal || phase === 'connecting'} placeholder="Japanese or English is fine" /><button disabled={terminal || phase === 'connecting' || !text.trim()} aria-label="Send typed answer"><Send size={18} /></button></div></form></CallLayout>;
}

const callCardSchema = z.object({
  phrases: z.array(z.object({ japanese: z.string(), romaji: z.string(), role: z.enum(['user', 'assistant']), turn: z.number().int() })),
  words: z.array(z.object({ japanese: z.string(), romaji: z.string(), meaning: z.string() })),
});

function Finished({ scenario, messages, mode, onDemo, onLive }: { scenarioId?: string; scenario: string; messages: Message[]; mode: 'demo' | 'live'; onDemo: () => void; onLive: () => void }) {
  const [cardState, setCardState] = useState<{ kind: 'loading' } | { kind: 'ready'; data: z.infer<typeof callCardSchema> } | { kind: 'error'; message: string }>({ kind: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    request('/api/call-card', callCardSchema, { method: 'POST', body: JSON.stringify({ messages: messages.filter(message => message.text.trim()).slice(-100) }), signal: controller.signal })
      .then(data => setCardState({ kind: 'ready', data }))
      .catch(error => { if (!controller.signal.aborted) setCardState({ kind: 'error', message: errorMessage(error) }); });
    return () => controller.abort();
  }, [messages]);
  const phrases = cardState.kind === 'ready' ? cardState.data.phrases : [];
  const preview = [...phrases.filter(item => item.role === 'user'), ...phrases.filter(item => item.role === 'assistant')].slice(0, 3).sort((a, b) => a.turn - b.turn);
  const remaining = phrases.filter(item => !preview.includes(item));
  const renderPhrase = (phrase: z.infer<typeof callCardSchema>['phrases'][number]) => <div className="call-card-phrase" key={phrase.turn}><span>Turn {phrase.turn} · {phrase.role === 'user' ? 'You said' : 'Your partner said'}</span><p lang="ja"><JapaneseText text={phrase.japanese} showRomaji={false} /></p><p className="card-romaji">{phrase.romaji}</p></div>;
  const card = buildCallCard({ scenario, messages, phrases: cardState.kind === 'ready' ? cardState.data.phrases : [], words: cardState.kind === 'ready' ? cardState.data.words : [] });
  const download = () => {
    const url = URL.createObjectURL(new Blob([card], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'before-i-call-practice-card.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="finished-layout"><div><span className="finished-check"><Check size={26} /></span><h1>That’s one call<br />under your belt.</h1><p>You don’t need perfect Japanese to make the call. Take the useful phrases with you, and give yourself time to think.</p><div className="home-actions"><button className="button primary" disabled={cardState.kind === 'loading'} onClick={download}><Download size={17} /> Download my call card</button><button className="button text-button" onClick={mode === 'demo' ? onLive : onDemo}>{mode === 'demo' ? 'Practice my own call' : 'Try the guided demo'} <ArrowRight size={17} /></button></div><p className="small-note">This was a rehearsal. No real appointment was booked.</p></div><div className="finished-card"><h2>Your conversation, to keep.</h2><p>Selected directly from what you and your partner said.</p>{cardState.kind === 'loading' && <p role="status">Preparing your conversation card…</p>}{cardState.kind === 'error' && <p role="alert">Your transcript is saved below. Pronunciation could not be prepared: {cardState.message}</p>}{cardState.kind === 'ready' && <>{cardState.data.phrases.length === 0 ? <p>No Japanese phrases were spoken in this practice yet.</p> : <div className="transcript-phrases"><h3>Phrases from your call</h3>{preview.map(renderPhrase)}{remaining.length > 0 && <details className="card-more"><summary>View {remaining.length} more phrases <ChevronDown size={15} /></summary>{remaining.map(renderPhrase)}</details>}</div>}{cardState.data.words.length > 0 && <div className="card-vocabulary"><h3>Words from your call</h3><table><caption className="visually-hidden">Japanese words used in this conversation</caption><thead><tr><th scope="col">Japanese</th><th scope="col">Romaji</th><th scope="col">Meaning</th></tr></thead><tbody>{cardState.data.words.slice(0, 6).map(word => <tr key={word.japanese}><th scope="row"><JapaneseText text={word.japanese} showRomaji={false} /></th><td className="word-romaji">{word.romaji}</td><td>{word.meaning}</td></tr>)}</tbody></table>{cardState.data.words.length > 6 && <details className="card-more"><summary>View {cardState.data.words.length - 6} more words <ChevronDown size={15} /></summary><dl>{cardState.data.words.slice(6).map(word => <div key={word.japanese}><dt><JapaneseText text={word.japanese} showRomaji={false} /> · {word.romaji}</dt><dd>{word.meaning}</dd></div>)}</dl></details>}</div>}</>}<details><summary>Your practice transcript <ChevronDown size={15} /></summary>{messages.map((message, i) => <p key={i}><strong>{message.role === 'assistant' ? (mode === 'demo' ? 'Partner' : 'Partner') : 'You'}:</strong> <JapaneseText text={message.text} /></p>)}</details></div></section>;
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export default App;
