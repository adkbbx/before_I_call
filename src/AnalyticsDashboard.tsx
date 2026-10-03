import { useState } from 'react';
import { z } from 'zod';
import { request } from './api';

const numbers = z.record(z.string(), z.number());
const reportSchema = z.object({ visits: z.number(), estimated_visitors: z.number(), window_days: z.number(), counts: numbers, daily_visits: numbers, languages: numbers, scenarios: numbers, actions: numbers, outcomes: numbers, average_duration: z.number(), journeys: z.array(z.object({ label: z.string(), events: z.array(z.object({ name: z.string(), at: z.number(), properties: z.record(z.string(), z.union([z.string(), z.number()])) })) })) });

const labels: Record<string, string> = { ja: 'Japanese', en: 'English', repair: 'Home repairs', clinic: 'Clinic appointment', delivery: 'Missed delivery', city: 'City office', food: 'Dietary requests', lost: 'Lost property', bill: 'Bills and utilities', custom: 'Own situation', completed: 'Completed', ended: 'Ended early', demo_start: 'Guided examples started', live_start: 'Live practices started', live_connected: 'Live connections', practice_finish: 'Practices finished', page: 'Page views', visit: 'Visits', action: 'Actions' };
const label = (name: string) => labels[name] ?? name.replaceAll('_', ' ');

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  return <section className="analytics-section"><h2>{title}</h2>{Object.keys(values).length ? <table><thead><tr><th>Activity</th><th>Count</th></tr></thead><tbody>{Object.entries(values).sort((a, b) => b[1] - a[1]).map(([name, count]) => <tr key={name}><td>{label(name)}</td><td>{count.toLocaleString()}</td></tr>)}</tbody></table> : <p>No activity yet.</p>}</section>;
}

function Bars({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return <section className="analytics-overview-panel"><h2>{title}</h2>{entries.length === 0 ? <p className="small-note">No activity yet.</p> : <ul className="analytics-bars">{entries.map(([name, count]) => <li key={name}><div><span>{label(name)}</span><strong>{count.toLocaleString()}</strong></div><div className="analytics-bar-track" aria-hidden="true"><span style={{ width: `${count / max * 100}%` }} /></div></li>)}</ul>}</section>;
}

type Journey = z.infer<typeof reportSchema>['journeys'][number];
const eventTitles: Record<string, string> = { explain: 'Asked for an explanation', pause: 'Paused practice', reply: 'Played a reply', slow: 'Replayed slowly', retry: 'Repeated a question', download: 'Downloaded call card', home: 'Opened home', setup: 'Opened setup', live: 'Opened live practice', demo: 'Opened guided example', finished: 'Opened call card' };
function eventTitle(event: Journey['events'][number]) {
  if (event.name === 'page') return eventTitles[String(event.properties.page)] ?? 'Opened a page';
  if (event.name === 'action') return eventTitles[String(event.properties.action)] ?? label(String(event.properties.action ?? 'Action'));
  if (event.name === 'practice_finish') return event.properties.result === 'completed' ? 'Completed practice' : 'Ended practice';
  return label(event.name);
}
function journeyStatus(journey: Journey) {
  const lastStart = journey.events.reduce((last, event, index) => event.name === 'demo_start' || event.name === 'live_start' ? index : last, -1);
  const lastFinish = journey.events.reduce((last, event, index) => event.name === 'practice_finish' ? index : last, -1);
  if (lastFinish > lastStart) return journey.events[lastFinish].properties.result === 'completed' ? 'Completed' : 'Ended early';
  return lastStart >= 0 ? 'No finish recorded' : 'Browsing only';
}
function VisitTimeline({ journey }: { journey: Journey }) {
  const [page, setPage] = useState(0);
  const total = Math.ceil(journey.events.length / 10);
  const start = journey.events[0]?.at;
  const context = journey.events.find(event => event.name === 'demo_start' || event.name === 'live_start');
  return <details className="journey-visit"><summary><div><strong>{journey.label}</strong><span>{start ? new Date(start * 1000).toLocaleString('en-US', { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No events'} · JST</span></div><div><span className="journey-status">{journeyStatus(journey)}</span><span>{context ? `${context.name === 'live_start' ? 'Live' : 'Guided'} · ${label(String(context.properties.language ?? 'Unknown language'))} · ${label(String(context.properties.scenario ?? 'Unknown situation'))}` : `${journey.events.length} events`}</span></div></summary><ol className="journey-timeline" start={page * 10 + 1}>{journey.events.slice(page * 10, page * 10 + 10).map((event, index) => <li key={page * 10 + index}><time>{new Date(event.at * 1000).toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</time><div><strong>{eventTitle(event)}</strong><span>{['language', 'scenario', 'mode', 'result', 'duration'].flatMap(name => { const value = event.properties[name]; return value === undefined ? [] : [name === 'duration' ? `${value}s practice` : label(String(value))]; }).join(' · ')}</span></div></li>)}</ol>{total > 1 && <nav className="journey-pagination" aria-label={`${journey.label} event pages`}><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous events</button><span>{page + 1} of {total}</span><button disabled={page + 1 >= total} onClick={() => setPage(value => value + 1)}>Next events</button></nav>}</details>;
}
function Journeys({ journeys }: { journeys: Journey[] }) {
  const [filter, setFilter] = useState('All visits');
  const [page, setPage] = useState(0);
  const filtered = journeys.filter(journey => filter === 'All visits' || (filter === 'With practice' ? journey.events.some(event => event.name === 'demo_start' || event.name === 'live_start') : journeyStatus(journey) === filter));
  const total = Math.ceil(filtered.length / 5);
  return <section className="analytics-section journey-explorer"><h2>Recent visit journeys</h2><p className="small-note">See what happened in each visit. “No finish recorded” means no ending event was received.</p><div className="journey-filters" role="group" aria-label="Filter visits">{['All visits', 'With practice', 'Completed', 'Browsing only'].map(option => <button key={option} aria-pressed={filter === option} onClick={() => { setFilter(option); setPage(0); }}>{option}</button>)}</div><p className="journey-result-count">{filtered.length} matching visits</p>{filtered.length === 0 ? <p className="small-note">No visits match this filter.</p> : filtered.slice(page * 5, page * 5 + 5).map(journey => <VisitTimeline key={journey.label} journey={journey} />)}{total > 1 && <nav className="journey-pagination" aria-label="Visit pages"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous visits</button><span>{page + 1} of {total}</span><button disabled={page + 1 >= total} onClick={() => setPage(value => value + 1)}>Next visits</button></nav>}</section>;
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
  return <main className="analytics-shell"><a className="back-link" href="/">Back to the app</a><div className="analytics-heading"><div><h1>Usage overview</h1><p className="small-note">{data ? `Practice activity over the last ${data.window_days} days` : 'See how people use call practice.'}</p></div>{data && <button className="button primary" disabled={busy} onClick={() => void load()}>{busy ? 'Refreshing…' : 'Refresh'}</button>}</div><details className="analytics-access" open={data ? undefined : true}><summary>{data ? 'Report access' : 'Sign in to view analytics'}</summary><form className="analytics-login" onSubmit={event => { event.preventDefault(); void load(); }}><label htmlFor="analytics-key">Admin key</label><input id="analytics-key" type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} required /><button className="button primary" disabled={busy}>{busy ? 'Loading…' : 'View report'}</button></form></details>{error && <p className="error" role="alert">{error}</p>}{data && <>
    <div className="analytics-metrics overview-metrics"><div><span>Visits</span><strong>{data.visits.toLocaleString()}</strong><small>All time</small></div><div><span>Practice starts</span><strong>{((data.counts.demo_start ?? 0) + (data.counts.live_start ?? 0)).toLocaleString()}</strong><small>Last {data.window_days} days</small></div><div><span>Completed practices</span><strong>{(data.outcomes.completed ?? 0).toLocaleString()}</strong><small>Last {data.window_days} days</small></div><div><span>Average practice length</span><strong>{Math.round(data.average_duration)}s</strong><small>Finished practices · last {data.window_days} days</small></div></div>
    <div className="analytics-overview-grid"><Bars title="Practice types" values={{ demo_start: data.counts.demo_start ?? 0, live_start: data.counts.live_start ?? 0 }} /><Bars title="How practices ended" values={data.outcomes} /><Bars title="Languages" values={data.languages} /><Bars title="Situations" values={data.scenarios} /></div>
    <details className="analytics-detail-report"><summary>Detailed report and visit journeys</summary><p className="small-note">{data.estimated_visitors.toLocaleString()} estimated browser visitors, all time. Browser identifiers do not identify people. Daily dates use UTC; events are retained for 90 days.</p><div className="analytics-grid"><Breakdown title="All events" values={data.counts} /><Breakdown title="Help and other actions" values={data.actions} /><Breakdown title="Daily visits" values={data.daily_visits} /></div><Journeys key={data.journeys.map(journey => journey.label + journey.events.length).join()} journeys={data.journeys} /></details>
  </>}</main>;
}
