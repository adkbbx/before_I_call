import json
import os
import tempfile
import unittest
from importlib.util import find_spec
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from server import local_voice
from server.app import app

real_client = httpx.AsyncClient
SITUATION = 'My washing machine leaks when it drains. I need to ask the building manager about a repair.'


def ollama(reply, status=200, seen=None):
    def handler(request):
        if seen is not None:
            seen.append(request)
        if status != 200:
            return httpx.Response(status, json={'error': 'model not found'})
        return httpx.Response(200, json={'choices': [{'message': {'role': 'assistant', 'content': reply}}]})
    return patch('server.local_voice.httpx.AsyncClient', side_effect=lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))


class LocalVoiceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'LOCAL_VOICE': '1', 'ANALYTICS_DB_PATH': self.directory.name + '/usage.sqlite3'})
        self.env.start()
        self.patches = [patch('server.local_voice.missing_packages', return_value=[]), patch('server.local_voice.synthesize', return_value=b'RIFF-voice'), patch('server.local_voice.transcribe', return_value='洗濯機から水が漏れています。')]
        self.synthesize = self.patches[1].start()
        self.patches[0].start()
        self.transcribe = self.patches[2].start()
        self.client = TestClient(app)
        local_voice.sessions.clear()

    def tearDown(self):
        for item in self.patches:
            item.stop()
        self.env.stop()
        self.directory.cleanup()
        local_voice.sessions.clear()

    def start(self, **overrides):
        response = self.client.post('/api/local/start', json={'scenario': SITUATION, 'scenario_id': 'repair', **overrides})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_health_offers_local_voice_only_when_switched_on(self):
        self.assertTrue(self.client.get('/api/health').json()['local_available'])
        with patch.dict(os.environ, {'LOCAL_VOICE': ''}):
            self.assertFalse(self.client.get('/api/health').json()['local_available'])

    def test_start_speaks_the_opening_and_keeps_the_prompt_on_the_server(self):
        data = self.start()
        self.assertEqual(data['greeting'], '管理会社です。ご用件をお伺いします。')
        self.assertTrue(data['audio'].startswith('data:audio/wav;base64,'))
        self.assertNotIn('prompt', data)
        session = local_voice.sessions[data['session_id']]
        self.assertNotIn('end_call', session.prompt)
        self.assertIn('The app hangs up after your farewell.', session.prompt)
        english = self.start(target_language='en', language='Japanese')
        self.assertNotIn('end_call', local_voice.sessions[english['session_id']].prompt)

    def test_a_recording_is_transcribed_and_answered_by_local_gemma(self):
        session = self.start()['session_id']
        seen = []
        with ollama('洗濯機から水が漏れているのですね。いつ漏れますか？', seen=seen):
            response = self.client.post(f'/api/local/sessions/{session}/turn', content=b'webm-bytes', headers={'Content-Type': 'audio/webm'})
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data['heard'], '洗濯機から水が漏れています。')
        self.assertEqual(data['reply'], '洗濯機から水が漏れているのですね。いつ漏れますか？')
        self.assertFalse(data['ended'])
        self.assertEqual(self.transcribe.call_args.args, (b'webm-bytes', 'ja'))
        body = json.loads(seen[0].content)
        self.assertEqual(str(seen[0].url), 'http://127.0.0.1:11434/v1/chat/completions')
        self.assertEqual(body['model'], 'gemma4:e2b-it-qat')
        self.assertEqual(body['reasoning_effort'], 'none')
        self.assertEqual(body['messages'][0]['role'], 'system')
        self.assertEqual([message['role'] for message in body['messages'][1:]], ['assistant', 'user'])
        self.assertNotIn('authorization', seen[0].headers)

    def test_a_typed_goodbye_ends_the_call_and_tool_text_is_never_spoken(self):
        session = self.start()['session_id']
        with ollama('お電話ありがとうございました。失礼いたします。 end_call(reason="done")'):
            data = self.client.post(f'/api/local/sessions/{session}/turn', json={'text': '以上です。ありがとうございました。'}).json()
        self.assertTrue(data['ended'])
        self.assertEqual(data['reply'], 'お電話ありがとうございました。失礼いたします。')
        self.assertEqual(self.synthesize.call_args.args[0], 'お電話ありがとうございました。失礼いたします。')
        self.transcribe.assert_not_called()

    def test_voice_directions_and_empty_replies_are_cleaned_up(self):
        session = self.start()['session_id']
        with ollama('[slow] **かしこまりました。**'):
            self.assertEqual(self.client.post(f'/api/local/sessions/{session}/turn', json={'text': '修理をお願いします。'}).json()['reply'], 'かしこまりました。')
        with ollama('end_call()'):
            self.assertEqual(self.client.post(f'/api/local/sessions/{session}/turn', json={'text': 'はい。'}).json()['reply'], 'もう一度お願いできますか？')

    def test_explain_returns_the_helper_json_even_inside_a_code_fence(self):
        session = self.start()['session_id']
        reply = '```json\n{"meaning": "When does the water leak?", "note": "いつ asks when.", "reply": "排水する時です。", "replyMeaning": "When it drains."}\n```'
        seen = []
        with ollama(reply, seen=seen):
            response = self.client.post(f'/api/local/sessions/{session}/explain', json={'text': '水はいつ漏れますか？'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['reply'], '排水する時です。')
        body = json.loads(seen[0].content)
        self.assertEqual(body['response_format'], {'type': 'json_object'})
        self.assertIn('Use English for meaning', body['messages'][0]['content'])
        with ollama('not json'):
            self.assertEqual(self.client.post(f'/api/local/sessions/{session}/explain', json={'text': '水はいつ漏れますか？'}).status_code, 502)

    def test_slow_replay_returns_wav_from_the_local_voice(self):
        session = self.start()['session_id']
        response = self.client.post(f'/api/local/sessions/{session}/speech', json={'text': '水はいつ漏れますか？', 'slow': True})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['content-type'], 'audio/wav')
        self.assertEqual(self.synthesize.call_args.args, ('水はいつ漏れますか？', 'ja', True))
        self.client.post(f'/api/local/sessions/{session}/speech', json={'text': 'When does it leak?', 'language': 'en'})
        self.assertEqual(self.synthesize.call_args.args, ('When does it leak?', 'en', False))

    def test_clear_errors_for_missing_setup_and_bad_requests(self):
        self.assertEqual(self.client.post('/api/local/sessions/missing/turn', json={'text': 'はい'}).status_code, 404)
        self.assertEqual(self.client.post('/api/local/start', json={'scenario': 'short'}).status_code, 422)
        self.assertEqual(self.client.post('/api/local/start', headers={'Origin': 'https://elsewhere.example'}, json={'scenario': SITUATION}).status_code, 403)
        session = self.start()['session_id']
        with ollama('', status=404):
            response = self.client.post(f'/api/local/sessions/{session}/turn', json={'text': 'はい'})
        self.assertEqual(response.status_code, 502)
        self.assertIn('ollama pull gemma4:e2b-it-qat', response.json()['detail'])
        with patch('server.local_voice.httpx.AsyncClient', side_effect=lambda **kwargs: real_client(transport=httpx.MockTransport(lambda request: (_ for _ in ()).throw(httpx.ConnectError('refused'))), **kwargs)):
            self.assertIn('Start Ollama', self.client.post(f'/api/local/sessions/{session}/turn', json={'text': 'はい'}).json()['detail'])
        self.transcribe.return_value = ''
        self.assertEqual(self.client.post(f'/api/local/sessions/{session}/turn', content=b'silence', headers={'Content-Type': 'audio/webm'}).status_code, 422)
        self.assertEqual(self.client.post(f'/api/local/sessions/{session}/turn', content=b'', headers={'Content-Type': 'audio/webm'}).status_code, 422)
        with patch.dict(os.environ, {'LOCAL_VOICE': ''}):
            self.assertEqual(self.client.post('/api/local/start', json={'scenario': SITUATION}).status_code, 503)
        with patch('server.local_voice.missing_packages', return_value=['kokoro']):
            self.assertIn('requirements-local.txt', self.client.post('/api/local/start', json={'scenario': SITUATION}).json()['detail'])

    def test_enhancement_and_vocabulary_use_local_gemma_without_spending_the_daily_budget(self):
        seen = []

        def handler(request):
            seen.append(request)
            body = json.loads(request.content)
            content = json.dumps({'situation': 'I am calling my dentist to move my appointment to Friday.'}) if 'situation' in body['messages'][0]['content'] else json.dumps({'words': [{'text': '予約', 'meaning': 'appointment'}]})
            return httpx.Response(200, json={'choices': [{'message': {'content': content}}]})
        with patch('server.preparation.httpx.AsyncClient', side_effect=lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs)):
            for index in range(7):
                response = self.client.post('/api/prepare', json={'situation': f'call dentist move appointment friday {index}'})
                self.assertEqual(response.status_code, 200, response.text)
            card = self.client.post('/api/call-card', json={'enrich_vocabulary': True, 'messages': [{'role': 'user', 'text': '予約を変更したいです。'}]}).json()
        self.assertEqual(card['vocabulary_source'], 'transcript')
        self.assertTrue(all(str(request.url) == 'http://127.0.0.1:11434/v1/chat/completions' for request in seen))
        self.assertTrue(all(json.loads(request.content)['reasoning_effort'] == 'none' and 'authorization' not in request.headers for request in seen))


@unittest.skipUnless(find_spec('av') and find_spec('numpy'), 'needs the local voice packages from requirements-local.txt')
class AudioDecodingTests(unittest.TestCase):
    def test_recordings_decode_to_16khz_mono_samples(self):
        import numpy as np
        one_second = local_voice.wav(np.zeros(24000, np.float32))
        samples = local_voice.decode(one_second)
        self.assertEqual(samples.dtype, np.float32)
        self.assertAlmostEqual(len(samples) / 16000, 1.0, places=1)


if __name__ == '__main__':
    unittest.main()
