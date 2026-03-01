# Custom Easing

Interactive custom easing creator.

Click the curve to add more points, then drag points to shape the easing.
Each point has a tangent handle to control local smoothing.
The curve is evaluated with piecewise cubic interpolation between all points.

## Uses
- `animation/components/stage.mjs`
- `animation/components/timeline-controls.mjs`

## Controls
- Footer `timeline-controls` drives play/pause/step/reset/speed/reverse.
- Click on the blue curve to insert a point.
- Drag blue point handles to move points.
- Drag orange tangent handles to adjust smoothness at each point.
- Copy the generated CSS easing function from the `CSS Easing` field.
