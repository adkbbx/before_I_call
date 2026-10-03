import os
import tempfile
import unittest
from uuid import uuid4
from unittest.mock import patch
from fastapi.testclient import TestClient
from server.app import app

class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'ANALYTICS_DB_PATH': self.directory.name + '/usage.sqlite3', 'ANALYTICS_ADMIN_KEY': 'test-admin', 'APP_ORIGIN': 'http://testserver'})
        self.env.start()
        self.client = TestClient(app)
        self.visitor, self.session = str(uuid4()), str(uuid4())
    def tearDown(self):
        self.env.stop()
        self.directory.cleanup()
    def event(self, name='visit', properties=None):
        return {'id': str(uuid4()), 'visitor': self.visitor, 'session': self.session, 'name': name, 'properties': properties or {}}
    def send(self, event):
        return self.client.post('/api/analytics/events', json=event, headers={'Origin': 'http://testserver'})
    def report(self):
        return self.client.get('/api/analytics/report', headers={'Authorization': 'Bearer test-admin'}).json()
    def test_counts_are_persistent_and_idempotent(self):
        event = self.event()
        for value in [event, event, self.event()]:
            self.assertEqual(self.send(value).status_code, 204)
        self.assertEqual(TestClient(app).get('/api/analytics/count').json(), {'visits': 1})
        data = self.report()
        self.assertEqual(data['estimated_visitors'], 1)
        self.assertEqual(data['counts']['visit'], 1)
        self.assertEqual(sum(data['daily_visits'].values()), 1)
    def test_journey_and_breakdowns(self):
        self.send(self.event())
        self.send(self.event('demo_start', {'language': 'ja', 'scenario': 'repair', 'mode': 'demo'}))
        self.send(self.event('action', {'action': 'slow'}))
        self.send(self.event('practice_finish', {'result': 'completed', 'duration': 42}))
        data = self.report()
        self.assertEqual(data['average_duration'], 42)
        self.assertEqual(data['languages'], {'ja': 1})
        self.assertEqual(data['scenarios'], {'repair': 1})
        self.assertEqual(data['actions'], {'slow': 1})
        self.assertEqual(data['outcomes'], {'completed': 1})
        self.assertEqual([e['name'] for e in data['journeys'][0]['events']], ['visit', 'demo_start', 'action', 'practice_finish'])
    def test_private_report_and_bounded_payload(self):
        self.assertEqual(self.client.get('/api/analytics/report').status_code, 401)
        self.assertEqual(self.client.get('/api/analytics/report', headers={'Authorization': 'Bearer wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/api/analytics/events', json=self.event(), headers={'Origin': 'https://other.example'}).status_code, 403)
        value = self.event(properties={'transcript': 'private words'})
        self.assertEqual(self.send(value).status_code, 422)
        self.assertEqual(self.client.get('/api/analytics/count').json()['visits'], 0)

    def test_local_card_works_when_live_origin_is_configured_elsewhere(self):
        from server.app import demo_turns
        turn = demo_turns[0]
        with patch.dict(os.environ, {'APP_ORIGIN': 'https://production.example'}):
            response = self.client.post('/api/call-card', headers={'Origin': 'http://localhost:8000'}, json={'messages': [{'role': 'user', 'text': turn['answer']}]})
            self.assertEqual(response.status_code, 200)
            phrase = response.json()['phrases'][0]
            self.assertEqual(phrase['romaji'], turn['answerRomaji'])
            self.assertEqual(phrase['meaning'], turn['answerMeaning'])
            self.assertTrue(response.json()['words'])
            self.assertEqual(self.client.post('/api/readings', headers={'Origin': 'http://localhost:8000'}, json={'text': turn['answer']}).status_code, 200)
            self.assertEqual(self.client.post('/api/start', headers={'Origin': 'http://localhost:8000'}, json={'scenario': 'Practice a repair call'}).status_code, 403)
