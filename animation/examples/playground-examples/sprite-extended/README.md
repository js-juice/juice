# Sprite Extended

`rocket-sprite` extends `animation-sprite` and maps yaw degrees to sprite frames.

## Uses
- `animation/examples/rocket-sprite.mjs`
- `animation/graphics/webgl/sprite-sheet.mjs`
- sprite sheet: `animation/examples/assets/rocket-yaw-sheet-med.png`

## Controls
- `timeline-controls`: Play/Pause/Step/Reset/Speed against the stage timeline
- Yaw sweep is timeline-driven (`sin(time * speed) * amplitude`) so reset/step stay deterministic
