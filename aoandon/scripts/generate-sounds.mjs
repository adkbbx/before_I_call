// Generates the ghost-night sound effects with ElevenLabs. Run: node scripts/generate-sounds.mjs [--force]
// Reads ELEVENLABS_API_KEY from the environment or .env.local; the key is never printed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets', 'sounds');
const MODEL = 'eleven_text_to_sound_v2';
const force = process.argv.includes('--force');

export const sounds = [
  { name: 'room-ambience', seconds: 22, loop: true, prompt: 'Quiet Japanese autumn night inside an old wooden tatami house: soft wind brushing paper shoji screens, distant bell crickets (suzumushi) chirping, an occasional faint wooden creak. Very calm and low. Seamless loop. No music, no voices.' },
  { name: 'candle-ignite', seconds: 2, loop: false, prompt: 'A single small candle wick catching flame: a soft whoosh and a gentle crackle, close and quiet.' },
  { name: 'candle-blow', seconds: 2.5, loop: false, prompt: 'Someone gently blows out a candle: a soft breath, the flame puffs out, a faint sizzle of the wick. Intimate and quiet.' },
  { name: 'furin-chime', seconds: 2.5, loop: false, prompt: 'A single Japanese glass wind chime (furin) rings softly once in a light breeze, delicate, with a short natural decay.' },
  { name: 'paper-turn', seconds: 1.2, loop: false, prompt: 'Turning a sheet of thick handmade Japanese washi paper, a soft close rustle.' },
  { name: 'flame-flare', seconds: 1.5, loop: false, prompt: 'A candle flame flares up with a low soft whoomp and crackle, then settles. Subtle and eerie, not loud.' },
  { name: 'temple-bell', seconds: 8, loop: false, prompt: 'A deep Japanese Buddhist temple bell (bonsho) struck once in the distance at night, long resonant decay, calm and solemn.' },
  { name: 'aoandon-arrival', seconds: 8, loop: false, prompt: 'A quiet supernatural presence arriving: a cold breath of wind and a low shimmering glassy drone that rises softly, faint distant airy whispers without words. No jump scare.' },
  { name: 'lantern-hum', seconds: 10, loop: true, prompt: 'A very soft, low, ethereal hum of a glowing paper lantern, gentle airy shimmer. Seamless loop, quiet.' },
];

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !line.trimStart().startsWith('#')) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

async function request(key, sound, withLoop) {
  const body = { text: sound.prompt, duration_seconds: sound.seconds, prompt_influence: 0.5, model_id: MODEL };
  if (withLoop && sound.loop) body.loop = true;
  return fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const key = process.env.ELEVENLABS_API_KEY ?? readEnvFile(join(root, '.env.local')).ELEVENLABS_API_KEY ?? '';
  if (!key) { console.error('ELEVENLABS_API_KEY is not set (.env.local).'); process.exit(1); }
  mkdirSync(outDir, { recursive: true });
  const manifestFile = join(outDir, 'manifest.json');
  const old = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { sounds: [] };
  const entries = [];
  for (const sound of sounds) {
    const file = `${sound.name}.mp3`, path = join(outDir, file), prior = old.sounds.find(s => s.name === sound.name);
    let loopSent = prior?.apiLoop ?? sound.loop;
    if (existsSync(path) && !force) { console.log(`skip ${file}`); entries.push(prior ?? { name: sound.name, file, seconds: sound.seconds, loop: sound.loop, prompt: sound.prompt, model: MODEL }); continue; }
    let response = await request(key, sound, true);
    if (!response.ok && sound.loop && response.status >= 400 && response.status < 500) { loopSent = false; response = await request(key, sound, false); }
    if (!response.ok) { console.error(`${file}: HTTP ${response.status} ${(await response.text()).slice(0, 200).replaceAll(key, '***')}`); process.exit(1); }
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
    console.log(`wrote ${file}`);
    entries.push({ name: sound.name, file, seconds: sound.seconds, loop: sound.loop, apiLoop: sound.loop ? loopSent : false, prompt: sound.prompt, model: MODEL });
  }
  writeFileSync(manifestFile, JSON.stringify({ model: MODEL, sounds: entries }, null, 2) + '\n');
}