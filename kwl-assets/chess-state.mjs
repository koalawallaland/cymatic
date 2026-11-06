function stores(tab, device) {
  if (tab !== undefined || device !== undefined) return [tab, device].filter(Boolean);
  const result = [];
  for (const name of ['sessionStorage', 'localStorage']) {
    try { if (globalThis[name]) result.push(globalThis[name]); } catch {}
  }
  return result;
}
export function readGameState(key, tab, device) {
  for (const storage of stores(tab, device)) {
    try {
      const state = JSON.parse(storage.getItem(key) || 'null');
      if (state && /^[a-z0-9]{6,24}$/.test(state.id) && ['w', 'b'].includes(state.me) && Array.isArray(state.moves)) return state;
    } catch {}
  }
  return null;
}
export function saveGameState(key, state, tab, device) {
  const value = JSON.stringify(state);
  for (const storage of stores(tab, device)) { try { storage.setItem(key, value); } catch {} }
}
export function clearGameState(key, tab, device) {
  for (const storage of stores(tab, device)) { try { storage.removeItem(key); } catch {} }
}
