"""Anonymous first-party event counts, stored on the app's persistent disk."""
import json
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix='/api/analytics')

class Properties(BaseModel):
    model_config = ConfigDict(extra='forbid')
    page: Literal['home', 'setup', 'demo', 'live', 'finished'] | None = None
    mode: Literal['demo', 'live'] | None = None
    language: Literal['ja', 'en'] | None = None
    scenario: Literal['repair', 'clinic', 'delivery', 'city', 'food', 'lost', 'bill', 'custom'] | None = None
    action: Literal['explain', 'slow', 'retry', 'pause', 'reply', 'download', 'linkedin', 'github', 'contribute', 'star'] | None = None
    result: Literal['completed', 'ended', 'timeout', 'error'] | None = None
    duration: int | None = Field(default=None, ge=0, le=3600)

class Event(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: UUID
    visitor: UUID
    session: UUID
    name: Literal['visit', 'page', 'demo_start', 'live_start', 'live_connected', 'practice_finish', 'action', 'call_error']
    properties: Properties = Field(default_factory=Properties)

@contextmanager
def database():
    path = Path(os.getenv('ANALYTICS_DB_PATH', 'work/analytics.sqlite3'))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.executescript('''
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, visitor TEXT, at REAL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, session TEXT, name TEXT, at REAL, properties TEXT);
      CREATE INDEX IF NOT EXISTS event_time ON events(at);
      CREATE INDEX IF NOT EXISTS event_session ON events(session);
    ''')
    try:
        with connection:
            yield connection
    finally:
        connection.close()

def origin(request):
    expected = os.getenv('APP_ORIGIN') or str(request.base_url).rstrip('/')
    if request.headers.get('origin') and request.headers['origin'] != expected:
        raise HTTPException(403, 'Origin not allowed.')

@router.post('/events', status_code=204)
def collect(event: Event, request: Request):
    origin(request)
    now = time.time()
    with database() as connection:
        recent = connection.execute('SELECT COUNT(*) FROM events WHERE session=? AND at>?', (str(event.session), now - 3600)).fetchone()[0]
        if recent >= 500:
            raise HTTPException(429, 'Too many analytics events.')
        connection.execute('INSERT OR IGNORE INTO visitors VALUES (?)', (str(event.visitor),))
        if event.name == 'visit':
            inserted = connection.execute('INSERT OR IGNORE INTO visits VALUES (?,?,?)', (str(event.session), str(event.visitor), now))
            if not inserted.rowcount:
                return Response(status_code=204)
        connection.execute('INSERT OR IGNORE INTO events VALUES (?,?,?,?,?)', (str(event.id), str(event.session), event.name, now, event.properties.model_dump_json(exclude_none=True)))
        connection.execute('DELETE FROM events WHERE at<?', (now - 90 * 86400,))
    return Response(status_code=204)

@router.get('/count')
def count():
    with database() as connection:
        visits = connection.execute('SELECT COUNT(*) FROM visits').fetchone()[0]
    return {'visits': visits}

@router.get('/report')
def report(request: Request):
    key = os.getenv('ANALYTICS_ADMIN_KEY', '')
    supplied = request.headers.get('authorization', '').removeprefix('Bearer ')
    if not key or not secrets.compare_digest(key, supplied):
        raise HTTPException(401, 'Enter the analytics admin key.')
    since = time.time() - 30 * 86400
    with database() as connection:
        visits = connection.execute('SELECT COUNT(*) FROM visits').fetchone()[0]
        visitors = connection.execute('SELECT COUNT(*) FROM visitors').fetchone()[0]
        rows = connection.execute('SELECT name, at, properties FROM events WHERE at>=? ORDER BY at', (since,)).fetchall()
        latest = connection.execute('SELECT session FROM events WHERE at>=? GROUP BY session ORDER BY MAX(at) DESC LIMIT 15', (since,)).fetchall()
        journeys = []
        for index, row in enumerate(latest):
            events = connection.execute('SELECT name, at, properties FROM events WHERE session=? AND at>=? ORDER BY at LIMIT 100', (row['session'], since)).fetchall()
            journeys.append({'label': f'Visit {index + 1}', 'events': [{'name': item['name'], 'at': item['at'], 'properties': json.loads(item['properties'])} for item in events]})
    counts, days, languages, scenarios, actions, outcomes = {}, {}, {}, {}, {}, {}
    durations = []
    for row in rows:
        name, properties = row['name'], json.loads(row['properties'])
        counts[name] = counts.get(name, 0) + 1
        day = time.strftime('%Y-%m-%d', time.gmtime(row['at']))
        if name == 'visit':
            days[day] = days.get(day, 0) + 1
        if name in ('demo_start', 'live_start'):
            for group, field in ((languages, 'language'), (scenarios, 'scenario')):
                value = properties.get(field, 'unknown')
                group[value] = group.get(value, 0) + 1
        if name == 'action':
            value = properties.get('action', 'unknown')
            actions[value] = actions.get(value, 0) + 1
        if name == 'practice_finish':
            result = properties.get('result', 'unknown')
            outcomes[result] = outcomes.get(result, 0) + 1
            if properties.get('duration') is not None:
                durations.append(properties['duration'])
    return {'visits': visits, 'estimated_visitors': visitors, 'window_days': 30, 'counts': counts, 'daily_visits': days, 'languages': languages, 'scenarios': scenarios, 'actions': actions, 'outcomes': outcomes, 'average_duration': round(sum(durations) / len(durations)) if durations else 0, 'journeys': journeys}
