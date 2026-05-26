import InputComponent from "./input-component.mjs";

const DEFAULT_STOPS = [
    { color: "#2563eb", position: 0 },
    { color: "#14b8a6", position: 52 },
    { color: "#f97316", position: 100 }
];

function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
}

function parseStops(value) {
    if (!value) return DEFAULT_STOPS.map((stop) => ({ ...stop }));

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return DEFAULT_STOPS.map((stop) => ({ ...stop }));

        return parsed
            .map((stop) => ({
                color: stop.color || "#ffffff",
                position: clamp(Number(stop.position) || 0)
            }))
            .sort((a, b) => a.position - b.position);
    } catch {
        return DEFAULT_STOPS.map((stop) => ({ ...stop }));
    }
}

class InputColorStops extends InputComponent {
    static tag = "input-colorstops";

    constructor() {
        super({ _layout: "label:input:>:default:native:status:<:validation" });
        this.stops = DEFAULT_STOPS.map((stop) => ({ ...stop }));
        this.dragIndex = null;
        this.dragPointerId = null;
    }

    get _styles() {
        return {
            ".native-wrapper": {
                display: "none"
            },
            ".colorstops": {
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "0.6rem",
                alignItems: "center",
                width: "100%",
                padding: "0.65rem"
            },
            ".track": {
                position: "relative",
                height: "34px",
                border: "1px solid #c8c8c8",
                borderRadius: "4px",
                background: "var(--colorstops-gradient)",
                boxSizing: "border-box"
            },
            ".stop": {
                position: "absolute",
                left: "calc(var(--position) * 1%)",
                top: "100%",
                width: "16px",
                height: "16px",
                padding: 0,
                border: 0,
                background: "transparent",
                transform: "translate(-50%, 4px)",
                cursor: "grab"
            },
            ".stop:before": {
                content: '""',
                display: "block",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "12px solid var(--color)",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))"
            },
            ".stop[aria-current='true']": {
                cursor: "grabbing"
            },
            ".add": {
                width: "34px",
                height: "34px",
                border: "1px solid #c8c8c8",
                borderRadius: "4px",
                background: "#ffffff",
                fontSize: "24px",
                lineHeight: "30px",
                cursor: "pointer"
            },
            ".color-editor": {
                position: "absolute",
                width: "1px",
                height: "1px",
                opacity: 0,
                pointerEvents: "none"
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
        if (this._dom.default) return;

        this._dom.default = document.createElement("div");
        this._dom.default.className = "colorstops";
        this._dom.default.innerHTML = `
            <div class="track"></div>
            <button class="add" type="button" aria-label="Add color stop">+</button>
            <input class="color-editor" type="color" aria-label="Color stop color">
        `;

        this._dom.default.querySelector(".add").addEventListener("click", () => this.addStop());
        this._dom.default.querySelector(".color-editor").addEventListener("input", (event) => {
            const index = Number(event.target.dataset.index);
            if (!Number.isInteger(index) || !this.stops[index]) return;
            this.stops[index].color = event.target.value;
            this.commit();
        });

        this._ensureDefaultMountedInInputContainer();
        this.renderStops();
    }

    _syncVisualState() {
        this.stops = parseStops(this.value);
        this.renderStops();
    }

    addStop() {
        this.stops.push({ color: "#ffffff", position: 50 });
        this.commit();
    }

    startDrag(index, event) {
        event.preventDefault();
        this.dragIndex = index;
        this.dragPointerId = event.pointerId;
        event.currentTarget.setAttribute("aria-current", "true");
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    dragStop(event) {
        if (this.dragIndex === null) return;
        if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) return;
        const rect = this._dom.default.querySelector(".track").getBoundingClientRect();
        const position = ((event.clientX - rect.left) / rect.width) * 100;
        this.stops[this.dragIndex].position = clamp(position);
        event.currentTarget.style.setProperty("--position", this.stops[this.dragIndex].position);
        this.commit({ render: false, sort: false, change: false });
    }

    endDrag() {
        if (this.dragIndex !== null) this.commit();
        this.dragIndex = null;
        this.dragPointerId = null;
        this._dom.default?.querySelectorAll(".stop").forEach((marker) => marker.removeAttribute("aria-current"));
    }

    editStop(index) {
        const input = this._dom.default.querySelector(".color-editor");
        input.dataset.index = index;
        input.value = this.stops[index].color;
        input.click();
    }

    commit({ render = true, sort = true, change = true } = {}) {
        if (sort) this.stops.sort((a, b) => a.position - b.position);
        this._dom.native.value = JSON.stringify(this.stops);
        this._syncHostFromNative();
        this._updateFormValue();
        if (render) this.renderStops();
        this.dispatchEvent(new Event("input", { bubbles: true }));
        if (change) this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    gradient() {
        return `linear-gradient(90deg, ${this.stops
            .map((stop) => `${stop.color} ${Math.round(stop.position)}%`)
            .join(", ")})`;
    }

    renderStops() {
        if (!this._dom.default) return;
        const track = this._dom.default.querySelector(".track");
        track.style.setProperty("--colorstops-gradient", this.gradient());
        track.querySelectorAll(".stop").forEach((marker) => marker.remove());

        this.stops.forEach((stop, index) => {
            const marker = document.createElement("button");
            marker.type = "button";
            marker.className = "stop";
            marker.style.setProperty("--position", stop.position);
            marker.style.setProperty("--color", stop.color);
            marker.setAttribute("aria-label", `Color stop ${index + 1}`);
            marker.addEventListener("pointerdown", (event) => this.startDrag(index, event));
            marker.addEventListener("pointermove", (event) => this.dragStop(event));
            marker.addEventListener("pointerup", () => this.endDrag());
            marker.addEventListener("pointercancel", () => this.endDrag());
            marker.addEventListener("lostpointercapture", () => this.endDrag());
            marker.addEventListener("dblclick", () => this.editStop(index));
            track.appendChild(marker);
        });
    }
}

customElements.define(InputColorStops.tag, InputColorStops);

export default InputColorStops;
