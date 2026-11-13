const stepSeconds = 60 / 84 / 4;
const sounds = {
  latch: { frequency: 540, name: 'Latch', shape: 'triangle', length: .07 },
  dryer: { frequency: 110, name: 'Dryer', shape: 'triangle', length: .24 },
  mirror: { frequency: 220, name: 'Mirror', shape: 'sine', length: .38 },
  chime: { frequency: 330, name: 'Elevator', shape: 'sine', length: .55 },
};

export function mountResonance({ pause, enter, travel, room, unlockStall }) {
  const trigger = document.createElement('button');
  trigger.textContent = 'Listen · E';
  trigger.hidden = true;
  document.querySelector('#hud').append(trigger);

  const tin = document.createElement('dialog');
  tin.setAttribute('aria-labelledby', 'resonance-title');
  tin.innerHTML = `
    <style>
      #resonance-tin{width:min(94vw,570px);max-height:85dvh;overflow:auto;color:#f8e5ed;background:linear-gradient(145deg,#38323c,#171e24);border:1px solid #d7bbc8;border-radius:22px;padding:clamp(14px,4vw,26px);box-shadow:0 12px 70px #000a}
      #resonance-tin::backdrop{background:#11131ab0}
      #resonance-tin h2{font:28px Georgia;margin:0 0 8px}
      #resonance-tin p{line-height:1.45}
      #resonance-tin .controls{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}
      #resonance-tin button{padding:7px 10px}
      #resonance-tin button:focus-visible,#resonance-tin input:focus-visible{outline:2px solid #ffc4df;outline-offset:2px}
      #resonance-tin .steps{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px}
      #resonance-tin .steps button{padding:6px 0;border-radius:6px;min-height:34px}
      #resonance-tin .steps [data-filled]{background:#824565}
      #resonance-tin .steps [data-playing]{outline:2px solid #f7bedb;outline-offset:-3px}
      #resonance-tin .steps [aria-pressed="true"]{border-color:#fff;border-width:2px}
      #resonance-tin .trace{display:flex;gap:7px;min-height:27px;align-items:center}
      #resonance-tin .trace span{color:#f9cae2;border-bottom:2px solid;padding:1px 5px}
      #resonance-tin label{margin:8px 0}
      #resonance-tin input[type=range]{width:100%;accent-color:#f2a3cc}
    </style>
    <h2 id="resonance-title">Toilet World · Resonance</h2>
    <p id="resonance-help"></p>
    <div class="controls">
      <button data-sound="latch">Stall latch</button>
      <button data-sound="dryer">Hand dryer</button>
      <button data-sound="mirror">Mirror</button>
      <button data-sound="chime">Elevator chime</button>
    </div>
    <div class="steps" role="group" aria-label="Loop steps"></div>
    <div class="trace" aria-hidden="true"></div>
    <label id="resonance-mix-label">Toilet World ↔ Park Hyatt
      <input type="range" min="0" max="100" value="35">
    </label>
    <p id="resonance-status" role="status"></p>
    <div class="controls">
      <button id="resonance-audio" aria-pressed="false">Enable sound</button>
      <button id="resonance-erase">Clear step</button>
      <button id="resonance-door" hidden></button>
      <button id="resonance-close">Back to exploring</button>
    </div>`;
  tin.id = 'resonance-tin';
  document.body.append(tin);
  const find = selector => tin.querySelector(selector);
  const panels = {
    toilets: Array.from({ length: 16 }, () => new Set()),
    hotel: Array.from({ length: 16 }, () => new Set()),
  };
  const mix = find('input');
  const status = find('#resonance-status');
  const door = find('#resonance-door');
  const audioButton = find('#resonance-audio');
  let place = 'toilets';
  let selected = 0;
  let playhead = -1;
  let unlocked = false;
  let returned = false;
  let audio;
  let master;
  let nextTime;
  let nextStep;
  let clockStart;
  let timer;
  let animation;

  const steps = panels.toilets.map((_, index) => {
    const button = document.createElement('button');
    button.textContent = index + 1;
    button.onclick = () => {
      selected = index;
      render();
    };
    find('.steps').append(button);
    return button;
  });

  function render() {
    steps.forEach((button, index) => {
      const entries = [...panels[place][index]].map(key => sounds[key].name);
      button.toggleAttribute('data-filled', entries.length > 0);
      button.toggleAttribute('data-playing', index === playhead);
      button.setAttribute('aria-pressed', String(index === selected));
      button.setAttribute('aria-label', `Step ${index + 1}, ${entries.join(', ') || 'empty'}`);
    });
    for (const button of tin.querySelectorAll('[data-sound]')) {
      const key = button.dataset.sound;
      button.hidden = place === 'toilets' ? key === 'chime' : key !== 'chime';
      button.setAttribute('aria-pressed', String(panels[place][selected].has(key)));
    }
    const notes = playhead < 0 ? [] : [...panels.toilets[playhead], ...(place === 'hotel' ? panels.hotel[playhead] : [])];
    const trace = find('.trace');
    trace.replaceChildren(...notes.map(key => {
      const label = document.createElement('span');
      label.textContent = key === 'latch' ? 'Latch' : `${sounds[key].frequency} Hz`;
      return label;
    }));
    door.hidden = !unlocked;
    door.textContent = place === 'toilets' ? 'Open the stall' : 'Return through the stall';
  }

  function play(key, when, level = 1) {
    if (!audio || audio.state !== 'running' || level <= 0) return;
    const sound = sounds[key];
    const voice = audio.createOscillator();
    const envelope = audio.createGain();
    const end = when + sound.length;
    voice.type = sound.shape;
    voice.frequency.value = sound.frequency;
    if (key === 'latch') voice.frequency.exponentialRampToValueAtTime(180, end);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(.19 * level, when + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    voice.connect(envelope).connect(master);
    if (place === 'toilets') {
      const echo = audio.createDelay(.2);
      const wet = audio.createGain();
      echo.delayTime.value = .085;
      wet.gain.value = .28;
      envelope.connect(echo).connect(wet).connect(master);
      voice.onended = () => setTimeout(() => { echo.disconnect(); wet.disconnect(); }, 100);
    }
    voice.start(when);
    voice.stop(end);
  }

  function schedule() {
    if (audio.state !== 'running') return;
    if (nextTime < audio.currentTime) {
      const missed = Math.ceil((audio.currentTime - nextTime) / stepSeconds);
      nextTime += missed * stepSeconds;
      nextStep = (nextStep + missed) % 16;
    }
    while (nextTime < audio.currentTime + .09) {
      const balance = Number(mix.value) / 100;
      for (const key of panels.toilets[nextStep]) play(key, nextTime, place === 'hotel' ? 1 - balance : 1);
      if (place === 'hotel') for (const key of panels.hotel[nextStep]) play(key, nextTime, balance);
      if (returned && place === 'toilets' && panels.toilets[nextStep].has('latch')) {
        play('latch', nextTime + stepSeconds, .38);
        returned = false;
      }
      nextTime += stepSeconds;
      nextStep = (nextStep + 1) % 16;
    }
  }

  function tick() {
    const elapsed = (audio?.state === 'running' ? audio.currentTime : performance.now() / 1000) - clockStart;
    const step = Math.floor(Math.max(0, elapsed) / stepSeconds) % 16;
    if (step !== playhead) {
      playhead = step;
      render();
    }
    animation = requestAnimationFrame(tick);
  }

  audioButton.onclick = async () => {
    if (audio?.state === 'running') {
      await audio.suspend();
      clockStart = performance.now() / 1000;
      audioButton.textContent = 'Enable sound';
      audioButton.setAttribute('aria-pressed', 'false');
      return;
    }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!audio) {
        audio = new Audio();
        master = audio.createGain();
        master.gain.value = .34;
        master.connect(audio.destination);
      }
      await audio.resume();
      if (!tin.open) {
        await audio.suspend();
        return;
      }
      clockStart = nextTime = audio.currentTime + .035;
      nextStep = 0;
      clearInterval(timer);
      timer = setInterval(schedule, 25);
      schedule();
      audioButton.textContent = 'Mute sound';
      audioButton.setAttribute('aria-pressed', 'true');
    } catch {
      status.textContent = 'Audio is unavailable. You can still follow the pitch lights.';
    }
  };

  for (const button of tin.querySelectorAll('[data-sound]')) button.onclick = () => {
    const key = button.dataset.sound;
    const entries = panels[place][selected];
    if (entries.has(key)) entries.delete(key);
    else {
      entries.add(key);
      if (audio) play(key, audio.currentTime + .01);
    }
    if (!unlocked && entries.has('dryer') && entries.has('mirror')) {
      unlocked = true;
      unlockStall();
      status.textContent = '110 Hz + 220 Hz. The stall lock turns.';
    }
    render();
  };

  find('#resonance-erase').onclick = () => {
    panels[place][selected].clear();
    render();
  };

  function showRoom(current) {
    place = current;
    selected = 0;
    find('h2').textContent = place === 'hotel' ? 'Park Hyatt · Resonance' : 'Toilet World · Resonance';
    find('#resonance-help').textContent = place === 'hotel'
      ? 'Pick a step to add an elevator chime. Slide between your two loops.'
      : 'Pick a step, then tap a fixture. Listen for two notes an octave apart.';
    find('#resonance-mix-label').hidden = place !== 'hotel';
    status.textContent = place === 'hotel' ? 'The carpet swallows the tile echo.' : '';
    render();
  }

  function open() {
    const current = room();
    if (tin.open || !panels[current]) return;
    pause();
    clockStart = performance.now() / 1000;
    showRoom(current);
    tin.showModal();
    tick();
  }

  function close() {
    tin.close();
    clearInterval(timer);
    cancelAnimationFrame(animation);
    if (audio?.state === 'running') void audio.suspend().catch(() => {});
    audioButton.textContent = 'Enable sound';
    audioButton.setAttribute('aria-pressed', 'false');
    playhead = -1;
  }

  trigger.onclick = open;
  tin.addEventListener('keydown', event => event.stopPropagation());
  tin.oncancel = event => { event.preventDefault(); close(); };
  find('#resonance-close').onclick = () => { close(); enter(); };
  door.onclick = () => {
    const destination = place === 'toilets' ? 'hotel' : 'toilets';
    returned = destination === 'toilets';
    travel(destination);
    showRoom(destination);
    find('#resonance-close').focus();
  };
  document.addEventListener('keydown', event => {
    if (event.code === 'KeyE' && !event.repeat && !trigger.hidden && !tin.open) {
      event.preventDefault();
      open();
    }
  });
  return {
    update(active) {
      const current = room();
      trigger.hidden = !active || (current !== 'toilets' && !(current === 'hotel' && unlocked));
    },
    pause() { if (tin.open) close(); },
  };
}
