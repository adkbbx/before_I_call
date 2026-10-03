"""Generate listening candidates for the problematic photo request."""
import argparse
import asyncio
import os
import wave
from pathlib import Path
import httpx
from dotenv import load_dotenv

# Each run makes paid speech requests, so --help or a mistyped argument must exit before any request.
argparse.ArgumentParser(description=__doc__).parse_args()
load_dotenv()
TEXT = 'では、よるにうかがえるかかくにんします。みずがもれているばしょのしゃしんを、おくっていただけますか？'


async def generate(client, model, stability):
    response = await client.post(
        'https://api.elevenlabs.io/v1/text-to-speech/' + os.environ['ELEVENLABS_VOICE_ID'],
        params={'output_format': 'pcm_24000'},
        headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']},
        json={'text': TEXT, 'model_id': model, 'language_code': 'ja', 'voice_settings': {'stability': stability, 'similarity_boost': 0.75, 'style': 0, 'speed': 0.95}},
    )
    if not response.is_success:
        print(f'{model}: HTTP {response.status_code}')
        return
    path = Path('work/pronunciation') / f'photo-{model}.wav'
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as recording:
        recording.setnchannels(1)
        recording.setsampwidth(2)
        recording.setframerate(24000)
        recording.writeframes(response.content)
    print(f'{model}: {path}')


async def main():
    async with httpx.AsyncClient(timeout=90) as client:
        await asyncio.gather(generate(client, 'eleven_flash_v2_5', 0.7), generate(client, 'eleven_v3', 1.0))


asyncio.run(main())
