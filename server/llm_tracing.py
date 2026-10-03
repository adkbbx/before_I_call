"""Sentry agent tracing for Gemma requests. Spans carry timing, token counts and tool names, never conversation text."""
import hashlib
import json
import os
import time

import sentry_sdk

PROVIDER = 'digitalocean'
# DigitalOcean serverless inference list prices in USD per million tokens: input, output, cached input.
PRICES = {'gemma-4-31B-it': (0.18, 0.50, 0.036)}


def init():
    if not os.getenv('SENTRY_DSN'):
        return False
    sentry_sdk.init(
        dsn=os.environ['SENTRY_DSN'],
        environment=os.getenv('SENTRY_ENVIRONMENT', 'production'),
        release=os.getenv('RENDER_GIT_COMMIT') or None,
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '1.0')),
        debug=os.getenv('SENTRY_DEBUG') == '1',
        # Situations, transcripts and help text stay with the providers that process them.
        send_default_pii=False,
        max_request_body_size='never',
        include_local_variables=False,
        trace_propagation_targets=[],
    )
    return True


def enabled():
    return sentry_sdk.get_client().is_active()


def conversation_ref(session_id: str) -> str:
    # Groups one practice call's turns in Sentry without exposing the session capability.
    return hashlib.sha256(session_id.encode()).hexdigest()[:16]


def estimated_cost(model, input_tokens, output_tokens, cached_tokens=0):
    if model not in PRICES:
        return None
    price_in, price_out, price_cached = PRICES[model]
    return ((input_tokens - cached_tokens) * price_in + cached_tokens * price_cached + output_tokens * price_out) / 1_000_000


class Turn:
    """One model request: an invoke_agent span with a chat child, plus a span for each tool the model requests."""

    def __init__(self, agent: str, model: str, streaming: bool = False, conversation: str | None = None):
        self.agent, self.model, self.done = agent, model, False
        self.started = time.perf_counter()
        self.first_token = None
        self.span = sentry_sdk.start_span(op='gen_ai.invoke_agent', name=f'invoke_agent {agent}')
        self.chat = self.span.start_child(op='gen_ai.chat', name=f'chat {model}')
        for span, operation in ((self.span, 'invoke_agent'), (self.chat, 'chat')):
            span.set_data('gen_ai.operation.name', operation)
            span.set_data('gen_ai.agent.name', agent)
            span.set_data('gen_ai.provider.name', PROVIDER)
            span.set_data('gen_ai.request.model', model)
            if conversation:
                span.set_data('gen_ai.conversation.id', conversation)
        self.chat.set_data('gen_ai.response.streaming', streaming)

    def first_chunk(self):
        if self.first_token is None:
            self.first_token = time.perf_counter() - self.started
            self.chat.set_data('gen_ai.response.time_to_first_token', self.first_token)
            self.chat.set_data('gen_ai.response.time_to_first_chunk', self.first_token)

    def finish_completion(self, data, flags=(), status='ok'):
        """Finish from a non-streamed chat completion body."""
        data = data if isinstance(data, dict) else {}
        choices = data.get('choices') if isinstance(data.get('choices'), list) else []
        choice = choices[0] if choices and isinstance(choices[0], dict) else {}
        message = choice.get('message') if isinstance(choice.get('message'), dict) else {}
        tools = [call['function']['name'] for call in message.get('tool_calls') or [] if isinstance(call, dict) and (call.get('function') or {}).get('name')]
        self.finish(data.get('usage') if isinstance(data.get('usage'), dict) else None, [choice['finish_reason']] if choice.get('finish_reason') else [], tools, data.get('id'), data.get('model'), flags, status)

    def finish(self, usage=None, finish_reasons=(), tools=(), response_id=None, response_model=None, flags=(), status='ok'):
        if self.done:
            return
        self.done = True
        if response_model:
            self.chat.set_data('gen_ai.response.model', response_model)
        if response_id:
            self.chat.set_data('gen_ai.response.id', response_id)
        if finish_reasons:
            self.chat.set_data('gen_ai.response.finish_reasons', json.dumps(list(finish_reasons)))
        if tools:
            self.chat.set_data('gen_ai.response.tool_calls', json.dumps([{'name': name} for name in tools]))
        if usage:
            cached = usage.get('cache_read_input_tokens') or (usage.get('prompt_tokens_details') or {}).get('cached_tokens') or 0
            input_tokens, output_tokens = usage.get('prompt_tokens') or 0, usage.get('completion_tokens') or 0
            for span in (self.chat, self.span):
                span.set_data('gen_ai.usage.input_tokens', input_tokens)
                span.set_data('gen_ai.usage.output_tokens', output_tokens)
                span.set_data('gen_ai.usage.cache_read.input_tokens', cached)
                span.set_data('gen_ai.usage.input_tokens.cached', cached)
                span.set_data('gen_ai.usage.total_tokens', usage.get('total_tokens') or input_tokens + output_tokens)
            cost = estimated_cost(response_model or self.model, input_tokens, output_tokens, cached)
            if cost is not None:
                self.chat.set_data('app.estimated_cost_usd', round(cost, 8))
        for flag in flags:
            self.chat.set_data('app.' + flag, True)
            sentry_sdk.capture_message(f'{self.agent}: {flag.replace("_", " ")}', level='warning')
        for name in tools:
            # ElevenLabs executes the tool; this span records that Gemma requested it in this turn.
            tool = self.span.start_child(op='gen_ai.execute_tool', name=f'execute_tool {name}')
            tool.set_data('gen_ai.operation.name', 'execute_tool')
            tool.set_data('gen_ai.tool.name', name)
            tool.set_data('gen_ai.tool.type', 'function')
            tool.set_data('gen_ai.agent.name', self.agent)
            tool.set_data('app.executed_by', 'elevenlabs')
            tool.finish()
        self.chat.set_status(status)
        self.span.set_status(status)
        self.chat.finish()
        self.span.finish()
