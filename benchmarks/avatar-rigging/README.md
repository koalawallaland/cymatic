# Cymatic Studio — avatar rigging method benchmark (2026-11-17)

**This is a method evaluation, not a character rig, and it does not touch the live site.** Source artwork is the repository's already-public `koe/art/singer-open.png`. No personal footage, private images, microphones, or audio are used.

## Methods and objective acceptance criteria

| Method | Automated check | What it cannot prove | Native Live2D? |
| --- | --- | --- | --- |
| Mesh Avatar Studio ([upstream](https://github.com/shinshin86/mesh-avatar-studio)) | Bootstrap a source-image project with its actual CLI | Believable deformations, artwork segmentation, clean eye shapes | No; custom .mavatar runtime |
| Still2Rig PSD ([upstream](https://github.com/shinshin86/still2rig-psd)) | Prepare the real source PNG and check job metadata | Segmentation or a layered PSD without external See-through/GPU inference | Produces a layered PSD, not a complete rig |
| PSD2Live ([upstream](https://github.com/tsunehimatoi/psd2live)) | Compile/test Java rigging/export application | High-quality rig from flattened PNG without layered artwork | Yes; native export supported |
| Live2D Agent Kit ([upstream](https://github.com/Ariakage/live2d-agent-kit)) | Generate and export its original geometric sample via pinned engine; validate model | Full model of this particular avatar | Yes; native test artifact |
| CubismExternalEditMCP ([upstream](https://github.com/nana7chi/CubismExternalEditMCP)) | Compile-check Python adapter | Successful editor connection (requires obsolete Cubism 5.4 Alpha) | Editor dependent, blocked |

## Passing a *real character* acceptance test requires all:

1. Original facial proportions, ears, and wings still recognizable in the neutral pose.
2. Independent eye-open/closed mesh and proper mouth-open/closed (not overpaint on a moving screenshot).
3. Physical head `X/Y/Z` turns; no detached chin/hair seams and no whole-image "floating".
4. Separate hair strands, ears, upper body, wings, and clothing with sane pivots and physics.
5. Seam and clipping checks over full parameter ranges and continuous loops; captured screenshots/GIF.
6. Native `.moc3` and `.model3.json` export loaded in a real WebGL runtime, plus editable sources.
7. Silent motion-only input; microphone and voice extraction disabled.
8. No production deployment or merge until user approves the motion preview.

**Current tests are toolchain smoke tests, not completion of the above acceptance criteria.**

## Safety

The workflow's token is read-only, no repository secrets are passed to the child tools, and the workflow does not upload assets or run Pages deployment. It checks out pinned upstream commits. No user's uploaded video is included.

### Run

```sh
bash benchmarks/avatar-rigging/run.sh mesh
bash benchmarks/avatar-rigging/run.sh still
bash benchmarks/avatar-rigging/run.sh psd
bash benchmarks/avatar-rigging/run.sh kit
bash benchmarks/avatar-rigging/run.sh cubism
```

When GitHub Actions executes, inspect each job's logs. A checked-out repository, compiled engine or prepared PSD request does **not** mean a finished character. This branch exists to make tool viability falsifiable before attempting a new rig.
