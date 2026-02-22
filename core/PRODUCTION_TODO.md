# Core Production TODO

Use this checklist to track production-readiness work in `core/`.

## Critical Fixes

- [ ] Fix undefined `Composite` usage in `Juice.blend()` (`core/Core.mjs`).
- [ ] Fix `callstack` vs `callStack` naming mismatch in call tracking (`core/Core.mjs`).
- [ ] Fix undefined `name` usage in `updateInputs()` (`core/Components/Form/Form.mjs`).
- [ ] Fix missing helper imports/usages in `TargetInput` (`core/Form/CustomInputs/TargetInput.mjs`).
- [ ] Rename malformed file `particleOrbit.mjs]` to `particleOrbit.mjs` and update references (`core/Graphics/Particles/`).

## High Priority Cleanup

- [ ] Implement or remove placeholder module `core/Components/Form/Forms.mjs`.
- [ ] Consolidate duplicate `InputName` implementations:
  - `core/Form/InputName.mjs`
  - `core/Components/Form/InputName.mjs`
- [ ] Consolidate/remove duplicate sprite sheet module:
  - `core/Graphics/WebGL/SpriteSheet.mjs`
  - `core/Graphics/WebGL/SpriteSheet copy.mjs`
- [ ] Move/remove non-production test artifact in `core/Dom/Observe/test.js`.

## Runtime Logging Cleanup

- [ ] Remove or gate debug logs in runtime paths (use a debug flag where needed):
  - `core/Graphics/WebGL/SpriteSheet.mjs`
  - `core/Components/Animation/Viewer.mjs`
  - `core/Template/Token.js`
  - `core/Template/Template.mjs`
  - and other core runtime files with direct `console.log`

## Packaging and Module Consistency

- [ ] Standardize module strategy for core (`.mjs`/ESM vs `.js`/CommonJS behavior).
- [ ] Ensure package config and file extensions align with runtime/build expectations.
- [ ] Validate import/export compatibility across all `core/` entry points.

## Quality Gates

- [ ] Add lint configuration for `core/`.
- [ ] Add automated tests for:
  - Core runtime (`Core.mjs`)
  - Form system (`core/Form`, `core/Components/Form`)
  - Virtual DOM (`core/VirtualDom`)
  - WebGL hot paths (`core/Graphics/WebGL`)
- [ ] Add CI checks (lint + tests + build/validation).
- [ ] Define release criteria (versioning, changelog, API stability/deprecations).

## Workflow

- [ ] Work items in order: Critical Fixes -> High Priority Cleanup -> Runtime Logging -> Packaging -> Quality Gates.
- [ ] After each completed item, update this file and commit with a focused message.
