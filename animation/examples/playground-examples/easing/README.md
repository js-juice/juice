# Easing

Shows every easing function from `animation/easing.mjs` with:
- a mini curve preview
- a moving dot on a horizontal track
- live eased value (`0` to `1`)

Families include:
- linear
- quad/cubic/quart/quint
- sine/expo/circ
- back/elastic/bounce

## Uses
- `animation/easing.mjs`
- `animation/components/stage.mjs`
- `animation/components/timeline-controls.mjs`

## Controls
- Footer `timeline-controls` drives play/pause/step/reset/speed/reverse.
- All easing rows are sampled at the same timeline phase for direct comparison.
