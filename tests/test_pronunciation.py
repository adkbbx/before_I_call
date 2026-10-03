import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from server.app import app, sessions, Session
from server.pronunciation import speech_text


class PronunciationTests(unittest.TestCase):
    def test_reported_readings_and_compounds(self):
        self.assertEqual(speech_text('洗濯機を洗っている場所に明日伺いたい。夜７時以降です。'), 'せんたくきをあらっているばしょにあしたうかがいたい。よる しちじ いこうです。')
        self.assertEqual(speech_text('水曜日に排水と水道を確認します。'), 'すいようびにはいすいと水道を確認します。')
        for source in ['夜７時以降', '夜7時以降', '夜七時以降']:
            self.assertEqual(speech_text(source), 'よる しちじ いこう')
        self.assertEqual(speech_text('明日 at 7', 'en'), '明日 at 7')

    def test_replay_sends_corrected_speech_and_preserves_language(self):
        real_client = httpx.AsyncClient
        for language, expected in [('ja', 'あしたせんたくきを確認します。'), ('en', '明日洗濯機を確認します。')]:
            def handler(request):
                body = json.loads(request.content)
                self.assertEqual(body['text'], expected)
                self.assertEqual(body['language_code'], language)
                return httpx.Response(200, content=b'audio')
            sessions['pronunciation-test'] = Session('pronunciation-test', target_language=language)
            try:
                with patch.dict(os.environ, {'ELEVENLABS_API_KEY': 'test', 'ELEVENLABS_VOICE_ID': 'test'}), patch('server.app.httpx.AsyncClient', side_effect=lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs)):
                    response = TestClient(app).post('/api/sessions/pronunciation-test/speech', json={'text': '明日洗濯機を確認します。'})
                    self.assertEqual(response.status_code, 200)
            finally:
                sessions.pop('pronunciation-test', None)

    def test_live_dictionary_preserves_existing_and_is_idempotent(self):
        spec = importlib.util.spec_from_file_location('configure_pronunciation', Path('scripts/configure-pronunciation.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        state = {'locators': [{'pronunciation_dictionary_id': 'existing', 'version_id': 'v1'}], 'creates': 0, 'patches': 0}
        def handler(request):
            path = request.url.path
            if request.method == 'GET' and path.endswith('/agents/test'):
                return httpx.Response(200, json={'conversation_config': {'tts': {'pronunciation_dictionary_locators': state['locators']}}})
            if request.method == 'GET':
                return httpx.Response(200, json={'name': 'Existing dictionary' if path.endswith('/existing') else state['name']})
            body = json.loads(request.content)
            if request.method == 'POST':
                state['creates'] += 1
                state['name'] = body['name']
                self.assertIn({'type': 'alias', 'string_to_replace': '明日', 'alias': 'あした'}, body['rules'])
                return httpx.Response(200, json={'id': 'new', 'version_id': 'v2'})
            state['patches'] += 1
            state['locators'] = body['conversation_config']['tts']['pronunciation_dictionary_locators']
            return httpx.Response(200, json={})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            module.configure(client, 'test')
            module.configure(client, 'test')
        self.assertEqual(state['creates'], 1)
        self.assertEqual(state['patches'], 1)
        self.assertEqual(state['locators'][-1]['pronunciation_dictionary_id'], 'existing')
