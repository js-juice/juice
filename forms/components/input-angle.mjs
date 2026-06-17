import InputComponent from "./input-component.mjs";

const UNITS = {
    deg: { label: "Degrees", toDeg: 1, fromDeg: 1 },
    rad: { label: "Radians", toDeg: 180 / Math.PI, fromDeg: Math.PI / 180 },
    turn: { label: "Turns", toDeg: 360, fromDeg: 1 / 360 },
    grad: { label: "Gradians", toDeg: 0.9, fromDeg: 10 / 9 }
};

class InputAngleComponent extends InputComponent {
    static tag = "input-angle";

    static get observedAttributes() {
        return [...super.observedAttributes, "unit"];
    }

    constructor() {
        super({ _layout: "label:default:input:>:native:status:<:validation" });
        this.inputType = "angle";
        this.angle = 0;
        this.unit = "deg";
        this.dragPointerId = null;
    }

    get _styles() {
        return {
            ".input-wrapper": {
                border: 0
            },
            ".native-wrapper": {
                display: "none"
            },
            ".angle-field": {
                display: "grid",
                gap: "0.65rem",
                width: "min(100%, 220px)"
            },
            ".angle-dial": {
                boxSizing: "border-box",
                position: "relative",
                width: "var(--form-angle-outer-size, 100%)", // 100%",
                aspectRatio: "1 / 1",
                border: "var(--form-angle-outer-border, 2px solid #b7c3cf)",
                borderRadius: "50%",
                background: "radial-gradient(circle at 38% 34%, #ffffff 0%, #eef3f8 58%, #d7e0eb 100%)",
                touchAction: "none",
                cursor: "grab"
            },
            ".angle-dial:active": {
                cursor: "grabbing"
            },
            ".angle-arm": {
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "42%",
                height: "3px",
                borderRadius: "999px",
                background: "var(--form-accent-color, #2563eb)",
                transformOrigin: "0 50%",
                transform: "rotate(var(--angle-deg))"
            },
            ".angle-arm::after": {
                content: '""',
                position: "absolute",
                right: "-6px",
                top: "50%",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "var(--form-accent-color, #2563eb)",
                border: "2px solid #ffffff",
                transform: "translateY(-50%)",
                boxShadow: "0 1px 4px rgba(15, 23, 42, 0.35)"
            },
            ".angle-center": {
                position: "absolute",
                left: "50%",
                top: "50%",
                border: "var(--form-angle-center-border, 0)",
                width: "var(--form-angle-center-size, 10px)",
                height: "var(--form-angle-center-size, 10px)",
                borderRadius: "50%",
                background: "var(--form-angle-center-background, #172033)",
                transform: "translate(-50%, -50%)",
                zIndex: 1
            },
            ".angle-value": {
                position: "absolute",
                left: "50%",
                bottom: "14%",
                transform: "translateX(-50%)",
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "#172033"
            },
            ".angle-grid": {
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "100%",
                height: "100%",
                transform: "translate(-50%, -50%)",
                zIndex: 0
            },
            ".grid-line": {
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "50%",
                height: "1px",
                transformOrigin: "0 50%",
                transform: "translateY(-50%) rotate(calc( var(--index) * 45deg ))",
                background: "#d2d2d2",
                zIndex: -1
            }
        };
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "hidden";
        input.classList.add("native");
        return input;
    }

    _renderDefault() {
        const field = document.createElement("div");
        field.className = "angle-field";
        field.innerHTML = `
            <div class="angle-dial">
                <div class="angle-arm"></div>
                <div class="angle-center"></div>
                <div class="angle-grid">
                    ${Array.from({ length: 8 })
                        .map((_, index) => `<div class="grid-line" style="--index: ${index}"></div>`)
                        .join("")}
                </div>
                <div class="angle-value"></div>
            </div>
            ${this.hasAttribute("unit") ? `<input id="unit" type='hidden' name='unit' value='${this.getAttribute("unit")}'>` : `<input-select id="unit" label="Unit" options="deg:Degrees,rad:Radians,turn:Turns,grad:Gradians" value="deg"></input-select>`}
        `;

        this._dom.default = field;
        this._dom.dial = field.querySelector(".angle-dial");
        this._dom.valueDisplay = field.querySelector(".angle-value");
        this._dom.unit = field.querySelector("#unit");

        this._dom.dial.addEventListener("pointerdown", (event) => {
            if (this.disabled) return;
            event.preventDefault();
            this.dragPointerId = event.pointerId;
            this._dom.dial.setPointerCapture?.(event.pointerId);
            this.updateFromPointer(event, "input");
        });
        this._dom.dial.addEventListener("pointermove", (event) => {
            if (event.pointerId !== this.dragPointerId) return;
            event.preventDefault();
            this.updateFromPointer(event, "input");
        });
        this._dom.dial.addEventListener("pointerup", (event) => this.endDrag(event));
        this._dom.dial.addEventListener("pointercancel", (event) => this.endDrag(event));
        this._dom.unit.addEventListener("input", () => {
            this.unit = UNITS[this._dom.unit.value] ? this._dom.unit.value : "deg";
            this.commit("change");
        });

        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
        return field;
    }

    _syncSingleAttribute(name) {
        super._syncSingleAttribute(name);
        if (name === "unit") this.unit = UNITS[this.getAttribute("unit")] ? this.getAttribute("unit") : "deg";
        if (name === "value") this.readValue(this._dom.native?.value || this.getAttribute("value"));
    }

    _afterConnected() {
        if (this.hasAttribute("unit")) {
            this.unitSet = true;
        }
        this.unit = UNITS[this.getAttribute("unit")] ? this.getAttribute("unit") : this.unit;
        this.readValue(this.getAttribute("value"));
        if (!this._dom.native.value)
            this._dom.native.value = `${this.format(this.angle * UNITS[this.unit].fromDeg)}${this.unit}`;
        this._syncVisualState();
    }

    _syncVisualState() {
        if (!this._dom.default) return;
        this._dom.default.style.setProperty("--angle-deg", `${this.angle}deg`);
        if (this._dom.unit && this._dom.unit.value !== this.unit) this._dom.unit.value = this.unit;
        this._dom.valueDisplay.textContent = `${this.format(this.angle * UNITS[this.unit].fromDeg)}${this.unit}`;
    }

    updateFromPointer(event, eventName) {
        const rect = this._dom.dial.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        this.angle = (Math.atan2(y, x) * 180) / Math.PI;
        if (this.angle < 0) this.angle += 360;
        this.commit(eventName);
    }

    endDrag(event) {
        if (event.pointerId !== this.dragPointerId) return;
        this.dragPointerId = null;
        this.commit("change");
        this._dom.dial.releasePointerCapture?.(event.pointerId);
    }

    readValue(value) {
        const match = String(value || "").match(/(-?\d+(?:\.\d+)?)(deg|rad|turn|grad)?/);
        if (!match) return;
        this.unit = UNITS[match[2]] ? match[2] : this.unit;
        this.angle = ((Number(match[1]) || 0) * UNITS[this.unit].toDeg) % 360;
        if (this.angle < 0) this.angle += 360;
    }

    commit(eventName) {
        this._dom.native.value = `${this.format(this.angle * UNITS[this.unit].fromDeg)}${this.unit}`;
        this._syncHostFromNative();
        this._updateFormValue();
        this._queueValidation();
        this._syncVisualState();
        this.dispatchEvent(new Event(eventName, { bubbles: true, composed: true }));
    }

    format(value) {
        return String(Number(value.toFixed(4)));
    }
}

customElements.define(InputAngleComponent.tag, InputAngleComponent);

export default InputAngleComponent;
