import json
import os
import tempfile
import unittest
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from server.app import app
from server.vocabulary import cache

class VocabularyTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.env=patch.dict(os.environ,{'GRADIENT_MODEL_ACCESS_KEY':'fake','ANALYTICS_DB_PATH':self.temp.name+'/usage.db','APP_ORIGIN':'','MAX_VOCABULARY_PER_VISITOR_DAY':'1','MAX_VOCABULARY_PER_DAY':'2'});self.env.start();cache.clear();self.client=TestClient(app);self.requests=[];self.status=200
        actual=httpx.AsyncClient
        def handler(req):
            self.requests.append(req)
            return httpx.Response(self.status,json={'choices':[{'message':{'content':json.dumps({'words':[{'text':'歯科医院','meaning':'dental clinic'},{'text':'架空語','meaning':'invented word'}]},ensure_ascii=False)}}]})
        self.mock=patch('server.vocabulary.httpx.AsyncClient',side_effect=lambda **kw:actual(transport=httpx.MockTransport(handler),**kw));self.mock.start()
    def tearDown(self):
        self.mock.stop();self.env.stop();self.temp.cleanup();cache.clear()
    def send(self,text='歯科医院の予約を変更したいです。'):
        return self.client.post('/api/call-card',json={'enrich_vocabulary':True,'messages':[{'role':'user','text':text}]})
    def test_grounding_cache_and_cap(self):
        data=self.send().json()
        self.assertEqual(data['words'][0]['japanese'],'歯科医院')
        self.assertNotIn('架空語',[w['japanese'] for w in data['words']])
        self.assertEqual(data['vocabulary_source'],'transcript')
        self.send();self.assertEqual(len(self.requests),1)
        self.assertEqual(json.loads(self.requests[0].content)['max_tokens'],600)
        self.assertEqual(self.send('受付で予約を取りたいです。').json()['vocabulary_source'],'dictionary')
        self.assertEqual(len(self.requests),1)
    def test_failure_cached_and_dictionary_kept(self):
        self.status=500
        data=self.send().json()
        self.assertEqual(data['vocabulary_source'],'dictionary')
        self.assertTrue(data['words'])
        self.send();self.assertEqual(len(self.requests),1)
    def test_global_budget_and_origin(self):
        self.send();self.client.cookies.clear();self.send();self.client.cookies.clear();self.send()
        self.assertEqual(len(self.requests),2)
        with patch.dict(os.environ,{'APP_ORIGIN':'https://example.com'}):
            self.assertEqual(self.client.post('/api/call-card',json={'enrich_vocabulary':True,'messages':[]},headers={'origin':'https://other.com'}).status_code,403)
