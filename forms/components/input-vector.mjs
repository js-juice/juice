

/**
 * AUTODOC:START
 * Component: <input-vector>
 * Class: InputVectorComponent
 * Overview: Multi-axis numeric vector input that composes `input-number` controls for 2D/3D/4D values.
 *
 * Features:
 * - Supports configurable dimensionality via `dimentions` (2, 3, or 4 axes).
 * - Initializes values from `default-*` attributes.
 * - Emits axis-specific custom events (`input-x`, `input-y`, ...).
 * - Serializes vector values for form integration through InputComponent.
 *
 * Example:
 * `<input-vector dimentions="3" default-x="0" default-y="1" default-z="0"></input-vector>`
 *
 * Attribute Reference:
 * - `dimentions`: Number of rendered axes (2/3/4).
 * - `default-x`, `default-y`, `default-z`, `default-t`: Default component values.
 * - `normalize`: Set to `false` to keep absolute values instead of unit normalization.
 *
 * Property Reference:
 * - Inherits base InputComponent properties (`value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - Inherits shared InputComponent variables (label, border, validation colors).
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * - Consumes child `input-number::part(input-wrapper)` for axis control radius styling.
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";
import InputNumberComponent from "./input-number.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 120;
const CENTER = 60;
const RADIUS = 50;
const EPSILON = 1e-6;
const VECTOR_SYNC_EPSILON = 1e-3;
const RING_SEGMENTS = 80;
const BASE_DIRECTION = { x: 0, y: 0, z: -1 };

class InputVectorComponent extends InputComponent {
    // TODO(refactor): Reuse shared vector parsing/serialization helpers with input-direction to remove duplication.
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observed() {
        return ["dimentions", "default-x", "default-y", "default-z", "default-t"];
    }

    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:default:input:>:native:status:<:validation" });
        this.inputType = "vector";

        this._vector = { x: 0, y: 0, z: 0, t: 0 };
        this._dimentions = Number(this.getAttribute("dimentions") || 2);
    }

    /**
       * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    static get styles() {
        return {
            ":host": {
                width: "auto"
            },

            label: {
                display: "block"
            },
            ".default": {
                width: "100%"
            },
            ".default-field": {
                width: "100%",
                position: "relative"
            },
            ".input-wrapper": {
                display: "none"
            },
            ".axis-field": {
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem"
            },
            ".axis-label": {
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#4a5560"
            },
            ".axis-input": {
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #b7c3cf",
                borderRadius: "4px",
                padding: "0.2rem 0.35rem",
                fontSize: "0.8rem"
            },
            "input-number": {
                margin: "0"
            },
            "input-number::part(input-wrapper)": {
                borderRadius: "0 "
            },
            "input-number:first-child::part(input-wrapper)": {
                borderTopLeftRadius: "5px",
                borderBottomLeftRadius: "5px"
            },
            "input-number:last-child::part(input-wrapper)": {
                borderTopRightRadius: "5px",
                borderBottomRightRadius: "5px"
            },
            ":host([dimentions='2']) input-number": {
                width: "50%"
            },
            ":host([dimentions='2']) input-number:first-child": {
                borderTopRightRadius: "0",
                borderBottomRightRadius: "0",
                borderRight: "none"
            },
            ":host([dimentions='2']) input-number:last-child": {
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0"
            },
            ":host([dimentions='3']) input-number": {
                width: "33.333%"
            },
            ":host([dimentions='3']) input-number:first-child": {
                borderTopRightRadius: "0",
                borderBottomRightRadius: "0",
                borderRight: "none"
            },
            ":host([dimentions='3']) input-number:nth-child(2)": {
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0",
                borderLeft: "none",
                borderRight: "none"
            },
            ":host([dimentions='3']) input-number:last-child": {
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0",
                borderLeft: "none"
            },
            ":host([dimentions='4']) input-number": {
                width: "25%"
            },
            ":host([dimentions='4']) input-number:first-child": {
                borderTopRightRadius: "0",
                borderBottomRightRadius: "0",
                borderRight: "none"
            },
            ":host([dimentions='4']) input-number:nth-child(2)": {
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0",
                borderLeft: "none",
                borderRight: "none"
            },
            ":host([dimentions='4']) input-number:nth-child(3)": {
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0",
                borderLeft: "none",
                borderRight: "none"
            },
            ":host([dimentions='4']) input-number:last-child": {
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0",
                borderLeft: "none"
            },
            "input-number:last-child": {
                marginRight: "0"
            }
        };

        return styles;
    }

    /**
      * Builds the default dial DOM (SVG rings, knob, labels, value display).
     * @returns {*} Rendered default dial container node.
     */
    _renderDefault() {
        const defaultField = document.createElement("div");
        defaultField.className = "default-field";

        const xInput = document.createElement("input-number");
        xInput.setAttribute("label", "X");
        xInput.setAttribute("label-placement", "before:native");
        xInput.setAttribute("inline", "");
        xInput.setAttribute("step", "1");
        xInput.setAttribute("maxlength", "6");
        xInput.setAttribute("value", this._vector.x);
        xInput.addEventListener("input", () => {
            this._vector.x = Number(xInput.value);
            this._syncVisualState();
            this.dispatchEvent(new CustomEvent("input-x", { bubbles: true, composed: true }));
        });
        this._dom.axisX = xInput;

        const yInput = document.createElement("input-number");
        yInput.setAttribute("label", "Y");
        yInput.setAttribute("label-placement", "before:native");
        yInput.setAttribute("inline", "");
        yInput.setAttribute("step", "1");
        yInput.setAttribute("maxlength", "6");
        yInput.setAttribute("value", this._vector.y);
        yInput.addEventListener("input", () => {
            this._vector.y = Number(yInput.value);
            this._syncVisualState();
            this.dispatchEvent(new CustomEvent("input-y", { bubbles: true, composed: true }));
        });

        this._dom.axisY = yInput;

        defaultField.appendChild(xInput);
        defaultField.appendChild(yInput);

        if (this._dimentions > 2) {
            const zInput = document.createElement("input-number");
            zInput.setAttribute("label", "Z");
            zInput.setAttribute("label-placement", "before:native");
            zInput.setAttribute("inline", "");
            zInput.setAttribute("step", "1");
            zInput.setAttribute("maxlength", "6");
            zInput.setAttribute("value", this._vector.z);
            zInput.addEventListener("input", () => {
                this._vector.z = Number(zInput.value);
                this._syncVisualState();
                this.dispatchEvent(new CustomEvent("input-z", { bubbles: true, composed: true }));
            });

            this._dom.axisZ = zInput;
            defaultField.appendChild(zInput);
        }

        if (this._dimentions === 4) {
            const tInput = document.createElement("input-number");
            tInput.setAttribute("label", "T");
            tInput.setAttribute("label-placement", "before:native");
            tInput.setAttribute("inline", "");
            tInput.setAttribute("step", "1");
            tInput.setAttribute("maxlength", "6");
            tInput.setAttribute("value", this._vector.t);
            tInput.addEventListener("input", () => {
                this._vector.t = Number(tInput.value);
                this._syncVisualState();
                this.dispatchEvent(new CustomEvent("input-t", { bubbles: true, composed: true }));
            });

            this._dom.axisT = tInput;

            defaultField.appendChild(tInput);
        }

        this._dom.default = defaultField;
        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
        return defaultField;
    }

    /**
      * Performs post-connect setup after the component has its default DOM nodes.
     * @returns {*} void.
     */
    _afterConnected() {
        const parsed = this._parseVector(this.getAttribute("value"));
        const initial = parsed || this._resolveDefaultVector();
        this._setVectorFromExternal(initial, { syncNative: true, syncHost: !parsed });
        this._syncVisualState();
    }

    /**
      * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "hidden";
        input.autocomplete = "off";
        input.classList.add("native");
        return input;
    }

    /**
      * Synchronizes single attribute between state, attributes, and UI.
     * @param {*} name - Attribute or field name.
     * @returns {*} void.
     */
    _syncSingleAttribute(name) {
        super._syncSingleAttribute(name);

        if (name === "value") {
            const parsed = this._parseVector(this._dom.native?.value ?? this.getAttribute("value"));
            if (parsed) this._setVectorFromExternal(parsed, { syncNative: true, syncHost: false });
        }

        if ((name === "default-x" || name === "default-y" || name === "default-z") && !this.hasAttribute("value")) {
            this._setVectorFromExternal(this._resolveDefaultVector(), { syncNative: true, syncHost: true });
        }
    }

    /**
      * Handles native input event events and updates component state.
     * @returns {*} void.
     */
    _onNativeInputEvent() {
        const parsed = this._parseVector(this._dom.native?.value);
        if (parsed) this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
    }

    /**
      * Handles native change event events and updates component state.
     * @returns {*} void.
     */
    _onNativeChangeEvent() {
        const parsed = this._parseVector(this._dom.native?.value);
        if (parsed) this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
    }

    /**
     * Updates internal component state and applies side effects.
     * @returns {*} Derived internal value or completion status.
     */
    _setVectorFromExternal() {
        const vector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        const options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        const normalized = this._normalizeVector(vector);
        const before = this._serializeVector(this._vector);
        this._vector = normalized;

        if (options.syncNative) {
            const serialized = this._serializeVector(this._vector);
            if (this._dom.native) this._dom.native.value = serialized;
        }

        if (options.syncHost) {
            const serialized = this._serializeVector(this._vector);
            if (serialized !== before) {
                this.setAttribute("value", serialized);
            } else {
                this._syncVisualState();
            }
        } else {
            this._syncVisualState();
        }
    }

    /**
      * Recomputes ring/progress/tick geometry and knob placement from current value state.
     * @returns {*} void.
     */
    _syncVisualState() {
        if (!this._dom.default) {
            this._renderDefault();
            return;
        }
        const axises = ["x", "y", "z", "t"];
        const parsed = this._parseVector(this._dom.native?.value ?? this.getAttribute("value"));
        const axisValues = [this._formatFloat(this._vector.x), this._formatFloat(this._vector.y)];
        if (this._dimentions > 2) axisValues.push(this._formatFloat(this._vector.z));
        if (this._dimentions === 4) axisValues.push(this._formatFloat(this._vector.t));

        this.setAttribute(
            "aria-valuetext",
            axisValues.reduce((acc, val, i) => {
                return `${acc} ${axises[i]} ${val}${i === axisValues.length - 1 ? "" : ","}`;
            }, "")
        );

        this._dom.native.value = `${axisValues.join(",")}`;
    }

    /**
       * Attaches input listeners for axis fields and forwards updates to vector state.
     * @returns {*} void.
     */
    _bindAxisInputs() {
        const onAxisInput = () => {
            this._commitAxisInputs("input");
        };
        const onAxisChange = () => {
            this._commitAxisInputs("change");
        };

        if (this._dom.axisX) {
            this._dom.axisX.addEventListener("input", onAxisInput);
            this._dom.axisX.addEventListener("change", onAxisChange);
        }
        if (this._dom.axisY) {
            this._dom.axisY.addEventListener("input", onAxisInput);
            this._dom.axisY.addEventListener("change", onAxisChange);
        }
        if (this._dom.axisZ) {
            this._dom.axisZ.addEventListener("input", onAxisInput);
            this._dom.axisZ.addEventListener("change", onAxisChange);
        }

        if (this._dom.axisT) {
            this._dom.axisT.addEventListener("input", onAxisInput);
            this._dom.axisT.addEventListener("change", onAxisChange);
        }
    }

    /**
      * Reads axis sub-inputs, normalizes them, and commits to host value.
     * @param {*} eventName - Input value for event name.
     * @returns {*} void.
     */
    _commitAxisInputs(eventName) {
        if (this._isSyncingAxisInputs) return;

        const x = Number(this._dom.axisX?.value);
        const y = Number(this._dom.axisY?.value);
        const z = Number(this._dom.axisZ?.value);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

        const before = this._serializeVector(this._vector);
        this._setVectorFromExternal({ x, y, z }, { syncNative: true, syncHost: true });
        this._updateFormValue();
        this._queueValidation();
        this._syncVisualState();

        const after = this._serializeVector(this._vector);
        if (before !== after) {
            this.dispatchEvent(new Event(eventName, { bubbles: true, composed: true }));
        }
    }

    /**
      * Resolves effective default vector configuration.
     * @returns {*} Derived value.
     */
    _resolveDefaultVector() {
        return this._normalizeVector({
            x: this._readNumberAttribute("default-x", 0),
            y: this._readNumberAttribute("default-y", 0),
            z: this._readNumberAttribute("default-z", 0),
            t: this._readNumberAttribute("default-t", 0)
        });
    }

    /**
      * Reads a numeric attribute with fallback handling for invalid values.
     * @param {*} name - Attribute or field name.
     * @param {*} fallback - Fallback value used when input is invalid.
     * @returns {*} Parsed numeric value or provided fallback.
     */
    _readNumberAttribute(name, fallback) {
        const raw = this.getAttribute(name);
        if (raw === null || raw === "") return fallback;
        const n = Number(raw);
        return Number.isFinite(n) ? n : fallback;
    }

    /**
      * Normalizes vector into a safe internal representation.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} Derived value.
     */
    _normalizeVector(value) {
        const x = Number(value?.x);
        const y = Number(value?.y);
        const z = Number(value?.z);
        const nx = Number.isFinite(x) ? x : 0;
        const ny = Number.isFinite(y) ? y : 0;
        const nz = Number.isFinite(z) ? z : 0;

        // Allow disabling normalization for use-cases like absolute positions.
        const normalizeAttr = this.getAttribute && this.getAttribute("normalize");
        const shouldNormalize = normalizeAttr == null || String(normalizeAttr) !== "false";
        if (!shouldNormalize) {
            return { x: nx, y: ny, z: nz };
        }

        const magnitude = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (magnitude <= EPSILON) return { x: 0, y: 0, z: 0 };

        return { x: nx / magnitude, y: ny / magnitude, z: nz / magnitude };
    }

    /**
      * Parses vector into normalized internal data.
     * @param {*} raw - Input value for raw.
     * @returns {*} Derived value.
     */
    _parseVector(raw) {
        if (raw === null || raw === undefined) return null;
        if (typeof raw === "object") return this._normalizeVector(raw);

        const text = String(raw).trim();
        if (!text) return null;

        const matches = text.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi);
        if (!matches || matches.length < 3) return null;

        const x = Number(matches[0]);
        const y = Number(matches[1]);
        const z = Number(matches[2]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;

        return this._normalizeVector({ x, y, z });
    }

    /**
      * Serializes vector coordinates into the component value format.
     * @param {*} vector - Input value for vector.
     * @returns {*} Serialized vector string value.
     */
    _serializeVector(vector) {
        const v = this._normalizeVector(vector);
        return `${this._formatFloat(v.x)},${this._formatFloat(v.y)},${this._formatFloat(v.z)}`;
    }

    /**
      * Formats a float using component precision rules.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} Formatted numeric string.
     */
    _formatFloat(value) {
        const next = Math.abs(value) < 1e-7 ? 0 : value;
        return String(Number(next.toFixed(4)));
    }
}

customElements.define("input-vector", InputVectorComponent);
