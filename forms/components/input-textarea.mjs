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
    static get styles() {
        return {
            ".input-wrapper": {
                padding: "var(--input-padding)",
                minWidth: "12rem",
                minHeight: "var(--input-control-size)"
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
                margin: "0",
                border: "0",
                outline: 0,
                minWidth: "calc(100% - 0.4rem) ",
                height: "auto",
                overflow: "hidden",
                boxSizing: "border-box",
                fontSize: "1em",
                lineHeight: "1.5em",
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
        this._boundAutoGrow = () => this._syncAutoGrowHeight();
    }

    /**
     * Wires textarea-specific sizing after the base component mounts.
     * @returns {void}
     */
    _afterConnected() {
        this._dom.native?.addEventListener("input", this._boundAutoGrow);
        this._syncAutoGrowHeight();
    }

    /**
     * Removes textarea-specific listeners when detached.
     * @returns {void}
     */
    disconnectedCallback() {
        this._dom.native?.removeEventListener("input", this._boundAutoGrow);
        super.disconnectedCallback();
    }

    /**
     * Runs after base attribute sync so preset values and row changes resize correctly.
     * @returns {void}
     */
    _afterSync() {
        this._syncAutoGrowHeight();
    }

    /**
     * Keeps height aligned when the base component changes value or classes.
     * @returns {void}
     */
    _syncVisualState() {
        this._syncAutoGrowHeight();
    }

    /**
     * Restores one-row sizing after native form reset.
     * @returns {void}
     */
    formResetCallback() {
        super.formResetCallback();
        this._syncAutoGrowHeight();
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

    /**
     * Fits the textarea to its current text content without leaving extra empty rows.
     * @returns {void}
     */
    _syncAutoGrowHeight() {
        const textarea = this._dom.native;
        if (!textarea) return;

        textarea.rows = 1;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
}

customElements.define("input-textarea", InputTextarea);

export default InputTextarea;
