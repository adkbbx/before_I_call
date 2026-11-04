import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
from server.app import app
from server.cost_limits import reserve
from server.storage import database, snapshot


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            'ANALYTICS_DATABASE_URL': '', 'ANALYTICS_DB_PATH': self.temp.name + '/data.sqlite3',
            'ANALYTICS_ADMIN_KEY': 'backup-test', 'MAX_DAILY_CALL_SECONDS': '120',
            'MAX_CALLS_PER_VISITOR_DAY': '3'})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_backup_requires_admin_and_contains_all_tables(self):
        reserve('saved-ticket', str(uuid4()), 120)
        client = TestClient(app)
        self.assertEqual(client.get('/api/analytics/backup').status_code, 401)
        response = client.get('/api/analytics/backup', headers={'Authorization': 'Bearer backup-test'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertEqual(response.json()['tables']['call_budget'][0]['ticket'], 'saved-ticket')
        self.assertEqual(len(response.json()['tables']), 6)

    def test_migration_freeze_blocks_writes_and_can_be_reversed(self):
        client = TestClient(app)
        headers = {'Authorization': 'Bearer backup-test'}
        self.assertEqual(client.post('/api/analytics/migration/freeze').status_code, 401)
        self.assertEqual(client.post('/api/analytics/migration/freeze', headers=headers).status_code, 200)
        self.assertEqual(client.post('/api/analytics/migration/freeze', headers=headers).status_code, 200)
        with self.assertRaises(HTTPException) as failure:
            reserve('blocked', str(uuid4()), 120)
        self.assertEqual(failure.exception.status_code, 503)
        self.assertEqual(client.get('/api/analytics/backup', headers=headers).status_code, 200)
        self.assertEqual(client.post('/api/analytics/migration/unfreeze', headers=headers).status_code, 200)
        reserve('allowed', str(uuid4()), 120)
        self.assertEqual(len(snapshot()['tables']['call_budget']), 1)

    def test_simultaneous_calls_cannot_exceed_global_budget(self):
        # Create storage before racing callers, just as a running app does.
        snapshot()
        def admit(index):
            try:
                reserve(str(index), str(uuid4()), 120)
                return True
            except HTTPException as error:
                self.assertEqual(error.status_code, 429)
                return False
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(sum(pool.map(admit, range(4))), 1)
        self.assertEqual(len(snapshot()['tables']['call_budget']), 1)
