# Juice Animation

Animation runtime modules for JS Juice.

## Design Priority

Everything in `animation/` is optimized for:

- Speed in the frame loop
- Usability for application developers

This package is the source of truth for timeline-driven animation orchestration.

## Current Modules

- `index.mjs`: animation package exports
- `time.mjs`: animation time state helper (delta/fps/frame tracking)
- `anchor.mjs`: anchor parsing helpers (`parseAnchor`, `parseAnchorPosition`)
- `timeline.mjs`: centralized timeline/ticker runtime
- `easing.mjs`: easing curves and `Ease` helper
- `tween.mjs`: tween helper for value interpolation
- `timeline-stepper.mjs`: keyframe-based property stepping helper
- `path-to-bezier.mjs`: converts SVG path data into Bezier curve segments
- `history.mjs`: value history helper for tracking prior states
- `controllers/`: controller modules (`index.mjs`, `ramp.mjs`)
- `graphics/`: animation-focused graphics modules (`webgl/sprite-sheet.mjs`)
- `angles.mjs`: angle conversion and circle/tangent geometry helpers
- `particles/`: particle modules (`particle.mjs`, `emitter.mjs`, `world.mjs`)
- `properties/`: animation property primitives (value, vector, rotation, scale, size, velocity, position)
- `components/`: animation DOM components (`animation-component.mjs`, `background.mjs`, `body.mjs`, `body2d.mjs`, `camera.mjs`, `container.mjs`, `layer.mjs`, `loop.mjs`, `marker.mjs`, `particle-world.mjs`, `particles.mjs`, `sprite.mjs`, `stage.mjs`, `stats.mjs`, `viewer.mjs`)
- `components/canvas/`: animation canvas helpers (`animation-canvas.mjs`, `asset.mjs`, `shapes.mjs`)
- `utils.mjs`: animation math utilities and rendering helpers
- `examples/`: standalone animation example pages

## Performance Notes

- Uses one centralized ticker loop for active timelines.
- Timelines auto-idle when no update/render work is registered.
- Paused/stopped timelines deactivate until explicitly started/played.
- Time scaling and reverse playback are built into the hot path.
