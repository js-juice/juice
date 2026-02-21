# Validation UI Controller

UI/form integration layer for validation.

This folder contains modules that bind `data/validate/*` core logic to form components, DOM validity state, visual status, and DOM events.

## Modules

- `components/validation/FieldValidationController.mjs`
- `components/validation/ErrorTagRenderer.mjs`

## Examples

- Forms demo file: [`forms/index.html`](../../index.html)
- Core validation examples file: [`data/validate/examples.mjs`](../../../data/validate/examples.mjs)

## What FieldValidationController Does

`FieldValidationController` is used by `components/input-component.js` and is responsible for:

- deriving rule strings from explicit attributes and native constraints
- creating/updating the core validator (`Validator.make(...)`)
- running validation and mapping errors to `ElementInternals.setValidity(...)`
- applying host status classes and `validation-state`
- emitting DOM validation events
- resolving status colors from global config and host overrides

## Rule Sources on Inputs

Rules come from:

- explicit attributes: `validation`, `validate`
- native-like attributes: `required`, `minlength`, `maxlength`, `min`, `max`, `pattern`, `type`

Derived rules are merged without duplicate rule types.

Example:

```html
<input-text
    name="email"
    required
    type="email"
    minlength="5"
    validation="max:60">
</input-text>
```

This yields a merged rule string equivalent to:

```txt
required|min:5|max:60|email
```

## DOM Events Emitted by Input Hosts

Events are emitted with:

- `bubbles: true`
- `composed: true`

Event names:

- `validation:change`: every validation update
- `validation:statechange`: only when state changes
- `validation:valid`: when state is `valid`
- `validation:invalid`: when state is `invalid`
- `validation:incomplete`: when state is `incomplete`

### Event Detail Payload

```ts
type ValidationEventDetail = {
    status: "none" | "valid" | "incomplete" | "invalid";
    valid: boolean;
    invalid: boolean;
    incomplete: boolean;
    complete: boolean;
    color: string;
    colors: {
        none: string;
        valid: string;
        incomplete: string;
        invalid: string;
    };
    property: string;
    value: unknown;
    rules: string;
    messages: string[];
    message: string;
    errors: Array<{
        type: string;
        message: string;
        property: string;
        args: unknown[];
    }>;
};
```

State meanings:

- `none`: no active validation rules
- `valid`: rules exist and field is valid
- `incomplete`: field focused and invalid only because of `{required,min,length}`
- `invalid`: any other invalid state

## Host State and Styling Hooks

Applied by controller:

- classes: `has-validation`, `is-valid`, `is-incomplete`, `is-invalid`
- attribute: `validation-state="valid|incomplete|invalid"` (removed for `none`)
- `--validation-color` CSS var on the input root

## Global UI Config

UI-facing validation config in `juice.config.mjs` / `configureJuice(...)`:

- `validation.colors.none`
- `validation.colors.valid`
- `validation.colors.incomplete`
- `validation.colors.invalid`

These also set global CSS variables:

- `--juice-validation-color-none`
- `--juice-validation-color-valid`
- `--juice-validation-color-incomplete`
- `--juice-validation-color-invalid`

Per-field overrides:

- `validation-color`
- `validation-color-valid`
- `validation-color-incomplete`
- `validation-color-invalid`
- `validation-color-none`

## ErrorTagRenderer

`components/validation/ErrorTagRenderer.mjs` provides optional DOM helpers:

- `formatErrorTagText(error)`
- `createErrorTag(error, options?)`
- `mountErrorTag(error, container, options?)`

Useful for custom error tag UI when you want an adapter independent from core validation state management.

## Usage Example

```js
const field = document.querySelector('input-text[name="email"]');

field.addEventListener("validation:change", (event) => {
    const { status, message, errors } = event.detail;
    console.log(status, message, errors);
});
```
