import InputComponent from "./input-component.mjs";

class InputRangeComponent extends InputComponent.HTMLElement {
    static tag = "input-range";
    static config = {
        properties: {
            min: { default: 0, linked: true },
            max: { default: 100, linked: true },
            step: { default: 1, linked: true },
            span: { default: 1, linked: true },
            multiple: { default: 1, type: "integer" }
        }
    };

    static get observedAttributes() {
        return ["min", "max", "step", "span", "multiple"];
    }

    constructor() {
        super({ _layout: "label:input:>:div.bar:>:div.span:<:div.values:native:status:<:validation" });
        this.inputType = "range";
        this.values = [];
        this.markerIndex = 0;
    }

    get _styles() {
        return [
            ...super.styles,
            `
            :host {
                display: block;
            }
            `
        ];
    }

    _createNativeControl() {
        if (this._useNativeMode()) {
            return document.createElement("input");
        }

        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.setAttribute("readonly", "readonly");
        input.setAttribute("form", "none");
        input.classList.add("native");
        this._dom.native = input;
        return input;
    }

    addNativeControl() {
        const input = document.createElement("input");
        input.type = "number";
        input.autocomplete = "off";
        input.setAttribute("readonly", "readonly");
        input.setAttribute("form", "none");
        input.classList.add("native");
        this._dom.labelValue = input;
    }

    addValueMarker(value) {
        let markerIndex = this.markerIndex || 0;
        this.markerIndex++;
        const marker = document.createElement("div");
        marker.classList.add("marker");
        const position = ((value - this.min) / (this.max - this.min)) * 100;
        marker.style.left = `${position}%`;
        let MOVING_MARKER = false;

        let MOVER_DATA = {
            markerIndex,
            initialValue: value,
            initialPosition: position,
            position: position,
            value: value
        };

        const onMouseMove = (e) => {
            if (!MOVING_MARKER) return; // not moving
            const rect = this._dom.bar.getBoundingClientRect();
            let newPosition = ((e.clientX - rect.left) / rect.width) * 100;
            newPosition = Math.max(0, Math.min(100, newPosition));
            const newValue = (newPosition / 100) * (this.max - this.min) + this.min;
            MOVER_DATA.position = newPosition;
            MOVER_DATA.value = newValue;
            marker.style.left = `${newPosition}%`;
            this.values[markerIndex] = newValue;
        };

        const onMouseUp = () => {
            MOVING_MARKER = false;
            marker.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        marker.addEventListener("mousedown", (e) => {
            e.preventDefault();
            MOVER_DATA.initialValue = value;
            MOVER_DATA.initialPosition = position;
            marker.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            MOVING_MARKER = true;
        });

        this._dom.bar.appendChild(marker);
    }
}
customElements.define(InputRangeComponent.tag, InputRangeComponent);
