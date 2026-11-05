# Four-source inventory

Untouched copies of the uploaded files are in `originals/`.

| Source | What it is | What it contributes | Where it lives now |
| --- | --- | --- | --- |
| Astro project | The host site: home page, blog, works | Routing, cat loop, cymatic field, draggable HHKB board, pop-up, swiping paw | `src/` |
| `koalawallaland.html` | A single-file export of the Astro home page | Nothing new; matches the Astro home page apart from a viewer wrapper | `originals/` only |
| `Mini_Resin_Lab.html` | First WebGL casting game: pour, tilt, cure, demold, tarot reveal, cat, rain and humidity failures | Preserved as the first version | `/lab/classic/` |
| `Mini_Resin_Lab2.html` | Extended game: neon room, shoji entrance, Topre and full-size MX keyboards, keycap sets, sound, put-your-cap-on-the-keyboard | The main lab | `/lab/` |

`/lab/` stars Part C, the pearl-white cat, because Katie prefers her. Also kept: `/lab/koala/` (the same lab with a koala) and `/works/keykollectiv-65/` (the May 2026 KeyKollectiv keyboard, rebuilt from its chat with a back arrow and side-scroll added). `/lab/#desk` opens the lab desk directly.

The home page is now the desk: shoji screens, the lab's flickering sign and the graffiti wall sit behind it, and the real keycap board sits on it. The desk build's notes live at `/desk/` with its cymatic studio at `/desk/studio.html`. Its source is in `originals/desk-build/`.

The real photos were removed from the site. Katie only wants photos that show her desk, so none should return until she picks them.

`cymatics-sim` is empty apart from its README, so there was nothing to bring in.

Ported from `main` (the live plain-HTML site): the LIVE beat pocket (`public/pocket/`), the cross-stitch sampler, the desk page with its rooms, the kaomoji and traditional-character neon, and the original dusk window (on `/lab/koala`; `/lab` keeps the crystal skyline). The eight photos on `main` were left out; only photos Katie confirms show her desk should return.

The keycap tray is now four trinket trays with Katie's own doodles cut from her marker sheet (`public/doodles/`), and the pixel diamond engraved on the ornate silver one. Off-board caps land on the silver tray.

Keyboard sounds are generated live by `public/keysound.js`, on the home board and in the lab. Four sounds: Creamy, Topre thock, Clicky, Marble clack.

The first cat-and-halo hero now lives on `/works/`. The cymatic field on the home page is a small pop-up opened from the singing dish, with the full version at `/works/cymatic-field/`. A small Instagram panel links to the main and reposts views. Part C sits on the right of the opening and links to the lab.

A small soldering station sits on the opening ledge and links to the lab desk.

Her lamps are drawn on the home page from the images she shared with ChatGPT. Katie says Delilah (Pottery Barn) has the fluted shade and Ada (CB2) the smooth one. The pink foo dog lamp is drawn from her product image. The small lavender lamp also comes from a product image and isn't confirmed as hers.

## Overlaps still to decide

- Two keyboards exist: the home page board (HHKB, pull-apart, swiping paw, drives the cymatic field) and the lab's room (Topre and MX layouts, sets, sound).
- Lab2's sound and layout switching are not on the home page board yet.

## Links between rooms

Casting a cap in `/lab/` and choosing "Put it on the keyboard" saves the rendered cap with its own id in the visitor's browser. It appears on the silver tray at home, and every cap's position is remembered until "reset board".

## Not built yet

The graffiti wall's public submissions. Tags stay in the visitor's browser until a moderated backend exists.
