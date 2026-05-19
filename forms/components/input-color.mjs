import InputComponent from "./input-component.mjs";

class InputColorComponent extends InputComponent {
    static tag = "input-color";

    static get observedAttributes() {
        return [...super.observedAttributes.filter((name) => name !== "type")];
    }

    get _styles() {
        return {};
    }

    constructor() {
        super({ _layout: "label:default:input:>:native:status:<:validation" });
        this.inputType = "color";
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "color";
        input.autocomplete = "off";
        input.classList.add("native");
        // ensure native control reflects min/max/step if present

        return input;
    }

    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        if (super.disconnectedCallback) super.disconnectedCallback();
    }

    _renderDefault() {}

    attributeChangedCallback(name, oldValue, newValue) {}
}

customElements.define(InputColorComponent.tag, InputColorComponent);
