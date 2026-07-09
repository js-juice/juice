# Juice Input Components

Use `input-image.mjs` as the current reference pattern for new value-bearing Juice inputs.

The base `InputComponent` now supports declarative native controls through `static config.native` and declarative views through `html()`. Only override lower-level methods when the config/html path is not enough.

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

    static get observedAttributes() {
        return [...super.observedAttributes, "example-option"];
    }

    constructor() {
        super({ _layout: "label:input:>:default:status:<:validation" });
        this.inputType = "example";
        this._button = null;
    }

    html() {
        return `
            <div class="example-input">
                <button class="example-button" type="button">Choose</button>
                <native></native>
            </div>
        `;
    }

    get _styles() {
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
    html: undefined,
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

### `html`

Defines the default visible view when the component does not provide an `html()` method.

```js
static config = {
    html: `
        <div class="example-input">
            <native></native>
        </div>
    `
};
```

The base accepts:

- a string of HTML
- a function
- a DOM `Node`

If the component class defines `html()`, that method wins over `static config.html`.

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

Use `html()` for the visible component UI.

```js
html() {
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

Use `get _styles()` for component-scoped styles.

```js
get _styles() {
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

## Runtime Hooks

Use these hooks for component behavior:

- `_afterRender()`: query `this._dom.default`, save element refs, and attach visible UI listeners.
- `_afterSync()`: apply derived native state after attributes have synced.
- `_syncSingleAttribute(name)`: customize one attribute before or after `super._syncSingleAttribute(name)`.
- `_syncVisualState()`: update visible UI from current state.
- `_onNativeInputEvent(event)` / `_onNativeChangeEvent(event)`: respond to native events.
- `_getFormValue()`: return the submitted form value when it is not just `this._dom.native.value`.
- `resetInput()` / `clear()`: reset custom state.

Call `super.attributeChangedCallback(name, oldValue, newValue)` if you override `attributeChangedCallback`.

## Value Handling

For normal text-like inputs, let the base sync `this._dom.native.value`.

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

If the component changes its own value outside a native event, update form state and validation:

```js
this._updateFormValue();
this._queueValidation();
```

## Do Not

- Do not build the shadow root yourself for normal value inputs.
- Do not duplicate label, validation, status, or form association behavior.
- Do not override `_createNativeControl()` when `static config.native` can describe the native element.
- Do not manually append `this._dom.default`; the base mounts the `html()` view.

## Check

```powershell
node --check resources/js/juice/forms/components/input-example.mjs
```
