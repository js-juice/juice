import InputComponent from "./input-component.js";

class InputTextarea extends InputComponent {
    get _styles() {
        return {
            ".input-wrapper": {
                padding: 0,
                minWidth: "12rem"
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
    constructor() {
        super({ _layout: "label:input:>:status:<:validation" });
        this.inputType = "textarea";
    }

    _createNativeControl() {
        return document.createElement("textarea");
    }
}

customElements.define("input-textarea", InputTextarea);

export default InputTextarea;
