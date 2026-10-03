import { useState } from 'react';
import { z } from 'zod';
import { request } from './api';

const numbers = z.record(z.string(), z.number());
const reportSchema = z.object({ visits: z.number(), estimated_visitors: z.number(), window_days: z.number(), counts: numbers, daily_visits: numbers, languages: numbers, scenarios: numbers, actions: numbers, outcomes: numbers, average_duration: z.number(), journeys: z.array(z.object({ label: z.string(), events: z.array(z.object({ name: z.string(), at: z.number(), properties: z.record(z.string(), z.union([z.string(), z.number()])) })) })) });

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  return <section className="analytics-section"><h2>{title}</h2>{Object.keys(values).length ? <table><thead><tr><th>Activity</th><th>Count</th></tr></thead><tbody>{Object.entries(values).sort((a, b) => b[1] - a[1]).map(([name, count]) => <tr key={name}><td>{name.replaceAll('_', ' ')}</td><td>{count}</td></tr>)}</tbody></table> : <p>No activity recorded yet.</p>}</section>;
}

export function AnalyticsDashboard() {
  const [key, setKey] = useState('');
  const [data, setData] = useState<z.infer<typeof reportSchema> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setError('');
    try { setData(await request('/api/analytics/report', reportSchema, { headers: { Authorization: `Bearer ${key}` } })); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load analytics.'); }
    finally { setBusy(false); }
  };
  return <main className="analytics-shell"><a className="back-link" href="/">Back to the app</a><h1>Usage & journeys</h1><p>First-party anonymous activity. Browser identifiers estimate visitors; they do not identify people.</p><form className="analytics-login" onSubmit={event => { event.preventDefault(); void load(); }}><label htmlFor="analytics-key">Analytics admin key</label><input id="analytics-key" type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} required /><button className="button primary" disabled={busy}>{busy ? 'Loading…' : data ? 'Refresh report' : 'View analytics'}</button></form>{error && <p className="error" role="alert">{error}</p>}{data && <><p className="small-note">Activity below covers the last {data.window_days} days. Visit and browser totals are lifetime counts. Daily dates use UTC. Detailed events are retained for 90 days.</p><div className="analytics-metrics"><div><strong>{data.visits}</strong><span>Visits</span></div><div><strong>{data.estimated_visitors}</strong><span>Estimated browser visitors</span></div><div><strong>{data.average_duration}s</strong><span>Average finished practice</span></div></div><div className="analytics-grid"><Breakdown title="Practice funnel" values={data.counts} /><Breakdown title="Completion & exits" values={data.outcomes} /><Breakdown title="Language choices" values={data.languages} /><Breakdown title="Situations" values={data.scenarios} /><Breakdown title="Help & other actions" values={data.actions} /><Breakdown title="Daily visits" values={data.daily_visits} /></div><section className="analytics-section"><h2>Recent visit journeys</h2><p>Actions within each visit, in sequence. No transcripts, typed situations, IP addresses or recordings.</p>{data.journeys.map(journey => <details key={journey.label}><summary>{journey.label} · {journey.events.length} events</summary><ol>{journey.events.map((event, index) => <li key={index}><time>{new Date(event.at * 1000).toLocaleTimeString()}</time> <strong>{event.name.replaceAll('_', ' ')}</strong> <span>{Object.entries(event.properties).map(([name, value]) => `${name}: ${value}`).join(' · ')}</span></li>)}</ol></details>)}</section></>}</main>;
}
