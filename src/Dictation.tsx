import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare global { interface Window { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition; } }
type Status = { kind: 'idle' } | { kind: 'listening'; preview: string } | { kind: 'error'; message: string };

export function Dictation({ text, disabled, onText, onListening }: { text: string; disabled: boolean; onText: (text: string) => void; onListening: (active: boolean) => void }) {
  const [language, setLanguage] = useState('en-US');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const instance = useRef<Recognition | null>(null);
  const callbacks = useRef({ onText, onListening });
  callbacks.current = { onText, onListening };
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  useEffect(() => () => { if (instance.current) { instance.current.onresult = null; instance.current.onend = null; instance.current.onerror = null; instance.current.abort(); } callbacks.current.onListening(false); }, []);
  const start = () => {
    if (!Constructor) return;
    const recognition = new Constructor();
    const original = text.trim();
    recognition.lang = language; recognition.continuous = false; recognition.interimResults = true;
    recognition.onresult = event => {
      const final: string[] = []; const interim: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        (result.isFinal ? final : interim).push(result[0].transcript);
      }
      if (final.length) callbacks.current.onText([original, final.join(language === 'ja-JP' ? '' : ' ')].filter(Boolean).join(' ').slice(0, 2000));
      setStatus({ kind: 'listening', preview: interim.join(' ') });
    };
    recognition.onerror = event => {
      setStatus({ kind: 'error', message: event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone access was blocked. Allow it in your browser or type your situation.' : 'Dictation couldn’t hear you. Try again or type your situation.' });
      callbacks.current.onListening(false);
    };
    recognition.onend = () => { instance.current = null; setStatus(value => value.kind === 'error' ? value : { kind: 'idle' }); callbacks.current.onListening(false); };
    instance.current = recognition;
    setStatus({ kind: 'listening', preview: '' }); callbacks.current.onListening(true);
    try { recognition.start(); } catch { instance.current = null; callbacks.current.onListening(false); setStatus({ kind: 'error', message: 'Dictation is unavailable. You can still type your situation.' }); }
  };
  const listening = status.kind === 'listening';
  return <div className="situation-dictation"><div className="dictation-controls"><button type="button" className="control-button" disabled={disabled || !Constructor} aria-pressed={listening} onClick={() => listening ? instance.current?.stop() : start()}>{listening ? <Square size={16} /> : <Mic size={16} />}{listening ? 'Stop dictation' : 'Dictate situation'}</button><label>Speak in<select aria-label="Dictation language" value={language} disabled={disabled || listening || !Constructor} onChange={event => setLanguage(event.target.value)}><option value="en-US">English</option><option value="ja-JP">Japanese</option></select></label></div><p className="field-hint" role="status">{!Constructor ? 'This browser doesn’t support dictation. Type, or use your keyboard’s microphone.' : status.kind === 'error' ? status.message : listening ? status.preview || 'Listening… describe your call. Tap Stop when finished.' : 'Dictation uses your browser’s speech service. Review the text before starting.'}</p></div>;
}
