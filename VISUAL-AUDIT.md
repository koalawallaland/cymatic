# Visual navigation and aesthetic audit — 2026-11-12

**Status:** source-level audit, not a visual/browser screenshot test. No UI code changed.

## What is working conceptually

The heart-lock shoji entrance is a strong threshold into the world. The desk uses objects as navigation and the lower room links provide a conventional fallback. The interface already includes accessible names on many objects, keyboard focus styling on selected controls, and a reduced-motion entrance path.

## Priority findings

### P0 — Establish a repeatable visual baseline before editing

The desk is a tightly composed, layered scene with many absolute positions. Save comparison screenshots at desktop, tablet, and narrow iPhone widths before any layout changes. Include the entrance, whole desk, mirror, monitors/cat, lamp, printer/desk leg, and under-desk row. This audit does **not** assert current overlap from code alone.

### P1 — Navigation hierarchy is implicit

The main entrance contains a lock and a separate Experiments link, but the artistic purpose is not explained on the page. On the desk, primary destinations are split between clickable props and a 'More rooms' text nav. Add one unobtrusive, dismissible 'Start here / Field guide' affordance; preserve the lock as primary action. Test whether first-time visitors can find journal, instrument, experiments, and resin lab unaided.

### P1 — Conflicting wayfinding vocabulary

The desk navigation labels 'Experiments' at `works/index.html`, while the entrance links 'Experiments' to `experiments/`. Clarify whether these are distinct collections, and name them distinctly if so. Likewise, 'Koala’s desk' within a page already depicting a desk may be ambiguous without a subtitle.

### P1 — Mobile composition is fragile

`home.html` includes explicit Safari phone overrides for lamp and under-desk controls at 700px. The under-desk beat pocket, graph, printer, and record player use percentage positions with `!important` overrides. Treat these as a regression-sensitive group: validate visual and hit-target separation at 320, 375, 390, 430, 768, and 1280 CSS pixels.

### P1 — Density and click-target discoverability

Numerous visually small interactive objects compete for attention. Keep their visual sizes if aesthetically necessary, but enlarge invisible touch hit areas where they don't overlap, add focus-visible states, and provide a compact map/field guide as a second navigation path. Avoid persistent labels over artwork.

### P2 — Semantics and content hierarchy

The page title and generic description underrepresent the environment; `home.html` includes a `noindex` directive. Review indexing intent before changing it. Update metadata only after approving exact copy; preserve the existing aesthetic and OG image until a replacement is reviewed.

### P2 — Sound and motion signaling

Distinguish decorative motion from sound-responsive animation. Ensure the 'Desk sound on' state is accurate, and controls communicate playing, paused, unavailable, and muted states. Respect browser autoplay limits and reduced-motion settings.

## Proposed visual language (not implemented)

- **Hierarchy:** one clear entrance action; one optional field-guide action; object-first exploration; unobtrusive fallback navigation.
- **Palette:** preserve lavender, lilac, pink, Tiffany-blue, and soft illuminated accents. Avoid adding a competing new color family.
- **Typography:** retain expressive display lettering; use highly legible small text for instructions.
- **Motion:** purposeful, intermittent, reduced-motion aware; avoid multiple attention-grabbing loops in the same visual zone.
- **Spacing:** use the existing desk perspective as the compositional anchor. Do not reposition mirror, lamp, cat, monitors, or printer without annotated before/after comparisons.

## Verification matrix

| Test | Desktop | iPhone narrow | iPhone wide | Tablet |
| --- | --- | --- | --- | --- |
| Entrance lock discoverable | Pending | Pending | Pending | Pending |
| Mirror/monitor/cat separation | Pending | Pending | Pending | Pending |
| Lamp scale stable | Pending | Pending | Pending | Pending |
| Printer clear of desk leg | Pending | Pending | Pending | Pending |
| Under-desk targets distinct | Pending | Pending | Pending | Pending |
| Journal and instrument findable | Pending | Pending | Pending | Pending |
| Keyboard focus and reduced motion | Pending | Pending | Pending | Pending |

## Implementation order

1. Capture actual screenshots and confirm the specific overlap/hit-target issues.
2. Prototype a tiny, optional field-guide affordance **outside** the desk's critical object zones.
3. Resolve the ambiguous Experiments routes and labels after confirming intent.
4. Test keyboard, touch, audio, and reduced motion.
5. Submit a separate visual PR with before/after screenshots and a clear rollback path.

**Do not merge or deploy visual changes from this audit alone.**
