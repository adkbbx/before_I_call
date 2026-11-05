"""Provision private storage, import a frozen backup, and verify every saved row.

Credentials come from local env files and are never printed. The source Render
disk stays untouched. A non-empty destination must exactly match the snapshot.
"""
import argparse
import hashlib
import json
import secrets
import sys
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import psycopg
from dotenv import dotenv_values
from psycopg import sql

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.storage import TABLES, SCHEMA

ROLE = 'before_i_call_app'


def canonical(rows):
    return sorted(json.dumps(row, sort_keys=True, separators=(',', ':')) for row in rows)


def digest(tables):
    return hashlib.sha256(json.dumps({table: canonical(rows) for table, rows in tables.items()},
                                    sort_keys=True).encode()).hexdigest()


def provision(admin_url, runtime_file):
    existed = runtime_file.exists()
    if existed:
        runtime_url = dotenv_values(runtime_file)['ANALYTICS_DATABASE_URL']
        password = unquote(urlsplit(runtime_url).password)
    else:
        password = secrets.token_urlsafe(32)
        parts = urlsplit(admin_url)
        suffix = '.' + parts.username.split('.', 1)[1] if '.' in parts.username else ''
        authority = f'{ROLE}{suffix}:{quote(password, safe="")}@{parts.hostname}:{parts.port or 5432}'
        runtime_url = urlunsplit((parts.scheme, authority, parts.path, 'sslmode=require', ''))

    with psycopg.connect(admin_url, sslmode='require', connect_timeout=15, prepare_threshold=None) as db:
        exists = db.execute('SELECT 1 FROM pg_namespace WHERE nspname=%s', (SCHEMA,)).fetchone()
        if exists and not existed:
            raise RuntimeError('Destination schema exists without local provisioning state. Refusing to modify it.')
        if not existed:
            runtime_file.parent.mkdir(parents=True, exist_ok=True)
            runtime_file.write_text('ANALYTICS_DATABASE_URL=' + runtime_url + '\n', encoding='utf-8')
        if not db.execute('SELECT 1 FROM pg_roles WHERE rolname=%s', (ROLE,)).fetchone():
            db.execute(sql.SQL('CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS')
                       .format(sql.Identifier(ROLE), sql.Literal(password)))
        db.execute(sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(sql.Identifier(SCHEMA)))
        db.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM PUBLIC, anon, authenticated').format(sql.Identifier(SCHEMA)))
        db.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(SCHEMA)))
        for table, columns in TABLES.items():
            db.execute(sql.SQL('CREATE TABLE IF NOT EXISTS {} ({})').format(sql.Identifier(table), sql.SQL(columns)))
        db.execute('CREATE INDEX IF NOT EXISTS event_time ON events(at)')
        db.execute('CREATE INDEX IF NOT EXISTS event_session ON events(session)')
        db.execute(sql.SQL('GRANT USAGE ON SCHEMA {} TO {}').format(sql.Identifier(SCHEMA), sql.Identifier(ROLE)))
        db.execute(sql.SQL('GRANT SELECT, INSERT, DELETE ON ALL TABLES IN SCHEMA {} TO {}')
                   .format(sql.Identifier(SCHEMA), sql.Identifier(ROLE)))
    with psycopg.connect(runtime_url, sslmode='require', connect_timeout=15, prepare_threshold=None) as db:
        role = db.execute('SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user').fetchone()
        if any(role):
            raise RuntimeError('Runtime role is too privileged.')
        db.execute('SELECT COUNT(*) FROM before_i_call.visitors')
    print('Private schema and restricted runtime connection verified.')
    return runtime_url


def import_backup(admin_url, source):
    snapshot = json.loads(source.read_text(encoding='utf-8'))
    if snapshot.get('format') != 'before-i-call-storage-v1' or set(snapshot['tables']) != set(TABLES):
        raise ValueError('Not a complete Before I Call storage backup.')
    from psycopg.rows import dict_row
    with psycopg.connect(admin_url, sslmode='require', connect_timeout=15,
                         prepare_threshold=None, row_factory=dict_row) as db:
        db.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(SCHEMA)))
        db.execute('SELECT pg_advisory_xact_lock(487309211)')
        db.execute('SET LOCAL extra_float_digits TO 3')
        existing = {table: db.execute(sql.SQL('SELECT * FROM {}').format(sql.Identifier(table))).fetchall()
                    for table in TABLES}
        if any(existing.values()):
            if digest(existing) != digest(snapshot['tables']):
                raise RuntimeError('Destination is non-empty and differs from the backup. No rows changed.')
        else:
            for table, rows in snapshot['tables'].items():
                for row in rows:
                    columns = list(row)
                    query = sql.SQL('INSERT INTO {} ({}) VALUES ({})').format(
                        sql.Identifier(table), sql.SQL(',').join(map(sql.Identifier, columns)),
                        sql.SQL(',').join(sql.Placeholder() for _ in columns))
                    db.execute(query, [row[column] for column in columns])
        saved = {table: db.execute(sql.SQL('SELECT * FROM {}').format(sql.Identifier(table))).fetchall()
                 for table in TABLES}
        if digest(saved) != digest(snapshot['tables']):
            raise RuntimeError('Imported rows differ from the source. Transaction rolled back.')
    print(json.dumps({'counts': {table: len(rows) for table, rows in saved.items()},
                      'verified_sha256': digest(saved)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--admin-env', type=Path, required=True)
    parser.add_argument('--runtime-env', type=Path, required=True)
    parser.add_argument('--backup', type=Path)
    args = parser.parse_args()
    admin_url = dotenv_values(args.admin_env)['SHORTLIST_MIGRATION_DATABASE_URL']
    provision(admin_url, args.runtime_env)
    if args.backup:
        import_backup(admin_url, args.backup)


if __name__ == '__main__':
    main()
