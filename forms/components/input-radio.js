import InputComponent from "./input-component.js";

class InputRadio extends InputComponent {
    constructor() {
        super({ _layout: "label:>:input:<" });
        this.inputType = "radio";
    }

    static get observedAttributes() {
        return [...super.observedAttributes, "bgcolor", "checkcolor"];
    }

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

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "radio";
        input.classList.add("visually-hidden");
        if (!input.value) input.value = "on";
        return input;
    }

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

    _afterConnected() {
        if (!this._dom.default) {
            this._renderDefault();
            return;
        }
        this._ensureDefaultMountedInInputContainer();
    }

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

    _onNativeChangeEvent() {
        if (!this.checked) return;
        this._uncheckSiblings();
    }

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

    set checked(value) {
        super.checked = value;
        if (value) this._uncheckSiblings();
    }

    get checked() {
        return super.checked;
    }
}

customElements.define("input-radio", InputRadio);

export default InputRadio;
