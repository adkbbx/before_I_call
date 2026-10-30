// Sample playback for the ghost night through WebAudio. Nothing plays, loads or even constructs an AudioContext
// until the first user gesture calls setSound(true). If a file is missing, procedural tones stand in.
export type SoundEvent = 'candle-ignite' | 'candle-blow' | 'word-added' | 'scene-turn' | 'wrong-answer' | 'bell' | 'arrival';
export type Scene = 'room' | 'shelf' | 'reader' | 'reveal' | 'about';
export type Channel = 'ambience' | 'events' | 'bell';
type Fallback = 'puff' | 'hum' | undefined;

export const channelGain: Record<Channel, number> = { ambience: 0.22, events: 0.5, bell: 0.6 };
export const eventSounds: Record<SoundEvent, { file: string; channel: Channel; fallback: Fallback }> = {
  'candle-ignite': { file: 'candle-ignite', channel: 'events', fallback: undefined },
  'candle-blow': { file: 'candle-blow', channel: 'events', fallback: 'puff' },
  'word-added': { file: 'furin-chime', channel: 'events', fallback: undefined },
  'scene-turn': { file: 'paper-turn', channel: 'events', fallback: undefined },
  'wrong-answer': { file: 'flame-flare', channel: 'events', fallback: undefined },
  bell: { file: 'temple-bell', channel: 'bell', fallback: 'hum' },
  arrival: { file: 'aoandon-arrival', channel: 'bell', fallback: undefined },
};
/** How loud each loop is on each screen, as a share of the ambience channel. */
export const sceneLoops: Record<Scene, { ambience: number; hum: number }> = {
  room: { ambience: 1, hum: 0 }, shelf: { ambience: 1, hum: 0 }, reader: { ambience: 0.5, hum: 0 },
  reveal: { ambience: 0, hum: 1 }, about: { ambience: 1, hum: 0 },
};
export const igniteWave = Array.from({ length: 6 }, (_, i) => ({ delay: i * 0.3 + (i % 2) * 0.07, rate: [0.92, 1.06, 0.97, 1.1, 0.9, 1.02][i] }));
export const FADE_SECONDS = 1.2, BASE = '/assets/sounds/';

type Ctx = AudioContext;
export type Deps = { createContext: () => Ctx; fetchFile: (url: string) => Promise<Response>; hidden: () => boolean };
type Loop = { source: AudioBufferSourceNode; gain: GainNode };

export function createSound(deps: Deps) {
  let ctx: Ctx | undefined, enabled = false, paused = false, scene: Scene | undefined, humPulse = false, pulseTimer: ReturnType<typeof setTimeout> | undefined;
  let available: Set<string> | undefined, manifestLoading: Promise<void> | undefined;
  const channels = {} as Record<Channel, GainNode>, buffers = new Map<string, Promise<AudioBuffer | null>>(), loops = new Map<string, Loop>(), listeners = new Set<() => void>();
  let wind: Loop | undefined;
  const running = () => !!ctx && ctx.state === 'running' && enabled && !paused;
  const notify = () => listeners.forEach(l => l());

  function ensureContext(): Ctx {
    if (ctx) return ctx;
    const c = deps.createContext(); ctx = c;
    for (const name of Object.keys(channelGain) as Channel[]) { const g = c.createGain(); g.gain.value = channelGain[name]; g.connect(c.destination); channels[name] = g; }
    c.addEventListener?.('statechange', notify);
    return c;
  }
  function loadManifest() {
    manifestLoading ??= deps.fetchFile(`${BASE}manifest.json`).then(r => r.ok ? r.json() : Promise.reject(new Error('no manifest')))
      .then((m: { sounds?: { name: string; file: string }[] }) => { available = new Set((m.sounds ?? []).map(s => s.name)); }).catch(() => { available = new Set(); });
    return manifestLoading;
  }
  function load(name: string): Promise<AudioBuffer | null> {
    let pending = buffers.get(name);
    if (!pending) {
      pending = loadManifest().then(async () => {
        if (!available?.has(name) || !ctx) return null;
        const response = await deps.fetchFile(`${BASE}${name}.mp3`);
        if (!response.ok || !/audio|octet/.test(response.headers.get('content-type') ?? 'audio')) return null;
        return await ctx.decodeAudioData(await response.arrayBuffer());
      }).catch(() => null);
      buffers.set(name, pending);
    }
    return pending;
  }
  function stopLoop(key: string, loop: Loop, now = false) {
    const c = ctx!, t = c.currentTime;
    loop.gain.gain.cancelScheduledValues(t);
    if (now) { try { loop.source.stop(); } catch { /* already stopped */ } return; }
    loop.gain.gain.setValueAtTime(loop.gain.gain.value, t); loop.gain.gain.linearRampToValueAtTime(0, t + FADE_SECONDS);
    try { loop.source.stop(t + FADE_SECONDS + 0.05); } catch { /* already stopped */ }
    loops.delete(key);
  }
  function startWind() {
    if (wind || !ctx) return;
    const c = ctx, buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220;
    const gain = c.createGain(); gain.gain.value = 10 ** (-36 / 20);
    source.connect(filter).connect(gain).connect(c.destination); source.start(); wind = { source, gain };
  }
  function stopWind() { if (wind) { try { wind.source.stop(); } catch { /* already stopped */ } wind = undefined; } }
  function level(kind: 'ambience' | 'hum') {
    if (!running() || !scene) return 0;
    return kind === 'hum' ? Math.max(sceneLoops[scene].hum, humPulse ? 0.6 : 0) : sceneLoops[scene].ambience;
  }
  async function sync(kind: 'ambience' | 'hum', name: string) {
    const target = level(kind), current = loops.get(name);
    if (target === 0) { if (current) stopLoop(name, current); if (kind === 'ambience') stopWind(); return; }
    if (current) { const t = ctx!.currentTime; current.gain.gain.cancelScheduledValues(t); current.gain.gain.setValueAtTime(current.gain.gain.value, t); current.gain.gain.linearRampToValueAtTime(target, t + FADE_SECONDS); return; }
    const buffer = await load(name);
    if (!ctx || level(kind) === 0 || loops.has(name)) return;
    if (!buffer) { if (kind === 'ambience') startWind(); return; }
    const c = ctx, source = c.createBufferSource(), gain = c.createGain(), t = c.currentTime;
    source.buffer = buffer; source.loop = true; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level(kind), t + FADE_SECONDS);
    source.connect(gain).connect(channels.ambience); source.start(); loops.set(name, { source, gain });
  }
  async function apply() {
    if (!ctx) return;
    await sync('ambience', 'room-ambience'); await sync('hum', 'lantern-hum');
    if (running()) for (const e of Object.values(eventSounds)) void load(e.file);
  }
  function procedural(kind: 'puff' | 'hum') {
    const c = ctx!, gain = c.createGain(); gain.connect(c.destination);
    gain.gain.setValueAtTime(0.0001, c.currentTime); gain.gain.exponentialRampToValueAtTime(kind === 'puff' ? 0.025 : 0.018, c.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (kind === 'puff' ? 0.3 : 4));
    if (kind === 'hum') { const osc = c.createOscillator(); osc.frequency.value = 73.4; osc.connect(gain); osc.start(); osc.stop(c.currentTime + 4); }
    else { const source = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate / 3, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; source.buffer = b; const low = c.createBiquadFilter(); low.frequency.value = 400; source.connect(low).connect(gain); source.start(); }
  }

  /** Called on a user gesture (or the toggle). Turning on creates the context; nothing is created before. */
  async function setSound(on: boolean) {
    enabled = on;
    if (!on) { if (ctx) { for (const [k, l] of [...loops]) stopLoop(k, l, true); loops.clear(); stopWind(); await ctx.suspend(); } notify(); return; }
    const c = ensureContext(); await c.resume(); notify(); await apply();
  }
  /** Mute while the tab is hidden. */
  async function setPaused(hidden: boolean) {
    paused = hidden;
    if (!ctx || !enabled) return;
    if (hidden) await ctx.suspend(); else { await ctx.resume(); await apply(); }
    notify();
  }
  function setScene(next: Scene) { scene = next; void apply(); }
  /** Lets the lantern hum sit under the room for a few seconds. */
  function pulseHum(ms = 6000) {
    humPulse = true; clearTimeout(pulseTimer); void apply();
    pulseTimer = setTimeout(() => { humPulse = false; void apply(); }, ms);
  }
  /** Returns true if the event was played (or its tone stood in); false if audio is not running. */
  function playEvent(event: SoundEvent, opts: { delay?: number; rate?: number } = {}): boolean {
    if (!running() || deps.hidden()) return false;
    const def = eventSounds[event], c = ctx!;
    void load(def.file).then(buffer => {
      if (!running()) return;
      if (!buffer) { if (def.fallback) procedural(def.fallback); return; }
      const source = c.createBufferSource(); source.buffer = buffer; source.playbackRate.value = opts.rate ?? 1;
      source.connect(channels[def.channel]); source.start(c.currentTime + (opts.delay ?? 0));
    });
    return true;
  }
  function playIgniteWave(): boolean { let played = false; for (const step of igniteWave) played = playEvent('candle-ignite', step) || played; return played; }
  function playReveal(): boolean { const played = playEvent('bell'); if (played) playEvent('arrival', { delay: 1.2 }); return played; }
  function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
  return { setSound, setPaused, setScene, pulseHum, playEvent, playIgniteWave, playReveal, subscribe, isRunning: running };
}

const sound = createSound({ createContext: () => new AudioContext(), fetchFile: url => fetch(url), hidden: () => document.hidden });
export const { setSound, setPaused, setScene, pulseHum, playEvent, playIgniteWave, playReveal, subscribe, isRunning } = sound;