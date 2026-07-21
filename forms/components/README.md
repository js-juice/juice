# Juice Input Components

Use `input-image.mjs` as the current reference pattern for new value-bearing Juice inputs.

The base `InputComponent` uses class-owned definitions: `static config` for behavior defaults, `static observed` for additional observed attributes, `static html()` for markup, and `static styles` for scoped styles. Only override lower-level instance methods for runtime behavior.

## Basic Shape

```js
import InputComponent from "./input-component.mjs";

class InputExampleComponent extends InputComponent {
    static tag = "input-example";

    static config = {
        native: {
            tag: "input",
            attrs: {
                type: "text"
            }
        }
    };

    static get observed() {
        return ["example-option"];
    }

    constructor() {
        super({ _layout: "label:input:>:default:status:<:validation" });
        this.inputType = "example";
        this._button = null;
    }

    static html() {
        return `
            <div class="example-input">
                <button class="example-button" type="button">Choose</button>
                <native></native>
            </div>
        `;
    }

    static get styles() {
        return {
            ".example-input": {
                display: "grid",
                gap: "0.5rem"
            },
            "input.native": {
                display: "none"
            }
        };
    }

    _afterRender() {
        this._button = this._dom.default?.querySelector(".example-button") || null;
        this._button?.addEventListener("click", () => this._dom.native?.focus());
    }
}

customElements.define(InputExampleComponent.tag, InputExampleComponent);

export default InputExampleComponent;
```

Register the file in `resources/js/juice/forms/index.mjs`.

```js
import "./components/input-example.mjs";
```

## Native Controls

Declare the native control in `static config.native`.

```js
static config = {
    native: {
        tag: "input",
        attrs: {
            type: "file",
            accept: "image/*"
        }
    },
    validation: false
};
```

`InputComponent` creates the native element, stores it in `this._dom.native`, tracks all native controls in `this._native`, binds native events, syncs value, and mounts the native control into the layout.

For multiple native controls, `native` can be an array. Use `ref` to name a control and place it with `<native ref="name"></native>` or `data-native="name"`.

## Component Config

`InputComponent` reads `this.constructor.config` through `getConfigValue()`. These are the component-level keys the base currently knows about:

```js
static config = {
    value: { type: "string", default: "" },
    native: { tag: "input", attrs: { type: "text" } },
    format: undefined,
    validation: undefined
};
```

### `native`

Defines the native control or controls. The base uses this when `_createNativeControl()` is not overridden.

Single native control:

```js
static config = {
    native: {
        tag: "input",
        attrs: {
            type: "file",
            accept: "image/*"
        }
    }
};
```

Multiple native controls:

```js
static config = {
    native: [
        {
            ref: "x",
            tag: "input",
            attrs: { type: "number", name: "x" }
        },
        {
            ref: "y",
            tag: "input",
            attrs: { type: "number", name: "y" }
        }
    ]
};
```

Supported native entry keys:

- `tag`: native element tag name. Defaults to `input`.
- `attrs`: attributes applied to the native element.
- `attributes`: alias for `attrs`.
- `ref`: optional lookup name for multiple native controls.

Attribute values:

- `true`: writes a boolean attribute.
- `false`, `null`, `undefined`: skips the attribute.
- any other value: stringified and written as an attribute.

`native` can also be an actual `HTMLElement`, or an array containing config objects and/or `HTMLElement` instances.

Created controls are stored in:

- `this._dom.native`: first native control.
- `this._native`: array of native controls.
- `this._native[ref]`: named native control when `ref` is provided.

### `format`

Defines the default format pipeline for native controls that support `.value`.

```js
static config = {
    format: "trim|lower"
};
```

Accepted forms:

- string: `"trim|lower"` or a single formatter name
- array: `["trim", "lower"]`
- function: custom pipeline function
- `false`: disables formatting
- `null`, `undefined`, `""`: no component-level format

Format precedence:

1. Host `format` attribute.
2. Component `static config.format`.
3. `forms.inputs.<type>.format` or `forms.inputs.<type>.formats`.
4. Shared `forms.format` or `forms.formats`.
5. Formatter inferred from validation preset metadata.

`format="false"` on the host disables formatting.

### `validation` / `validate`

Defines component-level validation rules. `validate` is an alias read when `validation` is not present.

```js
static config = {
    validation: "required|max:255"
};
```

Accepted forms:

- string: `"required|max:255"`
- array: `["required", "max:255"]`
- function: custom validation rule
- array containing functions
- `false`, `null`, `undefined`, `""`: no component-level validation

The base normalizes function rules to custom validation entries. Normal native constraints still come from observed attributes such as `required`, `maxlength`, `min`, `max`, and `pattern`.

### `value`

The base default config declares:

```js
value: { type: "string", default: "" }
```

`input-component.mjs` does not currently read `static config.value` during its lifecycle. Treat it as metadata unless another owner consumes it.

## Juice Forms Config

The base also reads shared Juice config through `getJuiceConfig("forms")`.

Shared form config:

```js
configureJuice({
    forms: {
        style: {},
        format: "trim",
        formatters: {}
    }
});
```

Per-input type config:

```js
configureJuice({
    forms: {
        inputs: {
            image: {
                attributes: {
                    button-label: "Upload image"
                },
                styles: {
                    ".image-button": {
                        background: "#111827"
                    }
                },
                format: "trim",
                formatters: {}
            }
        }
    }
});
```

Supported shared/per-type keys:

- `style`: style map.
- `styles`: alias for `style`.
- `format`: format pipeline spec.
- `formats`: alias for `format`.
- `formatter`: formatter map.
- `formatters`: alias for `formatter`.
- `attributes`: per-type default host attributes. Only used under `forms.inputs.<type>`.

Per-type lookup uses `this.inputType` first. If `this.inputType` is empty, it derives the type from the element tag by removing the `input-` prefix.

## View Markup

Use `static html()` for the visible component UI. Markup does not belong in `static config`.

```js
static html() {
    return `
        <div class="image-input">
            <canvas class="image-canvas" part="canvas"></canvas>
            <div class="image-actions">
                <button class="image-button" type="button" part="button">Choose image</button>
                <span class="image-file" part="file-name"></span>
            </div>
            <native></native>
        </div>
    `;
}
```

The base wraps this in `this._dom.default` and replaces `<native></native>`, `<input-native></input-native>`, or `[data-native]` placeholders with the native control.

## Layout

Pass the layout to `super()`.

```js
super({ _layout: "label:input:>:default:status:<:validation" });
```

Common tokens:

- `label`: shared label element
- `input`: input wrapper
- `default`: rendered `html()` view
- `native`: native wrapper when the native control is not placed in `html()`
- `status`: status icon wrapper
- `validation`: validation/message area
- `>` and `<`: open and close nesting scopes

Use `default` when the component has custom UI. Put `<native></native>` in `html()` when the native control belongs inside that UI.

## Styles

Use class-owned `static styles` for component-scoped styles.

```js
static get styles() {
    return {
        ".image-input": {
            display: "grid",
            gap: "0.55rem"
        },
        "input.native[type='file']": {
            display: "none !important"
        }
    };
}
```

Prefer existing Juice variables such as `--input-border`, `--input-border-radius`, `--input-button-bgcolor`, and `--form-description-color`.

## Observed Attributes

Declare only attributes owned by the concrete component. The base automatically combines these with all shared input attributes and removes duplicates.

```js
static get observed() {
    return ["button-label", "aspect"];
}
```

Handle a change inside the component with the native callback. Always let the base process shared state first.

```js
attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;

    if (name === "button-label") {
        this._syncButtonLabel(newValue);
    }
}
```

Listen from outside a component with `MutationObserver`:

```js
const input = document.querySelector("input-example");
const observer = new MutationObserver((changes) => {
    for (const change of changes) {
        console.log(change.attributeName, change.oldValue, input.getAttribute(change.attributeName));
    }
});

observer.observe(input, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: input.constructor.observedAttributes
});
```

## Runtime Hooks

Use these hooks for component behavior:

- `_onCreate()`: runs once per component instance after its first complete connection. Native controls, static markup/styles, initial attributes, form state, and validation are ready.
- `_afterConnected()`: runs after every connection, including when an existing component is removed and reattached.
- `_afterRender()`: query `this._dom.default`, save element refs, and attach visible UI listeners.
- `_afterSync()`: apply derived native state after attributes have synced.
- `_syncSingleAttribute(name)`: customize one attribute before or after `super._syncSingleAttribute(name)`.
- `_syncVisualState()`: update visible UI from current state.
- `_onNativeInputEvent(event)` / `_onNativeChangeEvent(event)`: respond to native events.
- `_getFormValue()`: return the submitted form value when it is not just `this._dom.native.value`.
- `resetInput()` / `clear()`: reset custom state.

Call `super.attributeChangedCallback(name, oldValue, newValue)` if you override `attributeChangedCallback`.

Use `_onCreate()` for one-time initialization that requires the completed component DOM:

```js
_onCreate() {
    this._analyticsId = crypto.randomUUID();
    this._syncInitialSelection();
}
```

Do not use `_onCreate()` for listeners or state that must be restored after reconnection; use `_afterConnected()` for that work.

## Value Handling

### Initial values

Set a field's initial value with the host `value` attribute. This is also the value restored by a native form reset.

```html
<input-example name="title" value="Initial title"></input-example>
```

`static config.value` is currently component metadata; it does not replace the host `value` attribute during the base lifecycle.

### Reading the current value

Use the component's public property. It returns the live native-control value, not a possibly stale markup snapshot.

```js
const input = document.querySelector("input-example");
const currentValue = input.value;
```

Inside a component, use the same public property unless you specifically need the native element:

```js
const currentValue = this.value;
const nativeControl = this.nativeInput; // this._dom.native is the internal equivalent
```

Do not use `getAttribute("value")` as the primary way to read live state. The attribute is synchronized for reflection and reset behavior, while `.value` is the public live-value API.

For checkable inputs, read `checked` separately:

```js
const selected = checkbox.checked;
const submittedValue = selected ? checkbox.value : null;
```

### Setting a value

Set normal values through the public property:

```js
input.value = "Updated title";
```

The setter normalizes the value, updates the native control and reflected host attribute, runs formatting, updates form-associated state, and queues validation.

For checkable inputs, use the public checked property:

```js
checkbox.checked = true;
```

Assigning `value` or `checked` programmatically does not dispatch `input` or `change`. This matches native controls and prevents accidental event loops. Consumers that need notification after a programmatic update should dispatch it deliberately:

```js
input.value = "Updated title";
input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
```

### User-driven custom controls

When custom UI changes a normal value, set `this.value` and then emit the appropriate event because the action came from the user:

```js
_chooseValue(nextValue) {
    this.value = nextValue;
    this._syncVisualState();
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
```

Native-control `input` and `change` events are already wired by `InputComponent`; do not dispatch duplicates from `_onNativeInputEvent()` or `_onNativeChangeEvent()`.

### Custom submitted values

For normal text-like inputs, let the base submit `this._dom.native.value`. Override `_getFormValue()` only when the submitted value is a different type, such as a `File`, `FormData`, or a nullable checkable value.

For custom values, override only the pieces you need. `input-image` stores a selected `File`, sets the host `value` to the file name, and submits the `File`:

```js
_syncHostFromNative() {
    this._isSyncing = true;
    try {
        const fileName = this._selectedFile?.name || "";
        if (fileName) this.setAttribute("value", fileName);
        else this.removeAttribute("value");
    } finally {
        this._isSyncing = false;
    }
    this._syncVisualState();
}

_getFormValue() {
    return this._selectedFile;
}
```

If a specialized component bypasses the public value setter and mutates its own internal state, it must update form state and validation itself:

```js
this._updateFormValue();
this._queueValidation();
```

Prefer the public `this.value = nextValue` path whenever the component's submitted value is a string.

### Reset behavior

The base participates in native form reset automatically. `resetInput()` restores the original host `value` or `checked` state captured when the component was created.

Override `resetInput()` only when the component owns additional state. Reset state used by `_getFormValue()` first, then let the base synchronize the native control, form value, and validation:

```js
resetInput() {
    this._selectedItem = null;
    super.resetInput();
    this._syncVisualState();
}
```

### Listening for value changes

Listen to the component exactly like a native form control:

```js
input.addEventListener("input", (event) => {
    console.log(event.currentTarget.value);
});

input.addEventListener("change", (event) => {
    console.log("Committed value:", event.currentTarget.value);
});
```

### Changing validation at runtime

Use the public `validation` property to replace the complete runtime rule set. The observed attribute rebuilds the validator, refreshes requirement guidance, and queues validation automatically.

```js
const password = document.querySelector("input-text[name='password']");

password.validation = [
    "required",
    "min:12",
    "contains:uppercase",
    "contains:lowercase",
    "contains:number",
    "contains:symbol"
].join("|");
```

The equivalent attribute API is useful when rules come from markup-oriented code:

```js
password.setAttribute("validation", "required|contains:number");
```

Remove the runtime override and return to configured component/form defaults with:

```js
password.validation = null;
```

## Do Not

- Do not build the shadow root yourself for normal value inputs.
- Do not duplicate label, validation, status, or form association behavior.
- Do not override `_createNativeControl()` when `static config.native` can describe the native element.
- Do not manually append `this._dom.default`; the base mounts the `static html()` view.

## Check

```powershell
node --check resources/js/juice/forms/components/input-example.mjs
```
