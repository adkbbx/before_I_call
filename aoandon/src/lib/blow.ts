export function createBlowDetector({ frameMs = 20, minMs = 250, marginDb = 12 }: { frameMs?: number; minMs?: number; marginDb?: number } = {}) {
  if (frameMs <= 0 || minMs <= 0 || marginDb < 0) throw new Error('Invalid detector timing');
  let elapsed = 0, sum = 0, frames = 0, sustained = 0, fired = false;
  return (db: number): boolean => {
    if (fired || !Number.isFinite(db)) return false;
    if (elapsed < 500) { sum += db; frames++; elapsed += frameMs; return false; }
    sustained = db > sum / frames + marginDb ? sustained + frameMs : 0;
    if (sustained >= minMs) { fired = true; return true; } return false;
  };
}
export async function startMicrophone(onBlow: () => void, onMeter: (value: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  let context: AudioContext;
  try { context = new AudioContext(); await context.resume(); } catch (e) { stream.getTracks().forEach(t => t.stop()); throw e; }
  const source = context.createMediaStreamSource(stream), low = context.createBiquadFilter(), analyser = context.createAnalyser();
  low.type = 'lowpass'; low.frequency.value = 500; analyser.fftSize = 1024; source.connect(low); low.connect(analyser);
  const data = new Float32Array(analyser.fftSize), detect = createBlowDetector();
  const stop = () => { clearInterval(timer); stream.getTracks().forEach(t => t.stop()); void context.close(); };
  const timer = setInterval(() => {
    if (document.hidden) { stop(); return; }
    analyser.getFloatTimeDomainData(data); const rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
    const db = 20 * Math.log10(Math.max(rms, 0.000001)); onMeter(Math.max(0, Math.min(1, (db + 70) / 60)));
    if (detect(db)) { stop(); onBlow(); }
  }, 20);
  return stop;
}
