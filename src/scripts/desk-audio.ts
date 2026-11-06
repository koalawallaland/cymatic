// Quiet object sounds, started only by a visitor's interaction.
export function deskAudio(enabled: () => boolean) {
  let ctx: AudioContext | undefined;
  let pouring: { source: AudioBufferSourceNode; gain: GainNode } | undefined;
  function context() {
    if (!enabled()) return;
    ctx ??= new AudioContext();
    void ctx.resume();
    return ctx;
  }
  function tap(kind: 'switch' | 'lift' | 'glass' | 'sip' | 'paper') {
    const c = context(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    const f = { switch: 720, lift: 350, glass: 1580, sip: 460, paper: 180 }[kind];
    o.type = kind === 'switch' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .7, t + .12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(kind === 'glass' ? .045 : .025, t + .004);
    g.gain.exponentialRampToValueAtTime(.0001, t + .18);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .2);
  }
  function stopPour() {
    if (!pouring || !ctx) return;
    const { source, gain } = pouring; pouring = undefined;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, .03);
    source.stop(ctx.currentTime + .15);
  }
  function startPour() {
    if (pouring) return;
    const c = context(); if (!c) return;
    const buffer = c.createBuffer(1, c.sampleRate, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = buffer; source.loop = true; filter.type = 'bandpass'; filter.frequency.value = 1250; filter.Q.value = .6;
    gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(.035, c.currentTime + .15);
    source.connect(filter); filter.connect(gain); gain.connect(c.destination); source.start();
    pouring = { source, gain };
  }
  return { tap, startPour, stopPour, close() { stopPour(); void ctx?.close(); ctx = undefined; } };
}
