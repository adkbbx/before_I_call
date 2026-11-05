"""Run existing behavior checks on an isolated, disposable real Postgres schema."""
import argparse
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import psycopg
from dotenv import dotenv_values
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))
from server import storage
from test_analytics import AnalyticsTests
from test_cost_controls import CostTests
from test_preparation import PreparationTests
from test_vocabulary import VocabularyTests
from test_storage import StorageTests
import migrate_storage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--admin-env', type=Path, required=True)
    parser.add_argument('--runtime-env', type=Path, required=True)
    args = parser.parse_args()
    admin = dotenv_values(args.admin_env)['SHORTLIST_MIGRATION_DATABASE_URL']
    runtime = dotenv_values(args.runtime_env)['ANALYTICS_DATABASE_URL']
    schema = 'bic_check_' + uuid4().hex
    with psycopg.connect(admin, sslmode='require', prepare_threshold=None) as db:
        db.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
        db.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(schema)))
        for table, columns in storage.TABLES.items():
            db.execute(sql.SQL('CREATE TABLE {} ({})').format(sql.Identifier(table), sql.SQL(columns)))
        db.execute(sql.SQL('GRANT USAGE ON SCHEMA {} TO before_i_call_app').format(sql.Identifier(schema)))
        db.execute(sql.SQL('GRANT SELECT, INSERT, DELETE ON ALL TABLES IN SCHEMA {} TO before_i_call_app')
                   .format(sql.Identifier(schema)))

    def postgres_class(base):
        class PostgresTest(base):
            def setUp(self):
                super().setUp()
                self.pg_env = patch.dict(os.environ, {'ANALYTICS_DATABASE_URL': runtime})
                self.pg_env.start()
                with storage.database(write=True) as connection:
                    for table in storage.TABLES:
                        connection.execute(f'DELETE FROM {table}')

            def tearDown(self):
                self.pg_env.stop()
                super().tearDown()
        PostgresTest.__name__ = 'Postgres' + base.__name__
        return PostgresTest

    try:
        with patch.object(storage, 'SCHEMA', schema):
            # Exact timestamp/Unicode preservation, duplicates and safe replay.
            sample = {table: [] for table in storage.TABLES}
            sample['visitors'] = [{'id': 'synthetic-visitor'}]
            sample['visits'] = [{'id': 'synthetic-visit', 'visitor': 'synthetic-visitor', 'at': 1792058005.718494}]
            sample['events'] = [{'id': 'synthetic-event', 'session': 'synthetic-visit', 'name': 'action',
                                 'at': 1792058005.718494, 'properties': '{"action":"download"}'}]
            sample['preparation_budget'] = [{'day': '2026-11-05', 'visitor': 'synthetic-visitor'}] * 2
            with tempfile.TemporaryDirectory() as directory, patch.object(migrate_storage, 'SCHEMA', schema):
                source = Path(directory) / 'synthetic-backup.json'
                source.write_text(json.dumps({'format': 'before-i-call-storage-v1', 'tables': sample}), encoding='utf-8')
                migrate_storage.import_backup(admin, source)
                migrate_storage.import_backup(admin, source)
                with patch.dict(os.environ, {'ANALYTICS_DATABASE_URL': runtime}):
                    assert migrate_storage.digest(storage.snapshot()['tables']) == migrate_storage.digest(sample)
                changed = json.loads(source.read_text())
                changed['tables']['visitors'].append({'id': 'different'})
                source.write_text(json.dumps(changed), encoding='utf-8')
                try:
                    migrate_storage.import_backup(admin, source)
                except RuntimeError:
                    pass
                else:
                    raise AssertionError('Changed backup was accepted over existing data')
            suite = unittest.TestSuite()
            for base in (AnalyticsTests, CostTests, PreparationTests, VocabularyTests):
                suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(postgres_class(base)))
            concurrency = postgres_class(StorageTests)('test_simultaneous_calls_cannot_exceed_global_budget')
            suite.addTest(concurrency)
            result = unittest.TextTestRunner(verbosity=1).run(suite)
        return 0 if result.wasSuccessful() else 1
    finally:
        with psycopg.connect(admin, sslmode='require', prepare_threshold=None) as db:
            db.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))


if __name__ == '__main__':
    raise SystemExit(main())
