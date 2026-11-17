(() => {
  "use strict";

  const panel = document.querySelector("[data-dt-magnetic]");
  if (!panel) return;
  const spiro = panel.closest("dialog");
  const get = (name) => panel.querySelector(`[data-dt-magnetic-${name}]`);
  const start = get("start");
  const tone = get("tone");
  const status = get("status");
  const metrics = get("metrics");
  const label = get("label");
  const value = get("value");
  const repeat = get("repeat");
  const rate = get("rate");
  const pitchRow = get("audio");
  const pitchLabel = get("audio-label");
  const pitchValue = get("pitch");
  const dial = spiro.querySelector("[data-dt-magnetic-dial]");
  const Audio = window.AudioContext || window.webkitAudioContext;
  const idle = status.textContent;
  let run = null;
  let audio = null;
  let preferCompass = false;

  function repeatRate(samples) {
    if (samples.length < 40) return null;
    const first = samples[0].time;
    const span = samples.at(-1).time - first;
    if (span < 4200) return null;

    // Interpolate timestamped samples before comparing the waveform to itself at each lag.
    const step = Math.max(1000 / 30, span / (samples.length - 1));
    const count = Math.floor(span / step) + 1;
    const waveform = new Float64Array(count);
    let right = 1;
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const time = first + i * step;
      while (right < samples.length - 1 && samples[right].time < time) right++;
      const before = samples[right - 1];
      const after = samples[right];
      const phase = (time - before.time) / (after.time - before.time);
      waveform[i] = before.strength + phase * (after.strength - before.strength);
      sum += waveform[i];
    }
    const center = (count - 1) / 2;
    const mean = sum / count;
    let slopeNumerator = 0;
    let slopeDenominator = 0;
    for (let i = 0; i < count; i++) {
      slopeNumerator += (i - center) * (waveform[i] - mean);
      slopeDenominator += (i - center) ** 2;
    }
    const slope = slopeNumerator / slopeDenominator;
    let energy = 0;
    for (let i = 0; i < count; i++) {
      waveform[i] -= mean + slope * (i - center);
      energy += waveform[i] ** 2;
    }
    if (Math.sqrt(energy / count) < .22) return null;

    const shortest = Math.max(3, Math.ceil(1000 / (8 * step)));
    const longest = Math.min(Math.floor(count / 3), Math.floor(1000 / (.65 * step)));
    const correlations = new Float64Array(longest + 2);
    for (let lag = shortest - 1; lag <= longest + 1; lag++) {
      let overlap = 0;
      let earlier = 0;
      let later = 0;
      for (let i = lag; i < count; i++) {
        const a = waveform[i - lag];
        const b = waveform[i];
        overlap += a * b;
        earlier += a * a;
        later += b * b;
      }
      correlations[lag] = overlap / Math.sqrt(earlier * later);
    }

    const peaks = [];
    for (let lag = shortest; lag <= longest; lag++) {
      const score = correlations[lag];
      if (score >= .78 && score > correlations[lag - 1] && score >= correlations[lag + 1]) {
        peaks.push(lag);
      }
    }
    const best = Math.max(...peaks.map((lag) => correlations[lag]));
    const lag = peaks.find((peak) => correlations[peak] >= best * .94);
    if (lag === undefined) return null;
    const left = correlations[lag - 1];
    const middle = correlations[lag];
    const rightScore = correlations[lag + 1];
    const offset = .5 * (left - rightScore) / (left - 2 * middle + rightScore);
    return 1000 / (step * (lag + offset));
  }

  function stopTone() {
    tone.setAttribute("aria-pressed", "false");
    pitchRow.hidden = true;
    if (!audio) return;
    const { context } = audio;
    audio = null;
    context.close().catch(() => {});
  }

  function stop(message = idle) {
    if (run) {
      const previous = run;
      run = null;
      previous.controller.abort();
      previous.sensor?.stop();
      clearTimeout(previous.timer);
    }
    start.textContent = "Start tuning";
    delete start.dataset.active;
    metrics.hidden = true;
    dial.hidden = true;
    tone.hidden = true;
    stopTone();
    status.textContent = message;
  }

  function tonePitch(session) {
    if (session.source === "compass") {
      return 220 * 2 ** (.5 * Math.sin(session.heading * Math.PI / 180));
    }
    const hz = session.hz;
    return hz ? hz * 2 ** Math.ceil(Math.log2(120 / hz)) : null;
  }

  function updateTone(session) {
    if (!audio) return;
    const { context, oscillator, gain } = audio;
    const pitch = tonePitch(session);
    const time = context.currentTime;
    if (pitch) oscillator.frequency.setTargetAtTime(pitch, time, .075);
    gain.gain.setTargetAtTime(pitch ? .035 : 0, time, .05);
    pitchValue.textContent = pitch ? `${Math.round(pitch)} Hz` : "Waiting for a repeat";
  }

  tone.addEventListener("click", async () => {
    if (audio) {
      stopTone();
      return;
    }
    if (!run?.source || !Audio) return;
    const session = run;
    let context;
    try {
      context = new Audio();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      audio = { context, oscillator, gain };
      tone.setAttribute("aria-pressed", "true");
      pitchRow.hidden = false;
      await context.resume();
      if (audio?.context === context) updateTone(session);
    } catch {
      if (audio?.context === context) stopTone();
      else if (context && context.state !== "closed") context.close().catch(() => {});
      if (run === session) {
        status.textContent = "Sound could not start in this browser.";
      }
    }
  });

  function closeRates(a, b) {
    return a !== null && b !== null && Math.abs(a - b) <= Math.max(.14, a * .07);
  }

  function lockRepeat(session, estimate, time) {
    if (closeRates(session.hz, estimate)) {
      session.hz += (estimate - session.hz) * .2;
      session.lockUntil = time + 1600;
      session.candidate = null;
    } else if (closeRates(session.candidate, estimate)) {
      session.hz = (session.candidate + estimate) / 2;
      session.lockUntil = time + 1600;
      session.candidate = null;
    } else {
      session.candidate = estimate;
      if (time >= session.lockUntil) session.hz = null;
    }
  }

  function resetField(session) {
    session.samples.length = 0;
    session.hz = null;
    session.candidate = null;
    session.baseline = undefined;
    session.gearHeading = undefined;
    session.nextEstimate = -Infinity;
    session.lockUntil = -Infinity;
  }

  function recordStrength(session, strength, time) {
    const previous = session.samples.at(-1);
    if (previous && time <= previous.time) return;
    if (previous && time - previous.time > 300) resetField(session);
    session.samples.push({ time, strength });
    while (session.samples[0].time < time - 5600) session.samples.shift();
    if (time >= session.nextEstimate) {
      lockRepeat(session, repeatRate(session.samples), time);
      session.nextEstimate = time + 500;
      clearTimeout(session.timer);
      session.timer = setTimeout(() => {
        if (run !== session) return;
        resetField(session);
        dial.hidden = true;
        value.textContent = "—";
        rate.textContent = "Waiting for a reading";
        updateTone(session);
      }, 1700);
    }
  }

  function accept(session, source, heading, strength, time) {
    if (run !== session) return;
    if (!session.source) {
      clearTimeout(session.timer);
      session.source = source;
      metrics.hidden = false;
      tone.hidden = !Audio;
      const compass = source === "compass";
      label.textContent = compass ? "Compass heading" : "Field strength";
      repeat.hidden = compass;
      pitchLabel.textContent = compass ? "Pitch mapped from heading" : "Audible octave";
      status.textContent = compass
        ? "Compass locked. Turn your device to roll the gear."
        : "Magnetometer active. Nearby field changes move the gear.";
    }

    let deflection = 0;
    if (source === "field") {
      recordStrength(session, strength, time);
      const baseline = session.baseline ?? strength;
      session.baseline = baseline + (strength - baseline) * .035;
      deflection = Math.max(-24, Math.min(24, (strength - baseline) * 3));
    }
    if (Number.isFinite(heading)) {
      dial.hidden = false;
      dial.style.setProperty("--dt-heading", `${heading.toFixed(1)}deg`);
      session.heading = heading;
    } else {
      dial.hidden = true;
    }

    const targetAngle = (heading ?? 0) + deflection;
    const previous = session.gearHeading ?? targetAngle;
    const degrees = ((targetAngle - previous + 540) % 360) - 180;
    if (session.gearHeading === undefined || Math.abs(degrees) >= 2) {
      session.gearHeading = targetAngle;
      if (degrees) {
        spiro.dispatchEvent(new CustomEvent("desk-magnetic-turn", { detail: degrees * Math.PI / 180 }));
      }
    }

    if (time < session.nextPaint) return;
    session.nextPaint = time + 95;
    value.textContent = source === "compass"
      ? `${Math.round(heading) % 360}°`
      : `${strength.toFixed(1)} µT`;
    if (source === "field") {
      rate.textContent = session.hz !== null
        ? `${session.hz.toFixed(2)} Hz · Locked`
        : session.candidate !== null ? "Locking on…" : "Looking for a repeat";
    }
    updateTone(session);
  }

  async function startCompass(session) {
    const Orientation = window.DeviceOrientationEvent;
    if (!Orientation) {
      if (run === session) stop("This browser does not expose a magnetic sensor.");
      return;
    }
    if (typeof Orientation.requestPermission === "function") {
      try {
        const permission = await Orientation.requestPermission(true);
        if (run !== session) return;
        if (permission !== "granted") {
          stop("Allow Motion & Orientation Access to tune with the compass.");
          return;
        }
      } catch {
        if (run === session) stop("Open in your phone’s browser tab to allow compass access.");
        return;
      }
    }
    if (run !== session) return;
    status.textContent = "Looking for the compass. Turn your device slightly.";
    const headingReading = (event) => {
      const direct = event.webkitCompassHeading;
      if (Number.isFinite(direct) && direct >= 0 && direct <= 360 && !(event.webkitCompassAccuracy < 0)) {
        accept(session, "compass", direct % 360, null, performance.now());
      } else if (event.absolute && Number.isFinite(event.alpha)) {
        accept(session, "compass", (360 - event.alpha + 360) % 360, null, performance.now());
      }
    };
    const options = { signal: session.controller.signal };
    window.addEventListener("deviceorientation", headingReading, options);
    window.addEventListener("deviceorientationabsolute", headingReading, options);
    session.timer = setTimeout(() => {
      if (run === session && !session.source) stop("No compass reading arrived. Try opening the desk in your phone’s browser.");
    }, 5200);
  }

  function startField(session) {
    function fallBack() {
      if (run !== session) return;
      const retryNeedsTap = typeof window.DeviceOrientationEvent?.requestPermission === "function"
        && !navigator.userActivation?.isActive;
      if (session.source || retryNeedsTap) {
        preferCompass = true;
        stop("The field sensor stopped. Tap Start tuning for the compass.");
        return;
      }
      const previous = session.sensor;
      session.sensor = null;
      previous?.stop();
      clearTimeout(session.timer);
      void startCompass(session);
    }

    try {
      const sensor = new window.Magnetometer({ frequency: 30 });
      session.sensor = sensor;
      const options = { signal: session.controller.signal };
      sensor.addEventListener("reading", () => {
        if (session.sensor !== sensor) return;
        const { x, y, z, timestamp } = sensor;
        if (![x, y, z].every(Number.isFinite)) return;
        const heading = Math.hypot(x, y) > .2 ? (Math.atan2(x, y) * 180 / Math.PI + 360) % 360 : null;
        const time = Number.isFinite(timestamp) ? timestamp : performance.now();
        accept(session, "field", heading, Math.hypot(x, y, z), time);
      }, options);
      sensor.addEventListener("error", () => {
        if (session.sensor === sensor) fallBack();
      }, options);
      session.timer = setTimeout(fallBack, 3200);
      sensor.start();
    } catch {
      fallBack();
    }
  }

  start.addEventListener("click", () => {
    if (run) {
      stop();
      return;
    }
    if (!window.isSecureContext) {
      status.textContent = "Open this preview on a secure browser page to use the magnetic sensor.";
      return;
    }
    const session = {
      controller: new AbortController(),
      samples: [],
      source: null,
      hz: null,
      candidate: null,
      lockUntil: -Infinity,
      nextEstimate: -Infinity,
      nextPaint: -Infinity,
    };
    run = session;
    start.textContent = "Stop tuning";
    start.dataset.active = "";
    status.textContent = "Checking magnetic sensor access…";
    if (!preferCompass && typeof window.Magnetometer === "function") startField(session);
    else void startCompass(session);
  });

  spiro.addEventListener("close", () => stop());
  window.addEventListener("pagehide", () => stop());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && run) stop();
  });
})();
