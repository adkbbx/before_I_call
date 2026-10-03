import argparse, asyncio, hashlib, json, os, re, sys, wave
from pathlib import Path
import httpx
from dotenv import load_dotenv
load_dotenv()
demos = [json.loads(Path('src/demo.json').read_text(encoding='utf-8')), *json.loads(Path('src/extra-demos.json').read_text(encoding='utf-8'))]
original = [turn for demo in demos for turn in demo['turns']]
english = [{**turn, 'id': 'en-' + turn['id'], 'japanese': turn['meaning'], 'answer': turn['answerMeaning']} for turn in original]
turns = english if '--english-only' in sys.argv else original + english
limit = asyncio.Semaphore(2)
parser = argparse.ArgumentParser()
parser.add_argument('--english-only', action='store_true')
parser.add_argument('--only', nargs='+', help='Recording IDs to regenerate, such as timing or appointment')
args = parser.parse_args()

async def generate(client, turn, reply):
    name = turn['id'] + ('-reply' if reply else '')
    async with limit:
        # Keep kanji in the UI, but make the intended reading explicit
        # in speech input rather than asking the voice model to guess it.
        readings = {'夜７時以降': 'よる しちじ いこう', '田中': 'たなか', '洗って': 'あらって', '伺い': 'うかがい', '伺え': 'うかがえ', '場所': 'ばしょ', '水漏れ': 'みずもれ', '排水': 'はいすい', '水曜日': 'すいようび', '水': 'みず'}
        speech_text = re.sub('|'.join(readings), lambda match: readings[match.group()], turn['answer'] if reply else turn['japanese'])
        response = await client.post('https://api.elevenlabs.io/v1/text-to-speech/' + (os.getenv('ELEVENLABS_ENGLISH_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL') if name.startswith('en-') else os.environ['ELEVENLABS_VOICE_ID']), params={'output_format': 'pcm_24000'}, headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']}, json={'text': speech_text, 'model_id': 'eleven_multilingual_v2', 'language_code': 'en' if name.startswith('en-') else 'ja', 'voice_settings': {'stability': 0.7, 'similarity_boost': 0.75, 'style': 0, 'speed': 0.95}})
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
        await asyncio.gather(*(generate(client, turn, reply) for turn in turns for reply in (False, True) if args.only is None or turn['id'] + ('-reply' if reply else '') in args.only))
    versions = {path.stem: hashlib.sha256(path.read_bytes()).hexdigest()[:12] for path in Path('public/audio').glob('*.wav')}
    Path('src/audio-versions.json').write_text(json.dumps(versions, indent=2) + '\n')

asyncio.run(main())
