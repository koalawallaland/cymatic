/* koala voicebank: shared by koe/index.html and koe/booth.html
   - SYLS: the syllables a full bank holds (fixed order = slot order in the exported wav)
   - analyze(): trims a take, finds where the voice starts, its pitch and pitch marks
   - Engine: AudioWorklet that sings any note from a take (pitch-synchronous overlap-add,
     so the voice keeps its own character), with a formant "tone" control
   - db: takes kept in this browser (IndexedDB); exportWav / loadWav for the published bank */
(function (G) {
'use strict';
const SYLS = [['a','あ'],['i','い'],['u','う'],['e','え'],['o','お'],
['ka','か'],['ki','き'],['ku','く'],['ke','け'],['ko','こ'],
['sa','さ'],['shi','し'],['su','す'],['se','せ'],['so','そ'],
['ta','た'],['chi','ち'],['tsu','つ'],['te','て'],['to','と'],
['na','な'],['ni','に'],['nu','ぬ'],['ne','ね'],['no','の'],
['ha','は'],['hi','ひ'],['fu','ふ'],['he','へ'],['ho','ほ'],
['ma','ま'],['mi','み'],['mu','む'],['me','め'],['mo','も'],
['ya','や'],['yu','ゆ'],['yo','よ'],
['ra','ら'],['ri','り'],['ru','る'],['re','れ'],['ro','ろ'],
['wa','わ'],['wo','を'],['n','ん'],
['ga','が'],['gi','ぎ'],['gu','ぐ'],['ge','げ'],['go','ご'],
['za','ざ'],['ji','じ'],['zu','ず'],['ze','ぜ'],['zo','ぞ'],
['da','だ'],['de','で'],['do','ど'],
['ba','ば'],['bi','び'],['bu','ぶ'],['be','べ'],['bo','ぼ'],
['pa','ぱ'],['pi','ぴ'],['pu','ぷ'],['pe','ぺ'],['po','ぽ'],
['fa','ふぁ']];
const KEYS = SYLS.map((s) => s[0]);
const KANA = Object.fromEntries(SYLS);
const SLOT_SEC = 1.8, EXPORT_SR = 32000;
const ALIAS = { si: 'shi', ti: 'chi', tu: 'tsu', hu: 'fu', zi: 'ji', di: 'ji', du: 'zu', la: 'ra', li: 'ri', lu: 'ru', le: 're', lo: 'ro', nn: 'n', o_: 'wo', xi: 'shi' };

// ---------- lyrics: hiragana / katakana / romaji -> syllable keys ----------
function kataToHira(s) { return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
const BY_KANA = SYLS.slice().sort((a, b) => b[1].length - a[1].length);
function parseLyric(text) {
  const out = []; let s = kataToHira(String(text || '')).toLowerCase();
  // kana pass
  let i = 0, buf = '';
  const flushRomaji = () => { if (buf.trim()) out.push(...parseRomaji(buf)); buf = ''; };
  while (i < s.length) {
    const hit = BY_KANA.find(([, k]) => s.startsWith(k, i));
    if (hit) { flushRomaji(); out.push(hit[0]); i += hit[1].length; continue; }
    const ch = s[i];
    if (/[぀-ゟー]/.test(ch)) { flushRomaji(); i++; continue; } // small kana, ー etc: skip
    buf += ch; i++;
  }
  flushRomaji();
  return out;
}
function parseRomaji(s) {
  const res = [];
  for (const word of s.split(/[^a-z']+/)) {
    let i = 0;
    while (i < word.length) {
      let found = null;
      for (let L = 3; L >= 1; L--) {
        let t = word.slice(i, i + L); if (t.length < L) continue;
        if (ALIAS[t]) t = ALIAS[t];
        if (KANA[t] && !(t === 'n' && /[aiueoy]/.test(word[i + 1] || ''))) { found = [t, L]; break; }
      }
      if (found) { res.push(found[0]); i += found[1]; } else i++;
    }
  }
  return res;
}
// split a key into consonant + vowel (for the built-in formant voice)
function split(key) {
  if (key === 'n') return ['N', ''];
  const v = key.slice(-1); const c = key.slice(0, -1);
  return [c, 'aiueo'.includes(v) ? v : 'u'];
}

// ---------- analysis ----------
function analyze(raw, sr) {
  const hop = Math.round(sr * 0.01), win = Math.round(sr * 0.04);
  const nF = Math.floor((raw.length - win) / hop);
  if (nF < 10) return { error: 'too short' };
  const rms = new Float32Array(nF);
  let peak = 0; for (let i = 0; i < raw.length; i++) peak = Math.max(peak, Math.abs(raw[i]));
  for (let f = 0; f < nF; f++) { let s = 0; for (let i = 0; i < win; i++) { const x = raw[f * hop + i]; s += x * x; } rms[f] = Math.sqrt(s / win); }
  const sorted = Array.from(rms).sort((a, b) => a - b); const floor = sorted[Math.floor(nF * 0.1)] || 1e-5; const maxR = sorted[nF - 1];
  if (maxR < 0.006) return { error: 'quiet', peak };
  const th = Math.max(floor * 3, maxR * 0.08);
  let on = rms.findIndex((r) => r > th); let off = nF - 1; while (off > on && rms[off] < th * 0.7) off--;
  if (on < 0) return { error: 'quiet', peak };
  // pitch per frame (normalised square difference, McLeod-style)
  const minLag = Math.floor(sr / 1000), maxLag = Math.ceil(sr / 65);
  const f0 = new Float32Array(nF), clar = new Float32Array(nF);
  for (let f = on; f <= off; f++) {
    const o = f * hop; if (o + win + maxLag >= raw.length) break;
    if (rms[f] < th * 0.6) continue;
    let best = 0, bestLag = 0; const nsdf = new Float32Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let ac = 0, m = 0;
      for (let i = 0; i < win; i++) { const a = raw[o + i], b = raw[o + i + lag]; ac += a * b; m += a * a + b * b; }
      nsdf[lag] = m > 0 ? 2 * ac / m : 0;
    }
    let mx = 0; for (let lag = minLag + 1; lag <= maxLag; lag++) mx = Math.max(mx, nsdf[lag]);
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1] && nsdf[lag] >= mx * 0.88) { best = nsdf[lag]; bestLag = lag; break; }
    }
    if (bestLag && best > 0.55) {
      const a = nsdf[bestLag - 1], b = nsdf[bestLag], c = nsdf[bestLag + 1]; const d = (a - c) / (2 * (a - 2 * b + c) || 1);
      f0[f] = sr / (bestLag + (Math.abs(d) < 1 ? d : 0)); clar[f] = best;
    }
  }
  // longest voiced run (allowing 2-frame gaps)
  let bs = -1, be = -1, cs = -1, gap = 0;
  for (let f = on; f <= off + 1; f++) {
    const v = f <= off && f0[f] > 0;
    if (v) { if (cs < 0) cs = f; gap = 0; if (f - cs > be - bs) { bs = cs; be = f; } }
    else if (cs >= 0) { if (++gap > 2) { cs = -1; gap = 0; } }
  }
  if (bs < 0 || be - bs < 12) return { error: 'novoice', peak };
  const vals = []; for (let f = bs; f <= be; f++) if (f0[f]) vals.push(f0[f]);
  vals.sort((a, b) => a - b); const fRef = vals[Math.floor(vals.length / 2)];
  // trimmed copy: from just before onset to end of voice
  const start = Math.max(0, on * hop - Math.round(sr * 0.015));
  const end = Math.min(raw.length, be * hop + win + Math.round(sr * 0.02));
  const data = raw.slice(start, end);
  // clear out everything well under the sung pitch (room rumble, mains hum, handling thumps):
  // it is not voice, and it gets louder than the note when the take is sung high
  { const k = Math.exp(-6.2832 * 0.6 * fRef / sr);
    for (let pass = 0; pass < 2; pass++) {
      let x1 = 0, y1 = 0; for (let i = 0; i < data.length; i++) { const x = data[i]; y1 = k * (y1 + x - x1); x1 = x; data[i] = y1; }
      x1 = 0; y1 = 0; for (let i = data.length - 1; i >= 0; i--) { const x = data[i]; y1 = k * (y1 + x - x1); x1 = x; data[i] = y1; }
    }
  }
  const vs = Math.max(0, bs * hop - start), ve = Math.min(data.length - 1, be * hop + win - start);
  // pitch marks (epochs): one per period, on the crest of the voice's fundamental.
  // Peaks are picked on a smoothed copy (zero-phase low-pass just above the pitch), because on the
  // raw wave the overtones make the tallest peak hop around inside the period, and uneven marks
  // come out as a warble when the take is sung.
  const smooth = (() => {
    const y = Float32Array.from(data), k = 1 - Math.exp(-6.2832 * 1.15 * fRef / sr);
    for (let pass = 0; pass < 2; pass++) {
      let z = 0; for (let i = 0; i < y.length; i++) { z += (y[i] - z) * k; y[i] = z; }
      z = 0; for (let i = y.length - 1; i >= 0; i--) { z += (y[i] - z) * k; y[i] = z; }
    }
    return y;
  })();
  const fAt = (pos) => { const f = Math.min(be, Math.max(bs, Math.round((pos + start) / hop))); return f0[f] || fRef; };
  let pos = 0, neg = 0; const mid0 = Math.floor((vs + ve) / 2); for (let i = mid0; i < Math.min(ve, mid0 + sr * 0.1); i++) { if (data[i] > pos) pos = data[i]; if (-data[i] > neg) neg = -data[i]; }
  const sg = pos >= neg ? 1 : -1;
  const ep = []; let T = sr / fAt(vs);
  let e = vs; { let bv = -1e9; for (let i = vs; i < Math.min(ve, vs + T); i++) if (sg * smooth[i] > bv) { bv = sg * smooth[i]; e = i; } }
  ep.push(e);
  while (true) {
    T = sr / fAt(e); const a = Math.floor(e + 0.75 * T), b = Math.ceil(e + 1.25 * T);
    if (b >= ve) break;
    let bi = a, bv = -1e9; for (let i = a; i <= b; i++) if (sg * smooth[i] > bv) { bv = sg * smooth[i]; bi = i; }
    ep.push(bi); e = bi;
  }
  // nudge each mark so its period lines up with the one before it (soft vowels have a broad, flat crest)
  { const R = Math.max(2, Math.round(sr * 0.00025));
    for (let j = 1; j < ep.length; j++) {
      const p0 = ep[j - 1], p1 = ep[j], h = Math.round((p1 - p0) / 2); let bd = 0, bc = -Infinity;
      if (p0 - h < 0 || p1 + h + R >= data.length) continue;
      for (let dl = -R; dl <= R; dl++) {
        let c = 0, m = 0; for (let i = -h; i <= h; i += 2) { const u = data[p0 + i], v = data[p1 + dl + i]; c += u * v; m += v * v; }
        c = c / Math.sqrt(m + 1e-12) - Math.abs(dl) * 1e-4; if (c > bc) { bc = c; bd = dl; }
      }
      ep[j] = p1 + bd;
    }
  }
  if (ep.length < 8) return { error: 'novoice', peak };
  // loudness normalise over the voiced part
  let ss = 0; for (let i = vs; i < ve; i++) ss += data[i] * data[i];
  const vr = Math.sqrt(ss / Math.max(1, ve - vs)); let dp = 0; for (let i = 0; i < data.length; i++) dp = Math.max(dp, Math.abs(data[i]));
  const gain = Math.min(0.13 / Math.max(vr, 1e-4), 0.95 / Math.max(dp, 1e-4));
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  // the part of the vowel that a held note loops over: the steady stretch around the middle.
  // (A fixed 35%..82% reached into the fade at the end of a take, so held notes swelled and sank.)
  const n = ep.length; let la = Math.floor(n * 0.35), lb = Math.max(la + 4, Math.floor(n * 0.82));
  { const pr = new Float32Array(n);
    for (let j = 1; j < n - 1; j++) { let q = 0; for (let i = ep[j - 1]; i < ep[j + 1]; i++) q += data[i] * data[i]; pr[j] = Math.sqrt(q / Math.max(1, ep[j + 1] - ep[j - 1])); }
    const mid = Array.from(pr.subarray(Math.floor(n * 0.3), Math.floor(n * 0.7))).sort((x, y) => x - y), med = mid[mid.length >> 1] || 0;
    const ok = (j) => pr[j] > med * 0.72 && pr[j] < med * 1.4;
    let c = n >> 1, a0 = c, b0 = c;
    while (a0 > Math.floor(n * 0.2) && ok(a0 - 1)) a0--;
    while (b0 < Math.floor(n * 0.9) && ok(b0 + 1)) b0++;
    if (b0 - a0 >= Math.max(12, n * 0.2)) { la = a0; lb = b0; }
  }
  return { data, sr, ep: Int32Array.from(ep), vs: ep[0], la, lb: Math.min(lb, n - 2), f0: fRef, peak, voicedSec: (ve - vs) / sr, consSec: vs / sr };
}

// How loud a take comes out at each note, relative to its own pitch -> make-up gain per semitone.
// Singing a take far above where it was recorded puts the harmonics between the formants,
// so without this the top of the keyboard is many times quieter than the middle.
const GT_LOW = 24, GT_N = 85, GT_MAX = 4, GT_MIN = 0.6;
function levelTable(a) {
  const { data, ep, sr } = a, grains = [];
  for (let i = 0; i < 6; i++) {
    const k = Math.min(ep.length - 2, Math.max(1, Math.round(a.la + (a.lb - a.la) * i / 5)));
    const L = Math.round((ep[k + 1] - ep[k - 1]) / 2), c = ep[k], g = new Float32Array(2 * L + 1);
    for (let j = -L; j <= L; j++) g[j + L] = (data[c + j] || 0) * (0.5 + 0.5 * Math.cos(Math.PI * j / L));
    grains.push(g);
  }
  const level = (f) => {
    let p = 0;
    for (const g of grains) for (let h = 1; h * f < Math.min(9000, sr / 2); h++) {
      if (h * f < 70) continue;
      const w = 6.2832 * h * f / sr; let re = 0, im = 0;
      for (let j = 0; j < g.length; j++) { re += g[j] * Math.cos(w * j); im += g[j] * Math.sin(w * j); }
      p += re * re + im * im;
    }
    return Math.sqrt(p / grains.length) * f / sr;
  };
  const ref = level(a.f0), gt = new Float32Array(GT_N);
  for (let m = 0; m < GT_N; m++) { const l = level(440 * Math.pow(2, (m + GT_LOW - 69) / 12)); gt[m] = Math.min(GT_MAX, Math.max(GT_MIN, ref / Math.max(l, 1e-9))); }
  return gt;
}

// ---------- worklets ----------
const WORKLET = `
const D = 1400;
class KoalaVoice extends AudioWorkletProcessor {
  constructor() { super(); this.bank = new Map(); this.N = 32768; this.R = new Float32Array(this.N); this.t = 0; this.slots = [];
    this.f0 = 220; this.f0T = 220; this.gl = 0.18; this.vD = 0; this.vDT = 0; this.vR = 5.6; this.vP = 0; this.q = 1; this.qT = 1; this.h = [0, 0, 0, 0]; this.pw = 0.0144; this.trim = 1;
    this.port.onmessage = (e) => this.msg(e.data); }
  msg(m) {
    if (m.type === 'syl') { const s = m.s; let h = 0; while (h < s.la && s.ep[h] - s.ep[0] < sampleRate * 0.14) h++; s.hs = h; this.bank.set(m.key, s); }
    else if (m.type === 'clear') this.bank.clear();
    else if (m.type === 'on') {
      const s = this.bank.get(m.key); if (!s) return;
      if (m.legato && this.slots.some((x) => x.gate)) { this.f0T = m.f0; if (m.same) return; }
      else { this.f0T = m.f0; this.f0 = m.f0 * 0.985; this.pw = 0.0144; }
      for (const x of this.slots) { x.gate = false; x.rel = 0.045; }
      this.slots.push(this.slot(s));
    } else if (m.type === 'off') { for (const x of this.slots) { x.gate = false; x.rel = 0.1; } }
    else if (m.type === 'f0') this.f0T = m.f0;
    else if (m.type === 'vib') { this.vDT = m.depth; if (m.rate) this.vR = m.rate; }
    else if (m.type === 'q') this.qT = m.q;
    else if (m.type === 'glide') this.gl = m.v;
    else if (m.type === 'panic') { this.slots = []; this.R.fill(0); }
  }
  slot(s) {
    const e0 = s.ep[0], T0 = s.ep[1] - s.ep[0];
    const rawEnd = e0 - T0;
    return { s, raw: 0, rawEnd, fade: T0, rawOn: rawEnd > 4, psola: rawEnd <= 4, next: null, ana: e0, k: 0, dir: 1, amp: rawEnd > 4 ? 0.3 : 0, gate: true, att: 0.006, rel: 0.1, dead: false };
  }
  grains(x, t0, n, sr) {
    const s = x.s, d = s.data, ep = s.ep, R = this.R, N = this.N;
    if (x.next === null) x.next = t0;
    while (x.next < t0 + n) {
      this.f0 += (this.f0T - this.f0) * this.gl;
      const f = this.f0 * Math.pow(2, this.vD * Math.sin(this.vP + (x.next - t0) / sr * 6.2832 * this.vR) / 1200);
      const To = sr / f;
      let k = x.k;
      while (k + 1 < ep.length && Math.abs(ep[k + 1] - x.ana) <= Math.abs(ep[k] - x.ana)) k++;
      while (k > 0 && Math.abs(ep[k - 1] - x.ana) < Math.abs(ep[k] - x.ana)) k--;
      x.k = k;
      const c = ep[k];
      const Ta = k > 0 && k + 1 < ep.length ? (ep[k + 1] - ep[k - 1]) / 2 : (k + 1 < ep.length ? ep[k + 1] - ep[k] : ep[k] - ep[k - 1]);
      const q = this.q; const L = Math.min(D - 8, Math.max(8, Math.floor(Ta / q)));
      if (!x.rawOn) { const tc = x.gate ? x.att : x.rel; x.amp += ((x.gate ? 1 : 0) - x.amp) * (1 - Math.exp(-To / (tc * sr))); }
      // level: a take sung far above its own pitch loses most of its energy, so make it up (table from levelTable)
      let mk = 1; if (s.gt) { const m = Math.min(s.gt.length - 1.001, Math.max(0, 69 + 12 * Math.log2(f / 440) - s.gm)), m0 = Math.floor(m); mk = s.gt[m0] + (s.gt[m0 + 1] - s.gt[m0]) * (m - m0); }
      const g = x.amp * mk;
      // Far above the take's own pitch the note lands between the take's overtones, where every
      // period of the recording answers a little differently, and that comes out as hiss around the
      // note. So up there, move through the held vowel slowly and blend each period into the next.
      const r = Ta / To, held = x.ana >= ep[s.hs];
      const sp = held && r > 1.2 ? Math.max(1 / 30, Math.pow(1.2 / r, 3)) : 1;
      let c2 = -1, a2 = 0;
      if (r > 1.2) { const k0 = ep[k] <= x.ana ? k : k - 1; if (k0 >= 0 && k0 + 1 < ep.length) { a2 = Math.min(1, Math.max(0, (x.ana - ep[k0]) / (ep[k0 + 1] - ep[k0]))); c2 = ep[k0 + 1]; x.c1 = ep[k0]; } }
      if (g > 1e-5) {
        // place each grain at its exact (fractional) time: whole-sample rounding made high notes rough
        const fl = Math.floor(x.next), fr = x.next - fl, base = fl + D;
        const c1 = c2 >= 0 ? x.c1 : c, g1 = c2 >= 0 ? g * (1 - a2) : g, g2 = g * a2;
        for (let j = -L; j <= L + 1; j++) {
          const u = j - fr; if (u < -L || u > L) continue;
          const w = 0.5 + 0.5 * Math.cos(Math.PI * u / L);
          let src = c1 + u * q, i0 = Math.floor(src), v = 0;
          if (i0 >= 0 && i0 + 1 < d.length) v = (d[i0] + (d[i0 + 1] - d[i0]) * (src - i0)) * g1;
          if (g2 > 0) { src = c2 + u * q; i0 = Math.floor(src); if (i0 >= 0 && i0 + 1 < d.length) v += (d[i0] + (d[i0 + 1] - d[i0]) * (src - i0)) * g2; }
          R[(base + j) % N] += v * w;
        }
      }
      x.next += To;
      x.ana += To * x.dir * sp;
      const la = ep[s.la], lb = ep[s.lb], last = ep[ep.length - 1];
      if (x.gate) { if (x.dir > 0 && x.ana > lb) x.dir = -1; else if (x.dir < 0 && x.ana < la) x.dir = 1; }
      else if (x.dir < 0) x.dir = 1;
      if (x.ana > last) x.ana = last;
      if (!x.gate && x.amp < 1e-4) { x.dead = true; break; }
    }
  }
  process(_, outs) {
    const out = outs[0][0]; if (!out) return true;
    const n = out.length, sr = sampleRate, R = this.R, N = this.N, t0 = this.t;
    this.vD += (this.vDT - this.vD) * 0.06; this.q += (this.qT - this.q) * 0.1;
    for (const x of this.slots) {
      if (x.rawOn) {
        const d = x.s.data; const ca = 1 - Math.exp(-1 / (x.att * sr)), cr = 1 - Math.exp(-1 / (x.rel * sr));
        for (let i = 0; i < n; i++) {
          const p = x.raw; const g = p < x.rawEnd ? 1 : 1 - (p - x.rawEnd) / x.fade;
          if (g <= 0 || p >= d.length) { x.rawOn = false; break; }
          x.amp += ((x.gate ? 1 : 0) - x.amp) * (x.gate ? ca : cr);
          R[(t0 + i + D) % N] += d[p] * g * x.amp;
          if (p === x.rawEnd) { x.psola = true; x.next = t0 + i + x.fade; x.ana = x.s.ep[0]; }
          x.raw++;
        }
        if (!x.gate && x.amp < 1e-4) x.dead = true;
      }
      if (x.psola && !x.dead) this.grains(x, t0, n, sr);
    }
    this.vP += 6.2832 * this.vR * n / sr;
    this.slots = this.slots.filter((x) => !x.dead);
    const hc = Math.exp(-6.2832 * Math.min(160, Math.max(35, this.f0 * 0.45)) / sr), h = this.h;
    for (let i = 0; i < n; i++) {
      const k = (t0 + i) % N; const v = R[k]; R[k] = 0;
      const y1 = hc * (h[1] + v - h[0]); h[0] = v; h[1] = y1;
      const y2 = hc * (h[3] + y1 - h[2]); h[2] = y1; h[3] = y2;
      out[i] = y2;
    }
    // leveller: the make-up table is only a first guess (how loud a note lands depends on which
    // part of the vowel is sounding), so ride the level gently towards one loudness while a note is held
    let bp = 0; for (let i = 0; i < n; i++) bp += out[i] * out[i]; bp /= n;
    if (bp > 2e-5 && this.slots.some((x) => x.gate && x.psola)) this.pw += (bp - this.pw) * (1 - Math.exp(-n / (0.05 * sr)));
    const want = Math.min(3, Math.max(0.4, 0.12 / Math.sqrt(this.pw))), t1 = this.trim;
    const t2 = t1 + (want - t1) * (1 - Math.exp(-n / ((want < t1 ? 0.03 : 0.12) * sr)));
    for (let i = 0; i < n; i++) out[i] *= t1 + (t2 - t1) * i / n;
    this.trim = t2;
    this.t += n;
    return true;
  }
}
registerProcessor('koala-voice', KoalaVoice);
class KwlRec extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.port.onmessage = (e) => { this.on = !!e.data.on; }; }
  process(ins) { const x = ins[0] && ins[0][0]; if (x && this.on) this.port.postMessage(x.slice(0)); return true; }
}
registerProcessor('kwl-rec', KwlRec);
`;
const loaded = new WeakMap();
function loadWorklet(ctx) {
  if (!loaded.has(ctx)) loaded.set(ctx, ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))));
  return loaded.get(ctx);
}
class Engine {
  constructor(ctx) {
    this.ctx = ctx; this.keys = new Set(); this.info = {};
    this.node = new AudioWorkletNode(ctx, 'koala-voice', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
  }
  load(key, a) {
    const s = { data: a.data, ep: a.ep, la: a.la, lb: a.lb, gt: levelTable(a), gm: GT_LOW };
    this.node.port.postMessage({ type: 'syl', key, s }); this.keys.add(key); this.info[key] = { f0: a.f0, consSec: a.consSec, voicedSec: a.voicedSec };
  }
  has(key) { return this.keys.has(key); }
  pick(key) { if (this.has(key)) return key; const [, v] = split(key); if (key === 'n') return this.has('n') ? 'n' : (this.has('u') ? 'u' : null); return this.has(v) ? v : null; }
  on(key, f0, legato, same) { this.node.port.postMessage({ type: 'on', key, f0, legato: !!legato, same: !!same }); }
  off() { this.node.port.postMessage({ type: 'off' }); }
  f0(f) { this.node.port.postMessage({ type: 'f0', f0: f }); }
  vib(depth, rate) { this.node.port.postMessage({ type: 'vib', depth, rate }); }
  tone(q) { this.node.port.postMessage({ type: 'q', q }); }
  glide(v) { this.node.port.postMessage({ type: 'glide', v }); }
  panic() { this.node.port.postMessage({ type: 'panic' }); }
  connect(dest) { this.node.connect(dest); return dest; }
}

// ---------- storage ----------
const DBN = 'kwl-koala-voice', ST = 'takes';
function idb() {
  return new Promise((res, rej) => {
    try { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (e) { rej(e); }
  });
}
const db = {
  async put(key, pcm, sr, meta) { const d = await idb(); return new Promise((res, rej) => { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).put({ pcm, sr, meta: meta || {}, ts: Date.now() }, key); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }); },
  async del(key) { const d = await idb(); return new Promise((res) => { const tx = d.transaction(ST, 'readwrite'); tx.objectStore(ST).delete(key); tx.oncomplete = () => res(true); }); },
  async all() {
    const d = await idb(); return new Promise((res, rej) => {
      const out = {}; const tx = d.transaction(ST, 'readonly'); const c = tx.objectStore(ST).openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; c.onerror = () => rej(c.error);
    });
  }
};

// ---------- wav ----------
async function resample(pcm, sr, to) {
  if (sr === to) return pcm;
  const len = Math.ceil(pcm.length * to / sr);
  const oc = new OfflineAudioContext(1, len, to); const b = oc.createBuffer(1, pcm.length, sr); b.copyToChannel(pcm, 0);
  const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
  return (await oc.startRendering()).getChannelData(0);
}
async function exportWav(takes) {
  const slot = Math.round(SLOT_SEC * EXPORT_SR), total = slot * KEYS.length;
  const pcm = new Float32Array(total);
  for (let i = 0; i < KEYS.length; i++) {
    const t = takes[KEYS[i]]; if (!t) continue;
    const r = await resample(t.pcm, t.sr, EXPORT_SR);
    pcm.set(r.subarray(0, slot), i * slot);
  }
  const buf = new ArrayBuffer(44 + total * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, EXPORT_SR, true); v.setUint32(28, EXPORT_SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) { const x = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, x < 0 ? x * 32768 : x * 32767, true); }
  return new Blob([buf], { type: 'audio/wav' });
}
// published bank -> {key: {pcm, sr}}
async function loadWav(url, ctx) {
  const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error('no bank');
  const ab = await r.arrayBuffer(); const buf = await ctx.decodeAudioData(ab);
  const d = buf.getChannelData(0), sr = buf.sampleRate, slot = Math.round(SLOT_SEC * sr), out = {};
  KEYS.forEach((k, i) => {
    const seg = d.slice(i * slot, Math.min(d.length, (i + 1) * slot));
    let pk = 0; for (let j = 0; j < seg.length; j += 4) pk = Math.max(pk, Math.abs(seg[j]));
    if (pk > 0.004) out[k] = { pcm: seg, sr };
  });
  return out;
}
// takes -> engine (resampling to the context rate first)
async function fill(engine, takes, onEach) {
  const sr = engine.ctx.sampleRate; let ok = 0;
  for (const k of KEYS) {
    const t = takes[k]; if (!t) continue;
    const pcm = await resample(t.pcm, t.sr, sr);
    const a = analyze(pcm, sr);
    if (!a.error) { engine.load(k, a); ok++; }
    onEach && onEach(k, a);
  }
  return ok;
}

G.KoalaVB = { SYLS, KEYS, KANA, SLOT_SEC, EXPORT_SR, parseLyric, split, analyze, loadWorklet, Engine, db, exportWav, loadWav, fill, resample, levelTable };
})(window);
