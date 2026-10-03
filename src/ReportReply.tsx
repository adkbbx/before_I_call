import { useEffect, useRef, useState } from 'react';
import { Check, Flag, X } from 'lucide-react';
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
  const dialog = useRef<HTMLDialogElement | null>(null);
  const reportToggle = useRef<HTMLButtonElement | null>(null);
  const isOpen = state.kind === 'open' || state.kind === 'sending' || state.kind === 'error';
  useEffect(() => {
    if (!isOpen || !dialog.current) return;
    const element = dialog.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; if (reportToggle.current) reportToggle.current.focus({ preventScroll: true }); else if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true }); };
  }, [isOpen]);
  if (state.kind === 'sent') return <p className="report-status" role="status">Thanks. Your report on partner reply {replyNumber} was sent to the developer.</p>;
  if (state.kind === 'closed') return <button type="button" className="report-toggle" ref={reportToggle} onClick={() => setState({ kind: 'open' })}><Flag size={14} aria-hidden="true" />Report this reply</button>;
  const send = async () => {
    if (!reason) return;
    setState({ kind: 'sending' });
    try {
      await request('/api/reports', z.object({ ok: z.boolean() }), { method: 'POST', body: JSON.stringify({ conversation, prompt_version: promptVersion ?? '', reply_number: replyNumber, reason, language, note: note.trim(), reply: includeReply ? reply : '' }) });
      setState({ kind: 'sent' });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'The report could not be sent. Try again.' }); }
  };
  const busy = state.kind === 'sending';
  return <dialog ref={dialog} className="report-dialog" aria-labelledby={`report-title-${replyNumber}`} onCancel={event => { event.preventDefault(); if (!busy) setState({ kind: 'closed' }); }} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary')).filter(element => element.getClientRects().length > 0);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><form className="report-form" onSubmit={event => { event.preventDefault(); void send(); }}><header className="report-header"><div><h2 id={`report-title-${replyNumber}`}>Report a reply</h2><p>Partner reply {replyNumber}</p></div><button type="button" className="report-close" disabled={busy} onClick={() => setState({ kind: 'closed' })} aria-label="Close report"><X size={18} /></button></header>
    <fieldset disabled={busy}><legend>What was the problem?</legend><div className="report-reasons" role="group" aria-label="Report reason">{reasons.map(([value, label]) => <button key={value} type="button" aria-pressed={reason === value} onClick={() => setReason(value)}><span>{label}</span>{reason === value && <Check size={16} aria-hidden="true" />}</button>)}</div><details className="report-note"><summary>Add a note<span>Optional</span></summary><label className="visually-hidden" htmlFor={`report-note-${replyNumber}`}>Additional details</label><textarea id={`report-note-${replyNumber}`} value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={2} placeholder="For example: I said 5 minutes, it heard 6." /></details><label className="report-consent"><input type="checkbox" role="switch" checked={includeReply} onChange={event => setIncludeReply(event.target.checked)} /><span>Attach this reply’s text</span></label></fieldset>
    <p className="report-privacy">Your reason, note and practice reference go to the developer. Reply text is shared only if you attach it.</p>{state.kind === 'error' && <p className="error" role="alert">{state.message}</p>}<div className="report-actions"><button type="button" className="button text-button" disabled={busy} onClick={() => setState({ kind: 'closed' })}>Cancel</button><button type="submit" className="button primary" disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</button></div></form></dialog>;
}
