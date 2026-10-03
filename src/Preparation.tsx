import { useState } from 'react';
import { z } from 'zod';
import { request } from './api';

const schema = z.object({ situation: z.string().min(10).max(1000), tip: z.string().max(500) });
type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; result: z.infer<typeof schema>; source: string; language: string; target: string };

export function Preparation({ situation, language, target, code, disabled, onApply }: { situation: string; language: 'English' | 'Japanese'; target: 'ja' | 'en'; code: string; disabled: boolean; onApply: (value: string) => void }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const prepare = async () => {
    setState({ kind: 'loading' });
    try {
      const result = await request('/api/prepare', schema, { method: 'POST', body: JSON.stringify({ situation, language, target_language: target, access_code: code }) });
      setState({ kind: 'ready', result, source: situation, language, target });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'Preparation is unavailable.' }); }
  };
  return <div className="preparation"><button type="button" className="button secondary" disabled={disabled || state.kind === 'loading' || situation.trim().length < 10 || situation.length > 1000} onClick={() => void prepare()}>{state.kind === 'loading' ? 'Preparing…' : 'Help me prepare'}</button><p className="field-hint">Optional. Sends your situation to DigitalOcean for a short suggestion. Up to 1,000 characters.</p>{state.kind === 'error' && <p role="alert" className="error">{state.message}</p>}{state.kind === 'ready' && state.source === situation && state.language === language && state.target === target && <div className="notice" aria-live="polite"><h3>Suggested situation</h3><p>{state.result.situation}</p><p>{state.result.tip}</p><p className="field-hint">Check the details before using this.</p><button type="button" className="button secondary" disabled={disabled} onClick={() => { onApply(state.result.situation); setState({ kind: 'idle' }); }}>Use this situation</button><button type="button" className="back-link" onClick={() => setState({ kind: 'idle' })}>Dismiss</button></div>}</div>;
}
