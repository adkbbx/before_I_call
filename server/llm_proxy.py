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

from server import reply_rules
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

    def __init__(self, turn: Turn, review):
        self.turn, self.review, self.buffer, self.text = turn, review, b'', []
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
        self.turn.finish(self.usage, self.finish_reasons, self.tools, self.id, self.model, self.review(''.join(self.text), self.tools, status == 'ok'), status)
        self.text = []


def label(value, pattern):
    return value if isinstance(value, str) and re.fullmatch(pattern, value) else None


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
    # The browser supplies these labels, so they only ever name spans; they never change what is sent to the model.
    purpose = 'help' if extra.get('purpose') == 'help' else 'call'
    conversation = label(extra.get('conversation'), r'[A-Za-z0-9_-]{1,64}')
    messages = body.get('messages') if isinstance(body.get('messages'), list) else []
    learner = reply_rules.last_learner_message(messages) if purpose == 'call' else None
    streaming = body.get('stream') is True
    if streaming:
        body['stream_options'] = {**(body.get('stream_options') or {}), 'include_usage': True}
    turn = Turn('Question helper' if purpose == 'help' else 'Practice partner', model, streaming, conversation, {
        'app.prompt_version': label(extra.get('prompt_version'), r'[0-9a-f]{4,16}'),
        'app.traffic': 'evaluation' if extra.get('traffic') == 'evaluation' else 'live',
        # Matches "Partner reply #N" on the call card: the greeting is reply 1.
        'app.turn': sum(1 for message in messages if isinstance(message, dict) and message.get('role') == 'assistant') + 1 if purpose == 'call' else None,
    })

    def review(reply: str, tools, completed: bool):
        """Quality flags for this reply; practice-call replies are also checked against the role-play rules."""
        found = flags(reply)
        if purpose == 'call':
            broken, goodbye = reply_rules.check(learner, reply, tools, completed)
            turn.set('app.learner_said_goodbye', goodbye)
            turn.set('app.hung_up', 'end_call' in tools)
            found += broken
        return found
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
            choices = data.get('choices') if isinstance(data, dict) and isinstance(data.get('choices'), list) else []
            message = choices[0].get('message') if choices and isinstance(choices[0], dict) and isinstance(choices[0].get('message'), dict) else {}
            tools = [call['function']['name'] for call in message.get('tool_calls') or [] if isinstance(call, dict) and (call.get('function') or {}).get('name')]
            turn.first_chunk()
            turn.finish_completion(data, review(reply_rules.text_of(message.get('content')), tools, True))
        return Response(content, status_code=response.status_code, media_type=response.headers.get('content-type', 'application/json'))
    stream = Stream(turn, review)

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
