import InputComponent from "./input-component.js";

class InputCheckbox extends InputComponent {
    constructor() {
        super({ _layout: "label:>:input:<:validation" });
        this.inputType = "checkbox";
    }

    static get observedAttributes() {
        return [...super.observedAttributes, "bgcolor", "checkcolor"];
    }

    get _styles() {
        return {
            label: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                cursor: "pointer"
            },
            ".label-text": {
                lineHeight: "calc(1em - 2px)",
                marginLeft: "0.5rem"
            },
            ".input-wrapper": {
                width: "1em",
                height: "1em",
                borderRadius: "0.2em",
                border: "1px solid #8a8a8a",
                backgroundColor: "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                backgroundColor: "#cccccc",
                background: "linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%)",
                color: "transparent",
                transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease"
            },
            ":host([checked]) .input-wrapper": {
                borderColor: "var(--checked-border-color, var(--check-color, #222222))"
            },
            ".input-wrapper::before": {
                content: "''",
                position: "absolute",
                display: "block",
                width: "1.2em",
                height: "0.6em",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                opacity: 0.7
            },
            ".svg-checkbox": {
                width: "100%",
                height: "100%",
                display: "block",
                zIndex: "1"
            },
            ".checkbox-mark": {
                fill: "none",
                stroke: "var(--check-color, #222222)",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeDasharray: "14",
                strokeDashoffset: "14",
                transition: "stroke-dashoffset 0.25s ease"
            },
            ":host([checked]) .input-wrapper .checkbox-mark": {
                stroke: "var(--check-color, #222222)",
                strokeDashoffset: "0",
                transition: "stroke-dashoffset 0.25s ease"
            }
        };
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("visually-hidden");
        if (!input.value) input.value = "on";
        return input;
    }

    _renderDefault() {
        const wrapper = this._wireframe.input;
        if (!wrapper) return;

        const existing = wrapper.querySelectorAll(".svg-checkbox");
        for (let i = 0; i < existing.length; i += 1) {
            existing[i].remove();
        }

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "svg-checkbox");
        svg.setAttribute("viewBox", "0 0 12 12");
        svg.setAttribute("aria-hidden", "true");

        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("class", "checkbox-mark");
        polyline.setAttribute("points", "2.2 6.3 5 9.2 9.6 2.8");
        svg.appendChild(polyline);

        this._dom.default = svg;
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

        const bg = this.getAttribute("bgcolor");
        const check = this.getAttribute("checkcolor");
        if (bg != null) this.style.setProperty("--bgcolor", bg);
        else this.style.removeProperty("--bgcolor");
        if (check != null) this.style.setProperty("--checkcolor", check);
        else this.style.removeProperty("--checkcolor");
        this.setAttribute("aria-checked", this.checked ? "true" : "false");
        this.setAttribute("role", "checkbox");
    }
}

customElements.define("input-checkbox", InputCheckbox);

export default InputCheckbox;
