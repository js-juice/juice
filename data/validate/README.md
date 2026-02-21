# Validation Core

Core validation engine for data rules, rule execution, and error lifecycle.

This folder is intentionally UI-agnostic. Form/input UI orchestration docs live in `forms/components/validation/README.md`.

## Docs

- `data/validate/README.md`: core setup, rules, API, extensibility.
- `data/validate/EVENTS.md`: core validator emitter events.
- `data/validate/examples.mjs`: runnable core validation examples.
- `forms/components/validation/README.md`: form/input integration (`FieldValidationController`, DOM events, status UI, colors).

## Examples

- Core examples file: [`data/validate/examples.mjs`](./examples.mjs)
- Forms demo file: [`forms/index.html`](../../forms/index.html)

Run core examples:

```bash
node data/validate/examples.mjs
```

## Core Modules

- `data/validate/Validator.mjs`: public API (`make`, `watchObject`) and validator runtime.
- `data/validate/Rules.mjs`: per-property orchestration and error-type diffs.
- `data/validate/Rules/Parser.mjs`: string/array rule parser.
- `data/validate/Rules/RuleSet.mjs`: rules for a single property.
- `data/validate/Rules/Rule.mjs`: execution of one rule + async context/cancellation helpers.
- `data/validate/Errors.mjs`: active error store and validator emitter events.
- `data/validate/Messages.mjs`: message templates and aliases.
- `data/validate/Presets.mjs`: built-in preset functions and dynamic preset registration.
- `data/validate/ValidationUtil.mjs`: helpers (`empty`, `type`, `arrayDiff`).
- `data/validate/Emitter.mjs`: lightweight event emitter.

## Quick Start

### Validate a Single Field

```js
import Validator from "./Validator.mjs";

const validator = Validator.make({
    email: "required|email"
});

const valid = await validator.test("email", "hello@example.com");
console.log(valid); // true | false
console.log(validator.messages("email")); // string[]
```

### Validate a Data Object

```js
import Validator from "./Validator.mjs";

const validator = Validator.make({
    email: "required|email",
    age: "required|number|min:18"
});

const ok = await validator.validate({
    email: "bad",
    age: 14
});

console.log(ok); // false
console.log(validator.errorsOf("age"));
```

### Auto-Validate With Proxy

```js
import Validator from "./Validator.mjs";

const user = Validator.watchObject(
    { email: "" },
    { email: "required|email" }
);

user.email = "broken";
console.log(user.validator.messages("email"));
```

## Rule Declarations

Supported formats:

```js
"required|min:3|email"
["required|min:3", ["equals", "ABC"]]
```

Parser behavior:

- `a-z0-9` shorthand normalizes to `chars:a-z0-9`.
- Args after `:` split on commas.
- Unknown rule types pass if no preset function exists.

## Built-In Presets

Provided by `data/validate/Presets.mjs`:

- Required/value: `required`, `empty`, `notEmpty`, `null`, `in`, `equals`
- Type: `string`, `text`, `number`, `array`, `boolean`, `object`, `int`, `integer`, `timestamp`
- Range/length: `min`, `max`, `length`
- Format: `email`, `phone`, `address`, `postal`, `chars`, `sha256`

Behavior notes:

- Empty non-required values are treated as valid.
- Empty + `required` returns only the `required` failure for that pass.

## Public API

`Validator`:

- `Validator.make(rules, data?, scope?)`
- `Validator.watchObject(target, rules, options?)`

`ValidatorInstance`:

- `validator.test(field, value): Promise<boolean>`
- `validator.validate(data): Promise<boolean>`
- `validator.addRule(property, rules)`
- `validator.hasRule(property, ruleType): boolean`
- `validator.errorsOf(property): ValidationError[]`
- `validator.messages(field?): string[] | Record<string, string[]>`
- `validator.errors` (`ValidationErrors`)
- `validator.debug` (`boolean`)

## Core Error Model

`ValidationError` (`data/validate/Errors.mjs`) includes:

- `name`, `code`, `type`, `property`, `args`, `value`, `scope`, `rule`, `message`
- `onResolved(fn)`, `resolve()`
- `toJSON()`

Typed error mapping is defined in `data/validate/Presets.mjs` (`ERROR_TYPES`).

## Core Configuration

Validation core config (non-UI):

- `validation.presets`: custom preset functions
- `validation.errorTypes`: custom typed errors by rule key

Example:

```js
import { configureJuice } from "../../forms/config/JuiceConfig.mjs";
import { ValidationError } from "./Errors.mjs";

class UsernameTakenError extends ValidationError {}

configureJuice({
    validation: {
        presets: {
            async username(value, context) {
                if (!value) return true;
                const response = await context.fetch(`/api/users/check?username=${encodeURIComponent(value)}`);
                const payload = await response.json();
                return payload.available === true;
            }
        },
        errorTypes: {
            username: UsernameTakenError
        }
    }
});
```

## Async Context

Async preset functions can receive a validation context:

- `context.signal`
- `context.aborted()`
- `context.fetch(url, options?)` with stale-request cancellation

Context is passed when either:

- `fn.usesValidationContext === true`
- function arity indicates an extra context parameter

## Message Templates

`data/validate/Messages.mjs`:

- `ValidationMessages.add(type, template)`
- `ValidationMessages.addAlias(field, displayName)`

Tokens:

- `%s` scalar values
- `%a...` joined args
- `%v` current value
