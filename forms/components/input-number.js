import InputComponent from "./input-component.js";

class InputNumber extends InputComponent {
    constructor() {
        super({ _layout: "label:input:>:div.stepers:>:div.step.up:div.step.down:<:native:status:<:validation" });
        this.inputType = "number";
    }

    get _styles() {
        return {
            ":host": {
                "--input-padding": "0.2em"
            },
            "input.native": {
                margin: "var(--input-padding)",
                width: "100%",
                boxSizing: "border-box"
            },
            ".stepers": {
                display: "flex",
                flexDirection: "column",
                position: "relative",
                right: "0",
                top: "0",
                borderRight: "1px solid #cccccc",
                marginRight: "0.5rem"
            },
            ".stepers .step": {
                flex: "0 0 auto",
                width: "1.5em",
                height: "50%",
                display: "flex",
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
                display: "block",
                "--s": "3px",
                height: "50%",
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
            }
        };
    }

    connectedCallback() {
        super.connectedCallback();
        this._bindStepers();
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.classList.add("native");
        return input;
    }

    _stepValue(step) {
        const newValue = Number(this._dom.native.value) + step;
        this._dom.native.value = newValue;
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    _bindStepers() {
        const stepUp = this._shadow.querySelector(".step.up");
        const stepDown = this._shadow.querySelector(".step.down");

        const step = Number(this.getAttribute("step")) || 1;

        stepUp.addEventListener("click", () => {
            this._stepValue(step);
        });

        stepDown.addEventListener("click", () => {
            this._stepValue(-step);
        });
    }
}

customElements.define("input-number", InputNumber);

export default InputNumber;
