import asyncio
import os
import tempfile
import time
import unittest
from unittest.mock import patch
from uuid import uuid4
import httpx
from fastapi.testclient import TestClient
from server.app import app, sessions, Session, speech_cache
from server.cost_limits import reserve, release
from server.speech_cache import SpeechCache

class CostTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ, {'ANALYTICS_DB_PATH':self.directory.name+'/cost.sqlite3','ELEVENLABS_API_KEY':'test-key','ELEVENLABS_AGENT_ID':'test-agent','ELEVENLABS_VOICE_ID':'test-voice','MAX_CALL_SECONDS':'120','MAX_CALLS_PER_VISITOR_DAY':'3','MAX_DAILY_CALL_SECONDS':'1800','LIVE_ACCESS_CODE':'','APP_ORIGIN':''})
        self.env.start();sessions.clear();self.client=TestClient(app)
    def tearDown(self):
        sessions.clear();self.env.stop();self.directory.cleanup()
    def test_browser_and_global_budgets_persist_and_reset(self):
        visitor=str(uuid4())
        for i in range(3):self.assertEqual(reserve(str(i),visitor,120),visitor)
        with self.assertRaises(Exception) as blocked:reserve('4',visitor,120)
        self.assertEqual(blocked.exception.status_code,429)
        with patch.dict(os.environ, {'MAX_DAILY_CALL_SECONDS':'360'}):
            with self.assertRaises(Exception):reserve('new',str(uuid4()),120)
        release('0');reserve('5',visitor,120)
        with patch('server.cost_limits.time.strftime',return_value='2099-01-01'):
            reserve('tomorrow',visitor,120)
    def test_failed_provider_releases_budget_and_cookie_limits_calls(self):
        actual=httpx.AsyncClient
        def provider(status):
            return patch('server.app.httpx.AsyncClient',side_effect=lambda **kwargs:actual(transport=httpx.MockTransport(lambda request:httpx.Response(status,json={'token':'test-token'})),**kwargs))
        with provider(500):self.assertEqual(self.client.post('/api/start',json={'scenario':'Practice home repair'}).status_code,502)
        with provider(200):
            for i in range(3):
                r=self.client.post('/api/start',json={'scenario':'Practice home repair'})
                self.assertEqual(r.status_code,200);self.assertEqual(r.json()['max_call_seconds'],120)
                self.client.delete('/api/sessions/'+r.json()['session_id'])
            self.assertEqual(self.client.post('/api/start',json={'scenario':'Practice home repair'}).status_code,429)
        self.assertTrue(self.client.cookies.get('bic-practice-visitor'))
    def test_replays_cache_successes_and_separate_language_and_sessions(self):
        sessions['one']=Session('one');sessions['two']=Session('two')
        speech_cache.discard_session('one');speech_cache.discard_session('two')
        calls=[];actual=httpx.AsyncClient
        def provider(request):
            calls.append(request);return httpx.Response(200,content=b'audio-result')
        with patch('server.app.httpx.AsyncClient',side_effect=lambda **kwargs:actual(transport=httpx.MockTransport(provider),**kwargs)):
            for _ in range(2):self.assertEqual(self.client.post('/api/sessions/one/speech',json={'text':'水です。'}).content,b'audio-result')
            self.assertEqual(len(calls),1)
            self.client.post('/api/sessions/one/speech',json={'text':'Water.','language':'en'})
            self.client.post('/api/sessions/two/speech',json={'text':'水です。'})
            self.assertEqual(len(calls),3)
            self.client.delete('/api/sessions/one');self.assertFalse(any(k[0]=='one' for k in speech_cache.entries))
    def test_cache_is_bounded_and_expires(self):
        cache=SpeechCache(max_bytes=5,ttl=1)
        cache.put(('a',),b'123');cache.put(('b',),b'456');self.assertIsNone(cache.get(('a',)))
        with patch('server.speech_cache.time.monotonic',return_value=time.monotonic()+2):self.assertIsNone(cache.get(('b',)))
        self.assertEqual(cache.size,0)
    def test_auxiliary_requests_are_capped_but_cached_audio_remains_available(self):
        sessions['capped']=Session('capped',help_requests=6,speech_requests=6)
        self.assertEqual(self.client.post('/api/sessions/capped/help-token').status_code,429)
        self.assertEqual(self.client.post('/api/sessions/capped/speech',json={'text':'水です。'}).status_code,429)
    def test_concurrent_replay_misses_generate_once(self):
        sessions['parallel']=Session('parallel');speech_cache.discard_session('parallel')
        actual=httpx.AsyncClient;calls=[]
        async def provider(request):
            calls.append(request);await asyncio.sleep(.02);return httpx.Response(200,content=b'one-render')
        async def run():
            with patch('server.app.httpx.AsyncClient',side_effect=lambda **kwargs:actual(transport=httpx.MockTransport(provider),**kwargs)):
                async with actual(transport=httpx.ASGITransport(app=app),base_url='http://testserver') as client:
                    results=await asyncio.gather(*(client.post('/api/sessions/parallel/speech',json={'text':'同じ文です。'}) for _ in range(2)))
                    self.assertTrue(all(result.status_code==200 for result in results))
        asyncio.run(run());self.assertEqual(len(calls),1)
    def test_global_budget_cannot_be_evaded_with_fresh_cookies(self):
        with patch.dict(os.environ, {'MAX_DAILY_CALL_SECONDS':'240'}):
            reserve('a',str(uuid4()),120);reserve('b',str(uuid4()),120)
            with self.assertRaises(Exception) as blocked:reserve('c',str(uuid4()),120)
            self.assertEqual(blocked.exception.status_code,429)
