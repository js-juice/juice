# js-juice

![js-juice logo](brand/logo-long.svg)

`js-juice` is an ES module monorepo for the Juice JavaScript framework. It contains the core runtime, shared configuration, data utilities, form web components, UI components, animation systems, brand/style assets, and the Squeeze Electron extraction tool.

This README intentionally excludes the `waiting/` directory.

## Requirements

- Node.js with ES module support
- npm
- Sass is installed through the root dev dependencies for brand/style builds

Install root dependencies:

```bash
npm install
```

## Root Entry Points

- `juice.js`: root framework entry point. It initializes shared config, exposes the global `juice` instance, provides dynamic import helpers, path helpers, event registration/dispatch, storage, queues, class blending, and `currentFile(import.meta)`.
- `config/juice-config.mjs`: shared configuration source for core, data, forms, and UI. It exports `configureJuice`, `extendJuiceConfig`, `getJuiceConfig`, `resetJuiceConfig`, and the `JUICE_CONFIG` proxy.
- `JSDOC_SPEC.js` and `JSDOC_EXAMPLE_FILE.js`: documentation standards and examples for public JSDoc.

Basic import:

```js
import juice, { config, currentFile } from "./juice.js";
import { configureJuice } from "./config/juice-config.mjs";

configureJuice({
    forms: {
        layout: {
            maxColumns: 2
        }
    }
});
```

## Repository Sections

### `core/`

Core framework modules shared across the repo.

- Runtime utilities under `core/Util/`
- Events under `core/Event/`
- DOM and observation helpers under `core/Dom/`
- Virtual DOM modules under `core/VirtualDom/`
- HTML parsing/relinking under `core/HTML/`
- Templates under `core/template/`
- Style parsing/SASS/CSS helpers under `core/Style/`
- Stream, file, asset, crypto, portal, client, proxy, queue, and storage helpers
- Legacy and shared component/form/animation/graphics modules that newer packages can migrate away from over time

Module docs: `core/README.md`

### `data/`

Data management modules for database access, models, validation, and formatting.

- `data/db/`: database abstraction, SQL builder, conditions, async/message-channel connections, and SQLite support
- `data/db/SQLite/`: SQLite database, boot, constants, migrations, migration history, worker, worker client, and remote database support
- `data/models/`: model, collection, model SQL builder, and model scaffolding helper
- `data/validate/`: UI-agnostic validation engine, rules, parser, presets, messages, error model, and events
- `data/format/`: string utilities, format presets, and format pipelines
- `data/examples/`: database, model, formatting, and validation examples

Useful examples:

```bash
node data/validate/examples.mjs
node data/format/examples/cli.mjs
```

Module docs:

- `data/README.md`
- `data/validate/README.md`
- `data/format/README.md`

### `forms/`

Web-component form system and native form enhancement layer.

- `forms/juice-forms.mjs`: browser bootstrap that registers form/input components, creates `window.JUICE_FORMS`, initializes forms on DOM ready, and exposes `JUICE_FORMS.refresh()`
- `forms/components/`: custom form elements such as `juice-form`, `input-text`, `input-number`, `input-select`, `input-checkbox`, `input-radio`, `input-textarea`, `input-button`, `input-buttonbar`, `input-fieldset`, `input-direction`, `input-dial`, `input-vector`, `input-status`, `option-group`, and `form-info`
- `forms/components/validation/`: form/input validation controller and error tag renderer backed by `data/validate`
- `forms/native/`: native `<form>` binders and enhancement utilities
- `forms/forms/`: form runtime and history modules
- `forms/compat/`: compatibility exports for older form consumers
- `forms/presets/`: layout, formatting, and validation presets
- `forms/index.html`, `forms/examples/`, and `forms/test.html`: browser demos and examples

Serve the repo root with a static server and open `forms/index.html` to run the main forms demo.

Module docs:

- `forms/README.md`
- `forms/components/validation/README.md`

### `ui/`

Standalone UI component package extracted from older core components.

- `ui/index.mjs`: package export root
- `ui/component.mjs`: primary component base class
- `ui/components/scroll.mjs`: `ScrollBar` and `ScrollView`
- `ui/components/keyboard/`: keyboard key and key group components
- `ui/components/gauge.mjs`: `BarGauge`
- `ui/components/shapes/2d/`: shape base, circle, and square
- `ui/components/lists.mjs`: `SortableList` and `ExpandableList`
- `ui/components/controls/`: checklist and tabs
- `ui/components/graphics/`: progress and graphics exports
- `ui/components/charting/`: chart data, chart visualization, grid, and area/bar/base/line/pie/scatter renderers
- `ui/components/staging/`: staged components and SASS pending stabilization or migration
- `ui/examples/`: runnable browser demos
- `ui/tests/`: Node test files for tabs, smoke coverage, and component base behavior

Module docs:

- `ui/readme.md`
- `ui/examples/readme.md`

### `animation/`

Timeline-driven animation package. This is the current source of truth for animation orchestration.

- `animation/index.mjs`: package export root
- `animation/timeline.mjs`, `time.mjs`, `tween.mjs`, `timeline-stepper.mjs`, `easing.mjs`, `history.mjs`: core timeline, timing, tweening, easing, stepping, and history helpers
- `animation/anchor.mjs`, `angles.mjs`, `body-target.mjs`, `path-to-bezier.mjs`, `utils.mjs`: geometry and animation utilities
- `animation/controllers/`: ramp/throttle controller exports
- `animation/properties/`: scalar/vector/position/rotation/scale/size/velocity/balanced property primitives
- `animation/particles/`: particle, emitter, and world modules
- `animation/components/`: DOM animation components such as body, body2d, background, camera, container, layer, marker, minimap, loop, particle world, sprite, stage, stats, timeline controls, and viewer
- `animation/components/canvas/`: canvas animation helpers and assets
- `animation/graphics/`: WebGL, matrix, projection, particle state, sprite sheet, and graphics exports
- `animation/examples/`: docs, lab pages, playground pages, and runnable examples
- `animation/backups/`: dated backup snapshots for particle-system work

Module docs:

- `animation/README.md`
- `animation/properties/README.md`
- `animation/properties/VECTOR_USAGE.md`

### `brand/`

Brand assets, documentation templates, stylesheet sources, and documentation tooling.

- Logo/icon source and exported assets: SVG, PNG, JPG, and AI files
- `brand/fonts/`: bundled web fonts and demos
- `brand/style/`: SCSS source for default, docs, forms, Juice, pages, and playground preview styling
- `brand/templates/`: compiled CSS, blank template, and shared HTML includes
- `brand/scripts/`: component/doc manifest generation and JSDoc refinement scripts
- `brand/tmp/`: analysis and rewrite helper scripts

Root SCSS build scripts compile `brand/style` into `brand/templates/css`.

### `styles/`

Standalone styles package.

- `styles/scss/`: SCSS source and helpers
- `styles/build/`: compiled CSS output
- `styles/package.json`: package-local Sass build/watch scripts

From `styles/`:

```bash
npm install
npm run build
npm run watch
```

### `squeeze/`

Electron app for extracting selected Juice modules with minimal dependencies.

- `squeeze/src/main.mjs`: Electron main process
- `squeeze/src/preload.mjs`: preload bridge
- `squeeze/src/dependency-service.mjs`: dependency tracing/extraction logic
- `squeeze/src/renderer/`: renderer HTML, styles, images, and UI logic
- `squeeze/forge.config.mjs`: Electron Forge packaging config

From `squeeze/`:

```bash
npm install
npm start
npm run package
npm run make
```

Module docs: `squeeze/README.md`

## Root Scripts

Defined in root `package.json`:

- `npm run scss:build`: compile `brand/style` SCSS into `brand/templates/css`
- `npm run scss:watch`: watch and compile `brand/style` SCSS into `brand/templates/css`
- `npm test`: run `ui/tests/*.test.mjs`
- `npm run test:ui`: run `ui/tests/*.test.mjs`
- `npm run manifest:animation-components`: run `animation/components/generate-component-manifest.mjs`

The root package also contains manifest/docs script names that reference a root `scripts/` directory. In this checkout, the matching script files are under `brand/scripts/`, so verify the script path before using those commands.

## Testing

Run the root UI test suite:

```bash
npm test
```

Run a syntax check on an edited module when making targeted changes:

```bash
node --check path/to/file.mjs
```

## Development Notes

- Keep shared behavior anchored to one source of truth. The shared config module is `config/juice-config.mjs`; validation logic lives in `data/validate`; animation orchestration lives in `animation/`.
- Prefer direct module imports from each section's package root when one exists, such as `animation/index.mjs` or `ui/index.mjs`.
- Browser demos need to be served from the repo root so relative ES module imports resolve correctly.
- `node_modules/` and generated/build output are not project source sections.

## Module Readmes

- `core/README.md`
- `data/README.md`
- `data/validate/README.md`
- `data/format/README.md`
- `forms/README.md`
- `forms/components/validation/README.md`
- `ui/readme.md`
- `ui/examples/readme.md`
- `animation/README.md`
- `animation/properties/README.md`
- `squeeze/README.md`
