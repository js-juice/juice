/**
 * AUTODOC:START
 * Component: <input-number>
 * Class: InputNumber
 * Overview: Numeric entry component with stepper controls, optional units, and precision support.
 *
 * Features:
 * - Pointer-driven increment/decrement steppers.
 * - Configurable step size and decimal precision.
 * - Optional units suffix rendered in the control chrome.
 *
 * Example:
 * `<input-number label="Speed" min="0" max="240" step="0.5" decimals="1" units="km/h"></input-number>`
 *
 * Attribute Reference:
 * - `step`: Increment/decrement amount for steppers and keyboard changes.
 * - `decimals`: Display/rounding precision for emitted values.
 * - `units`: Suffix text rendered to the right of the numeric input.
 * - Inherits base min/max/validation attributes from InputComponent.
 *
 * Property Reference:
 * - Inherits base properties (`value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - `--input-padding`: Inner native input spacing.
 * - `--input-height`: Height sync for stepper/label alignment.
 * - `--form-accent-color`: Hover accent for step controls.
 * - `--input-border-color`: Label-divider border color when using `label-placement="before:native"`.
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

class InputNumber extends InputComponent {
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observed() {
        return ["units", "step", "decimals"];
    }
    /**
     * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({
            _layout: "label:input:>:div.stepers:>:div.step.up:div.step.down:<:native:div.units:status:<:validation"
        });

        this.inputType = "number";
    }

    /**
     * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    static get styles() {
        return {
            ":host": {},
            "input.native": {
                width: "100%",
                boxSizing: "border-box",
                textAlign: "right"
            },
            ".native-wrapper": {
                marginLeft: "0.5rem"
            },
            ".units": {
                lineHeight: "var(--input-height)",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                padding: "var(--input-padding)",
                paddingRight: "1rem"
            },
            ".units:empty": {
                display: "none"
            },
            ".stepers": {
                display: "flex",
                flexDirection: "column",
                position: "relative",
                right: "0",
                top: "0",
                height: `calc(var(--input-height) + var(--input-padding) + var(--input-padding))`,
                borderRight: "1px solid #cccccc"
            },
            ".stepers .step": {
                flex: "0 0 auto",
                width: "calc(var(--input-height) * 0.7)",
                height: "50%",
                display: "flex",
                padding: "0 0.5rem",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                userSelect: "none",
                fontSize: "0.8em",
                color: "#555555",
                position: "relative"
            },
            ".stepers .step:hover": {
                background: "var(--form-accent-color, #333333)"
            },
            ".stepers .step:hover:before": {
                background: "#ffffff"
            },
            ".stepers .step:before": {
                content: "''",
                position: "relative",
                display: "block",
                "--s": "3px",
                height: "35%",
                aspectRatio: "7/5",
                clipPath:
                    "polygon(0 100%,0 calc(100% - var(--s)),50% 0,100% calc(100% - var(--s)),100% 100%,50% var(--s))",
                background: "#333333"
            },
            ".stepers .step.up": {
                borderBottom: "1px solid #cccccc"
            },
            ".stepers .step.down": {
                borderTop: "1px solid #cccccc"
            },
            ".stepers .step.down:before": {
                clipPath: "polygon(0 0,0 var(--s),50% 100%,100% var(--s),100% 0,50% calc(100% - var(--s)))"
            },
            ":host([label-placement='before:native']) label": {
                height: "var(--input-height)",
                lineHeight: "var(--input-height)",
                padding: "0 0.5rem",
                borderRight: "1px solid var(--input-border-color, #c8c8c8)"
            },
            ":host([label-placement='before:native']) label:after": {
                content: "':'"
            }
        };
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        super.connectedCallback();
        if (this.connected) return;
        this._bindStepers();
        if (this.hasAttribute("units")) {
            const unit = this.getAttribute("units");
            //this._wireframe["div.units"].style.width = `${unit.length * 4}ch`; // unit.length
            this._wireframe["div.units"].innerHTML = `${unit}`; // this.getAttribute("units");
        }
        this.connected = true;
    }

    /**
     * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.inputMode = "decimal";
        input.classList.add("native");
        input.addEventListener("input", () => {
            const sanitizedValue = this._sanitizeLiveValue(input.value);
            if (sanitizedValue !== input.value) {
                input.value = sanitizedValue;
            }
        });
        return input;
    }

    _getDecimalLimit() {
        if (!this.hasAttribute("decimals")) {
            return null;
        }

        const decimals = Number(this.getAttribute("decimals"));
        return Number.isInteger(decimals) && decimals >= 0 ? decimals : null;
    }

    _sanitizeLiveValue(value) {
        const text = value == null ? "" : String(value);
        if (!text) {
            return "";
        }

        const allowNegative = !this.hasAttribute("min") || Number(this.getAttribute("min")) < 0;
        const hasLeadingNegative = allowNegative && text.startsWith("-");
        const unsignedText = hasLeadingNegative ? text.slice(1) : text;
        const firstDecimalIndex = unsignedText.indexOf(".");

        let integerPart = "";
        let decimalPart = "";

        if (firstDecimalIndex >= 0) {
            integerPart = unsignedText.slice(0, firstDecimalIndex);
            decimalPart = unsignedText.slice(firstDecimalIndex + 1);
        } else {
            integerPart = unsignedText;
        }

        integerPart = integerPart.replace(/\D+/g, "");
        decimalPart = decimalPart.replace(/\D+/g, "");

        const decimalLimit = this._getDecimalLimit();
        if (decimalLimit === 0) {
            decimalPart = "";
        } else if (decimalLimit !== null) {
            decimalPart = decimalPart.slice(0, decimalLimit);
        }

        const hadDecimalPoint = firstDecimalIndex >= 0 && decimalLimit !== 0;
        const prefix = hasLeadingNegative ? "-" : "";
        const shouldKeepBareDecimal = hadDecimalPoint && integerPart === "" && decimalPart === "";
        const shouldKeepTrailingDecimal = hadDecimalPoint && decimalPart === "";

        if (shouldKeepBareDecimal) {
            return `${prefix}.`;
        }

        if (!integerPart && !decimalPart) {
            return prefix;
        }

        if (hadDecimalPoint && (decimalPart || shouldKeepTrailingDecimal)) {
            return `${prefix}${integerPart}.${decimalPart}`;
        }

        return `${prefix}${integerPart}`;
    }

    _normalizeValue(value) {
        const text = value == null ? "" : String(value).trim();
        if (!text) {
            return "";
        }

        const numericValue = Number(text);
        if (!Number.isFinite(numericValue)) {
            return "";
        }

        if (this.hasAttribute("decimals")) {
            const decimals = Number(this.getAttribute("decimals"));
            const factor = Math.pow(10, decimals);
            return String(Math.round(numericValue * factor) / factor);
        }

        return String(numericValue);
    }

    _setValue(value, { dispatchEvents = false } = {}) {
        const normalizedValue = this._normalizeValue(value);
        if (normalizedValue === this._lastSetValue && normalizedValue === this._dom.native.value) return;

        this._lastSetValue = normalizedValue;
        this._dom.native.value = normalizedValue;

        if (dispatchEvents) {
            this._dom.native.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            this._dom.native.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        }
    }

    /**
     * Computes the next numeric value using step/min/max constraints.
     * @param {*} step - Input value for step.
     * @returns {*} Derived internal value or completion status.
     */
    _stepValue(step) {
        const current = Number(this._dom.native.value);
        const base = Number.isFinite(current) ? current : 0;
        const newValue = base + step;
        this._setValue(newValue, { dispatchEvents: true });
    }

    _onNativeChangeEvent() {
        this._setValue(this._dom.native.value);
    }

    /**
     * Attaches increment/decrement controls and keyboard shortcuts for stepping.
     * @returns {*} void.
     */
    _bindStepers() {
        const stepUp = this._shadow.querySelector(".step.up");
        const stepDown = this._shadow.querySelector(".step.down");

        const step = Number(this.getAttribute("step")) || 1;

        let pressed;

        function handlePress(isStepUp) {
            if (pressed) return;
            pressed = true;
            const stepValue = isStepUp ? step : -step;
            this._stepValue(stepValue);

            const intervalId = setInterval(() => {
                if (!pressed) {
                    clearInterval(intervalId);
                    return;
                }
                this._stepValue(stepValue);
            }, 100);
        }

        stepUp.addEventListener("mouseup", () => {
            pressed = false;
        });

        stepUp.addEventListener("mousedown", () => {
            handlePress.call(this, true);
        });

        stepDown.addEventListener("mouseup", () => {
            pressed = false;
        });

        stepDown.addEventListener("mousedown", () => {
            handlePress.call(this, false);
        });

        this.addEventListener("pointerdown", () => {
            pressed = false;
        });
    }
}

customElements.define("input-number", InputNumber);

export default InputNumber;
