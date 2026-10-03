// Port of dartThud from Sides.tsx (lines 54-82): a short synthesized knock.

export function dartThud(): void {
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioCtx = w.AudioContext ?? w.webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx();
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    const dur = 0.09;
    const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * dur)), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    }
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start(now);
    const osc = audio.createOscillator();
    const og = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(og);
    og.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.18);
    window.setTimeout(() => {
      void audio.close().catch(() => undefined);
    }, 600);
  } catch {
    /* audio unavailable — the dart still lands */
  }
}
