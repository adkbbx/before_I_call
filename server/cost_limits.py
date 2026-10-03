"""Durable daily admission budgets; no conversation content is stored here."""
import os
import time
from uuid import UUID, uuid4
from fastapi import HTTPException
from server.analytics import database

def reserve(ticket: str, visitor: str | None, seconds: int) -> str:
    try:
        browser = str(UUID(visitor or ''))
    except ValueError:
        browser = str(uuid4())
    day = time.strftime('%Y-%m-%d', time.gmtime())
    with database() as connection:
        connection.execute('CREATE TABLE IF NOT EXISTS call_budget (ticket TEXT PRIMARY KEY, day TEXT, visitor TEXT, seconds INTEGER)')
        # Serialize check-and-reserve even if more than one request arrives together.
        connection.execute('BEGIN IMMEDIATE')
        connection.execute('DELETE FROM call_budget WHERE day<?', (day,))
        total = connection.execute('SELECT COALESCE(SUM(seconds),0) FROM call_budget WHERE day=?', (day,)).fetchone()[0]
        count = connection.execute('SELECT COUNT(*) FROM call_budget WHERE day=? AND visitor=?', (day, browser)).fetchone()[0]
        if count >= int(os.getenv('MAX_CALLS_PER_VISITOR_DAY', '3')):
            raise HTTPException(429, 'You’ve used today’s live practices. You can keep practising with the guided examples. Live practice resets at midnight UTC.')
        if total + seconds > int(os.getenv('MAX_DAILY_CALL_SECONDS', '1800')):
            raise HTTPException(429, 'Today’s live practice budget is used up. The guided examples are still available. Live practice resets at midnight UTC.')
        connection.execute('INSERT INTO call_budget VALUES (?,?,?,?)', (ticket, day, browser, seconds))
    return browser

def release(ticket: str):
    with database() as connection:
        connection.execute('DELETE FROM call_budget WHERE ticket=?', (ticket,))
