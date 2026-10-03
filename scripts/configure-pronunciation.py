"""Install shared Japanese speech aliases on the configured live agent."""
import hashlib
import json
import os
import sys
from pathlib import Path
import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.pronunciation import dictionary_rules

PREFIX = 'Before I Call Japanese readings '


def configure(client, agent_id):
    url = f'https://api.elevenlabs.io/v1/convai/agents/{agent_id}'
    response = client.get(url)
    response.raise_for_status()
    current = response.json()['conversation_config']['tts'].get('pronunciation_dictionary_locators') or []
    rules = dictionary_rules()
    name = PREFIX + hashlib.sha256(json.dumps(rules, ensure_ascii=False).encode()).hexdigest()[:12]
    keep = []
    locator = None
    for entry in current:
        response = client.get('https://api.elevenlabs.io/v1/pronunciation-dictionaries/' + entry['pronunciation_dictionary_id'])
        response.raise_for_status()
        dictionary = response.json()
        if dictionary['name'] == name:
            locator = entry
        elif not dictionary['name'].startswith(PREFIX):
            keep.append(entry)
    if locator is None:
        response = client.post('https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-rules', json={'name': name, 'rules': rules})
        response.raise_for_status()
        dictionary = response.json()
        locator = {'pronunciation_dictionary_id': dictionary['id'], 'version_id': dictionary['version_id']}
    desired = [locator, *keep]
    if desired != current:
        response = client.patch(url, json={'conversation_config': {'tts': {'pronunciation_dictionary_locators': desired}}})
        response.raise_for_status()
    response = client.get(url)
    response.raise_for_status()
    actual = response.json()['conversation_config']['tts']['pronunciation_dictionary_locators']
    assert any(entry['pronunciation_dictionary_id'] == locator['pronunciation_dictionary_id'] and entry['version_id'] == locator['version_id'] for entry in actual), 'Agent did not retain pronunciation dictionary'
    print(f'Live agent pronunciation dictionary verified: {len(rules)} Japanese aliases.')


if __name__ == '__main__':
    load_dotenv()
    with httpx.Client(headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']}, timeout=30) as client:
        try:
            configure(client, os.environ['ELEVENLABS_AGENT_ID'])
        except httpx.HTTPStatusError as error:
            print(f'Pronunciation configuration failed: ElevenLabs HTTP {error.response.status_code}. Check pronunciation dictionary and ElevenAgents Read/Write permissions.', file=sys.stderr)
            detail = error.response.json().get('detail', {})
            if isinstance(detail, dict) and detail.get('status') == 'missing_permissions':
                print(detail.get('message', 'API key is missing a required permission.'), file=sys.stderr)
            sys.exit(1)
