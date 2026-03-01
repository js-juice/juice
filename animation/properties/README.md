# Animation Properties

This folder contains property primitives used by animation systems.

## Import

```js
import {
  AnimationValue,
  Rotation,
  Rotation2D,
  Rotation3D,
  Vector2D,
  Vector3D,
  Vector4D,
  Position2D,
  Position3D,
  Scale,
  Size2D,
  Size3D,
  Velocity,
  Balanced
} from "./index.mjs";
```

## Which Type To Use

- `number` (fastest): use for hot loops where you only need math.
- `AnimationValue`: use for one scalar when you need locking, dirty checks, or typed setter behavior.
- `Vector2D/3D/4D`: use for grouped coordinates and vector math APIs.
- `Position2D/3D`: semantic alias for vectors when value means position.
- `Rotation`: single wrapped/clamped angle.
- `Rotation2D/Rotation3D`: grouped rotations per axis.
- `Scale`: single scale factor.
- `Size2D/Size3D`: dimensions with dirty tracking helpers.
- `Velocity`: cartesian/polar velocity helper.
- `Balanced`: center-seeking value with acceleration/deceleration.

## Proper Usage

### `AnimationValue` (`Value.mjs`)

Use for scalar state that needs behavior beyond a plain number.

```js
const opacity = new AnimationValue(1, { type: "float", history: 3 });
opacity.value = 0.8;
if (opacity.dirty) opacity.save();
```

### `Vector2D/3D/4D` (`Vector.mjs`)

Use mutate-in-place methods (`set`, `add`, `subtract`) in render/update loops.

```js
const pos = new Vector3D(0, 0, 0, { trackDirty: true, history: 3 });
pos.add(1, 0, 0);
if (pos.dirty) pos.save();
```

For richer examples, see `animation/properties/VECTOR_USAGE.md`.

### `Position2D/3D` (`Position.mjs`)

Use when you want semantic clarity (`position` instead of generic `vector`).

```js
const position = new Position2D(100, 40);
position.x += 10;
```

### `Rotation`, `Rotation2D`, `Rotation3D` (`Rotation.mjs`)

Use `Rotation` for one axis with wrap/clamp, `Rotation3D` for multi-axis state.

```js
const rot = new Rotation(350);
rot.value += 20; // wraps in loop mode

const euler = new Rotation3D(0, 0, 0);
euler.y = 90;
```

### `Scale` (`Scale.mjs`)

Use for scalar scale values.

```js
const scale = new Scale(1);
scale.value = 1.2;
```

### `Size2D/Size3D` (`Size.mjs`)

Use when dimension dirtiness matters for layout or redraw decisions.

```js
const size = new Size2D(120, 40);
size.x = 140;
if (size.dirty) {
  // re-layout
  size.clean();
}
```

### `Velocity` (`Velocity.mjs`)

Use when you need velocity components plus angle/speed conversion helpers.

```js
const vel = new Velocity("cartesian");
vel.applyForce(0.5, -0.2);
const speed = vel.toSpeed();
```

### `Balanced` (`Balanced.mjs`)

Use for values that should return toward a center with acceleration/deceleration.

```js
const springLike = new Balanced(100, { center: 0, maxSpeed: 2 });
springLike.direction(1);
springLike.update(0.016);
```

## Performance Notes

- Prefer `number` over wrapper classes in the hottest per-frame code.
- Prefer in-place mutation (`set`, `add`, `subtract`) over methods that allocate new objects.
- Enable history/dirty/freezable features only when needed.
- Avoid console/logging paths in animation loops.
- Keep property wrappers at system boundaries (API/state), and use raw numbers inside tight math loops.
