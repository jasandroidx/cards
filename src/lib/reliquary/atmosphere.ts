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

/** A bright blip when a mark is earned. */
export function markSound() {
  playWinBlip(0);
}

/** Shared win-blip core. Level 0 is the classic markSound; higher levels
 *  raise pitch and tighten the envelope for escalating win stings. */
function playWinBlip(level: number) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const lift = Math.pow(2, (level * 2) / 12); // +2 semitones per streak step
  const speed = Math.max(0.62, 1 - level * 0.07); // slightly snappier at high streak
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520 * lift, now);
  osc.frequency.exponentialRampToValueAtTime(880 * lift, now + 0.09 * speed);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22 * speed);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.24 * speed);
  // a faint octave shimmer on top at streak 3+, the Balatro donk
  if (level >= 3) {
    const shimmer = audio.createOscillator();
    const shimmerGain = audio.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(1040 * lift, now);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.018, now + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 * speed);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(audio.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.18 * speed);
  }
}

/** Pentatonic ladder for mark count-ups: 400Hz -> ~900Hz across `total` steps. */
const PENTA_LADDER = [0, 2, 4, 7, 9, 12, 14];

/**
 * One tick of a mark count-up. Call per digit as the purse climbs:
 * pitch rises along a pentatonic ladder from `step` 0 to `total` - 1.
 * Each blip is ~70ms — tiny enough to fire rapidly.
 */
export function markTick(step: number, total: number) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const span = Math.max(1, total - 1);
  const frac = Math.min(1, Math.max(0, step / span));
  const idx = Math.round(frac * (PENTA_LADDER.length - 1));
  const semis = PENTA_LADDER[idx] ?? 0;
  const freq = 400 * Math.pow(2, semis / 12);
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

let stingStreak = 0;
const STING_CAP = 5;

/**
 * Escalating win sting: the win blip, pitched and tightened by the current
 * win streak. Streak is capped at 5. Call with the streak AFTER incrementing
 * (first consecutive win = 1).
 */
export function winSting(streak: number) {
  stingStreak = Math.min(STING_CAP, Math.max(0, Math.floor(streak)));
  playWinBlip(stingStreak);
}

/** A loss breaks the streak: the next win sting is back at base pitch. */
export function resetSting() {
  stingStreak = 0;
}

/** A low thud when a mark is lost. */
export function lossSound() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.3);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.36);
}

/** A deeper chime when a gate opens. */
export function gateSound() {  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  for (const [freq, at] of [[330, 0], [495, 0.12]] as const) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + at);
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.05, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.4);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.42);
  }
}

function fade(node: GainNode | null, value: number) {
  if (!node || !ctx) return;
  node.gain.setTargetAtTime(value, ctx.currentTime, 0.3);
}

/** One woody knock: filtered noise burst for dice and cups. */
function knock(audio: AudioContext, when: number, freq: number, vol: number) {
  const dur = 0.07;
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * dur), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 2;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(vol, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  src.start(when);
}

/** Dice cup rattle: rapid knocks while the cup shakes. */
export function cupRattle() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  for (let i = 0; i < 9; i++) {
    knock(audio, now + i * 0.07 + Math.random() * 0.02, 1800 + Math.random() * 1200, 0.05);
  }
}

/** Dice settling: staggered clacks, one per die. */
export function diceClatter(n = 3) {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  for (let i = 0; i < n; i++) {
    knock(audio, now + i * 0.13, 1200 + Math.random() * 800, 0.07);
    knock(audio, now + i * 0.13 + 0.045, 2400, 0.03);
  }
}

/** Cup coming down: low wooden thunk. */
export function cupThunk() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.24);
  knock(audio, now, 900, 0.05);
}

/** The liar call: a tense dissonant hit. */
export function liarSting() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  for (const f of [196, 207]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  }
}

/** Dark triumph for winning the match: low swell under two bleak chimes. */
export function liarWinSting() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  // low swell, rising but never bright
  const swell = audio.createOscillator();
  const swellGain = audio.createGain();
  swell.type = "triangle";
  swell.frequency.setValueAtTime(110, now);
  swell.frequency.exponentialRampToValueAtTime(220, now + 0.9);
  swellGain.gain.setValueAtTime(0.0001, now);
  swellGain.gain.exponentialRampToValueAtTime(0.06, now + 0.35);
  swellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
  swell.connect(swellGain);
  swellGain.connect(audio.destination);
  swell.start(now);
  swell.stop(now + 1.15);
  // two chimes, a minor third descending — victory, but bleak
  for (const [freq, at] of [[659, 0.15], [554, 0.45]] as const) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + at);
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.05, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.55);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.6);
  }
}

/** Ominous loss: deep drop with a dissonant minor-second pair. */
export function liarLoseSting() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  // deep drop
  const drop = audio.createOscillator();
  const dropGain = audio.createGain();
  drop.type = "sawtooth";
  drop.frequency.setValueAtTime(160, now);
  drop.frequency.exponentialRampToValueAtTime(40, now + 1.0);
  dropGain.gain.setValueAtTime(0.0001, now);
  dropGain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
  dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
  drop.connect(dropGain);
  dropGain.connect(audio.destination);
  drop.start(now);
  drop.stop(now + 1.15);
  // minor-second pair grinding underneath
  for (const f of [110, 116.54]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now + 0.1);
    osc.stop(now + 1.15);
  }
}

/** A heavier wooden slam when the cups come down on the intro video. */
export function cupSlam() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.32);
  knock(audio, now, 700, 0.07);
  knock(audio, now + 0.03, 320, 0.05);
}

/** Farkle: the bones give nothing. A descending gut-punch. */
export function farkleSting() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const notes = [330, 262, 196, 147];
  notes.forEach((f, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, now + i * 0.16);
    gain.gain.setValueAtTime(0.0001, now + i * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.06, now + i * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.18);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now + i * 0.16);
    osc.stop(now + i * 0.16 + 0.2);
  });
}

/** Banking points: a small wooden tick. */
export function bankTick() {
  const audio = context();
  if (!audio) return;
  knock(audio, audio.currentTime, 2000, 0.06);
}

/** A book closes: paper shuffle plus a low satisfied thump. */
export function bookSound() {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  knock(audio, now, 2600, 0.04);
  knock(audio, now + 0.09, 1800, 0.05);
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
  gain.gain.setValueAtTime(0.0001, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.07);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now + 0.05);
  osc.stop(now + 0.32);
}

/** A card snapped onto the table: short papery click. */
export function cardSnap() {
  const audio = context();
  if (!audio) return;
  knock(audio, audio.currentTime, 3200, 0.045);
}
