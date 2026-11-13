const phraseKey = 'kwl-koe-instax-phrase';
const demo = [60, 64, 67, 69, 67, 64, 62, 60].map((key, index) => ({
  key, octave: 0, at: index * 320, length: index === 7 ? 560 : 245
}));

export function readPhrase() {
  try {
    const notes = JSON.parse(localStorage.getItem(phraseKey));
    if (Array.isArray(notes) && notes.length > 0 && notes.length <= 96 &&
        notes.every((note, index) => note &&
          Number.isInteger(note.key) && note.key >= 60 && note.key <= 84 &&
          Number.isInteger(note.octave) && Math.abs(note.octave) <= 2 &&
          Number.isFinite(note.at) && note.at >= (index ? notes[index - 1].at + notes[index - 1].length : 0) &&
          Number.isFinite(note.length) && note.length > 0 && note.at + note.length <= 24000)) {
      return { notes, demo: false };
    }
  } catch {}
  return { notes: demo, demo: true };
}

export function createPhraseCapture() {
  let notes = [], origin = 0, held = null, lastEnd = -Infinity, writeTimer;
  function save() {
    clearTimeout(writeTimer);
    if (!notes.length) return;
    try { localStorage.setItem(phraseKey, JSON.stringify(notes)); } catch {}
  }
  function release(now = performance.now()) {
    if (!held) return;
    notes.push({ ...held, length: Math.max(1, Math.min(24000, now - origin) - held.at) });
    held = null;
    lastEnd = now;
    writeTimer = setTimeout(save, 350);
  }
  return {
    press(key, octave) {
      const now = performance.now();
      release(now);
      if (now - lastEnd > 2200 || now - origin > 20000 || notes.length >= 96) {
        save();
        notes = [];
        origin = now;
      }
      const previous = notes.at(-1);
      held = { key, octave, at: Math.max(now - origin, previous ? previous.at + previous.length : 0) };
    },
    release,
    flush() {
      release();
      save();
    }
  };
}

export function drawPrint(canvas, notes) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const end = notes.at(-1).at + notes.at(-1).length;
  const pitches = notes.map(note => note.key + note.octave * 12);
  const low = Math.min(...pitches), high = Math.max(...pitches);
  const row = (height - 24) / Math.max(8, high - low + 1);
  context.fillStyle = '#332239';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#60455e';
  for (let y = 12; y < height; y += row) context.fillRect(0, y, width, 1);
  notes.forEach((note, index) => {
    const y = (height / 2) + ((high + low) / 2 - pitches[index]) * row;
    context.fillStyle = ['#ffc5df', '#c5b8ff', '#b0e6d8'][index % 3];
    context.fillRect(8 + note.at / end * (width - 16), y - row / 4,
      Math.max(2, note.length / end * (width - 16)), Math.max(2, row / 2));
  });
}
