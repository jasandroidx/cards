let ctx: AudioContext | null = null;
let drone: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let noise: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;

function context(): AudioContext | null {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function brownNoise(audio: AudioContext): AudioBufferSourceNode {
  const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function armAtmosphere() {
  context();
}

export function setAtmosphere(phase: number) {
  const audio = context();
  if (!audio) return;

  if (phase <= 0) {
    fade(droneGain, 0);
    fade(noiseGain, 0);
    return;
  }

  if (!drone) {
    drone = audio.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55;
    droneGain = audio.createGain();
    droneGain.gain.value = 0;
    drone.connect(droneGain);
    droneGain.connect(audio.destination);
    drone.start();
  }
  if (!noise) {
    noise = brownNoise(audio);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = phase >= 3 ? 400 : 180;
    noiseGain = audio.createGain();
    noiseGain.gain.value = 0;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audio.destination);
    noise.start();
  }

  const now = audio.currentTime;
  drone.frequency.setTargetAtTime(phase >= 3 ? 42 : 55, now, 0.4);
  droneGain?.gain.setTargetAtTime(phase >= 2 ? 0.045 : 0.02, now, 0.6);
  noiseGain?.gain.setTargetAtTime(phase >= 3 ? 0.08 : 0.03, now, 0.6);
}

export function fallSound() {
  const audio = context();
  if (!audio) return;
  setAtmosphere(3);
  const now = audio.currentTime;
  drone?.frequency.exponentialRampToValueAtTime(22, now + 1.4);
  droneGain?.gain.setTargetAtTime(0.07, now, 0.2);
  noiseGain?.gain.setTargetAtTime(0.12, now, 0.2);
}

export function signSound() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

export function wrongSound() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(36, now + 0.45);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.52);
}

function fade(node: GainNode | null, value: number) {
  if (!node || !ctx) return;
  node.gain.setTargetAtTime(value, ctx.currentTime, 0.3);
}
