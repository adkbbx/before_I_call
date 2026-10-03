"""Point the ElevenLabs agent's Custom LLM at this app's traced /llm/v1 proxy, or roll back to DigitalOcean.

Usage:
  .venv/Scripts/python.exe scripts/configure-llm-proxy.py https://before-i-call.onrender.com
  .venv/Scripts/python.exe scripts/configure-llm-proxy.py --rollback
"""
import argparse
import json
import os
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

DIRECT = 'https://inference.do-ai.run/v1/'
SAVED = Path('work/llm-proxy-rollback.json')
load_dotenv()
parser = argparse.ArgumentParser()
parser.add_argument('origin', nargs='?', help='Public app origin, such as https://before-i-call.onrender.com')
parser.add_argument('--rollback', action='store_true', help='Restore the direct DigitalOcean URL and its saved key')
args = parser.parse_args()
url = 'https://api.elevenlabs.io/v1/convai/agents/' + os.environ['ELEVENLABS_AGENT_ID']

with httpx.Client(headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']}, timeout=30) as client:
    agent = client.get(url)
    agent.raise_for_status()
    prompt = agent.json()['conversation_config']['agent']['prompt']
    custom = prompt['custom_llm']
    if args.rollback:
        saved = json.loads(SAVED.read_text(encoding='utf-8'))
        custom.update(url=saved['url'], api_key={'secret_id': saved['secret_id']})
        platform = {}
    else:
        if not args.origin or not os.getenv('LLM_PROXY_KEY'):
            parser.error('Pass the app origin and set LLM_PROXY_KEY to the value configured on the server.')
        if custom['url'] == DIRECT:
            SAVED.parent.mkdir(parents=True, exist_ok=True)
            SAVED.write_text(json.dumps({'url': custom['url'], 'secret_id': custom['api_key']['secret_id']}), encoding='utf-8')
        secret = client.post('https://api.elevenlabs.io/v1/convai/secrets', json={'type': 'new', 'name': f'before-i-call-llm-proxy-{int(time.time())}', 'value': os.environ['LLM_PROXY_KEY']})
        secret.raise_for_status()
        custom.update(url=args.origin.rstrip('/') + '/llm/v1/', api_key={'secret_id': secret.json()['secret_id']})
        # Lets the browser label each request as a practice call or question help, with a hashed conversation reference.
        platform = {'platform_settings': {'overrides': {'custom_llm_extra_body': True}}}
    # ElevenLabs validates custom_llm only together with the selected llm type.
    response = client.patch(url, json={'conversation_config': {'agent': {'prompt': {'llm': prompt['llm'], 'custom_llm': custom}}}, **platform})
    response.raise_for_status()
    saved = client.get(url).json()['conversation_config']['agent']['prompt']['custom_llm']
    if saved['url'] != custom['url'] or saved['api_key'] != custom['api_key']:
        raise RuntimeError('The agent did not keep the requested Custom LLM settings')
    print(f"Custom LLM now uses {saved['url']} with model {saved['model_id']}.")
