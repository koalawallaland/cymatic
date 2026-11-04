/* Pocket: a small floating window that holds the live field.
   Anything with a data-pocket attribute opens it. Closing it unloads the
   frame, so the music stops too. */
(() => {
  'use strict';
  const LIVE = new URL('live.html', document.currentScript.src).href;

  const css = document.createElement('style');
  css.textContent = `
  .pocket {
    position: fixed; z-index: 50;
    right: max(12px, env(safe-area-inset-right, 0px));
    bottom: max(12px, env(safe-area-inset-bottom, 0px));
    width: min(400px, calc(100vw - 24px));
    height: min(640px, calc(100dvh - 90px));
    display: flex; flex-direction: column; margin: 0; padding: 0;
    background: #0d0a18; border: 1px solid #3a2f5c; border-radius: 16px; overflow: hidden;
    box-shadow: 0 18px 50px rgba(0,0,0,.6), 0 0 24px rgba(255,122,200,.22);
    transform-origin: bottom right; animation: pocketIn .22s cubic-bezier(.2,1.4,.4,1);
  }
  .pocket[hidden] { display: none; }
  @keyframes pocketIn { from { transform: scale(.85) translateY(12px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .pocket { animation: none; } }
  .pocket-bar {
    display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 14px;
    background: linear-gradient(90deg, #ff7ac8, #b9a6ff 60%, #6ff3ff); color: #160f24;
    font: 700 12px/1 ui-monospace, Menlo, monospace; letter-spacing: .08em;
  }
  .pocket-bar span { flex: 1; }
  .pocket-bar button {
    width: 32px; height: 28px; border: 0; border-radius: 8px; cursor: pointer;
    background: rgba(22,15,36,.18); color: #160f24; font: 700 15px/1 system-ui, sans-serif;
  }
  .pocket-bar button:focus-visible { outline: 2px solid #160f24; outline-offset: 1px; }
  .pocket iframe { flex: 1; width: 100%; border: 0; background: #0d0a18; }
  `;
  document.head.appendChild(css);

  const box = document.createElement('div');
  box.className = 'pocket'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Live field');
  box.innerHTML = '<div class="pocket-bar"><span>LIVE FIELD ʕ•ᴥ•ʔ♪</span><button type="button" aria-label="Close live field">×</button></div>';
  const frame = document.createElement('iframe');
  frame.title = 'Live field: type a beat and the sand dances to it';
  box.appendChild(frame);
  document.body.appendChild(box);

  let opener = null;
  function open(e) {
    if (e) e.preventDefault();
    opener = document.activeElement;
    if (!frame.src) frame.src = LIVE;
    box.hidden = false;
    box.querySelector('button').focus();
  }
  function close() {
    box.hidden = true;
    frame.removeAttribute('src');          // unload it so the music stops
    if (opener && opener.focus) opener.focus();
  }
  box.querySelector('button').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  addEventListener('message', e => { if (e.data === 'pocket:close') close(); });
  document.addEventListener('click', e => { const t = e.target.closest('[data-pocket]'); if (t) open(e); });
  document.addEventListener('keydown', e => {
    const t = e.target.closest && e.target.closest('[data-pocket][role="button"]');
    if (t && (e.key === 'Enter' || e.key === ' ')) open(e);
  });
})();
