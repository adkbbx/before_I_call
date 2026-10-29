let context: AudioContext | undefined;
let wind: AudioBufferSourceNode | undefined;
let enabled = false;
export async function setSound(on: boolean) {
  enabled = on;
  if (!on) { wind?.stop(); wind = undefined; await context?.suspend(); return; }
  context ??= new AudioContext(); await context.resume();
  if (wind) return;
  const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
  const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  wind = context.createBufferSource(); wind.buffer = buffer; wind.loop = true;
  const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220;
  const gain = context.createGain(); gain.gain.value = 10 ** (-36 / 20);
  wind.connect(filter).connect(gain).connect(context.destination); wind.start();
}
export function playSound(kind: 'puff' | 'hum') {
  if (!enabled || !context || context.state !== 'running') return;
  const c = context, gain = c.createGain(); gain.connect(c.destination);
  gain.gain.setValueAtTime(0.0001, c.currentTime); gain.gain.exponentialRampToValueAtTime(kind === 'puff' ? 0.025 : 0.018, c.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (kind === 'puff' ? 0.3 : 4));
  if (kind === 'hum') { const osc = c.createOscillator(); osc.frequency.value = 73.4; osc.connect(gain); osc.start(); osc.stop(c.currentTime + 4); }
  else { const source = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate / 3, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; source.buffer = b; const low = c.createBiquadFilter(); low.frequency.value = 400; source.connect(low).connect(gain); source.start(); }
}
