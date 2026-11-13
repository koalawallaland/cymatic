# Visitor-experience quality checklist

This is a **test plan**, not a claim that the checks have passed.

## Entrance
- [ ] Heart lock works with touch, mouse, and keyboard.
- [ ] Reduced-motion preference skips unnecessary animation.
- [ ] New visitors understand how to enter.

## Desk and navigation
- [ ] Every visible interactive object has a predictable response.
- [ ] Keyboard focus is visible and follows a sensible order.
- [ ] No objects overlap critical controls on narrow mobile screens.
- [ ] Tooltips or field-guide hints explain unfamiliar interactions without obscuring artwork.

## Audio
- [ ] Playback starts after user gesture on iOS Safari and desktop browsers.
- [ ] Audio controls clearly indicate paused, playing, and failed states.
- [ ] Visualizers distinguish real audio-driven behavior from decorative animation.
- [ ] Muting and reduced-motion preferences are respected.

## Creation and storage
- [ ] Any claim that creations are saved is verified against the actual backend.
- [ ] Anonymous public contributions do not expose private identifying information.
- [ ] Collection and counters fail gracefully when services are unavailable.

## Scientific and experimental content
- [ ] Artistic simulations are labeled as such.
- [ ] Physical measurements show units, assumptions, and limitations.
- [ ] No unsupported claims of scientific validation.

## Review protocol
Record browser, device, date, steps, expected result, observed result, screenshot, and relevant commit. Fix the highest-impact failures first. Do not merge visual changes without mobile comparison screenshots.
