// audio.js — fluorescent hum via WebAudio.
// 120 Hz mains hum + quiet harmonics + a faint band-limited ballast buzz,
// with a slow amplitude wobble. Started on the click-to-enter gesture.
export class Hum {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.level = 0.05;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const mkOsc = (freq, type, gain) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(master);
      osc.start();
    };
    mkOsc(120, "sine", 0.5);
    mkOsc(240, "sine", 0.12);
    mkOsc(360, "sine", 0.05);

    // faint band-limited noise (ballast buzz)
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = 0.015;
    noise.connect(bp).connect(ng).connect(master);
    noise.start();

    // slow amplitude wobble
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();

    master.gain.setTargetAtTime(this.muted ? 0 : this.level, ctx.currentTime, 1.5);
  }

  toggle() {
    this.muted = !this.muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.level,
        this.ctx.currentTime,
        0.2
      );
    }
    return this.muted;
  }
}
