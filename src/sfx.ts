// Sound effects using Web Audio API — no dependencies needed

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastCollisionTime = 0;

const COLLISION_COOLDOWN = 0.07; // seconds between collision sounds

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function getMaster(): AudioNode {
  const c = getCtx();
  if (!compressor) {
    compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 10;
    compressor.ratio.value = 8;
    master = c.createGain();
    master.gain.value = 0.8;
    master.connect(compressor).connect(c.destination);
  }
  return master!;
}

function getNoiseBuffer(duration: number): AudioBuffer {
  const c = getCtx();
  const needed = Math.ceil(c.sampleRate * duration);
  if (!noiseBuffer || noiseBuffer.length < needed) {
    noiseBuffer = c.createBuffer(1, needed, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < needed; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

export function initAudio() {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  getMaster();
}

/** Short percussive impact — pitch/volume scale with collision force */
export function playCollision(force = 0.5) {
  const c = getCtx();
  if (c.state !== "running") return;

  const now = c.currentTime;
  if (now - lastCollisionTime < COLLISION_COOLDOWN) return;
  lastCollisionTime = now;

  const out = getMaster();
  const vol = 0.15 + force * 0.25;
  const freq = 200 + force * 400;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + 0.25);

  const noise = c.createBufferSource();
  noise.buffer = getNoiseBuffer(0.12);
  const nGain = c.createGain();
  nGain.gain.setValueAtTime(vol * 0.4, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(nGain).connect(out);
  noise.start(now);
  noise.stop(now + 0.12);
}

/** Dramatic explosion burst — descending sweep + noise */
export function playExplosion() {
  const c = getCtx();
  if (c.state !== "running") return;

  const now = c.currentTime;
  const out = getMaster();

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + 0.9);

  const sub = c.createOscillator();
  const subGain = c.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(80, now);
  sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
  subGain.gain.setValueAtTime(0.35, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  sub.connect(subGain).connect(out);
  sub.start(now);
  sub.stop(now + 0.6);

  const noise = c.createBufferSource();
  noise.buffer = getNoiseBuffer(0.65);
  const nGain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(4000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.6);
  nGain.gain.setValueAtTime(0.25, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.connect(filter).connect(nGain).connect(out);
  noise.start(now);
  noise.stop(now + 0.65);
}

/** Ascending whoosh/sucking sound for gravity reunite */
export function playGravity() {
  const c = getCtx();
  if (c.state !== "running") return;

  const now = c.currentTime;
  const duration = 1.5;
  const out = getMaster();

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + duration);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + duration + 0.1);

  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(90, now);
  osc2.frequency.exponentialRampToValueAtTime(900, now + duration);
  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.linearRampToValueAtTime(0.1, now + duration * 0.6);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc2.connect(gain2).connect(out);
  osc2.start(now);
  osc2.stop(now + duration + 0.1);

  const noise = c.createBufferSource();
  noise.buffer = getNoiseBuffer(duration);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(100, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + duration);
  filter.Q.value = 2;
  const nGain = c.createGain();
  nGain.gain.setValueAtTime(0.001, now);
  nGain.gain.linearRampToValueAtTime(0.12, now + duration * 0.5);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(nGain).connect(out);
  noise.start(now);
  noise.stop(now + duration + 0.1);
}
