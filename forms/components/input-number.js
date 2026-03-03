import InputComponent from "./input-component.js";

class InputNumber extends InputComponent {
    static get observedAttributes() {
        return [...super.observedAttributes.filter((name) => name !== "type"), "units", "step", "decimals"];
    }
    constructor() {
        super({
            _layout: "label:input:>:div.stepers:>:div.step.up:div.step.down:<:native:div.units:status:<:validation"
        });

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
            ".units": {
                lineHeight: "var(--input-height)",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis"
            },
            ".units > div": {
                margin: "auto",
                padding: "0 0.2em"
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
        if (this.hasAttribute("units")) {
            const unit = this.getAttribute("units");
            //this._wireframe["div.units"].style.width = `${unit.length * 4}ch`; // unit.length
            this._wireframe["div.units"].innerHTML = `<div>${unit}</div>`; // this.getAttribute("units");
        }
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.inputMode = "decimal";
        input.classList.add("native");
        return input;
    }

    _stepValue(step) {
        const current = Number(this._dom.native.value);
        const base = Number.isFinite(current) ? current : 0;
        const newValue = base + step;
        this._dom.native.value = newValue;
        this._dom.native.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this._dom.native.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
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
