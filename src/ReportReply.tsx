import { useState } from 'react';
import { Flag } from 'lucide-react';
import { z } from 'zod';
import { request } from './api';
import './report.css';

const reasons = [
  ['misheard', 'Misheard me'],
  ['wrong_language', 'Unnatural or wrong wording'],
  ['made_up', 'Made something up'],
  ['did_not_end', 'Didn’t end the call'],
  ['too_hard', 'Too hard to understand'],
  ['other', 'Something else'],
] as const;
type Reason = typeof reasons[number][0];
type State = { kind: 'closed' } | { kind: 'open' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/** Lets a learner flag one partner reply. The developer sees it in Sentry next to that call's traced Gemma turns. */
export function ReportReply({ conversation, promptVersion, replyNumber, reply, language }: { conversation: string; promptVersion?: string; replyNumber: number; reply: string; language: 'ja' | 'en' }) {
  const [state, setState] = useState<State>({ kind: 'closed' });
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [includeReply, setIncludeReply] = useState(false);
  if (state.kind === 'sent') return <p className="report-status" role="status">Thanks. Your report on partner reply {replyNumber} was sent to the developer.</p>;
  if (state.kind === 'closed') return <button type="button" className="report-toggle" onClick={() => setState({ kind: 'open' })}><Flag size={14} aria-hidden="true" />Report this reply</button>;
  const send = async () => {
    if (!reason) return;
    setState({ kind: 'sending' });
    try {
      await request('/api/reports', z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify({ conversation, prompt_version: promptVersion ?? '', reply_number: replyNumber, reason, language, note: note.trim(), reply: includeReply ? reply : '' }) });
      setState({ kind: 'sent' });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'The report could not be sent. Try again.' }); }
  };
  const busy = state.kind === 'sending';
  return <form className="report-form" onSubmit={event => { event.preventDefault(); void send(); }}>
    <fieldset disabled={busy}>
      <legend>What went wrong with partner reply {replyNumber}?</legend>
      <div className="report-reasons">{reasons.map(([value, label]) => <label key={value}><input type="radio" name={`report-reason-${replyNumber}`} value={value} checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</div>
      <label className="report-note-label" htmlFor={`report-note-${replyNumber}`}>Anything else? (optional)</label>
      <textarea id={`report-note-${replyNumber}`} value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={2} placeholder="For example: I said 5 minutes, it heard 6." />
      <label className="report-consent"><input type="checkbox" checked={includeReply} onChange={event => setIncludeReply(event.target.checked)} />Include the text of this reply</label>
    </fieldset>
    <p className="small-note">Sent to the developer through Sentry with this practice’s reference, so they can find the exact AI turn. Without the box ticked, only your choice and note are sent.</p>
    {state.kind === 'error' && <p className="error" role="alert">{state.message}</p>}
    <div className="report-actions"><button type="submit" className="button primary" disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</button><button type="button" className="button text-button" disabled={busy} onClick={() => setState({ kind: 'closed' })}>Cancel</button></div>
  </form>;
}
