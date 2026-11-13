# Technical field notebook

## Purpose

Koala Walla Land / Cymatic Studio is an interactive, browser-based creative environment. Its primary interface is a desk populated with objects that lead to sound, writing, customization, experiments, and playful interactions. The central design question is: **Can a personal creative practice be experienced as a place rather than merely described on a page?**

## What is observable in the current repository

- `index.html` implements the animated shoji-screen entrance, heart-lock interaction, and a reduced-motion alternative.
- `home.html` contains the desk experience and extensive styling for interactive objects, audio players, monitors, animations, and responsive presentation.
- `koe/` is a separate instrument experience.
- `experiments/` provides a separate exploration route.
- The journal and other areas extend the desk beyond a static portfolio.

These observations do not establish that every feature works across browsers or that every experiment is physically accurate.

## Design rationale

**Objects as navigation.** An instrument or piece of furniture can serve as a link and an invitation. The cost is discoverability; visitors need unobtrusive hints and a field guide.

**Audio as interaction.** Playback, visual feedback, and tactile gestures belong together. Browser autoplay policies, mobile performance, and accessible controls are implementation constraints, not decorative concerns.

**A world rather than a gallery.** The site's coherence comes from recurring questions about resonance, memory, attention, and the relationship between physical and digital play.

**Intentional eccentricity.** Unusual juxtapositions are part of the aesthetic, but should not excuse broken interactions or unclear navigation.

## Implementation and authorship

The site is developed using web technologies and AI-assisted implementation. The creator directs the experience, specifies interactions, reviews results, and iterates. This document does **not** claim that all code was written manually, that every subsystem was designed from first principles, or that the implementation has undergone a formal audit.

## Engineering questions worth documenting

1. Which interactions use Web Audio versus embedded third-party players?
2. How are playback state and visual animation synchronized?
3. Which creations are stored locally, remotely, or not at all?
4. What is the expected behavior when audio, network, or embeds fail?
5. Which interactive objects are keyboard-accessible and usable on narrow screens?
6. Which visualizations are scientific models, artistic interpretations, or hybrids?

## Planned documentation standard

For each substantial feature, record: **intent → user action → implementation → dependencies → failure modes → accessibility → test evidence**. Link commits or screenshots when available. Mark incomplete work explicitly rather than presenting proposals as shipped features.

## Preservation rule

Documentation and metadata changes must not reposition desk objects, alter sound behavior, enable analytics, or change persistence without separate review.
