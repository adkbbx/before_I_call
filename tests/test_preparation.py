import os
import tempfile
import unittest
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from server.app import app
from server.preparation import cache, input_language

class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'ANALYTICS_DB_PATH': self.temp.name+'/budget.db', 'GRADIENT_MODEL_ACCESS_KEY':'fake-key', 'LIVE_ACCESS_CODE':'', 'APP_ORIGIN':'', 'MAX_PREPARATIONS_PER_VISITOR_DAY':'2', 'MAX_PREPARATIONS_PER_DAY':'3'})
        self.env.start(); cache.clear(); self.client = TestClient(app); self.requests=[]
        actual = httpx.AsyncClient
        def handler(request):
            self.requests.append(request)
            return httpx.Response(200,json={'choices':[{'message':{'content':'{"situation":"I need to arrange a repair.","tip":"Have your availability ready."}'}}]})
        self.provider=patch('server.preparation.httpx.AsyncClient',side_effect=lambda **kw:actual(transport=httpx.MockTransport(handler),**kw));self.provider.start()
    def tearDown(self):
        self.provider.stop(); self.env.stop(); self.temp.cleanup(); cache.clear()
    def send(self, text='My washing machine leaks.'):
        return self.client.post('/api/prepare',json={'situation':text})
    def test_cache_and_durable_browser_limit(self):
        self.assertEqual(self.send().status_code,200)
        self.assertEqual(self.send().status_code,200)
        self.assertEqual(len(self.requests),1)
        self.assertIn('"max_tokens":350',self.requests[0].content.decode())
        self.assertEqual(self.send('My parcel has not arrived.').status_code,200)
        cache.clear()
        self.assertEqual(self.send('I need a clinic appointment.').status_code,429)
    def test_global_limit_survives_new_cookies(self):
        for i in range(3):
            self.client.cookies.clear()
            self.assertEqual(self.send().status_code,200)
        self.client.cookies.clear()
        self.assertEqual(self.send().status_code,429)
    def test_input_origin_and_access_guards(self):
        self.assertEqual(self.send('x'*1001).status_code,422)
        with patch.dict(os.environ,{'APP_ORIGIN':'https://example.com'}):
            self.assertEqual(self.client.post('/api/prepare',json={'situation':'My machine leaks.'},headers={'origin':'https://other.com'}).status_code,403)
        with patch.dict(os.environ,{'LIVE_ACCESS_CODE':'secret'}):
            self.assertEqual(self.send().status_code,403)
        self.assertEqual(len(self.requests),0)
    def test_language_is_input_not_call_language(self):
        self.assertEqual(input_language('I want to call my building manager.'),'English')
        self.assertEqual(input_language('洗濯機から水が漏れています。修理をお願いしたいです。'),'Japanese')
        self.assertEqual(self.send().status_code,200)
        import json
        prompt=json.loads(self.requests[0].content)['messages'][0]['content']
        self.assertIn('OUTPUT LANGUAGE: English',prompt)
        self.assertNotIn('target call language',prompt)
    def test_wrong_language_response_is_not_applied(self):
        # The mocked provider returns English even for Japanese input.
        self.assertEqual(self.send('洗濯機から水が漏れています。修理をお願いしたいです。').status_code,502)
        self.assertEqual(len(cache),0)
