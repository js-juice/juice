/**
 * AUTODOC:START
 * Component: <input-textarea>
 * Class: InputTextarea
 * Overview: Multi-line text input component for longer free-form text entry.
 *
 * Features:
 * - Uses InputComponent lifecycle, validation, and status UI.
 * - Native `<textarea>` control wrapped in Juice form styling/layout.
 * - Starts at one row and grows vertically to fit the entered text.
 * - Supports standard text validation rules through base validation pipeline.
 *
 * Example:
 * `<input-textarea label="Bio" placeholder="Tell us about yourself"></input-textarea>`
 *
 * Attribute Reference:
 * - Inherits base input attributes and constraints (`required`, `maxlength`, `validation`, etc).
 * - Always begins at one row; preset and entered content determine the expanded height.
 * - `resizable` accepts `vertical`, `horizontal` or `both` (default).
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
import enhanceMarkdown from "./textarea-markdown.mjs";

class InputTextarea extends InputComponent {
    /**
     * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    static get styles() {
        return {
            ".input-wrapper": {
                resize: "both",
                padding: "var(--input-padding)",
                minWidth: "12rem",
                minHeight: "var(--input-control-size)"
            },
            ':host([resizable="vertical"]) .input-wrapper': { resize: "vertical" },
            ':host([resizable="horizontal"]) .input-wrapper': { resize: "horizontal" },
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
                margin: "0",
                padding: 0,
                border: "0",
                outline: 0,
                width: "100%",
                minWidth: 0,
                fieldSizing: "content",
                height: "auto",
                minHeight: "var(--input-height)",
                overflow: "auto",
                boxSizing: "border-box",
                backgroundColor: "transparent",
                textIndent: "var(--input-textarea-indent, 0px)",
                fontSize: "1em",
                lineHeight: "1.5",
                paddingTop: "0.2rem",
                paddingBottom: "0.2rem",
                paddingLeft: "0.5rem",
                paddingRight: "0.5rem",
                fontFamily: "inherit",
                resize: "none"
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
     * Wires textarea-specific sizing after the base component mounts.
     * @returns {void}
     */
    _afterConnected() {
        enhanceMarkdown(this);
    }

    /**
     * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const textarea = document.createElement("textarea");
        textarea.rows = 1;
        return textarea;
    }

}

customElements.define("input-textarea", InputTextarea);

export default InputTextarea;
