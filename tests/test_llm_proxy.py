import json
import os
import unittest
from unittest.mock import patch

import httpx
import sentry_sdk
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sentry_sdk.transport import Transport

from server import llm_proxy

REPLY = 'お電話ありがとうございました。失礼いたします。'
CHUNKS = [
    {'choices': [{'delta': {'role': 'assistant', 'content': ''}}]},
    {'choices': [{'delta': {'content': 'お電話ありがとうございました。'}}]},
    {'choices': [{'delta': {'content': '失礼いたします。'}}]},
    {'choices': [{'delta': {'tool_calls': [{'index': 0, 'id': 'call-1', 'type': 'function', 'function': {'name': 'end_call', 'arguments': ''}}]}}]},
    {'choices': [{'delta': {'tool_calls': [{'index': 0, 'function': {'arguments': '{"reason": "goodbye"}'}}]}}]},
    {'choices': [{'delta': {}, 'finish_reason': 'tool_calls'}]},
    {'choices': [], 'usage': {'prompt_tokens': 84, 'completion_tokens': 27, 'total_tokens': 111, 'cache_read_input_tokens': 64}},
]


def sse(chunks):
    events = [f'data: {json.dumps({"id": "chatcmpl-1", "model": "gemma-4-31B-it", **chunk}, ensure_ascii=False)}\n\n' for chunk in chunks]
    return ''.join(events + ['data: [DONE]\n\n']).encode()


class Capture(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.items = []

    def capture_envelope(self, envelope):
        self.items.extend(item.payload.json for item in envelope.items if item.payload.json)


class LlmProxyTests(unittest.TestCase):
    def setUp(self):
        self.transport = Capture()
        sentry_sdk.init(dsn='https://public@sentry.example/1', traces_sample_rate=1.0, transport=self.transport, send_default_pii=False, max_request_body_size='never', stream_gen_ai_spans=False)
        # Sentry adds its ASGI middleware to apps created after init.
        app = FastAPI()
        app.include_router(llm_proxy.router)
        self.client = TestClient(app)
        self.env = patch.dict(os.environ, {'LLM_PROXY_KEY': 'proxy-secret', 'GRADIENT_MODEL_ACCESS_KEY': 'do-key', 'GRADIENT_MODEL': 'gemma-4-31B-it'})
        self.env.start()
        self.sent = []

    def tearDown(self):
        self.env.stop()
        sentry_sdk.init(dsn=None)

    def upstream(self, response):
        def handler(request):
            self.sent.append((request.headers, json.loads(request.content)))
            return response() if callable(response) else response
        return patch.object(llm_proxy, 'upstream', lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)))

    def post(self, body, key='proxy-secret'):
        return self.client.post('/llm/v1/chat/completions', json=body, headers={'Authorization': f'Bearer {key}'} if key else {})

    def spans(self, op):
        transactions = [item for item in self.transport.items if item.get('type') == 'transaction']
        return [span for item in transactions for span in item.get('spans', []) if span.get('op') == op]

    def test_rejects_wrong_key_and_other_models(self):
        body = {'model': 'gemma-4-31B-it', 'messages': []}
        self.assertEqual(self.post(body, key=None).status_code, 401)
        self.assertEqual(self.post(body, key='guess').status_code, 401)
        self.assertEqual(self.post({**body, 'model': 'gpt-5'}).status_code, 400)
        with patch.dict(os.environ, {'LLM_PROXY_KEY': ''}):
            self.assertEqual(self.post(body, key='').status_code, 401)

    def test_streams_unchanged_bytes_and_traces_the_turn_without_content(self):
        payload = sse(CHUNKS)

        async def split():
            # Split mid-line to prove buffering across network chunks.
            for start in range(0, len(payload), 37):
                yield payload[start:start + 37]

        with self.upstream(lambda: httpx.Response(200, headers={'content-type': 'text/event-stream'}, content=split())):
            response = self.post({'model': 'gemma-4-31B-it', 'stream': True, 'user_id': 'u', 'messages': [{'role': 'user', 'content': '以上です。さようなら。'}], 'elevenlabs_extra_body': {'purpose': 'call', 'conversation': 'ref-123'}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, payload)
        headers, forwarded = self.sent[0]
        self.assertEqual(headers['authorization'], 'Bearer do-key')
        self.assertEqual(forwarded['stream_options'], {'include_usage': True})
        self.assertNotIn('elevenlabs_extra_body', forwarded)
        agent, = self.spans('gen_ai.invoke_agent')
        chat, = self.spans('gen_ai.chat')
        tool, = self.spans('gen_ai.execute_tool')
        self.assertEqual(agent['data']['gen_ai.agent.name'], 'Practice partner')
        self.assertEqual(agent['data']['gen_ai.conversation.id'], 'ref-123')
        self.assertEqual((chat['data']['gen_ai.usage.input_tokens'], chat['data']['gen_ai.usage.output_tokens'], chat['data']['gen_ai.usage.cache_read.input_tokens']), (84, 27, 64))
        self.assertEqual(chat['data']['gen_ai.response.finish_reasons'], '["tool_calls"]')
        self.assertIn('gen_ai.response.time_to_first_token', chat['data'])
        self.assertAlmostEqual(chat['data']['app.estimated_cost_usd'], (20 * 0.18 + 64 * 0.036 + 27 * 0.50) / 1_000_000)
        self.assertEqual(tool['data']['gen_ai.tool.name'], 'end_call')
        self.assertEqual(tool['parent_span_id'], agent['span_id'])
        sent_to_sentry = json.dumps(self.transport.items, ensure_ascii=False)
        for text in ('さようなら', '失礼いたします', 'goodbye', 'proxy-secret', 'do-key'):
            self.assertNotIn(text, sent_to_sentry)

    def test_flags_tool_syntax_spoken_as_dialogue(self):
        spoken = [{'choices': [{'delta': {'content': '失礼いたします。end_call(reason="finished")'}, 'finish_reason': 'stop'}]}]
        with self.upstream(httpx.Response(200, headers={'content-type': 'text/event-stream'}, content=sse(spoken))):
            self.post({'model': 'gemma-4-31B-it', 'stream': True, 'messages': []})
        warnings = [item for item in self.transport.items if item.get('level') == 'warning']
        self.assertEqual([item['message'] for item in warnings], ['Practice partner: tool syntax in speech'])
        self.assertTrue(self.spans('gen_ai.chat')[0]['data']['app.tool_syntax_in_speech'])
        self.assertNotIn('finished', json.dumps(self.transport.items))

    def test_non_streaming_help_turn_and_provider_errors_pass_through(self):
        completion = {'id': 'c2', 'model': 'gemma-4-31B-it', 'choices': [{'message': {'content': '{"meaning": "x"}'}, 'finish_reason': 'stop'}], 'usage': {'prompt_tokens': 10, 'completion_tokens': 5}}
        with self.upstream(httpx.Response(200, json=completion)):
            response = self.post({'model': 'gemma-4-31B-it', 'messages': [], 'elevenlabs_extra_body': {'purpose': 'help'}})
        self.assertEqual(response.json(), completion)
        self.assertEqual(self.spans('gen_ai.invoke_agent')[0]['data']['gen_ai.agent.name'], 'Question helper')
        with self.upstream(httpx.Response(429, json={'error': {'message': 'rate limited'}})):
            response = self.post({'model': 'gemma-4-31B-it', 'stream': True, 'messages': []})
        self.assertEqual(response.status_code, 429)
        self.assertIn('DigitalOcean inference returned HTTP 429', [item.get('message') for item in self.transport.items])


if __name__ == '__main__':
    unittest.main()
