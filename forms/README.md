# Juice Forms

Juice Forms is a web component form system with:

- Custom input elements (`input-text`, `input-select`, `input-checkbox`, `input-radio`, `input-textarea`)
- Custom input elements (`input-text`, `input-select`, `input-checkbox`, `input-radio`, `input-textarea`, `input-button`)
- Inline field validation
- Form history support through `form-info` (undo/revert actions)
- Form runtime registration through `window.JUICE_FORMS`

## Files

- `components/input-component.mjs`: abstract base class for all custom inputs
- `components/input-text.mjs`: `input-text`
- `components/input-textarea.mjs`: `input-textarea`
- `components/input-checkbox.mjs`: `input-checkbox`
- `components/input-radio.mjs`: `input-radio`
- `components/input-select.mjs`: `input-select`
- `components/input-button.mjs`: `input-button`
- `components/option-group.mjs`: `option-group`
- `components/juice-forms.mjs`: `juice-forms` container entry
- `components/form-info.mjs`: `form-info` state/actions panel
- `native/juice-form.mjs`: native form binder and enhancer class (`JuiceForm`)
- `native/form-input.mjs`: migrated form input base class
- `native/virtual-builder.mjs`: migrated virtual form builder utilities
- `../data/validate/*`: shared validation engine (rules, parser, errors, presets, validator)
- `forms/Form.mjs`: runtime bridge to migrated compatibility `Form` class
- `compat/Form/*`: remaining legacy helpers pending migration
- `compat/Components/Form/Form.mjs`: compatibility export for legacy `Form.fromVDom(...)` consumers
- `juice-forms.mjs`: runtime bootstrap entry
- `index.html`: demo page

## Quick Start

1. Serve the project with a static server.
2. Open `index.html`.
3. Inputs are registered by `juice-forms.mjs`.
4. Validation runs automatically for inputs with `validation` or `validate` attributes.

## Examples

- Forms demo file: [`forms/index.html`](./index.html)
- Forms template-based examples page: [`forms/examples/index.html`](./examples/index.html)
- Core validation examples file: [`data/validate/examples.mjs`](../data/validate/examples.mjs)

## Shared Juice Config

Juice Forms reads config from the shared root module `config/juice-config.mjs`.

Config is sectioned by domain:

- `forms`
- `ui`
- `validation` (colors, custom presets, custom error types)

Async validation presets are supported. If your preset takes a second `context` argument,
use `context.fetch(...)` to automatically cancel previous in-flight requests to the same endpoint.

Example:

```js
import { configureJuice } from "../config/juice-config.mjs";

configureJuice({
  forms: {
    layout: {
      maxColumns: 2
    }
  }
});
```

## Validation Usage

Use either `validation` or `validate` on an input component.

```html
<input-text
  name="username"
  label="Username"
  validation="required|min:3|max:20|a-z0-9"
></input-text>
```

Notes:

- `a-z0-9` shorthand is supported and normalized to a `chars` rule.
- Validation messages render in each component's validation area.
- Form-associated validity is updated through `ElementInternals.setValidity(...)` when available.

## Supported Rule Syntax

Pipe-delimited string rules:

- `required`
- `min:<n>`
- `max:<n>`
- `length:<min>,<max>`
- `email`
- `phone`
- `address`
- `postal`
- `int` / `integer`
- `string`
- `number`
- `array`
- `boolean`
- `object`
- `timestamp`
- `equals:<value>`
- `in:<a>,<b>,<c>`
- `chars:<allowed-char-class>`
- shorthand `a-z0-9` style token (maps to `chars:...`)

## Form Runtime Wiring

`juice-forms.mjs` creates `window.JUICE_FORMS` and initializes on DOM ready.

Behavior:

- Dynamically imports `./forms/Form.mjs`
- Collects native `<form>` and forms inside `<juice-forms>`
- Creates one `Form` instance per form element
- Supports `JUICE_FORMS.refresh()` to pick up DOM changes

## `forms/Form.mjs` Validation Integration

The `Form` class now:

- Imports root validator from `../../data/validate/Validator.mjs`
- Collects rules from form controls using:
  - `validation`
  - `validate`
  - `required` (auto-prepends `required` if missing)
- Calls validator `test(name, value)` on both `input` and `changed` events

## Programmatic Validator Usage

```js
import Validator from "../data/validate/Validator.mjs";

const validator = Validator.make({
  username: "required|min:3|a-z0-9"
});

const ok = await validator.test("username", "john123");
const messages = validator.messages("username");
```

## Native Form Enhancers

`forms/native` is the home for enhancements that target already-native `<form>` markup.

Example:

```js
import JuiceForm from "./native/index.mjs";

JuiceForm.register("autosave", (form, jf) => {
  if (!jf.config.autosave) return;
  form.dataset.autosave = "enabled";
});

const form = document.querySelector("form");
const bound = new JuiceForm(form); // binds this form to Juice native enhancements

// Optional: bind every native form under a root
JuiceForm.enhanceAll(document);
```

By default, `new JuiceForm(form)` auto-enhances native controls (`input`, `textarea`, `select`).
To opt a control (or a wrapper subtree) out, use either:

- attribute: `juicex`
- class: `juicex`

## Important Notes

- `InputComponent` is abstract and is not registered as a custom element directly.
- Runtime uses safe dynamic import for `forms/Form.mjs`; if legacy form dependencies are missing, it logs a warning and continues without hard crash.
