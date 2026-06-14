/**
 * AUTODOC:START
 * Component: <input-textarea>
 * Class: InputTextarea
 * Overview: Multi-line text input component for longer free-form text entry.
 *
 * Features:
 * - Uses InputComponent lifecycle, validation, and status UI.
 * - Native `<textarea>` control wrapped in Juice form styling/layout.
 * - Supports standard text validation rules through base validation pipeline.
 *
 * Example:
 * `<input-textarea label="Bio" rows="4" placeholder="Tell us about yourself"></input-textarea>`
 *
 * Attribute Reference:
 * - Inherits base input attributes and constraints (`required`, `maxlength`, `validation`, etc).
 * - Uses native textarea-relevant attributes such as `rows` when passed through.
 *
 * Property Reference:
 * - Inherits base properties (`value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - Inherits shared InputComponent variables (label, border, validation colors).
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

class InputTextarea extends InputComponent {
    /**
     * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    get _styles() {
        return {
            ".input-wrapper": {
                padding: 0,
                minWidth: "12rem"
            },
            ".input-wrapper .status-wrapper": {
                position: "absolute",
                top: "0",
                right: "0",
                width: "100%",
                padding: "0.2rem",
                boxSizing: "border-box",
                width: "var(--input-control-size)",
                height: "var(--input-control-size)"
            },
            textarea: {
                margin: "0.2rem",
                border: "0",
                outline: 0,
                minWidth: "calc(100% - 0.4rem) ",
                boxSizing: "border-box",
                fontSize: "1em",
                fontFamily: "inherit",
                resize: "vertical"
            }
        };
    }
    /**
     * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:input:>:status:<:validation" });
        this.inputType = "textarea";
    }

    /**
     * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        return document.createElement("textarea");
    }
}

customElements.define("input-textarea", InputTextarea);

export default InputTextarea;
