const mirror = document.querySelector('.desk-mirror');
const message = document.querySelector('.mirror-status');
const soundToggle = document.querySelector('[data-desk-sound]');
let audio;
let dismiss;

mirror.addEventListener('click', () => {
  message.textContent = 'shadow oracle readings coming soon ✨';
  clearTimeout(dismiss);
  dismiss = setTimeout(() => { message.textContent = ''; }, 6500);
  if (soundToggle?.getAttribute('aria-pressed') === 'false') return;
  sparkle().catch(() => {});
});

async function sparkle() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audio ??= new Audio();
  if (audio.state === 'suspended') await audio.resume();
  const start = audio.currentTime;
  [1046.5, 1318.51, 1567.98, 2093].forEach((frequency, index) => {
    const time = start + index * .052;
    const bell = audio.createOscillator();
    const envelope = audio.createGain();
    bell.type = 'sine';
    bell.frequency.value = frequency;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(.04 / (1 + index * .3), time + .014);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + .42);
    bell.connect(envelope).connect(audio.destination);
    bell.start(time);
    bell.stop(time + .43);
    bell.onended = () => { bell.disconnect(); envelope.disconnect(); };
  });
}
