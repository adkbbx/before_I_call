type Properties = {
  page?: 'home' | 'setup' | 'demo' | 'live' | 'finished';
  mode?: 'demo' | 'live';
  language?: 'ja' | 'en';
  scenario?: 'repair' | 'clinic' | 'delivery' | 'city' | 'food' | 'lost' | 'bill' | 'custom';
  action?: 'explain' | 'slow' | 'retry' | 'pause' | 'reply' | 'download' | 'linkedin' | 'github' | 'contribute' | 'star';
  result?: 'completed' | 'ended' | 'timeout' | 'error';
  duration?: number;
};
type EventName = 'visit' | 'page' | 'demo_start' | 'live_start' | 'live_connected' | 'practice_finish' | 'action' | 'call_error';

function identifier(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  storage.setItem(key, id);
  return id;
}

let visitor: string | undefined;
let session: string | undefined;
let visited = false;
export function track(name: EventName, properties: Properties = {}): void {
  if (window.location.pathname === '/analytics') return;
  try {
    visitor ??= identifier(localStorage, 'bic-visitor');
    session ??= identifier(sessionStorage, 'bic-visit');
    const body = JSON.stringify({ id: crypto.randomUUID(), visitor, session, name, properties });
    void fetch('/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch { /* Practice remains usable when browser storage or analytics is blocked. */ }
}
export function trackVisit(): void {
  if (visited) return;
  visited = true;
  track('visit');
}
