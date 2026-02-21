# js-juice

Monorepo containing core library, data layer, forms module, brand assets, and squeeze tooling.

## Root Directory Guide

### `core/`
Core Juice framework modules shared across the repo.

- Runtime primitives and utilities
- DOM and Virtual DOM modules
- Events, proxy/watch, templates, styles
- Graphics/animation/UI building blocks

### `data/`
Data layer for persistence, validation, and formatting.

- SQL/database access and SQLite support (`db/`)
- Model and collection abstractions (`models/`)
- Validation engine, rules, messages, presets (`validate/`)
- Data/string formatting pipeline and presets (`format/`)
- Usage examples (`examples/`)

### `forms/`
Web-component based forms module.

- Custom input components (`components/`)
- Form runtime behavior and history (`forms/`)
- Config and presets
- Demo pages (`index.html`, `examples/`, `test.html`)

### `brand/`
Brand and UI assets used by the project.

- Logos/icons and design files
- SCSS sources (`style/`)
- Compiled CSS and template HTML (`templates/`)

### `squeeze/`
Electron app for extraction/tooling workflows.

- Electron process code (`src/main.js`, `src/preload.js`)
- Renderer UI and assets (`src/renderer/`)
- Packaging/build config (`forge.config.js`)

### Root files

- `README.md`: Repository overview
- `package.json`: Root scripts and dependencies
- `package-lock.json`: Locked dependency versions
- `.gitignore`: Ignore rules

## Install

```bash
npm install
```

## Root Scripts

- `npm run scss:build`
- `npm run scss:watch`
- `npm test`

## Module Readmes

- `core/README.md`
- `data/README.md`
- `forms/README.md`
- `squeeze/README.md`
