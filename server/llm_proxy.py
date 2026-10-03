"""OpenAI-compatible pass-through from the ElevenLabs agent to Gemma on DigitalOcean, traced with Sentry."""
import asyncio
import json
import os
import re
import secrets

import httpx
import sentry_sdk
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

from server.llm_tracing import Turn

router = APIRouter()
UPSTREAM = 'https://inference.do-ai.run/v1/chat/completions'
# Problems seen in testing: the model speaking tool syntax or voice directions instead of dialogue.
FLAGS = {'tool_syntax_in_speech': re.compile(r'end_call\s*\(|\breason\s*=|system__'), 'voice_tag_in_speech': re.compile(r'\[[A-Za-z][A-Za-z ]{1,20}\]')}
_client: httpx.AsyncClient | None = None


def upstream() -> httpx.AsyncClient:
    global _client
    if _client is None:
        # Reused so each turn skips a fresh TLS handshake to DigitalOcean.
        _client = httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10))
    return _client


def configured():
    return bool(os.getenv('LLM_PROXY_KEY') and (os.getenv('GRADIENT_MODEL_ACCESS_KEY') or os.getenv('DIGITALOCEAN_INFERENCE_KEY')))


def flags(text: str):
    return [name for name, pattern in FLAGS.items() if pattern.search(text)]


class Stream:
    """Reads OpenAI-style SSE chunks for metrics while the bytes pass through unchanged. Text stays in memory only."""

    def __init__(self, turn: Turn):
        self.turn, self.buffer, self.text = turn, b'', []
        self.tools, self.finish_reasons, self.usage, self.id, self.model = [], [], None, None, None

    def feed(self, chunk: bytes):
        self.buffer += chunk
        *lines, self.buffer = self.buffer.split(b'\n')
        for line in lines:
            self.parse(line)

    def parse(self, line: bytes):
        line = line.strip()
        if not line.startswith(b'data:') or line[5:].strip() == b'[DONE]':
            return
        try:
            event = json.loads(line[5:])
        except ValueError:
            return
        if not isinstance(event, dict):
            return
        self.id = event.get('id') or self.id
        self.model = event.get('model') or self.model
        if isinstance(event.get('usage'), dict):
            self.usage = event['usage']
        for choice in event.get('choices') or []:
            delta = choice.get('delta') or {}
            if delta.get('content'):
                self.turn.first_chunk()
                self.text.append(delta['content'])
            for call in delta.get('tool_calls') or []:
                self.turn.first_chunk()
                name = (call.get('function') or {}).get('name')
                if name:
                    self.tools.append(name)
            if choice.get('finish_reason'):
                self.finish_reasons.append(choice['finish_reason'])

    def close(self, status='ok'):
        self.parse(self.buffer)
        self.buffer = b''
        self.turn.finish(self.usage, self.finish_reasons, self.tools, self.id, self.model, flags(''.join(self.text)), status)
        self.text = []


@router.post('/llm/v1/chat/completions')
async def chat_completions(request: Request):
    expected = os.getenv('LLM_PROXY_KEY', '')
    supplied = request.headers.get('authorization', '').removeprefix('Bearer ').strip()
    if not expected or not secrets.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(401, 'Invalid proxy key.')
    key = os.getenv('GRADIENT_MODEL_ACCESS_KEY') or os.getenv('DIGITALOCEAN_INFERENCE_KEY')
    if not key:
        raise HTTPException(503, 'The model provider key is not configured.')
    try:
        body = await request.json()
    except ValueError:
        raise HTTPException(400, 'Expected a JSON body.')
    model = os.getenv('GRADIENT_MODEL', 'gemma-4-31B-it')
    if not isinstance(body, dict) or body.get('model') != model:
        # The key is never usable for other, more expensive models.
        raise HTTPException(400, f'Only {model} is available.')
    extra = body.pop('elevenlabs_extra_body', None)
    extra = extra if isinstance(extra, dict) else {}
    conversation = extra.get('conversation') if isinstance(extra.get('conversation'), str) else None
    streaming = body.get('stream') is True
    if streaming:
        body['stream_options'] = {**(body.get('stream_options') or {}), 'include_usage': True}
    turn = Turn('Question helper' if extra.get('purpose') == 'help' else 'Practice partner', model, streaming, conversation[:64] if conversation else None)
    try:
        response = await upstream().send(upstream().build_request('POST', UPSTREAM, json=body, headers={'Authorization': 'Bearer ' + key, 'Accept-Encoding': 'identity'}), stream=True)
    except httpx.HTTPError:
        turn.finish(status='unavailable')
        sentry_sdk.capture_message('DigitalOcean inference could not be reached', level='error')
        return JSONResponse({'error': {'message': 'The model provider could not be reached.'}}, status_code=502)
    if response.is_error or not streaming:
        content = await response.aread()
        await response.aclose()
        if response.is_error:
            turn.finish(status='internal_error')
            sentry_sdk.capture_message(f'DigitalOcean inference returned HTTP {response.status_code}', level='error')
        else:
            try:
                data = json.loads(content)
            except ValueError:
                data = {}
            message = ((data.get('choices') or [{}])[0] if isinstance(data, dict) else {}).get('message') or {}
            turn.first_chunk()
            turn.finish_completion(data, flags(message.get('content') or '') if isinstance(message.get('content'), str) else ())
        return Response(content, status_code=response.status_code, media_type=response.headers.get('content-type', 'application/json'))
    stream = Stream(turn)

    async def relay():
        status = 'ok'
        try:
            async for chunk in response.aiter_bytes():
                stream.feed(chunk)
                yield chunk
        except httpx.HTTPError:
            status = 'internal_error'
            sentry_sdk.capture_message('DigitalOcean inference stream was interrupted', level='error')
        except (asyncio.CancelledError, GeneratorExit):
            # ElevenLabs drops the request when the learner interrupts the reply.
            status = 'cancelled'
            raise
        finally:
            stream.close(status)
            try:
                await response.aclose()
            except (httpx.HTTPError, asyncio.CancelledError):
                pass

    return StreamingResponse(relay(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
