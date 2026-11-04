"""SQLite locally, private Postgres storage on diskless hosts."""
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from fastapi import HTTPException

TABLES = {
    'visitors': 'id TEXT PRIMARY KEY',
    'visits': 'id TEXT PRIMARY KEY, visitor TEXT, at DOUBLE PRECISION',
    'events': 'id TEXT PRIMARY KEY, session TEXT, name TEXT, at DOUBLE PRECISION, properties TEXT',
    'call_budget': 'ticket TEXT PRIMARY KEY, day TEXT, visitor TEXT, seconds INTEGER',
    'preparation_budget': 'day TEXT, visitor TEXT',
    'vocabulary_budget': 'day TEXT, visitor TEXT',
}
SCHEMA = 'before_i_call'
WRITE_LOCK = 487309211


class Row(dict):
    """Preserve sqlite3.Row's name and positional lookup for existing queries."""
    def __getitem__(self, key):
        return tuple(self.values())[key] if isinstance(key, int) else super().__getitem__(key)


def postgres_row(cursor):
    names = [column.name for column in cursor.description] if cursor.description else []
    return lambda values: Row(zip(names, values))


class PostgresQueries:
    """Translate parameter markers in this app's fixed, internal SQL only."""
    def __init__(self, connection):
        self.connection = connection

    def execute(self, query, parameters=()):
        return self.connection.execute(query.replace('?', '%s'), parameters)


def sqlite_path():
    return Path(os.getenv('ANALYTICS_DB_PATH', 'work/analytics.sqlite3'))


@contextmanager
def database(*, write=False):
    url = os.getenv('ANALYTICS_DATABASE_URL', '')
    if url:
        import psycopg
        from psycopg import sql
        with psycopg.connect(url, sslmode='require', connect_timeout=10,
                             prepare_threshold=None, row_factory=postgres_row) as connection:
            connection.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(SCHEMA)))
            connection.execute("SET LOCAL statement_timeout TO '15s'")
            if write:
                # Same check-and-reserve exclusion as SQLite BEGIN IMMEDIATE.
                # Transaction-scoped locks also work through Supabase's pooler.
                connection.execute('SELECT pg_advisory_xact_lock(%s)', (WRITE_LOCK,))
            else:
                connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
            yield PostgresQueries(connection)
        return

    path = sqlite_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute('PRAGMA journal_mode=WAL')
        for table, columns in TABLES.items():
            connection.execute(f'CREATE TABLE IF NOT EXISTS {table} ({columns})')
        connection.execute('CREATE INDEX IF NOT EXISTS event_time ON events(at)')
        connection.execute('CREATE INDEX IF NOT EXISTS event_session ON events(session)')
        connection.commit()
        with connection:
            connection.execute('BEGIN IMMEDIATE' if write else 'BEGIN')
            if write and Path(str(path) + '.frozen').exists():
                raise HTTPException(503, 'Storage migration is in progress. Please try again shortly.')
            yield connection
    finally:
        connection.close()


def freeze_sqlite(frozen):
    if os.getenv('ANALYTICS_DATABASE_URL'):
        raise HTTPException(409, 'Only the original SQLite store can be frozen for migration.')
    # Wait for any in-flight write, then block later writers before exporting.
    with database() as connection:
        connection.rollback()
        connection.execute('BEGIN IMMEDIATE')
        marker = Path(str(sqlite_path()) + '.frozen')
        if frozen:
            marker.touch()
        else:
            marker.unlink(missing_ok=True)


def snapshot():
    with database() as connection:
        return {'format': 'before-i-call-storage-v1', 'tables': {
            table: [dict(row) for row in connection.execute(f'SELECT * FROM {table}').fetchall()]
            for table in TABLES}}
