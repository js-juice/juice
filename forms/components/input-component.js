/**
 * AUTODOC:START
 * Component: <input-*>
 * Class: InputComponent (base)
 * Overview: Abstract base class for Juice form inputs that standardizes native-control wiring, layout rendering, style compilation, validation, and form association.
 *
 * Features:
 * - Form-associated custom element support via ElementInternals.
 * - Shared lifecycle pipeline for attribute sync, rendering, formatting, and validation.
 * - Configurable layout tokens for composing label/input/status/validation regions.
 * - Built-in integration with validation controller and configurable format pipeline.
 *
 * Example:
 * `class InputText extends InputComponent { _createNativeControl(){...} }`
 *
 * Attribute Reference:
 * - Provides shared attributes such as `label`, `name`, `value`, `disabled`, `validation`, `format`, and constraint attrs.
 * - Subclasses can extend `observedAttributes` with component-specific attributes.
 *
 * Property Reference:
 * - Exposes native-like APIs: `value`, `checked`, `disabled`, `form`, `validity`, `checkValidity()`, `reportValidity()`.
 *
 * Feature Registry:
 * - `registerFeatures(features)` accepts a plain object and shallow-merges into `_features`.
 * - Base-collected feature keys: `canreset`, `validate`, `validation`, `format`, `icon`, `template`.
 * - Values are stored as-is (usually raw attribute strings) so subclasses can interpret them.
 *
 * Formatting Guide:
 * - `format` attribute/property defines the active format pipeline spec.
 * - `formatters` property/register API accepts `{ [name]: function }` map used by the format pipeline.
 * - Format spec resolution precedence: host `format` attribute > forms config (`forms.<type>.format`) > shared forms config (`forms.format`).
 * - Formatter map precedence: instance formatter registrations > per-type form config formatters > shared form config formatters.
 *
 * Example (custom formatter registration):
 * `input.registerFormatters({ clamp2: (value) => String(Number(value).toFixed(2)) });`
 * `input.format = "trim|clamp2";`
 *
 * CSS Variables:
 * - `--form-label-weight`, `--form-label-color`: Base label styling.
 * - `--input-border`, `--input-border-radius`, `--input-height`: Input container sizing and border control.
 * - `--validation-color`, `--validation-message-color`, `--juice-validation-color-invalid`: Validation visual states.
 *
 * Part Names:
 * - `input-wrapper`: Primary visual input container exposed for styling.
 * AUTODOC:END
 */

import { render } from "./layout.js";
import FieldValidationController from "./validation/validation-controller.mjs";
import { getJuiceConfig } from "../../config/juice-config.mjs";
import { applyFormatPipeline } from "../../data/format/FormatPipeline.mjs";
import { isPlainObject, looksLikeStyleMap, mergeStyleMaps, toKebabCase, makeCSSString } from "./component-util.js";
/*
 * InputComponent (abstract base class)
 *
 * Why this was refactored:
 * 1. The old version mixed "base" behavior with concrete rendering behavior and had
 *    inconsistent internal fields, which made subclassing brittle.
 * 2. Different input components duplicated lifecycle and sync logic, causing drift
 *    and regressions when one component changed but others did not.
 * 3. Integration with forms and future external systems needed a stable contract
 *    (native-like attrs/events + predictable internal hooks).
 *
 * What this structure gives us:
 * 1. Single lifecycle pipeline: create native control -> sync attrs -> render view
 *    -> compile styles -> update form value.
 * 2. Clear separation of concerns:
 *    - _wireframe: scaffold containers only (layout structure)
 *    - _dom: visible/interactive nodes (native input, label, style, template/default view)
 * 3. Consistent form-associated behavior (ElementInternals) for every subclass.
 * 4. Native parity API (`value`, `checked`, `disabled`, `input/change`) so host
 *    systems can integrate without adapters for each component.
 * 5. Explicit extension points (`_createNativeControl`, `_renderDefault`,
 *    `_syncVisualState`, hooks) so new input types can be added safely.
 */

function normalizeStyleConfigEntry(entry) {
    if (!isPlainObject(entry)) return {};
    if (isPlainObject(entry.style)) return entry.style;
    if (isPlainObject(entry.styles)) return entry.styles;
    if (looksLikeStyleMap(entry)) return entry;
    return {};
}

function normalizeFormatConfigEntry(entry) {
    if (!isPlainObject(entry)) return "";
    if (typeof entry.format === "string") return entry.format;
    if (Array.isArray(entry.format)) return entry.format;
    if (typeof entry.format === "function") return entry.format;
    if (typeof entry.formats === "string") return entry.formats;
    if (Array.isArray(entry.formats)) return entry.formats;
    if (typeof entry.formats === "function") return entry.formats;
    return "";
}

function normalizeFormatterConfigEntry(entry) {
    if (!isPlainObject(entry)) return {};
    const source = isPlainObject(entry.formatters)
        ? entry.formatters
        : isPlainObject(entry.formatter)
          ? entry.formatter
          : null;
    if (!source) return {};

    const normalized = {};
    const names = Object.keys(source);
    for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        if (typeof source[name] === "function") {
            normalized[name] = source[name];
        }
    }
    return normalized;
}

function uniqueId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

class InputComponent extends HTMLElement {
    // TODO(refactor): Extract layout token parsing/rendering into a dedicated layout engine to reduce base-class surface area.
    /**
     * Form associated is a boolean that indicates whether the custom element has form associated logic.
     * If true, the custom element will participate in the form's lifecycle and provide value and validity information.
     * @returns {boolean}
     */
    static get formAssociated() {
        return true;
    }

    get hasValidation() {
        return this._validationController.hasValidation();
    }

    /**
     * A list of attributes that the component observes for changes.
     * The component will automatically re-render when any of the attributes in this list change.
     * @returns {string[]} A list of attribute names
     */
    static get observedAttributes() {
        return [
            "label",
            "name",
            "value",
            "checked",
            "disabled",
            "placeholder",
            "required",
            "minlength",
            "maxlength",
            "min",
            "max",
            "pattern",
            "type",
            "icon",
            "inline",
            "label-inline",
            "stacked",
            "validation",
            "validate",
            "format",
            "template",
            "view",
            "append",
            "validation-color",
            "validation-color-valid",
            "validation-color-incomplete",
            "validation-color-invalid",
            "validation-color-none"
        ];
    }

    /**
     * A map of CSS selectors to their corresponding styles.
     * The base style provides a baseline visual appearance for all input components.
     * It is intended to be extended by each input component.
     * @returns {Object} A map of CSS selectors to their styles.
     */
    static get baseStyle() {
        return {
            ":host": {
                display: "block",
                fontFamily: "system-ui,Segoe UI,Roboto,Arial,sans-serif",
                boxSizing: "border-box",
                marginBottom: "1rem"
            },
            ":host([inline])": {
                display: "inline-block"
            },
            ":host([stacked])": {
                display: "block"
            },
            ".input-root": {
                position: "relative"
            },
            ".input-root label": {
                position: "relative",
                fontSize: "0.8rem",
                textTransform: "uppercase"
            },
            label: {
                display: "block",
                cursor: "pointer"
            },
            ".label-text": {
                fontSize: "0.8em",
                fontWeight: "var(--form-label-weight, bold)",
                color: "var(--form-label-color, #48484A)"
            },
            ".input-wrapper": {
                border: "var(--input-border, 1px solid #c8c8c8)",
                borderRadius: "var(--input-border-radius, 5px)",
                position: "relative",
                display: "flex",
                flexDirection: "row",
                fontSize: "1rem",
                overflow: "hidden",
                boxSizing: "border-box"
            },
            ".native-wrapper": {
                display: "block",
                width: "100%",
                flex: "1 1 auto"
            },
            ".native-wrapper input": {
                position: "relative",
                width: "100%"
            },
            "input.native": {
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "inherit",
                border: 0,
                outline: 0,
                padding: 0,
                margin: 0
            },
            "input.native[type=text], input.native[type=number]": {
                margin: "0.2rem"
            },
            ".input-wrapper .status-wrapper": {
                position: "relative",
                flex: "0 0 auto",
                width: "var(--input-height)",
                height: "var(--input-height)",
                top: "0",
                right: "0",
                marginLeft: 0,
                pointerEvents: "none",
                overflow: "hidden",
                color: "#FFFFFF"
            },
            "input-status": {
                position: "absolute",
                top: 0,
                right: 0
            },
            ".status-wrapper .cover": {
                width: "1px",
                height: "1px",
                left: "calc(100% - 5px)",
                top: "5px",
                position: "absolute",
                transform: "rotate(45deg)",
                backgroundColor: "var(--validation-color)",
                transition: "right 0.3s ease, top 0.3s ease, background-color 0.3s ease"
            },
            ".status-wrapper .cover::before": {
                content: "''",
                display: "block",
                position: "absolute",
                width: "80px",
                height: "80px",
                bottom: 0,
                left: "50%",
                transform: "translate(-50%, 0)",
                transformOrigin: "bottom center",
                backgroundColor: "var(--validation-color)",
                transition: "background-color 0.3s ease"
            },
            ":host(.focused) .status-wrapper .cover": {
                left: "50%",
                top: "50%"
            },
            ":host(.has-validation.touched) .input-root .input-wrapper": {
                border: "1px solid var(--validation-color, #c8c8c8)"
            },

            ".visually-hidden": {
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: "0",
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
                border: "0"
            },
            ".validation-wrapper": {
                position: "absolute",
                fontSize: "0.7em",
                lineHeight: "1.25",
                minHeight: "1.1em",
                marginTop: "0.25rem",
                display: "none"
            },
            ".validation-message": {
                color: "var(--validation-message-color, var(--juice-validation-color-invalid, #b1302e))"
            },
            ".validation-message:empty": {
                display: "none"
            }
        };
    }

    /**
     * Creates a new instance of the InputComponent class.
     *
     * Subclasses should not override this method.
     *
     * @constructor
     * @protected
     */
    constructor(overrides = {}) {
        super();
        this._internals = this.attachInternals ? this.attachInternals() : null;
        this._shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        this._isSyncing = false;
        this._eventsBound = false;
        this._layout = "label:input";
        this._labelPlacement = "default";
        this._initialLayout = null;
        this._features = {};
        this._formatters = {};
        this._onJuiceConfigChange = null;
        this._validator = null;
        this._validationRule = "";
        this._validationProperty = "__value";
        this._validationMessages = [];
        this._validationController = new FieldValidationController(this);
        this._initialState = {
            value: this.getAttribute("value"),
            checked: this.hasAttribute("checked")
        };

        // Apply overrides for testing or advanced use cases. This is not intended for general use.
        if (overrides) {
            for (const key in overrides) {
                this[key] = overrides[key];
            }
        }
        // Freeze layout after constructor overrides; runtime attribute/property changes are ignored.
        this._layout = this._layout || "label:input";
        // Scaffold/layout-only nodes. Subclasses should not treat these as view widgets.
        this._wireframe = {
            root: render("div.input-root"),
            input: render('div.input-wrapper[part="input-wrapper"]'),
            native: render("div.native-wrapper"),
            icon: render("div.icon-wrapper"),
            status: render("div.status-wrapper > div.cover"),
            default: render("div.default"),
            validation: render("div.validation-wrapper")
        };

        if (this.hasAttribute("append")) {
            this._append = this.getAttribute("append");
        }

        if (this._layout.split(":").indexOf("native") !== -1) {
            this._nativeWrapper = this._wireframe.native;
        } else {
            this._nativeWrapper = this._wireframe.input;
        }

        // View/interactive nodes. These are the concrete nodes integrations care about.
        this._dom = {
            style: render("style"),
            label: render("label"),
            labelText: null,
            native: null,
            template: null,
            default: null,
            status: render("input-status.status"),
            validationMessage: render("div.validation-message")
        };

        this._dom.status.setAttribute("size", "14");
        this._dom.status.setAttribute("icon-only", "");
        this._dom.status.setAttribute("state", "idle");

        this._wireframe.validation.appendChild(this._dom.validationMessage);

        this._wireframe.status.appendChild(this._dom.status);
        this._shadow.append(this._dom.style, this._wireframe.root);
        // this._renderWireframe();
        // Compile once at construction so the shadow <style> is never empty.
        this._compileStyles();
    }

    /**
     * Merges feature flags/options into the component feature registry.
     *
     * This method does not validate or coerce values; it stores the provided keys
     * so subclass logic can consume them later.
     *
     * @param {Record<string, unknown>} features - Feature map to merge into the registry.
     * @example
     * this.registerFeatures({
     *   canreset: this.hasAttribute("canreset"),
     *   validate: this.getAttribute("validate"),
     *   icon: this.getAttribute("icon")
     * });
     */
    registerFeatures(features = {}) {
        this._features = { ...this._features, ...features };
    }

    // Lifecycle hooks for integrators/subclasses.
    _beforeSync() {}

    _afterSync() {}

    _beforeRender() {}

    _afterRender() {}

    _afterConnected() {}

    _onNativeInputEvent() {}

    _onNativeChangeEvent() {}

    _syncVisualState() {}

    //END OF LIFECYCLE HOOKS

    /**
     * Registers named formatter functions for use by the format pipeline.
     *
     * Each key becomes a formatter token name that can be referenced from the
     * `format` attribute/property.
     *
     * @param {Record<string, Function>} formatters - Formatter function map keyed by formatter name.
     * @example
     * this.registerFormatters({
     *   clamp2: (value) => String(Number(value).toFixed(2)),
     *   digitsOnly: (value) => String(value).replace(/\D+/g, "")
     * });
     */
    registerFormatters(formatters = {}) {
        if (!isPlainObject(formatters)) return;
        const names = Object.keys(formatters);
        for (let i = 0; i < names.length; i += 1) {
            const name = names[i];
            const formatter = formatters[name];
            if (typeof formatter !== "function") continue;
            this._formatters[name] = formatter;
        }
    }

    _supportsFormatting(native = this._dom.native) {
        if (!native || this._isCheckableControl(native)) return false;
        const tagName = String(native.tagName || "").toLowerCase();
        if (tagName === "select") return false;
        return "value" in native;
    }

    _getConfiguredFormFormat() {
        const formsConfig = getJuiceConfig("forms");
        if (!isPlainObject(formsConfig)) return "";

        const sharedFormat = normalizeFormatConfigEntry(formsConfig);
        const typeConfig = this._getFormTypeConfig(formsConfig);
        const typeFormat = normalizeFormatConfigEntry(typeConfig);
        return typeFormat || sharedFormat || "";
    }

    _getConfiguredFormFormatters() {
        const formsConfig = getJuiceConfig("forms");
        if (!isPlainObject(formsConfig)) return {};

        const sharedFormatters = normalizeFormatterConfigEntry(formsConfig);
        const typeConfig = this._getFormTypeConfig(formsConfig);
        const typeFormatters = normalizeFormatterConfigEntry(typeConfig);
        return { ...sharedFormatters, ...typeFormatters };
    }

    /**
     * Resolves the active format specification string.
     *
     * Precedence:
     * 1. Host `format` attribute.
     * 2. Form config type override (`forms.<type>.format`).
     * 3. Shared form config (`forms.format`).
     *
     * @returns {string} Active format specification.
     */
    _getActiveFormatSpec() {
        if (this.hasAttribute("format")) {
            return this.getAttribute("format") || "";
        }
        return this._getConfiguredFormFormat();
    }

    /**
     * Runs the active format pipeline against the native control value.
     *
     * This is a no-op when formatting is unsupported (for example checkable inputs
     * or selects) or when no format spec exists.
     *
     * @param {{syncHost?: boolean}} options - Formatting options.
     * @param {boolean} [options.syncHost=false] - Whether to sync host attributes after formatting.
     * @returns {boolean} True when value changed, otherwise false.
     */
    _applyFormatting({ syncHost = false } = {}) {
        const native = this._dom.native;
        if (!this._supportsFormatting(native)) return false;

        const formatSpec = this._getActiveFormatSpec();
        if (!formatSpec) return false;

        const configuredFormatters = this._getConfiguredFormFormatters();
        const scopedFormatters = { ...configuredFormatters, ...this._formatters };
        const formatted = applyFormatPipeline(native.value, formatSpec, {
            formatters: scopedFormatters,
            context: this
        });

        if (formatted === native.value) return false;
        native.value = formatted;
        if (syncHost) this._syncHostFromNative();
        return true;
    }

    _getConfiguredCharacterWidthMax() {
        const maxLengthValue = parseInt(this.getAttribute("maxlength"), 10);
        if (Number.isFinite(maxLengthValue) && maxLengthValue > 0) {
            return maxLengthValue;
        }

        const validationText = (this.getAttribute("validation") || this.getAttribute("validate") || "").trim();
        if (!validationText) return null;

        const tokens = validationText
            .split("|")
            .map((token) => String(token).trim())
            .filter(Boolean);

        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            if (!token.toLowerCase().startsWith("maxlength:")) continue;
            const maxText = token.slice(4).trim();
            const maxValue = parseInt(maxText, 10);
            if (Number.isFinite(maxValue) && maxValue > 0) {
                return maxValue;
            }
        }

        return null;
    }

    _syncConfiguredCharacterWidth() {
        const native = this._dom.native;
        if (!native || this._isCheckableControl(native)) return;

        const maxChars = this._getConfiguredCharacterWidthMax();
        if (!maxChars) {
            native.style.removeProperty("width");
            return;
        }
        native.style.width = `calc(${maxChars}ch + 1.5em)`;
        native.style.maxWidth = `calc(${maxChars}ch + 1.5em)`;
    }

    _isCheckableControl(native = this._dom.native) {
        if (!native) return false;
        const type = String(native.type || "").toLowerCase();
        return type === "checkbox" || type === "radio";
    }

    /**
     * Creates a native control for the input component.
     * This method must be implemented by subclasses.
     * It should return a native HTML element that can be used to receive user input.
     * The native control should be a single element, and should not have any children.
     * The native control should also not have any event listeners attached to it.
     * The input component will attach its own event listeners to the native control.
     * @throws {Error} if not implemented by a subclass.
     */
    _createNativeControl() {
        throw new Error(`${this.tagName.toLowerCase()} must implement _createNativeControl()`);
    }

    /**
     * Renders the default view of the input component.
     * This method should be called by subclasses when they want to render a default view.
     * It will set the `_dom.default` property to null.
     */
    _renderDefault() {
        this._dom.default = null;
    }

    _ensureDefaultMountedInInputContainer() {
        const container = this._wireframe.default.parentNode ? this._wireframe.default : this._wireframe.input;

        if (!this._dom.default || !container || !container.parentNode) return;
        if (this._dom.default.parentNode !== container) {
            container.appendChild(this._dom.default);
        }
    }

    /**
     * Ensure the native control is mounted inside the configured native wrapper.
     * This keeps native placement stable even when wireframe/layout is re-rendered.
     */
    _ensureNativeMountedInWrapper() {
        if (!this._dom.native || !this._nativeWrapper) return;
        if (this._dom.native.parentNode !== this._nativeWrapper) {
            this._nativeWrapper.appendChild(this._dom.native);
        }
    }

    /**
     * Lifecycle hook that is called after the component has been inserted into the DOM.
     * This method is responsible for setting up the component's initial state.
     * It will collect features from the component's attributes and upgrade them to properties.
     * It will also ensure that the native control is created and rendered.
     * It will then sync the component's state from its attributes and render the default or template view.
     * Finally, it will compile the component's styles and update its value in the form.
     */
    connectedCallback() {
        if (this.hasAttribute("label-placement")) {
            this._labelPlacement = this.getAttribute("label-placement");
        }

        this._collectFeatures();
        this._upgradeProperties([
            "label",
            "name",
            "value",
            "checked",
            "disabled",
            "placeholder",
            "format",
            "formatters"
        ]);
        if (!this._onJuiceConfigChange) {
            this._onJuiceConfigChange = () => {
                this._compileStyles();
                const formatted = this._applyFormatting({ syncHost: true });
                this._syncConfiguredCharacterWidth();
                if (formatted) {
                    this._updateFormValue();
                    this._queueValidation();
                }
                this._syncVisualState();
            };
        }
        document.addEventListener("juice:configchange", this._onJuiceConfigChange);
        this._ensureNativeControl();
        this._renderWireframe();
        this._ensureNativeMountedInWrapper();
        this._syncFromAttributes();
        this._renderTemplateOrDefault();
        if (!this._dom.template && !this._dom.default) {
            this._renderDefault();
            this._ensureDefaultMountedInInputContainer();
        }
        this._compileStyles();
        this._updateFormValue();
        this._setupValidation();
        this._queueValidation();
        this._afterConnected();

        // Set CSS variable for input height so validation status can position relative to it.
        const inputWrapper = this._shadow.querySelector(".input-wrapper");
        const rect = inputWrapper.getBoundingClientRect();
        if (rect.height > 0) {
            this._wireframe.root.style.setProperty("--input-height", `${rect.height}px`);
        } else {
            this._whenVisible(inputWrapper, () => {
                const rect = inputWrapper.getBoundingClientRect();
                this._wireframe.root.style.setProperty("--input-height", `${rect.height}px`);
            });
        }
    }

    _whenVisible(element, callback) {
        if (!this._visibilityCallbacks) this._visibilityCallbacks = [];
        this._visibilityCallbacks.push(callback);
        if (!this._visibilityObserver) {
            this._visibilityObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    this._visibilityCallbacks.forEach((cb) => cb());
                    this._visibilityObserver.disconnect();
                }
            });
            this._visibilityObserver.observe(element);
        }
    }

    disconnectedCallback() {
        if (this._onJuiceConfigChange) {
            document.removeEventListener("juice:configchange", this._onJuiceConfigChange);
        }
    }

    /**
     * Lifecycle hook that is called when an attribute of the component changes.
     * This method will check if the old value and new value of the attribute are the same,
     * and if the component is currently syncing its state.
     * If either condition is true, the method will return early.
     * Otherwise, it will check if the attribute is "template" or "view".
     * If it is, it will re-render the template or default view, respectively.
     * Finally, it will sync the single changed attribute, sync the component's visual state,
     * and update the component's value in the form.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue || this._isSyncing) return;
        const affectsValidation = this._validationController.affectsAttribute(name);
        const affectsFormatting = name === "value" || name === "format" || name === "validation" || name === "validate";

        if (name === "template" || name === "view") {
            this._renderTemplateOrDefault();
            return;
        }

        if (!this._dom.native) return;

        if (affectsValidation) {
            this._setupValidation();
            this._renderWireframe();
        }

        this._syncSingleAttribute(name);
        if (affectsFormatting) {
            this._applyFormatting({ syncHost: true });
        }
        this._syncConfiguredCharacterWidth();
        this._syncVisualState();
        this._updateFormValue();

        if (name === "value" || name === "checked" || affectsValidation || affectsFormatting) {
            this._queueValidation();
        }
    }

    /**
     * Collects features from attributes of the component.
     *
     * Collected keys:
     * - `canreset`
     * - `validate`
     * - `validation`
     * - `format`
     * - `icon`
     * - `template`
     *
     * Values are copied from raw attributes and passed to `registerFeatures()`.
     */
    _collectFeatures() {
        const attrs = ["canreset", "validate", "validation", "format", "icon", "template"];
        const features = {};
        for (let i = 0; i < attrs.length; i += 1) {
            const key = attrs[i];
            if (this.hasAttribute(key)) {
                features[key] = this.getAttribute(key);
            }
        }
        this.registerFeatures(features);
    }

    /**
     * Ensures that the native control is created and rendered.
     * If the native control is already created, this method will return early.
     * Otherwise, it will create the native control, replace any existing native control,
     * and then sync the component's state from its attributes.
     */
    _ensureNativeControl() {
        if (this._dom.native) return;
        const native = this._createNativeControl();
        this._replaceNativeControl(native);
    }

    /**
     * Replaces the native control with a new one.
     * If the previous native control exists and is a child of the wireframe's input element,
     * it will be removed from the DOM.
     * The new native control will be inserted as the first child of the wireframe's input element.
     * This method also centralizes the rebinding of native events and syncing of attributes, so
     * subclasses do not need to duplicate this logic when switching modes (for example, switching from
     * a custom dropdown to a native select).
     * @param {Element} nextNative - The new native control to be inserted into the DOM.
     */
    _replaceNativeControl(nextNative) {
        if (!nextNative) return;

        if (this._dom.native && this._dom.native.parentNode) {
            this._dom.native.parentNode.removeChild(this._dom.native);
        }

        this._dom.native = nextNative;
        if (!this._dom.native.id) {
            this._dom.native.id = uniqueId("inp");
        }

        // Rebinding is centralized here so mode switches (for example custom/native select)
        // do not need to duplicate event + sync setup in subclasses.
        this._dom.native.classList.add("native");
        this._ensureNativeMountedInWrapper();

        this._eventsBound = false;
        this._bindNativeEvents();
        if (!this._dom.template && !this._dom.default) {
            this._renderDefault();
            this._ensureDefaultMountedInInputContainer();
        }
        this._syncFromAttributes();
        this._compileStyles();
    }

    /**
     * Binds native events to the component.
     * This method is responsible for attaching event listeners to the native control.
     * It will attach listeners for the "input" and "change" events.
     * When either event is triggered, it will call the relevant "onNative*" method and
     * then call `_syncHostFromNative` to update the component's state from its native control.
     * It will then call `_updateFormValue` to update the component's value in the form.
     * Finally, it will dispatch an event to indicate that the component's value has changed.
     * The event will have a boolean property indicating whether the change was triggered by the user.
     */
    _bindNativeEvents() {
        if (!this._dom.native || this._eventsBound) return;

        this._dom.native.addEventListener("input", (event) => {
            if (this._isSyncing) return;
            this._applyFormatting();
            this._onNativeInputEvent(event);
            this._syncHostFromNative();
            this._updateFormValue();
            this._queueValidation();
            try {
                this.dispatchEvent(
                    new CustomEvent("input", { bubbles: true, composed: true, detail: { from: "native" } })
                );
            } catch (e) {
                this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            }
        });

        this._dom.native.addEventListener("change", (event) => {
            if (this._isSyncing) return;
            this._applyFormatting();
            this._onNativeChangeEvent(event);
            this._syncHostFromNative();
            this._updateFormValue();
            this._queueValidation();
            try {
                this.dispatchEvent(
                    new CustomEvent("change", { bubbles: true, composed: true, detail: { from: "native" } })
                );
            } catch (e) {
                this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            }
        });

        // Refresh validation UI status on focus transitions so "incomplete" can
        // be focus-aware and downgrade to "invalid" immediately on blur.
        this._dom.native.addEventListener("focus", () => {
            if (this._isSyncing) return;
            this.classList.add("focused");
            this.classList.add("touched");
            this._queueValidation();
        });

        this._dom.native.addEventListener("blur", () => {
            if (this._isSyncing) return;
            this.classList.remove("focused");
            this._queueValidation();
        });

        this._eventsBound = true;
    }

    /**
     * Synchronizes the component's state from its native control.
     * This method will set the component's "value" attribute to the native control's value.
     * If the native control has a "checked" property, it will set the component's "checked" attribute
     * to an empty string if the native control is checked, or remove it if the native control is not checked.
     * This method is guarded by a boolean flag to prevent feedback loops when the attributeChangedCallback
     * re-syncs the native state.
     */
    _syncHostFromNative() {
        if (!this._dom.native) return;

        // Guard prevents feedback loops when attributeChangedCallback re-syncs native state.
        this._isSyncing = true;
        try {
            this.setAttribute("value", this._dom.native.value ?? "");
            if (this._isCheckableControl()) {
                if (this._dom.native.checked) this.setAttribute("checked", "");
                else this.removeAttribute("checked");
            }
        } finally {
            this._isSyncing = false;
        }
    }

    /**
     * Synchronizes the component's state from its attributes.
     * This method will iterate through the observed attributes of the component and call
     * `_syncSingleAttribute` for each one.
     * After all attributes have been synced, it will call `_afterSync` to perform any additional
     * work that needs to be done after the attribute sync.
     * Finally, it will call `_syncVisualState` to update the component's visual state and
     * `_renderLabel` to re-render the label if necessary.
     */
    _syncFromAttributes() {
        this._beforeSync();
        const attrs = this.constructor.observedAttributes || [];
        for (let i = 0; i < attrs.length; i += 1) {
            this._syncSingleAttribute(attrs[i]);
        }
        this._afterSync();
        this._applyFormatting({ syncHost: true });
        this._syncConfiguredCharacterWidth();
        this._syncVisualState();
        this._renderLabel();
    }

    /**
     * Synchronizes a single attribute of the component with its native control.
     * This method will switch on the given attribute name and update the native control's corresponding     * corresponding property with the attribute's value.
     * If the attribute does not exist on the native control, it will do nothing.
     * @param {string} name - The name of the attribute to sync.
     */
    _syncSingleAttribute(name) {
        const native = this._dom.native;
        if (!native) return;
        if (this._validationController.syncNativeConstraintAttribute(name, native)) return;

        switch (name) {
            case "label":
                this._renderLabel();
                break;
            case "name":
                native.name = this.getAttribute("name") || "";
                break;
            case "value": {
                const value = this.getAttribute("value");
                if (value !== null && native.value !== value) {
                    native.value = value;
                }
                break;
            }
            case "checked":
                if (this._isCheckableControl(native)) {
                    native.checked = this.hasAttribute("checked");
                }
                break;
            case "disabled":
                native.disabled = this.hasAttribute("disabled");
                break;
            case "placeholder":
                if ("placeholder" in native) {
                    native.placeholder = this.getAttribute("placeholder") || "";
                }
                break;
            default:
                break;
        }
    }

    _getEffectiveLayout() {
        const base = this._initialLayout || this._layout || "label:input";
        const tokens = base
            .split(":")
            .map((token) => String(token).trim())
            .filter(Boolean)
            .filter((token) => token !== "validation" || this.hasValidation);

        const hasExplicitValidationToken = base
            .split(":")
            .map((token) => String(token).trim())
            .includes("validation");

        if (this.hasValidation) {
            if (!tokens.includes("status")) {
                const statusAnchor = tokens.indexOf("input");
                if (statusAnchor >= 0) {
                    let statusInsertIndex = statusAnchor + 1;
                    if (tokens[statusInsertIndex] === ">") {
                        statusInsertIndex += 1;
                    }
                    tokens.splice(statusInsertIndex, 0, "status");
                } else {
                    tokens.push("status");
                }
            }

            if (!hasExplicitValidationToken) {
                const statusIndex = tokens.indexOf("status");
                const inputIndex = tokens.indexOf("input");
                const validationAnchor = statusIndex >= 0 ? statusIndex : inputIndex;
                if (validationAnchor >= 0) {
                    let validationInsertIndex = validationAnchor + 1;
                    if (tokens[validationInsertIndex] === ">") {
                        validationInsertIndex += 1;
                    }
                    tokens.splice(validationInsertIndex, 0, "validation");
                } else {
                    tokens.push("validation");
                }
            }
        }
        //console.log("label placement", this._labelPlacement);
        if (this._labelPlacement !== "default") {
            const [position, relative] = this._labelPlacement.split(":");
            const labelIndex = tokens.indexOf("label");

            const label = tokens[labelIndex];
            tokens.splice(labelIndex, 1);
            const inputIndex = tokens.indexOf(relative);

            const directions = {
                after: 1,
                before: 0,
                inside: 1
            };

            const direction = directions[position] || 0;
            let relativeIndex = 0;
            if (relative) relativeIndex = tokens.indexOf(relative);
            let newIndex = relativeIndex + direction;

            if (tokens[newIndex] === ">") newIndex += 1;

            if (position === "inside") {
                tokens.splice(newIndex, 0, ">", "label", "<");
            } else if (position === "before") {
                tokens.splice(newIndex, 0, "label");
            } else if (position === "after") {
                tokens.splice(newIndex, 0, "label");
            }
        }

        return tokens.join(":");
    }

    /**
     * Renders the wireframe for the component.
     * The wireframe is the base layout structure for the component, and is used to
     * position the label, input, icon, and validation elements.
     * The structure is derived from the initialized layout string (constructor/default),
     * which is a set of colon-separated tokens. The tokens can be any of the following:
     *   - `label`: the label element
     *   - `input`: the input element
     *   - `icon`: the icon element
     *   - `validation`: the validation element
     *   - `>`, `<`: used to open and close scopes, which are used to group elements together
     *      and create nested structures.
     * The structure is rendered by splitting the `layout` string into tokens and iterating
     * over them. For each token, the corresponding element is looked up in the `map` object and
     * appended to the current scope. If a token is a scope opener (`>`) or closer (`<`),
     * the scope index is incremented or decremented, respectively.
     */
    _renderWireframe() {
        const layout = this._getEffectiveLayout();
        const fragment = document.createDocumentFragment();
        const scopes = [fragment];
        let scopeIndex = 0;
        let lastNode = fragment;

        const map = {
            // "label" targets the actual <label> so layout can nest controls inside it.
            label: this._dom.label,
            input: this._wireframe.input,
            native: this._wireframe.native,
            icon: this._wireframe.icon,
            validation: this._wireframe.validation,
            status: this._wireframe.status,
            default: this._wireframe.default
        };

        // Token layout keeps structure configurable without changing subclass render code.
        // Example: "label:input" or "label:>:input:<:validation"
        const tokens = layout.split(":");
        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            if (token === ">") {
                scopeIndex += 1;
                scopes[scopeIndex] = lastNode;
                continue;
            }
            if (token === "<") {
                if (scopeIndex > 0) {
                    scopes.pop();
                    scopeIndex -= 1;
                }
                continue;
            }
            let node = map[token];
            if (!node) {
                node = render(token);
                this._wireframe[token] = node;
            }
            scopes[scopeIndex].appendChild(node);
            lastNode = node;
        }
        if (this.inputType) this._wireframe.root.classList.add(this.inputType);
        this._wireframe.root.replaceChildren(fragment);
        this._ensureNativeMountedInWrapper();
    }

    /**
     * Renders the template or default view of the component.
     * If the `template` or `view` attribute is set and the selector matches a valid template element,
     * the template is rendered. Otherwise, the default view is rendered.
     * This method is called by the `connectedCallback` lifecycle hook after the component has been inserted into the DOM.
     * It is also called by the `attributeChangedCallback` lifecycle hook when the `template` or `view` attribute changes.
     * @protected
     */
    _renderTemplateOrDefault() {
        this._beforeRender();

        if (this._dom.template && this._dom.template.parentNode) {
            this._dom.template.parentNode.removeChild(this._dom.template);
            this._dom.template = null;
        }

        // Template/view override preserves back-compat while default views stay subclass-owned.
        const selector = this.getAttribute("template") || this.getAttribute("view");
        if (selector && selector.startsWith("#")) {
            const template = document.querySelector(selector);
            if (template && template.content) {
                const root = document.createElement("div");
                root.className = "template-view";
                root.appendChild(template.content.cloneNode(true));
                this._wireframe.input.appendChild(root);
                this._dom.template = root;
                this._afterRender();
                return;
            }
        }

        this._renderDefault();
        this._ensureDefaultMountedInInputContainer();
        this._afterRender();
    }

    /**
     * Renders the label of the component.
     * If the component has a label and a native control, this method will:
     * 1. Remove all children from the label element.
     * 2. Set the `for` attribute of the label element to the id of the native control.
     * 3. If the component has a label text, create a new span element with the label text,
     *    add it to the label element, and set the `aria-label` attribute of the native control to the label text.
     * 4. If the component does not have a label text, remove the `aria-label` attribute from the native control.
     * This method is called by the `connectedCallback` lifecycle hook after the component has been inserted into the DOM.
     * It is also called by the `attributeChangedCallback` lifecycle hook when the `label` attribute changes.
     * @protected
     */
    _renderLabel() {
        if (!this._dom.label || !this._dom.native) return;

        this._dom.label.setAttribute("for", this._dom.native.id);
        const labelText = this.getAttribute("label") || "";
        if (labelText) {
            if (!this._dom.labelText) {
                this._dom.labelText = document.createElement("span");
                this._dom.labelText.className = "label-text";
            }
            this._dom.labelText.textContent = labelText;
            // Always append so the text follows any nested controls (radio/checkbox layouts).
            this._dom.label.appendChild(this._dom.labelText);
            this._dom.native.setAttribute("aria-label", labelText);
        } else {
            if (this._dom.labelText && this._dom.labelText.parentNode) {
                this._dom.labelText.parentNode.removeChild(this._dom.labelText);
            }
            this._dom.native.removeAttribute("aria-label");
        }
    }

    /**
     * Compiles the CSS styles for the component.
     * This method takes the base CSS style from the component's constructor and the local CSS style
     * from the component's `_styles` property, and combines them into a single string.
     * The resulting string is then set as the text content of the component's `<style>` element.
     * @protected
     */
    _compileStyles() {
        const base = makeCSSString(this.constructor.baseStyle || {});
        const localStyles = this._styles || {};
        const configuredStyles = this._getConfiguredFormStyles();
        const local = makeCSSString(mergeStyleMaps(localStyles, configuredStyles));
        this._dom.style.textContent = `${base}\n${local}`;
    }

    _getFormTypeAlias() {
        const explicitType = String(this.inputType || "")
            .trim()
            .toLowerCase();
        if (explicitType) return explicitType;

        const tagName = String(this.tagName || "").toLowerCase();
        if (!tagName) return "";
        return tagName.startsWith("input-") ? tagName.slice(6) : tagName;
    }

    _getFormTypeConfig(formsConfig = getJuiceConfig("forms")) {
        if (!isPlainObject(formsConfig)) return {};
        const alias = this._getFormTypeAlias();
        if (!alias) return {};
        const entry = formsConfig[alias];
        return isPlainObject(entry) ? entry : {};
    }

    _getConfiguredFormStyles() {
        const formsConfig = getJuiceConfig("forms");
        if (!isPlainObject(formsConfig)) return {};

        const sharedStyles = normalizeStyleConfigEntry(formsConfig);
        const typeConfig = this._getFormTypeConfig(formsConfig);
        const typeStyles = normalizeStyleConfigEntry(typeConfig);
        return mergeStyleMaps(sharedStyles, typeStyles);
    }

    _normalizeRuleToken(token) {
        return this._validationController.normalizeRuleToken(token);
    }

    _ruleTypeFromToken(token) {
        return this._validationController.ruleTypeFromToken(token);
    }

    _mergeRuleStrings(primaryRules = "", secondaryRules = "") {
        return this._validationController.mergeRuleStrings(primaryRules, secondaryRules);
    }

    _patternToCharsRule(pattern) {
        return this._validationController.patternToCharsRule(pattern);
    }

    _getNativeValidationRules() {
        return this._validationController.getNativeValidationRules();
    }

    _getValidationRules() {
        return this._validationController.getValidationRules();
    }

    _setupValidation() {
        this._validationController.setup();
    }

    _getCurrentValidationValue() {
        return this._validationController.getCurrentValidationValue();
    }

    _buildValidityState(errors = []) {
        return this._validationController.buildValidityState(errors);
    }

    _setValidationState(valid, messages = [], errors = []) {
        this._validationController.setValidationState(valid, messages, errors);
    }

    async _runValidation() {
        return this._validationController.run();
    }

    _queueValidation() {
        this._validationController.queue();
    }

    /**
     * Upgrades properties that were set on the component before it was upgraded from a custom element
     * to a formitable component.
     * @param {string[]} props - An array of property names to upgrade.
     * @protected
     */
    _upgradeProperties(props) {
        for (let i = 0; i < props.length; i += 1) {
            const prop = props[i];
            if (!Object.prototype.hasOwnProperty.call(this, prop)) continue;
            const value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }

    /**
     * Gets the value of the form component.
     * If the component's native control does not exist, this method will return null.
     * If the component's native control has a "checked" property, this method will return the value of
     * the native control if it is checked, or null if it is not checked.
     * Otherwise, this method will return the value of the native control.
     * @return {string|null} The value of the form component, or null if the component's native control does not exist.
     * @protected
     */
    _getFormValue() {
        if (!this._dom.native) return null;
        if (this._isCheckableControl()) {
            return this._dom.native.checked ? this._dom.native.value : null;
        }
        return this._dom.native.value;
    }

    /**
     * Updates the component's value in the form.
     * If the component's internals do not exist, this method will do nothing.
     * Otherwise, it will call the internals' setFormValue method with the value returned by _getFormValue.
     * @protected
     */
    _updateFormValue() {
        if (!this._internals) return;
        this._internals.setFormValue(this._getFormValue());
    }

    /**
     * Callback to update the component's native control's disabled state.
     * @param {boolean} disabled - Disabled state.
     * @protected
     */
    formDisabledCallback(disabled) {
        if (this._dom.native) this._dom.native.disabled = disabled;
    }

    /**
     * Resets the component's input value to its initial state.
     * If the component is a checkbox, it will reset the checked state to its initial state.
     * If the component is not a checkbox, it will reset the value of the native control to its initial state.
     * Finally, it will update the component's value in the form.
     */
    resetInput() {
        if (!this._dom.native) return;
        this.classList.remove("focused");
        this.classList.remove("touched");
        if (this._isCheckableControl()) {
            this.checked = this._initialState.checked;
        } else {
            const defaultValue = this._initialState.value == null ? "" : this._initialState.value;
            this._dom.native.value = defaultValue;
            this.setAttribute("value", defaultValue);
        }
        this._updateFormValue();
        this._queueValidation();
    }

    /**
     * Handles native form reset callbacks by restoring initial input state.
     * @returns {void}
     */
    formResetCallback() {
        this.resetInput();
    }

    /**
     * Handles native form reset callbacks by restoring initial input state.
     * @returns {void}
     */
    formStateRestoreCallback() {}

    /**
     * Returns the associated native form element.
     * @returns {HTMLFormElement | null}
     */
    get form() {
        return this._internals ? this._internals.form : null;
    }

    /**
     * Returns the current `validity` value.
     * @returns {ValidityState | null}
     */
    get validity() {
        return this._internals ? this._internals.validity : null;
    }

    /**
     * Returns the current `validationMessage` value.
     * @returns {string}
     */
    get validationMessage() {
        return this._internals ? this._internals.validationMessage : "";
    }

    /**
     * Returns the current `willValidate` value.
     * @returns {boolean}
     */
    get willValidate() {
        return this._internals ? this._internals.willValidate : false;
    }

    /**
     * Checks the current validity state without forcing UI.
     * @returns {boolean}
     */
    checkValidity() {
        return this._internals ? this._internals.checkValidity() : true;
    }

    /**
     * Reports validity and returns whether the component is valid.
     * @returns {boolean}
     */
    reportValidity() {
        return this._internals ? this._internals.reportValidity() : true;
    }

    /**
     * Returns whether the component is disabled.
     * @returns {boolean}
     */
    get disabled() {
        return this.hasAttribute("disabled");
    }

    /**
     * Updates the disabled state by toggling the `disabled` attribute.
     * @param {boolean} value - Assigned value.
     * @returns {void}
     */
    set disabled(value) {
        if (value) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    /**
     * Returns the current checked state.
     * @returns {boolean}
     */
    get checked() {
        if (!this._dom.native || !this._isCheckableControl()) return false;
        return !!this._dom.native.checked;
    }

    /**
     * Updates the checked state and synchronizes host/form/validation state.
     * @param {boolean} value - Assigned value.
     * @returns {void}
     */
    set checked(value) {
        if (!this._dom.native || !this._isCheckableControl()) return;
        this._dom.native.checked = !!value;
        if (value) this.setAttribute("checked", "");
        else this.removeAttribute("checked");
        this._syncVisualState();
        this._updateFormValue();
        this._queueValidation();
    }

    /**
     * Returns the current component value.
     * @returns {string}
     */
    get value() {
        return this._dom.native ? this._dom.native.value : "";
    }

    /**
     * Updates the value, applies formatting, then syncs host/form/validation state.
     * @param {string | number | null | undefined} value - Assigned value.
     * @returns {void}
     */
    set value(value) {
        if (!this._dom.native) return;
        const normalized = value == null ? "" : String(value);
        this._dom.native.value = normalized;
        this._applyFormatting();
        this.setAttribute("value", this._dom.native.value);
        this._updateFormValue();
        this._queueValidation();
    }

    /**
     * Returns the active format specification.
     *
     * @returns {*} Current format specification.
     */
    get format() {
        return this.getAttribute("format") || this._format || "";
    }

    /**
     * Sets the active format spec string for this input.
     *
     * Pass `null`, `undefined`, or `false` to remove formatting.
     *
     * @param {string | null | undefined | false} value - Assigned value.
     */
    set format(value) {
        if (value == null || value === false) {
            this.removeAttribute("format");
            return;
        }
        this.setAttribute("format", String(value));
    }

    /**
     * Returns registered formatter functions.
     *
     * @returns {Record<string, Function>} Formatter map.
     */
    get formatters() {
        return { ...this._formatters };
    }

    /**
     * Replaces instance formatter registrations.
     *
     * This clears existing formatter registrations, applies the new formatter map,
     * then re-runs formatting/validation on the current value.
     *
     * @param {Record<string, Function>} value - Assigned value.
     */
    set formatters(value) {
        this._formatters = {};
        if (isPlainObject(value)) {
            this.registerFormatters(value);
        }
        this._applyFormatting({ syncHost: true });
        this._updateFormValue();
        this._queueValidation();
    }

    /**
     * Returns the underlying native input control.
     * @returns {HTMLElement | null}
     */
    get nativeInput() {
        return this._dom.native;
    }
}

export default InputComponent;
