# Juice UI

UI package extracted from `core/Components`.

## Current Scope

- `component.mjs`: primary component base class
- `components/scroll.mjs`: shared module containing both `ScrollBar` and `ScrollView`
- `components/keyboard/key.mjs`
- `components/keyboard/key-group.mjs`
- `components/gauge.mjs`: module containing `BarGauge`
- `components/shapes/2d/shape2d.mjs`
- `components/shapes/2d/circle.mjs`
- `components/shapes/2d/square.mjs`
- `components/lists.mjs`: shared module containing `SortableList` and `ExpandableList`
- `components/controls/checklist.mjs`: `Checklist` + `ChecklistItem`
- `components/controls/tabs.mjs`: `UITabs` + `UIContent`
- `components/graphics/progress.mjs`: `UIProgress`
- `components/graphics/index.mjs`: graphics category root
- `examples/*`: runnable component demos
- `tests/*.test.mjs`: minimal smoke tests

## Sibling Packages

- `../animation/index.mjs`: animation timeline/utilities package (kept outside `ui`)

## Migration Notes

- `ui/component.mjs` includes small cleanup/perf improvements:
  - removed duplicate static style registration in `initialize()`
  - reduced noisy logging behind `this.debug`
  - fixed falsey default handling in observable setup (`??` + strict undefined checks)
  - removed unused per-render attribute extraction work

## Next Migrations

- Move additional UI components from `core/Components/UI/*` into `ui/components/*`
