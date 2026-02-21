# Juice Forms

Juice Forms is a web component form system with:

- Custom input elements (`input-text`, `input-select`, `input-checkbox`, `input-radio`, `input-textarea`)
- Inline field validation
- Form history support through `form-info` (undo/revert actions)
- Form runtime registration through `window.JUICE_FORMS`

## Files

- `components/input-component.js`: abstract base class for all custom inputs
- `components/input-text.js`: `input-text`
- `components/input-textarea.js`: `input-textarea`
- `components/input-checkbox.js`: `input-checkbox`
- `components/input-radio.js`: `input-radio`
- `components/input-select.js`: `input-select`
- `components/option-group.js`: `option-group`
- `components/juice-forms.js`: `juice-forms` container entry
- `components/form-info.js`: `form-info` state/actions panel
- `../data/validate/*`: shared validation engine (rules, parser, errors, presets, validator)
- `forms/Form.mjs`: form runtime integration and rule collection
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

## Optional Juice Config

An optional root config file (`juice.config.mjs`) is auto-loaded by the Juice Forms runtime when present.

Config is sectioned by domain:

- `forms`
- `ui`
- `validation` (colors, custom presets, custom error types)

Async validation presets are supported. If your preset takes a second `context` argument,
use `context.fetch(...)` to automatically cancel previous in-flight requests to the same endpoint.

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

## Important Notes

- `InputComponent` is abstract and is not registered as a custom element directly.
- Runtime uses safe dynamic import for `forms/Form.mjs`; if legacy form dependencies are missing, it logs a warning and continues without hard crash.
