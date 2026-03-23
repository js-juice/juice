

/**
 * AUTODOC:START
 * Component: <input-text>
 * Class: InputText
 * Overview: Single-line text input built on InputComponent with native text semantics.
 *
 * Features:
 * - Form associated behavior via InputComponent.
 * - Validation/status rendering from base component pipeline.
 * - Configurable through shared base input attributes (`label`, `value`, `placeholder`, `validation`, etc).
 *
 * Example:
 * `<input-text label="Username" placeholder="Type username" validation="required|min:3"></input-text>`
 *
 * Attribute Reference:
 * - Inherits full InputComponent attribute set.
 * - No component-specific attributes beyond the base contract.
 *
 * Property Reference:
 * - Inherits base properties (`value`, `disabled`, `format`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - `--input-padding`: Local text input inner spacing.
 * - Inherits shared InputComponent variables (validation, border, label).
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

class InputText extends InputComponent {
    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:input:>:native:status:<:validation" });
        this.inputType = "text";
    }

    /**
       * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    get _styles() {
        return {
            ":root": {
                "--input-padding": "0.2em"
            }
        };
    }

    /**
      * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.classList.add("native");
        return input;
    }
}

customElements.define("input-text", InputText);

export default InputText;
