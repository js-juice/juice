# Stage

`animation-stage` is the world container for animation content.

This example runs stage in standalone mode (no viewer parent), so stage owns a local timeline.

## Uses
- `animation/components/stage.mjs`

## What This Example Shows
- A stage filling the viewport area
- A probe element animated by `stage.addAnimator({ update, render })`
- Stage staying static while content inside it animates

## Attributes You Can Change
- `width`: stage width in pixels when set as a number (for example `stage.width = 1200` or `width="1200"`).
- `height`: stage height in pixels.
- `fps`: local stage timeline fps in standalone mode.
- `x`: stage x offset route value (primarily used when inside a viewer).
- `y`: stage y offset route value (primarily used when inside a viewer).
- `anchor`: anchor string value.
- `parallax`: boolean attribute to enable parallax transform path.

## Methods You Can Call
- `stage.addAnimator(animator)`: register an animator object with `update(time)` and/or `render(time)`.
- `stage.addBackground(element, options)`: append background elements to world/parallax layers.
- `stage.moveTo(x, y)`: set stage position values.
- `stage.move(dx, dy)`: add delta to stage position values.

## Useful Runtime Properties
- `stage.timeline`: active timeline used by this stage.
- `stage.viewer`: viewer instance when wrapped by `animation-viewer`, otherwise `null`.

## Quick Examples
```js
const stage = document.getElementById("stage");
stage.width = 1400;
stage.height = 800;
stage.fps = 120;
```

```js
stage.addAnimator({
  update(time) {
    // time.delta is seconds
  },
  render() {
    // write DOM updates here
  }
});
```

## Timeline Ownership
- Standalone stage: stage uses its local timeline.
- Stage inside viewer: ownership shifts to `viewer.timeline`.
