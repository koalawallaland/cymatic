const TASKS = {
  hotel: 'Take a lavender coffee to the hotel concierge.',
  toilets: 'Check the restroom stall marked OUT OF ORDER.',
  tokyo: 'Send your sign-off from the Tokyo night gallery.',
};
const REPLIES = {
  hotel: 'Concierge: I ordered this tomorrow. Thank you for being early.',
  toilets: 'From the stall: I can hear your chat through the pipes.',
  tokyo: 'Stream ended. The viewer count stayed at one.',
};
const CHAT = [
  'pocketkoala: you can take five. i’ll keep the chat open.',
  'guest_02: why is the food court still playing your intro?',
  'guest_02: i can see a hallway behind you.',
  'guest_02: there are two of that hallway now.',
];

export function mountLateShift({ scene, room, travel }) {
  const panel = document.getElementById('late-shift');
  const toggle = document.getElementById('shift-toggle');
  const select = panel.querySelector('#shift-destination');
  const close = panel.querySelector('[data-close-shift]');
  const pressure = panel.querySelector('meter');
  const reading = panel.querySelector('[data-pressure]');
  const chat = panel.querySelector('[data-chat]');
  const status = panel.querySelector('[data-shift-status]');
  const task = panel.querySelector('[data-task]');
  const action = panel.querySelector('[data-shift-action]');
  const coffee = panel.querySelector('[data-coffee]');
  const tone = panel.querySelector('[data-tone]');
  const zone = panel.querySelector('[data-shift-room]');
  const horror = document.getElementById('nightmare');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tint = scene.fog.color.clone();
  const usual = tint.clone();
  const dream = tint.clone().set('#a9578f');
  const dread = tint.clone().set('#301b26');
  const order = Object.keys(TASKS);
  let stage = -1;
  let load = 0;
  let hadCoffee = false;
  let lastRoom;

  function sync() {
    const here = room();
    const destination = order[stage];
    select.value = here;
    zone.textContent = document.querySelector('#zone').textContent;
    task.textContent = stage < 0 ? 'Start a stream to pick up a closing-shift job.' :
      destination ? TASKS[destination] : 'Shift complete. The mall is yours to explore.';
    action.textContent = stage < 0 ? 'Go live' : destination ? 'Finish this job' : 'Start another shift';
    action.disabled = Boolean(destination && here !== destination);
    coffee.disabled = !destination || stage !== 0 || here !== 'atrium' || hadCoffee;
    tone.disabled = !destination || load === 0;
    pressure.value = Math.floor(load);
    reading.textContent = Math.floor(load) + '%';
    chat.textContent = destination ? CHAT[Math.min(3, Math.floor(load / 25))] : 'Chat is offline.';
  }
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    sync();
    if (open) close.focus();
    else document.getElementById('intro').hidden ? toggle.focus() : document.getElementById('enter').focus();
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
  select.addEventListener('change', () => travel(select.value));
  action.addEventListener('click', () => {
    const destination = order[stage];
    if (!destination) {
      stage = 0;
      load = 12;
      hadCoffee = false;
      status.textContent = 'You’re live. One viewer is already here.';
    } else if (room() === destination) {
      status.textContent = REPLIES[destination];
      stage++;
      load = stage === order.length ? 0 : Math.min(load + 18, 100);
    }
    sync();
  });
  coffee.addEventListener('click', () => {
    hadCoffee = true;
    load = Math.max(0, load - 12);
    status.textContent = 'One lavender coffee for the concierge, one for you.';
    sync();
  });
  tone.addEventListener('click', () => {
    load = 0;
    status.textContent = 'You tuned out the chat for a moment. The hallway settled.';
    sync();
  });
  return {
    update(active, dt) {
      const here = room();
      if (order[stage] && active && panel.hidden) load = Math.min(100, load + dt * .4);
      if (here !== lastRoom) { lastRoom = here; sync(); }
      const amount = reduced.matches ? 0 : load / 100;
      scene.fog.color.copy(tint.copy(usual).lerp(horror.checked ? dread : dream, amount));
      scene.fog.far = 110 - amount * (horror.checked ? 55 : 26);
    },
  };
}
