// Ten columns of isolated frames from Boba's own tennis-ball return.
export function createReturnRun(world, dog) {
  const canvas = document.createElement('canvas');
  canvas.width = 208;
  canvas.height = 304;
  canvas.className = 'boba-return-run';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  world.append(canvas);
  const ball = document.createElement('span');
  ball.className = 'boba-thrown-ball';
  ball.hidden = true;
  world.append(ball);
  const context = canvas.getContext('2d');
  const sheet = new Image();
  sheet.src = new URL('./boba-return.webp', import.meta.url);
  let frame = 0;
  function stop() {
    cancelAnimationFrame(frame);
    canvas.hidden = ball.hidden = true;
    dog.classList.remove('boba-away');
  }
  function play(x, y, done) {
    stop();
    if (!context || !sheet.complete || !sheet.naturalWidth ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const bounds = world.getBoundingClientRect();
    const home = dog.getBoundingClientRect();
    const hx = home.left + home.width / 2 - bounds.left;
    const hy = home.top + home.height * .865 - bounds.top;
    const start = performance.now();
    ball.hidden = false;
    const point = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
    function draw(now) {
      const elapsed = now - start;
      if (elapsed < 560) {
        const t = elapsed / 560;
        point(ball, hx + (x-hx)*t, hy + (y-hy)*t - Math.sin(Math.PI*t)*bounds.height*.23);
      } else {
        ball.hidden = true;
        const t = Math.min(1, (elapsed-560)/3000);
        const index = Math.min(77, Math.floor(t*78));
        canvas.hidden = false;
        dog.classList.add('boba-away');
        context.clearRect(0, 0, 208, 304);
        context.drawImage(sheet, index%10*208, Math.floor(index/10)*304, 208, 304, 0, 0, 208, 304);
        canvas.style.height = home.height * (.54 + t*.43) + 'px';
        point(canvas, x+(hx-x)*t, y+(hy-y)*t);
        if (t===1) { stop(); done(); return; }
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return true;
  }
  return {play, stop};
}
