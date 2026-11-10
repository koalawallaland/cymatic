// koala noises for the koe pocket.
// Low keys: the male bellow, a snoring breath in and then a belching breath out, over and over.
// High keys: the whine of a female or a joey, which sounds like a sad kazoo sliding downhill.
// Everything is synthesized here; no recordings are used.
(function (G) {
'use strict';
const WORKLET = `
class Reson {
  constructor() { this.y1 = 0; this.y2 = 0; this.a1 = 0; this.a2 = 0; this.g = 1; }
  set(f, bw) { const r = Math.exp(-Math.PI * bw / sampleRate); this.a1 = 2 * r * Math.cos(2 * Math.PI * f / sampleRate); this.a2 = -r * r; this.g = 1 - r; }
  run(x) { const y = this.g * x + this.a1 * this.y1 + this.a2 * this.y2; this.y2 = this.y1; this.y1 = y; return y; }
}
class KoalaNoise extends AudioWorkletProcessor {
  constructor() {
    super();
    this.gate = 0; this.amp = 0; this.note = 60; this.noteS = 60; this.growl = 0; this.growlS = 0;
    // bellow
    this.bf = [new Reson(), new Reson(), new Reson(), new Reson()];
    this.ct = 0; this.seg = 0; this.len = [0.5, 0.06, 0.4, 0.14]; this.pph = 1; this.burst = 0; this.blp = 0; this.jit = 1;
    // whine
    this.wf = [new Reson(), new Reson(), new Reson()];
    this.wt = 0; this.wph = 0; this.wlen = 1.05; this.wlp = 0;
    this.lastSeg = -1; this.k = 0;
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.t === 'on') { this.note = d.n; if (!d.legato || !this.gate) { this.ct = 0; this.seg = 0; this.wt = 0; this.pph = 1; this.noteS = d.n; this.newCycle(); } this.gate = 1; }
      else if (d.t === 'off') this.gate = 0;
      else if (d.t === 'growl') this.growl = d.v ? 1 : 0;
    };
  }
  newCycle() { const r = () => 0.88 + Math.random() * 0.24; this.len = [0.5 * r(), 0.06, 0.4 * r(), 0.14 * r()]; this.wlen = 1.05 * r(); }
  process(_, outputs) {
    const out = outputs[0][0]; const sr = sampleRate;
    for (let i = 0; i < out.length; i++) {
      this.noteS += (this.note - this.noteS) * 0.0012;
      this.growlS += (this.growl - this.growlS) * 0.0008;
      this.amp += (this.gate - this.amp) * (this.gate ? 0.004 : 0.0009);
      if (this.amp < 1e-4 && !this.gate) { out[i] = 0; continue; }
      const n = this.noteS;
      let m = (n - 66) / 8; m = m < 0 ? 0 : m > 1 ? 1 : m; m = m * m * (3 - 2 * m); // 0 = bellow, 1 = whine
      let y = 0;
      // ---- bellow ----
      if (m < 0.999) {
        if ((this.k & 63) === 0) {
          const sz = Math.pow(2, (n - 60) / 30); // smaller koala on higher keys
          this.bf[0].set(290 * sz, 90); this.bf[1].set(640 * sz, 110); this.bf[2].set(1080 * sz, 150); this.bf[3].set(1650 * sz, 220);
        }
        const base = 440 * Math.pow(2, (n - 69) / 12) / 8; // C4 is about 33 pulses a second
        const L = this.len[this.seg]; const u = this.ct / L;
        let rate = 0, e = 0, breath = 0, bl = 0.006;
        if (this.seg === 0) { // breath in: a fast, ragged snore that rises
          rate = base * (1.55 + 0.5 * u); e = Math.sin(Math.PI * Math.min(1, u * 1.08)) * 0.62; breath = 0.16 * e; bl = 0.0045;
        } else if (this.seg === 2) { // breath out: a slow, heavy belch that sags
          rate = base * (1.0 - 0.22 * u); e = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.8); breath = 0.05 * e; bl = 0.008;
        }
        let x = 0;
        if (rate > 0) {
          this.pph += rate * this.jit / sr;
          if (this.pph >= 1) { this.pph -= 1; this.burst = 1; const j = (this.seg === 0 ? 0.22 : 0.07) + 0.2 * this.growlS; this.jit = 1 + (Math.random() * 2 - 1) * j; x += 9 * (0.8 + Math.random() * 0.4); }
          const w = Math.random() * 2 - 1;
          x += w * this.burst * (this.seg === 0 ? 2.6 : 1.5) * (1 + 1.2 * this.growlS) + w * breath * 3;
          this.burst *= Math.exp(-1 / (bl * sr));
        }
        this.blp += (x - this.blp) * 0.32;
        const s = this.blp * e;
        const b = this.bf[0].run(s) * 1.0 + this.bf[1].run(s) * 0.85 + this.bf[2].run(s) * 0.42 + this.bf[3].run(s) * 0.18;
        y += b * 7 * (1 - m);
        this.ct += 1 / sr;
        if (this.ct >= L) { this.ct = 0; this.seg = (this.seg + 1) & 3; if (this.seg === 0) this.newCycle(); }
      }
      // ---- sad kazoo whine ----
      if (m > 0.001) {
        const wu = this.wt / this.wlen; const gap = 0.16;
        let e = 0;
        if (wu < 1) e = Math.min(1, this.wt / 0.05) * Math.pow(1 - wu, 0.55) * (0.75 + 0.25 * Math.sin(Math.PI * wu));
        const droop = -3.6 * Math.pow(wu, 1.6) + 0.9 * Math.exp(-this.wt / 0.07); // scoops in, then sinks
        const wob = Math.sin(2 * Math.PI * 6.3 * this.wt) * (0.12 + 0.45 * wu + 0.5 * this.growlS);
        const f = 440 * Math.pow(2, (n - 69 - 12 + droop + wob) / 12);
        this.wph += f / sr; if (this.wph >= 1) this.wph -= 1;
        const p = this.wph;
        let src = (p < 0.32 ? 1 : -0.47) + (2 * p - 1) * 0.5; // a buzzy, lopsided reed
        src *= 1 + (Math.random() * 2 - 1) * 0.35;             // the paper membrane rattling
        this.wlp += (src - this.wlp) * 0.6;
        if ((this.k & 63) === 0) { this.wf[0].set(880, 260); this.wf[1].set(1750, 320); this.wf[2].set(2900, 500); }
        const s = this.wlp * e;
        const k = this.wf[0].run(s) * 1.0 + this.wf[1].run(s) * 0.9 + this.wf[2].run(s) * 0.45 + s * 0.05;
        y += k * 1.5 * m;
        this.wt += 1 / sr;
        if (this.wt >= this.wlen + gap) { this.wt = 0; this.newCycle(); }
      }
      y *= this.amp;
      out[i] = Math.tanh(y * 1.3) * 0.8;
      this.k++;
    }
    // tell the page which breath we're on, so the koala's mouth can follow
    const st = !this.gate ? -1 : (this.noteS > 70 ? (this.wt < this.wlen ? 4 : 1) : this.seg);
    if (st !== this.lastSeg) { this.lastSeg = st; this.port.postMessage({ seg: st }); }
    return true;
  }
}
registerProcessor('koala-noise', KoalaNoise);
`;
const loaded = new WeakMap();
function load(ctx) {
  if (!loaded.has(ctx)) loaded.set(ctx, ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))));
  return loaded.get(ctx);
}
class Engine {
  constructor(ctx) {
    this.ctx = ctx; this.onseg = null;
    this.node = new AudioWorkletNode(ctx, 'koala-noise', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    this.node.port.onmessage = (e) => { if (this.onseg) this.onseg(e.data.seg); };
  }
  connect(dest) { this.node.connect(dest); }
  on(note, legato) { this.node.port.postMessage({ t: 'on', n: note, legato: !!legato }); }
  off() { this.node.port.postMessage({ t: 'off' }); }
  growl(v) { this.node.port.postMessage({ t: 'growl', v: !!v }); }
}
G.KoalaNoise = { load, Engine };
})(window);
