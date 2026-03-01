# Viewer With Stage

Second foundational example: `animation-viewer` hosting an `animation-stage`.

## Uses
- `animation/components/viewer.mjs`
- `animation/components/stage.mjs`

## Focus
- Viewer + stage hierarchy
- Timeline ownership through viewer
- Stage camera movement via viewer follow target
- Additional stage drift/tilt motion on top of camera translation
- Scene behavior encapsulated inside the `demo-moving-stage` component

## Notes
- Timeline owner in this example: `viewer.timeline`.
- Stage timeline is not used while attached to viewer.
- Footer controls use `timeline-controls`.
- Most behavior logic lives in `javascript.before.mjs` and `javascript.mjs`.
