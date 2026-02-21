import InputComponent from "./input-component.js";

class InputText extends InputComponent {
    constructor() {
        super({ _layout: "label:input:>:native:status:<:validation" });
        this.inputType = "text";
    }

    get _styles() {
        return {
            ":root": {
                "--input-padding": "0.2em"
            }
        };
    }

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
