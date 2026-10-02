import asyncio, json, os, wave
from pathlib import Path
import httpx
from dotenv import load_dotenv
load_dotenv()
demos = [json.loads(Path('src/demo.json').read_text(encoding='utf-8')), *json.loads(Path('src/extra-demos.json').read_text(encoding='utf-8'))]
turns = [turn for demo in demos for turn in demo['turns']]
limit = asyncio.Semaphore(2)

async def generate(client, turn, reply):
    name = turn['id'] + ('-reply' if reply else '')
    async with limit:
        response = await client.post('https://api.elevenlabs.io/v1/text-to-speech/' + os.environ['ELEVENLABS_VOICE_ID'], params={'output_format': 'pcm_24000'}, headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']}, json={'text': turn['answer'] if reply else turn['japanese'], 'model_id': 'eleven_multilingual_v2', 'language_code': 'ja', 'voice_settings': {'stability': 0.45, 'similarity_boost': 0.75, 'style': 0.2, 'speed': 0.95 if reply else 0.9}})
        if not response.is_success:
            raise RuntimeError(f'{name}: ElevenLabs status {response.status_code}')
        if len(response.content) < 1000:
            raise RuntimeError(f'{name}: empty audio')
        destination = Path('public/audio') / (name + '.wav')
        with wave.open(str(destination), 'wb') as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(24000)
            audio.writeframes(response.content)
        print(name + ': generated')

async def main():
    async with httpx.AsyncClient(timeout=90) as client:
        await asyncio.gather(*(generate(client, turn, reply) for turn in turns for reply in (False, True)))

asyncio.run(main())
