"""Apply the app's required voice overrides and completion tool to its agent."""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()
headers = {'xi-api-key': os.environ['ELEVENLABS_API_KEY']}
url = 'https://api.elevenlabs.io/v1/convai/agents/' + os.environ['ELEVENLABS_AGENT_ID']
with httpx.Client(headers=headers, timeout=30) as client:
    response = client.get(url)
    response.raise_for_status()
    current = response.json()
    platform = current['platform_settings']
    overrides = platform['overrides']['conversation_config_override']
    overrides['agent'] = {'first_message': True, 'language': True, 'prompt': {'prompt': True}}
    overrides['tts'] = {'voice_id': True}
    prompt = current['conversation_config']['agent']['prompt']
    tools = prompt.get('built_in_tools') or {}
    tools['end_call'] = {'type': 'system', 'name': 'end_call', 'description': 'End after the rehearsal goal is addressed and the learner confirms no further help is needed, or explicitly asks to finish. Do not end for a casual thank-you.', 'params': {'system_tool_type': 'end_call'}}
    prompt['built_in_tools'] = tools
    response = client.patch(url, json={'platform_settings': platform, 'conversation_config': {'agent': {'prompt': prompt}, 'tts': {'speed': 0.85}, 'conversation': {'max_duration_seconds': int(os.getenv('MAX_CALL_SECONDS', '300'))}}})
    response.raise_for_status()
    print('Configured language and voice overrides, end-call tool, and duration limit.')
