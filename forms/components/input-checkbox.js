

/**
 * AUTODOC:START
 * Component: <input-checkbox>
 * Class: InputCheckbox
 * Overview: Styled checkbox input that preserves native checked/value semantics.
 *
 * Features:
 * - Custom visual checkbox rendering with native input state synchronization.
 * - Supports inline usage in row/group layouts.
 * - Participates in validation/status workflow inherited from InputComponent.
 *
 * Example:
 * `<input-checkbox name="subscribe" label="Subscribe to updates" value="yes"></input-checkbox>`
 *
 * Attribute Reference:
 * - `bgcolor`: Optional custom background color for the checkbox shell.
 * - `checkcolor`: Optional custom checkmark color.
 * - Inherits base attributes (`checked`, `disabled`, `required`, ...).
 *
 * Property Reference:
 * - Inherits base properties (`checked`, `value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - `--bgcolor`: Checked-state accent/background override.
 * - `--checkcolor`, `--check-color`: Checkmark stroke color control.
 * - `--checked-border-color`: Optional checked border override.
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.js";

class InputCheckbox extends InputComponent {
    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:>:input:<:validation" });
        this.inputType = "checkbox";
    }

    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return [...super.observedAttributes, "bgcolor", "checkcolor"];
    }

    /**
       * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    get _styles() {
        return {
            label: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                cursor: "pointer"
            },
            ".label-text": {
                lineHeight: "calc(1em - 2px)",
                marginLeft: "0.5rem"
            },
            ".input-wrapper": {
                width: "1em",
                height: "1em",
                borderRadius: "0.2em",
                border: "1px solid #8a8a8a",
                backgroundColor: "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                backgroundColor: "#cccccc",
                background: "linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%)",
                color: "transparent",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
            },
            ":host([checked]) .input-wrapper": {
                borderColor: "var(--checked-border-color, var(--check-color, #222222))"
            },
            ".input-wrapper::before": {
                content: "''",
                position: "absolute",
                display: "block",
                width: "1.2em",
                height: "0.6em",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                opacity: 0.7
            },
            ".svg-checkbox": {
                width: "100%",
                height: "100%",
                display: "block",
                zIndex: "1"
            },
            ".checkbox-mark": {
                fill: "none",
                stroke: "var(--check-color, #222222)",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeDasharray: "14",
                strokeDashoffset: "14",
                transition: "stroke-dashoffset 0.25s ease"
            },
            ":host([checked]) .input-wrapper .checkbox-mark": {
                stroke: "var(--check-color, #222222)",
                strokeDashoffset: "0",
                transition: "stroke-dashoffset 0.25s ease"
            }
        };
    }

    /**
      * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("visually-hidden");
        if (!input.value) input.value = "on";
        return input;
    }

    /**
      * Builds the default dial DOM (SVG rings, knob, labels, value display).
     * @returns {*} Rendered default dial container node.
     */
    _renderDefault() {
        const wrapper = this._wireframe.input;
        if (!wrapper) return;

        const existing = wrapper.querySelectorAll(".svg-checkbox");
        for (let i = 0; i < existing.length; i += 1) {
            existing[i].remove();
        }

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "svg-checkbox");
        svg.setAttribute("viewBox", "0 0 12 12");
        svg.setAttribute("aria-hidden", "true");

        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("class", "checkbox-mark");
        polyline.setAttribute("points", "2.2 6.3 5 9.2 9.6 2.8");
        svg.appendChild(polyline);

        this._dom.default = svg;
        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
    }

    /**
      * Performs post-connect setup after the component has its default DOM nodes.
     * @returns {*} void.
     */
    _afterConnected() {
        if (!this._dom.default) {
            this._renderDefault();
            return;
        }
        this._ensureDefaultMountedInInputContainer();
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
        this._ensureDefaultMountedInInputContainer();

        const bg = this.getAttribute("bgcolor");
        const check = this.getAttribute("checkcolor");
        if (bg != null) this.style.setProperty("--bgcolor", bg);
        else this.style.removeProperty("--bgcolor");
        if (check != null) this.style.setProperty("--checkcolor", check);
        else this.style.removeProperty("--checkcolor");
        this.setAttribute("aria-checked", this.checked ? "true" : "false");
        this.setAttribute("role", "checkbox");
    }
}

customElements.define("input-checkbox", InputCheckbox);

export default InputCheckbox;
