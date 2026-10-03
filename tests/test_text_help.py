import os, unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import httpx
from server.app import app, sessions, Session

class TextHelpTests(unittest.TestCase):
    def tearDown(self): sessions.clear()
    def test_token_requires_live_session_and_origin(self):
        client=TestClient(app)
        self.assertEqual(client.post('/api/sessions/missing/help-token').status_code,404)
        with patch.dict(os.environ, {'APP_ORIGIN':'https://app.example'}):
            self.assertEqual(client.post('/api/sessions/missing/help-token',headers={'Origin':'https://other.example'}).status_code,403)
    def test_token_proxy_returns_only_signed_url(self):
        sessions['test']=Session(id='test')
        async def provider(*args,**kwargs):
            self.assertTrue(args[-1].endswith('/get-signed-url'))
            return httpx.Response(200,json={'signed_url':'wss://example.test/help'},request=httpx.Request('GET','https://api.elevenlabs.io'))
        with patch.dict(os.environ, {'ELEVENLABS_AGENT_ID':'test','ELEVENLABS_API_KEY':'test'}),patch('httpx.AsyncClient.get',provider):
            result=TestClient(app).post('/api/sessions/test/help-token')
        self.assertEqual(result.status_code,200)
        self.assertEqual(result.json(),{'signed_url':'wss://example.test/help'})
