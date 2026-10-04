"""Where server-side Gemma requests go: DigitalOcean serverless inference, or Ollama on this computer in local voice mode."""
import os
from typing import NamedTuple

DIGITALOCEAN = 'https://inference.do-ai.run/v1/chat/completions'


class Endpoint(NamedTuple):
    url: str
    headers: dict
    model: str
    extra: dict
    timeout: float


def local() -> bool:
    return os.getenv('LOCAL_VOICE') == '1'


def available() -> bool:
    return local() or bool(os.getenv('GRADIENT_MODEL_ACCESS_KEY') or os.getenv('DIGITALOCEAN_INFERENCE_KEY'))


def endpoint() -> Endpoint:
    """An OpenAI-compatible chat completions target. Local Gemma 4 thinks before answering unless told not to."""
    if local():
        url = os.getenv('LOCAL_LLM_URL', 'http://127.0.0.1:11434/v1').rstrip('/') + '/chat/completions'
        return Endpoint(url, {}, os.getenv('LOCAL_LLM_MODEL', 'gemma4:e2b-it-qat'), {'reasoning_effort': 'none'}, 120)
    key = os.getenv('GRADIENT_MODEL_ACCESS_KEY') or os.getenv('DIGITALOCEAN_INFERENCE_KEY') or ''
    return Endpoint(DIGITALOCEAN, {'Authorization': 'Bearer ' + key}, os.getenv('GRADIENT_MODEL', 'gemma-4-31B-it'), {}, 20)
