

/**
 * AUTODOC:START
 * Component: <input-radio>
 * Class: InputRadio
 * Overview: Custom-styled radio input that preserves native radio semantics and group exclusivity.
 *
 * Features:
 * - Uses hidden native radio input for form compatibility.
 * - Enforces same-name mutual exclusion through sibling synchronization.
 * - Supports custom selected-state colors via CSS-variable-backed attributes.
 *
 * Example:
 * `<input-radio name="theme" value="dark" label="Dark" checked></input-radio>`
 *
 * Attribute Reference:
 * - `name`: Radio group name used for exclusive selection.
 * - `value`: Submitted value when selected.
 * - `checked`: Initial/current selected state.
 * - `bgcolor`: Optional accent color for checked visuals.
 * - `checkcolor`: Optional center mark color override.
 *
 * Property Reference:
 * - `checked`: Getter/setter synchronized with the native radio state.
 *
 * CSS Variables:
 * - `--bgcolor`: Checked accent color.
 * - `--checkcolor`: Checked indicator color.
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

class InputRadio extends InputComponent {
    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:>:input:<" });
        this.inputType = "radio";
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
            ":host": {
                display: "inline-block"
            },
            ":host(:not(:last-child))": {
                marginRight: "1rem"
            },
            label: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                cursor: "pointer"
            },

            ".label-text": {
                lineHeight: 1,
                marginLeft: "0.5rem",
                verticalAlign: "middle",
                color: "#777777"
            },
            ".input-wrapper:has(input:checked) + .label-text": {
                color: "#333333"
            },
            ".input-wrapper": {
                position: "relative",
                width: "1em",
                height: "1em",
                borderRadius: "50%",
                border: "1px solid #bdbdbd",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#cccccc",
                background: "linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%)",
                boxShadow: "0px 0px 0px 0px rgba(165, 165, 165, 0);"
            },
            ".input-wrapper::before": {
                content: "''",
                position: "absolute",
                display: "block",
                width: "0.8em",
                height: "0.6em",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                opacity: 0.7
            },
            ".radio-center": {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "0.5em",
                height: "0.5em",
                borderRadius: "50%",
                backgroundColor: "#292929",
                background: "linear-gradient(0deg,rgba(41, 41, 41, 1) 0%, rgba(99, 99, 99, 1) 100%)",
                transition:
                    "height 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), width 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            },
            ":host([checked]) .radio-center": {
                width: "0.65em",
                height: "0.65em",
                backgroundColor: "var(--bgcolor, #0078d4)",
                background: "linear-gradient(0deg, #1e88d8 0%, rgb(0, 34, 59) 100%)",
                opacity: 1,
                transition:
                    "height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            },
            ":host([checked]) .radio-center::before": {
                content: "''",
                position: "absolute",
                display: "block",
                width: "0.5em",
                height: "0.5em",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                background: "linear-gradient(0deg, #005ba1 0%, #0078d4 100%)"
            },
            ":host([checked]) .input-wrapper": {
                borderColor: "var(--bgcolor, #0078d4)"
                // boxShadow: "0px 0px 1px 2px rgba(111, 202, 115, 0.3);"
            }
        };
    }

    /**
      * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "radio";
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

        const existing = wrapper.querySelectorAll(".radio-center, .svg-radio");
        for (let i = 0; i < existing.length; i += 1) {
            existing[i].remove();
        }

        const center = document.createElement("div");
        center.className = "radio-center";
        center.setAttribute("aria-hidden", "true");

        this._dom.default = center;
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

        const bg = this.getAttribute("bgcolor") || "#0078d4";
        const check = this.getAttribute("checkcolor") || "#ffffff";
        this.style.setProperty("--bgcolor", bg);
        this.style.setProperty("--checkcolor", check);
        this.setAttribute("aria-checked", this.checked ? "true" : "false");
        this.setAttribute("role", "radio");
    }

    /**
      * Handles native change event events and updates component state.
     * @returns {*} void.
     */
    _onNativeChangeEvent() {
        if (!this.checked) return;
        this._uncheckSiblings();
    }

    /**
       * Clears checked state from sibling radios in the same group.
     * @returns {*} Derived internal value or completion status.
     */
    _uncheckSiblings() {
        const name = this.getAttribute("name");
        if (!name) return;

        const scope = this.form || document;
        const radios = scope.querySelectorAll(`input-radio[name="${name}"]`);
        for (let i = 0; i < radios.length; i += 1) {
            const radio = radios[i];
            if (radio !== this) {
                radio.checked = false;
            }
        }
    }

    /**
     * Updates the `checked` value.
     * @param {*} value - Assigned value.
     * @returns {*} void
     */
    set checked(value) {
        super.checked = value;
        if (value) this._uncheckSiblings();
    }

    /**
        * Returns the current checked state.
     * @returns {*} Boolean state value.
     */
    get checked() {
        return super.checked;
    }
}

customElements.define("input-radio", InputRadio);

export default InputRadio;
