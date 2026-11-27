// Pieces Katie pins to the wall herself. They sit on the bricks, under visitor drawings.
// x/y is the center on the 1200x800 wall, w is the width, rot is in radians.
export const pinned = [
  {src: new URL('./art/coco-tag.webp', import.meta.url).href, x: 215, y: 250, w: 300, rot: -0.08},
  {src: new URL('./art/sand-mandala.webp', import.meta.url).href, x: 960, y: 500, w: 320, rot: 0.05}
];

export function loadPinned() {
  return Promise.all(pinned.map(piece => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({...piece, img});
    img.onerror = () => resolve(null);
    img.src = piece.src;
  }))).then(items => items.filter(Boolean));
}

export function drawPinned(ctx, items) {
  for (const {img, x, y, w, rot} of items) {
    const h = w * img.naturalHeight / img.naturalWidth;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}
