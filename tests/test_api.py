import unittest
import json
from fastapi.testclient import TestClient
from server.app import app, sessions, Session, validate_readings


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_demo_health_without_credentials_and_live_rejects(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['ok'])
        if not response.json()['live_available']:
            response = self.client.post('/api/start', json={'scenario': 'My washing machine leaks.'})
            self.assertEqual(response.status_code, 503)

    def test_input_bounds_origin_and_expired_session(self):
        self.assertEqual(self.client.post('/api/start', json={'scenario': 'x'}).status_code, 422)
        self.assertEqual(self.client.post('/api/start', json={'scenario': 'x' * 2001}).status_code, 422)
        self.assertEqual(self.client.post('/api/start', headers={'Origin': 'https://unrelated.example'}, json={'scenario': 'My washing machine leaks.'}).status_code, 403)
        self.assertEqual(self.client.get('/api/sessions/not-a-session').status_code, 404)

    def test_readings_preserve_original_sentence_and_reject_malformed_output(self):
        source = '明日です。'
        data = {'segments': [{'text': '明日', 'reading': 'あした', 'meaning': 'tomorrow'}, {'text': 'です。', 'reading': '', 'meaning': ''}]}
        self.assertEqual(validate_readings(json.dumps(data), source), data)
        with self.assertRaises(ValueError):
            validate_readings(json.dumps(data), '明日は？')
        with self.assertRaises(ValueError):
            validate_readings('{"segments":[{"text":"明日"}]}', source)
        self.assertEqual(self.client.get('/api/sessions/missing/readings', params={'text': source}).status_code, 404)

    def test_readings_only_annotate_session_text_and_reuse_cache(self):
        session = Session('reading-test', 'Repair', 'English', '', '', '')
        session.last_reply = '明日です。'
        cached = {'segments': [{'text': session.last_reply, 'reading': '', 'meaning': ''}]}
        session.readings[session.last_reply] = cached
        sessions[session.id] = session
        try:
            self.assertEqual(self.client.get('/api/sessions/reading-test/readings', params={'text': session.last_reply}).json(), cached)
            self.assertEqual(self.client.get('/api/sessions/reading-test/readings', params={'text': 'Unrelated input'}).status_code, 422)
        finally:
            sessions.pop(session.id)

    def test_ending_is_idempotent_and_transcript_remains_available(self):
        session = Session('test', 'Washing machine repair', 'English', '', '', '')
        session.messages = [{'role': 'user', 'text': 'After seven', 'at': 1}]
        sessions['test'] = session
        try:
            for _ in range(2):
                self.assertEqual(self.client.delete('/api/sessions/test').status_code, 200)
            snapshot = self.client.get('/api/sessions/test').json()
            self.assertEqual(snapshot['status'], 'ended')
            self.assertEqual(snapshot['messages'][0]['text'], 'After seven')
        finally:
            sessions.pop('test', None)


if __name__ == '__main__':
    unittest.main()
