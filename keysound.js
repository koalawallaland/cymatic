/* Keyboard sounds for Koala Walla Land, built live with Web Audio (no sample files).
   A keystroke is layered: bottom-out noise, case body, keycap partials, then a quieter
   upstroke. Key width, cap material and position on the board all change the result. */
(function () {
  const PROFILES = {
    creamy: { label: 'Creamy', body: [215, 104], bodyDur: .08, bodyG: .62, nF: 1150, nQ: .9, nG: .5, nDur: .045, caps: [620, 1180], capG: .16, capDur: .036, upF: 1700, upG: .13, upDelay: .085, lp: 4800 },
    topre: { label: 'Topre thock', body: [168, 84], bodyDur: .115, bodyG: .72, nF: 720, nQ: .7, nG: .5, nDur: .072, caps: [440, 890], capG: .2, capDur: .052, upF: 1050, upG: .22, upDelay: .1, lp: 3000 },
    clicky: { label: 'Clicky', body: [262, 150], bodyDur: .05, bodyG: .36, nF: 2400, nQ: 1.2, nG: .42, nDur: .03, caps: [1450, 2650], capG: .16, capDur: .024, upF: 3600, upG: .3, upDelay: .07, lp: 9000, click: true },
    velvet: { label: 'Velvet thock', body: [142, 72], bodyDur: .13, bodyG: .78, nF: 520, nQ: .6, nG: .4, nDur: .082, caps: [360, 720], capG: .12, capDur: .06, upF: 820, upG: .13, upDelay: .105, lp: 2300 },
    bump: { label: 'Tactile bump', body: [236, 128], bodyDur: .07, bodyG: .56, nF: 1500, nQ: 1.3, nG: .46, nDur: .036, caps: [800, 1520], capG: .18, capDur: .034, upF: 2000, upG: .19, upDelay: .08, lp: 5600 },
    silk: { label: 'Silk linear', body: [200, 110], bodyDur: .07, bodyG: .5, nF: 950, nQ: .6, nG: .3, nDur: .04, caps: [540, 1000], capG: .1, capDur: .03, upF: 1400, upG: .08, upDelay: .09, lp: 4000 },
    pop: { label: 'Bubble pop', body: [300, 190], bodyDur: .045, bodyG: .44, nF: 1800, nQ: 1.6, nG: .48, nDur: .028, caps: [1100, 2100], capG: .22, capDur: .03, upF: 2400, upG: .2, upDelay: .07, lp: 7000 },
    marble: { label: 'Marble clack', body: [320, 180], bodyDur: .04, bodyG: .36, nF: 2000, nQ: 2, nG: .6, nDur: .025, caps: [1500, 2900, 4300], capG: .24, capDur: .05, upF: 2600, upG: .12, upDelay: .075, lp: 9000 },
  };
  const KEY = 'kwl-keysound';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const saved = read();
  const clampVol = (v) => { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; };
  const state = { on: saved.on !== false, profile: PROFILES[saved.profile] ? saved.profile : 'creamy', volume: clampVol(saved.volume ?? 1) };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  const noiseFor = new WeakMap();
  function noiseBuffer(ctx) {
    let b = noiseFor.get(ctx);
    if (b) return b;
    b = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseFor.set(ctx, b);
    return b;
  }
  function env(g, t, peak, dur, attack = .001) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, .0002), t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + attack + dur);
  }
  function noise(ctx, out, t, { f, q = 1, gain, dur, type = 'bandpass', sweep }) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(ctx); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    env(g, t, gain, dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * .4); s.stop(t + dur + .02);
  }
  function tone(ctx, out, t, { f, to, gain, dur, type = 'sine' }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, gain, dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + .02);
  }
  const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 1009; return h / 1009; };

  // one full keystroke, drawn into any audio context (the page's, or an offline one in a test)
  function keystroke(ctx, out, t, o = {}) {
    const p = PROFILES[o.profile] || PROFILES[state.profile], w = o.w || 1, vel = (o.vel ?? 1) * (.88 + Math.random() * .24);
    const seed = hash(o.code || 'x'), detune = 1 + (seed - .5) * .1 + (Math.random() - .5) * .018, size = 1 / (1 + .11 * (w - 1));
    const bare = o.cap === 'none', resin = o.cap === 'resin';
    const bus = ctx.createBiquadFilter(); bus.type = 'lowpass'; bus.frequency.value = bare ? 7000 : p.lp;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.max(-.7, Math.min(.7, o.x || 0)); bus.connect(pan); pan.connect(out); } else bus.connect(out);

    if (p.click) { noise(ctx, bus, t - .012 > 0 ? t - .012 : t, { f: 5200, q: 2.4, gain: .46 * vel, dur: .008 }); tone(ctx, bus, t, { f: 3200, gain: .12 * vel, dur: .012, type: 'square' }); }
    if (bare) {
      // no cap on it: a thin, hollow plastic tick right off the switch
      noise(ctx, bus, t, { f: 3100, q: 2.2, gain: .42 * vel, dur: .018 });
      tone(ctx, bus, t, { f: 620 * detune, to: 420, gain: .16 * vel, dur: .03 });
    } else {
      noise(ctx, bus, t, { f: p.nF * detune * size, q: p.nQ, gain: p.nG * vel, dur: p.nDur });
      tone(ctx, bus, t, { f: p.body[0] * detune * size, to: p.body[1] * size, gain: p.bodyG * vel, dur: p.bodyDur * (1 + (w - 1) * .1) });
      p.caps.forEach((f, i) => tone(ctx, bus, t + .001, { f: f * detune * size * (resin ? 1.16 : 1), gain: (p.capG / (i + 1)) * vel * (resin ? 1.7 : 1), dur: p.capDur * (resin ? 1.7 : 1), type: i ? 'triangle' : 'sine' }));
      if (w >= 2) {
        // stabilizers: an extra low knock and a soft wire rattle on wide keys
        noise(ctx, bus, t + .003, { f: 520 * size, q: 1.1, gain: .32 * vel, dur: .05 });
        noise(ctx, bus, t + .03, { f: 2700, q: 3, gain: .05 * vel, dur: .012 });
        noise(ctx, bus, t + .05, { f: 2300, q: 3, gain: .028 * vel, dur: .01 });
      }
    }
    const up = t + p.upDelay + Math.random() * .012;
    noise(ctx, bus, up, { f: p.upF * detune, q: 1.5, gain: p.upG * vel * (bare ? .6 : 1), dur: .018 });
    if (o.profile === 'topre' || (!o.profile && state.profile === 'topre')) tone(ctx, bus, up, { f: 240 * detune, to: 390, gain: .14 * vel, dur: .035 });
  }

  // caps landing in things, and being pulled off
  const RING = {
    ceramic: { parts: [1870, 2930, 4410, 6100], decay: .24, gain: .16, bounces: [[.085, .42], [.14, .18]] },
    lacquer: { parts: [920, 1560, 2640], decay: .1, gain: .22, bounces: [[.07, .36]] },
    silver: { parts: [2210, 3470, 5130, 7340, 9010], decay: .85, gain: .11, bounces: [[.115, .5], [.2, .24], [.26, .1]] },
    socket: { parts: [1400, 2500], decay: .03, gain: .22, bounces: [] },
  };
  function landing(ctx, out, t, kind) {
    const r = RING[kind] || RING.ceramic;
    [[0, 1], ...r.bounces].forEach(([at, amt]) => {
      noise(ctx, out, t + at, { f: 3300, q: .9, gain: .2 * amt, dur: .012 });
      r.parts.forEach((f, i) => tone(ctx, out, t + at, { f: f * (1 + (Math.random() - .5) * .006), gain: (r.gain * amt) / (1 + i * .55), dur: r.decay * (1 - i * .12) * (amt < 1 ? .75 : 1) }));
    });
    if (kind === 'socket') tone(ctx, out, t, { f: 190, to: 110, gain: .34, dur: .05 });
  }
  function pull(ctx, out, t) {
    noise(ctx, out, t, { f: 700, sweep: 2600, q: 1.4, gain: .17, dur: .05 });
    tone(ctx, out, t + .045, { f: 520, to: 980, gain: .3, dur: .035 });
    noise(ctx, out, t + .05, { f: 3800, q: 2, gain: .16, dur: .012 });
  }
  function whoosh(ctx, out, t) { noise(ctx, out, t, { f: 500, sweep: 3200, q: .7, gain: .1, dur: .16 }); }
  function nope(ctx, out, t) { tone(ctx, out, t, { f: 150, to: 90, gain: .3, dur: .08 }); noise(ctx, out, t, { f: 900, q: 1, gain: .12, dur: .02 }); }

  let ctx = null, out = null, masterGain = null;
  const BASE_GAIN = .8;
  function ensure(force) {
    if (!state.on && !force) return null;
    try {
      if (!ctx) {
        // lets sound play with the iPhone's silent switch on, where Safari supports it
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .002; comp.release.value = .12;
        const master = masterGain = ctx.createGain(); master.gain.value = BASE_GAIN * state.volume;
        out = ctx.createGain();
        out.connect(comp);
        // a small, dark room around the board
        const len = Math.floor(ctx.sampleRate * .22), ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let last = 0; for (let i = 0; i < len; i++) { last += .25 * ((Math.random() * 2 - 1) - last); d[i] = last * Math.pow(1 - i / len, 3.2); } }
        const room = ctx.createConvolver(); room.buffer = ir;
        const wet = ctx.createGain(); wet.gain.value = .16;
        out.connect(room); room.connect(wet); wet.connect(comp);
        comp.connect(master); master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch { return null; }
  }
  const play = (fn) => (...a) => { const c = ensure(); if (c) { api.count++; fn(c, out, c.currentTime + .002, ...a); } };
  // Safari only starts audio from a finished tap or a key, so wake it on the first one
  ['pointerup', 'keydown', 'touchend'].forEach((n) => addEventListener(n, () => ensure(), { capture: true, passive: true }));

  const api = {
    PROFILES, count: 0, keystroke, landing, pull,
    get on() { return state.on; },
    set on(v) { state.on = !!v; save(); },
    get profile() { return state.profile; },
    set profile(v) { if (PROFILES[v]) { state.profile = v; save(); } },
    get volume() { return state.volume; },
    set volume(v) { state.volume = clampVol(v); save(); if (masterGain) masterGain.gain.value = BASE_GAIN * state.volume; },
    key: play((c, o, t, opts) => keystroke(c, o, t, opts)),
    // the lab has its own sound button, so it doesn't follow the home board's mute
    labKey(opts) { const c = ensure(true); if (c) { api.count++; keystroke(c, out, c.currentTime + .002, opts); } },
    land: play((c, o, t, kind) => landing(c, o, t, kind)),
    pop: play((c, o, t) => pull(c, o, t)),
    swish: play((c, o, t) => whoosh(c, o, t)),
    thud: play((c, o, t) => nope(c, o, t)),
  };
  window.KWLKeys = api;

  // Any sound picker on the page gets every profile and a volume slider.
  if (typeof document !== 'undefined') {
    document.querySelectorAll('select[data-profile]').forEach((select) => {
      const have = new Set([...select.options].map((o) => o.value));
      for (const [id, p] of Object.entries(PROFILES)) {
        if (have.has(id)) continue;
        const option = document.createElement('option');
        option.value = id; option.textContent = p.label;
        for (const a of select.options[0]?.attributes || []) if (a.name.startsWith('data-astro-cid')) option.setAttribute(a.name, '');
        select.append(option);
      }
      select.value = state.profile;
      select.addEventListener('change', () => { api.profile = select.value; api.key({ code: 'KeyA' }); });
      if (select.parentElement.querySelector('[data-kwl-volume]')) return;
      const label = document.createElement('label');
      label.style.cssText = 'display:inline-flex;align-items:center;gap:.4rem;font:inherit;font-size:.8em';
      const text = document.createElement('span'); text.textContent = 'volume';
      const range = document.createElement('input');
      range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '.05'; range.value = String(state.volume);
      range.setAttribute('data-kwl-volume', ''); range.setAttribute('aria-label', 'Keyboard sound volume');
      range.style.cssText = 'width:6.5rem;min-height:32px;accent-color:var(--kwl-pink,#ff7ab8)';
      range.addEventListener('input', () => { api.volume = range.value; });
      range.addEventListener('change', () => api.key({ code: 'KeyA' }));
      label.append(text, range); select.after(label);
    });
  }
})();
