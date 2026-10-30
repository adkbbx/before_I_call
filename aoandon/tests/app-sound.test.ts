import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSound, eventSounds, igniteWave, sceneLoops, channelGain } from '../src/lib/sound.ts';

function mock(files: Record<string, string> = {}) {
  const log = { contexts: 0, fetched: [] as string[], sources: [] as { rate: number; start: number }[], oscillators: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = (): any => ({ gain: param(), frequency: param(), connect: (n: any) => n, stop() {}, start() {} });
  class FakeContext {
    state = 'suspended'; currentTime = 0; sampleRate = 8000; destination = {};
    constructor() { log.contexts++; }
    addEventListener() {}
    async resume() { this.state = 'running'; } async suspend() { this.state = 'suspended'; }
    createGain() { return node(); } createBiquadFilter() { return node(); } createOscillator() { log.oscillators++; return node(); }
    createBuffer(_c: number, n: number) { return { getChannelData: () => new Float32Array(Math.min(n, 16)) }; }
    createBufferSource() { const n = node(); n.playbackRate = param(); n.start = function (t: number) { log.sources.push({ rate: n.playbackRate.value, start: t }); }; return n; }
    async decodeAudioData() { return { duration: 1 }; }
  }
  const fetchFile = async (url: string): Promise<Response> => {
    log.fetched.push(url);
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify({ sounds: Object.keys(files).map(name => ({ name, file: `${name}.mp3` })) }));
    const name = url.split('/').pop()!.replace('.mp3', '');
    return name in files ? new Response(new Uint8Array(4), { headers: { 'content-type': 'audio/mpeg' } }) : new Response('', { status: 404 });
  };
  const sound = createSound({ createContext: () => new FakeContext() as unknown as AudioContext, fetchFile, hidden: () => false });
  return { sound, log };
}
const all = Object.fromEntries(['room-ambience', 'lantern-hum', 'candle-ignite', 'candle-blow', 'furin-chime', 'paper-turn', 'flame-flare', 'temple-bell', 'aoandon-arrival'].map(n => [n, 'x']));
const tick = () => new Promise(r => setTimeout(r, 20));

test('every event maps to a distinct manifest sound on the right channel', () => {
  assert.equal(eventSounds['candle-blow'].file, 'candle-blow'); assert.equal(eventSounds['word-added'].file, 'furin-chime');
  assert.equal(eventSounds['scene-turn'].file, 'paper-turn'); assert.equal(eventSounds['wrong-answer'].file, 'flame-flare');
  assert.equal(eventSounds.bell.file, 'temple-bell'); assert.equal(eventSounds.arrival.file, 'aoandon-arrival');
  assert.equal(eventSounds.bell.channel, 'bell'); assert.equal(eventSounds['candle-ignite'].channel, 'events');
  assert.deepEqual(channelGain, { ambience: 0.22, events: 0.5, bell: 0.6 });
  assert.equal(sceneLoops.reader.ambience, 0.5); assert.equal(sceneLoops.reveal.ambience, 0); assert.equal(sceneLoops.reveal.hum, 1);
  assert.equal(igniteWave.length, 6); assert.ok(igniteWave.every(s => s.rate >= 0.9 && s.rate <= 1.1));
});

test('nothing plays, loads or creates audio before a gesture', async () => {
  const { sound, log } = mock(all);
  sound.setScene('room'); sound.pulseHum();
  assert.equal(sound.playEvent('candle-blow'), false); assert.equal(sound.playIgniteWave(), false); assert.equal(sound.playReveal(), false);
  await tick();
  assert.equal(log.contexts, 0); assert.deepEqual(log.fetched, []); assert.deepEqual(log.sources, []); assert.equal(sound.isRunning(), false);
});

test('after the first gesture the manifest and ambience load and events play; off silences them', async () => {
  const { sound, log } = mock(all);
  sound.setScene('room'); await sound.setSound(true); await tick();
  assert.equal(log.contexts, 1); assert.equal(sound.isRunning(), true);
  assert.equal(log.fetched[0], '/assets/sounds/manifest.json'); assert.equal(log.fetched[1], '/assets/sounds/room-ambience.mp3');
  const before = log.sources.length;
  assert.equal(sound.playIgniteWave(), true); await tick();
  assert.equal(log.sources.length - before, 6);
  await sound.setSound(false); assert.equal(sound.playEvent('candle-blow'), false);
});

test('missing files fall back to the procedural tone', async () => {
  const { sound, log } = mock({});
  sound.setScene('room'); await sound.setSound(true); await tick();
  assert.equal(sound.playEvent('bell'), true); await tick();
  assert.equal(log.oscillators, 1);
});

test('a hidden tab is muted', async () => {
  const { sound } = mock(all);
  await sound.setSound(true); await sound.setPaused(true);
  assert.equal(sound.playEvent('candle-blow'), false);
  await sound.setPaused(false); assert.equal(sound.playEvent('candle-blow'), true);
});