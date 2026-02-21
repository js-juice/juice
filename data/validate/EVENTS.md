# Validation Core Events

This file documents emitter events from the core validator runtime.

For input/form DOM events (`validation:change`, `validation:invalid`, etc.), see `forms/components/validation/README.md`.

## Event System

Core events are emitted through `ValidatorInstance` (`validation/Validator.mjs`) using the internal emitter from `validation/Emitter.mjs`.

Subscribe with:

```js
validator.on("error", (property, error) => {});
```

## Event Signatures

```ts
type ValidatorEvents = {
    error: (property: string, error: ValidationError) => void;
    resolve: (property: string, removedTypes: string[]) => void;
    "property:invalid": (property: string) => void;
    "property:valid": (property: string) => void;
    invalid: (property: string) => void;
    valid: (property: string) => void;
};
```

## Event Details

### `error`

- Fired for each newly added error in the current diff.
- Source: `ValidationErrors.set(...)`.

Args:

- `property`: property key.
- `error`: `ValidationError` instance (or typed subclass).

### `resolve`

- Fired when one or more error types are resolved/removed.
- Source: `ValidationErrors.resolve(...)`.

Args:

- `property`: property key.
- `removedTypes`: removed rule type names.

### `property:invalid`

- Fired when a property transitions from zero errors to one or more.

Args:

- `property`: property key.

### `property:valid`

- Fired when a property transitions from one or more errors to zero.

Args:

- `property`: property key.

### `invalid`

- Fired when validator global state transitions from valid to invalid.

Args:

- `property`: the property that triggered the transition.

### `valid`

- Fired when validator global state returns to valid (no properties with errors).

Args:

- `property`: the property that completed the transition.

## Error Payload Shape

`error` listeners receive a `ValidationError` instance with:

```ts
type ValidationError = Error & {
    name: string;
    code: string;
    type: string;
    property: string;
    args: unknown[];
    value: unknown;
    scope: unknown;
    rule: unknown;
    message: string;
    onResolved(fn: () => void): void;
    resolve(): void;
    toJSON(): {
        name: string;
        code: string;
        type: string;
        property: string;
        args: unknown[];
        value: unknown;
    };
};
```
