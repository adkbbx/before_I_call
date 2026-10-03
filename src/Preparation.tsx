import { useRef, useState } from 'react';
import { Sparkles, Undo2 } from 'lucide-react';
import { z } from 'zod';
import { request } from './api';
import './preparation.css';

const schema = z.object({ situation: z.string().min(10).max(1000) });
type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'enhanced'; original: string; result: string };

export function Preparation({ situation, language, target, code, disabled, available, onApply }: { situation: string; language: 'English' | 'Japanese'; target: 'ja' | 'en'; code: string; disabled: boolean; available: boolean; onApply: (value: string) => void }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const current = useRef({ situation, language, target });
  current.current = { situation, language, target };
  const prepare = async () => {
    const source = { situation, language, target };
    setState({ kind: 'loading' });
    try {
      const result = await request('/api/prepare', schema, { method: 'POST', body: JSON.stringify({ situation, language, target_language: target, access_code: code }) });
      if (current.current.situation !== source.situation || current.current.language !== source.language || current.current.target !== source.target) { setState({ kind: 'idle' }); return; }
      onApply(result.situation);
      setState({ kind: 'enhanced', original: source.situation, result: result.situation });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'Couldn’t enhance your situation. Try again.' }); }
  };
  const loading = state.kind === 'loading';
  return <><div className="situation-editor" aria-busy={loading}><textarea id="scenario" aria-describedby="scenario-hint enhance-status" placeholder="For example: I need to call my dentist to change an appointment. I’m free on Friday afternoon." maxLength={2000} minLength={10} value={situation} onChange={event => { onApply(event.target.value); if (!loading) setState({ kind: 'idle' }); }} rows={3} disabled={disabled || loading} required />{available && <div className="situation-editor-actions"><button type="button" className="enhance-prompt" disabled={disabled || loading || situation.trim().length < 10 || situation.length > 1000} onClick={() => void prepare()} title={situation.length > 1000 ? 'Enhance prompts up to 1,000 characters' : 'Make your situation clearer while keeping your details'}><Sparkles size={16} aria-hidden="true" />{loading ? 'Enhancing…' : 'Enhance prompt'}</button></div>}</div><div className="enhance-status" id="enhance-status" role="status">{loading && <span>Making your situation clearer…</span>}{state.kind === 'enhanced' && state.result === situation && <><span>Prompt enhanced. You can still edit it.</span><button type="button" disabled={disabled} onClick={() => { onApply(state.original); setState({ kind: 'idle' }); }}><Undo2 size={14} aria-hidden="true" />Undo</button></>}{state.kind === 'error' && <span className="error">{state.message}</span>}</div><p id="scenario-hint" className="field-hint">Write in English or Japanese. Leave out private details.{available && <span className="enhance-disclosure"> Enhance sends this text to DigitalOcean.</span>}</p></>;
}
