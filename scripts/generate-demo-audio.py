import argparse, asyncio, hashlib, json, os, sys, wave
from pathlib import Path
import httpx
from dotenv import load_dotenv
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.pronunciation import speech_text
load_dotenv()
demos = [json.loads(Path('src/demo.json').read_text(encoding='utf-8')), *json.loads(Path('src/extra-demos.json').read_text(encoding='utf-8'))]
original = [turn for demo in demos for turn in demo['turns']]
english = [{**turn, 'id': 'en-' + turn['id'], 'japanese': turn['meaning'], 'answer': turn['answerMeaning']} for turn in original]
turns = english if '--english-only' in sys.argv else original + english
limit = asyncio.Semaphore(2)
parser = argparse.ArgumentParser()
parser.add_argument('--english-only', action='store_true')
parser.add_argument('--japanese-only', action='store_true', help='Regenerate Japanese audio without changing English recordings')
parser.add_argument('--replies-only', action='store_true', help='Regenerate learner replies without changing partner recordings')
parser.add_argument('--only', nargs='+', help='Recording IDs to regenerate, such as timing or appointment')
args = parser.parse_args()
if args.english_only and args.japanese_only:
    parser.error('Choose either --english-only or --japanese-only')
if args.japanese_only:
    turns = original
def voice_for(language, reply):
    if language == 'en':
        partner = os.getenv('ELEVENLABS_ENGLISH_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL')
        learner = os.getenv('ELEVENLABS_ENGLISH_REPLY_VOICE_ID', 'CwhRBWXzGAHq8TQ4Fs17')
    else:
        partner = os.environ['ELEVENLABS_VOICE_ID']
        learner = os.getenv('ELEVENLABS_JAPANESE_REPLY_VOICE_ID', 'iTqcz0mjbxzCZAfsqojU')
    if partner == learner:
        raise ValueError('Demo partner and learner must use different voices')
    return learner if reply else partner

async def generate(client, turn, reply):
    name = turn['id'] + ('-reply' if reply else '')
    async with limit:
        # Keep kanji in the UI, but make the intended reading explicit
        # in speech input rather than asking the voice model to guess it.
        spoken = speech_text(turn['answer'] if reply else turn['japanese'], 'en' if name.startswith('en-') else 'ja')
        # This voice's Multilingual v2 recording repeatedly mispronounces okutte.
        model = 'eleven_v3' if name == 'photo' else 'eleven_multilingual_v2'
        response = await client.post('https://api.elevenlabs.io/v1/text-to-speech/' + voice_for('en' if name.startswith('en-') else 'ja', reply), params={'output_format': 'pcm_24000'}, headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY']}, json={'text': spoken, 'model_id': model, 'language_code': 'en' if name.startswith('en-') else 'ja', 'voice_settings': {'stability': 1.0 if model == 'eleven_v3' else 0.7, 'similarity_boost': 0.75, 'style': 0, 'speed': 0.95}})
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
        await asyncio.gather(*(generate(client, turn, reply) for turn in turns for reply in (False, True) if (not args.replies_only or reply) and (args.only is None or turn['id'] + ('-reply' if reply else '') in args.only)))
    versions = {path.stem: hashlib.sha256(path.read_bytes()).hexdigest()[:12] for path in Path('public/audio').glob('*.wav')}
    Path('src/audio-versions.json').write_text(json.dumps(versions, indent=2) + '\n')

asyncio.run(main())
