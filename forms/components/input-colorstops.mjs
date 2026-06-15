import InputComponent from "./input-component.mjs";
import "./input-color.mjs";

const DEFAULT_STOPS = [
    { color: "#2563eb", position: 0 },
    { color: "#14b8a6", position: 52 },
    { color: "#f97316", position: 100 }
];

function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
}

function getPositionFromEvent(event, track) {
    const rect = track.getBoundingClientRect();
    if (!rect.width) return 0;
    return clamp(((event.clientX - rect.left) / rect.width) * 100);
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
        this._outsidePointerHandler = null;
        this._escapeHandler = null;
    }

    get _styles() {
        return {
            ".native-wrapper": {
                display: "none"
            },
            ".input-root, .input-wrapper, .default": {
                overflow: "visible"
            },
            ".colorstops": {
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
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
                backgroundImage:
                    "var(--colorstops-gradient), linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)",
                backgroundColor: "#ffffff",
                backgroundPosition: "0 0, 0 0, 0 8px, 8px -8px, -8px 0",
                backgroundSize: "auto, 16px 16px, 16px 16px, 16px 16px, 16px 16px",
                boxSizing: "border-box",
                cursor: "copy"
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
                position: "absolute",
                display: "block",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "12px solid var(--color)",
                // filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
                zIndex: 1
            },
            ".stop:after": {
                content: '""',
                position: "absolute",
                display: "block",
                left: "2px",
                top: "2px",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "12px solid #000000",
                // filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
                zIndex: 0
            },
            ".stop[aria-current='true']": {
                cursor: "grabbing"
            },
            ".stop[data-delete='true']:before": {
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.45)) grayscale(1) opacity(0.45)"
            },
            ".stop[data-editing='true']:before": {
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.45)) brightness(1.08)"
            },
            ".add": {
                width: "34px",
                height: "34px",
                border: "1px solid #c8c8c8",
                borderRadius: "4px",
                background: "#9b9999",
                color: "#111827",
                fontSize: "24px",
                lineHeight: "30px",
                cursor: "pointer",
                transition: "transform ease 0.4s"
            },
            ".add:hover": {
                background: "#274a9b",
                color: "#FFFFFF",
                transform: "translateY(-5px)"
            },
            ".reverse": {
                position: "relative",
                width: "34px",
                height: "34px",
                padding: "4px",
                border: "1px solid #c8c8c8",
                borderRadius: "4px",
                background: "#9b9999",
                color: "#111827",
                fontSize: "24px",
                lineHeight: "30px",
                cursor: "pointer",
                transition: "transform ease 0.4s"
            },
            ".reverse:hover": {
                background: "#274a9b",
                color: "#FFFFFF",
                transform: "translateY(-5px)"
            },
            ".reverse svg": {
                width: "20px",
                height: "20px",
                margin: "auto",
                padding: "0",
                display: "block"
            },
            ".color-popover": {
                position: "absolute",
                left: "var(--popover-left, 50%)",
                bottom: "calc(100% + 34px)",
                zIndex: 20,
                display: "none",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                boxShadow: "0 16px 36px rgba(15, 23, 42, 0.22)",
                transform: "translateX(-50%)"
            },
            ".color-popover[open]": {
                display: "block"
            },
            ".color-popover:after": {
                content: '""',
                position: "absolute",
                left: "50%",
                top: "100%",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid #ffffff",
                transform: "translateX(-50%)"
            }
        };
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "hidden";
        input.classList.add("native");
        return input;
    }

    connectedCallback() {
        super.connectedCallback();
        this.bindPopoverCloseEvents();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unbindPopoverCloseEvents();
    }

    bindPopoverCloseEvents() {
        if (this._outsidePointerHandler) return;
        this._outsidePointerHandler = (event) => {
            const path = event.composedPath ? event.composedPath() : [];
            if (path.includes(this)) return;
            this.closePopover();
        };
        this._escapeHandler = (event) => {
            if (event.key !== "Escape") return;
            this.closePopover();
        };
        document.addEventListener("pointerdown", this._outsidePointerHandler);
        document.addEventListener("keydown", this._escapeHandler);
    }

    unbindPopoverCloseEvents() {
        if (this._outsidePointerHandler) {
            document.removeEventListener("pointerdown", this._outsidePointerHandler);
            this._outsidePointerHandler = null;
        }
        if (this._escapeHandler) {
            document.removeEventListener("keydown", this._escapeHandler);
            this._escapeHandler = null;
        }
    }

    closePopover() {
        this._dom.popover?.removeAttribute("open");
        this._dom.default?.querySelectorAll(".stop").forEach((stop) => stop.removeAttribute("data-editing"));
    }

    _renderDefault() {
        if (this._dom.default) return;

        this._dom.default = document.createElement("div");
        this._dom.default.className = "colorstops";
        this._dom.default.innerHTML = `
            <div class="track"></div>
            <button class="reverse" title="Reverse Stops" type="button" aria-label="Reverse color stops"><svg width="20" height="20" viewBox="0 0 25 25" ><line x1="12.5" y1="0" x2="12.5" y2="25" stroke="currentColor"  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /> <polygon points="0 5, 10 12.5, 0 20" stroke="currentColor" fill="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><polygon points="25 5, 15 12.5, 25 20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
            <button class="add" title="Add Stop" type="button" aria-label="Add color stop">+</button>
            <div class="color-popover">
                <input-color label="Color"></input-color>
            </div>
        `;

        this._dom.default.querySelector(".reverse").addEventListener("click", () => this.reverse());

        this._dom.default.querySelector(".add").addEventListener("click", () => this.addStop());
        this._dom.default
            .querySelector(".track")
            .addEventListener("pointerdown", (event) => this.addStopFromTrack(event));
        this._dom.popover = this._dom.default.querySelector(".color-popover");
        this._dom.color = this._dom.default.querySelector("input-color");
        this._dom.color.addEventListener("input", (event) => {
            const index = Number(this._dom.popover.dataset.index);
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

    reverse() {
        this.stops = parseStops(this.value);
        this.stops = this.stops
            .map((stop) => ({
                ...stop,
                position: clamp(100 - (Number(stop.position) || 0), 0, 100)
            }))
            .sort((a, b) => a.position - b.position);
        this.commit();
    }

    addStop(position = 50, color = "#ffffff") {
        this.stops.push({ color, position: clamp(position) });
        this.commit();
    }

    addStopFromTrack(event) {
        if (event.target.closest(".stop")) return;
        const track = this._dom.default.querySelector(".track");
        const position = getPositionFromEvent(event, track);
        this.addStop(position, this.colorAtPosition(position));
    }

    colorAtPosition(position) {
        if (!this.stops.length) return "#ffffff";
        const sorted = [...this.stops].sort((a, b) => a.position - b.position);
        let nearest = sorted[0];
        let distance = Math.abs(position - nearest.position);
        for (let i = 1; i < sorted.length; i += 1) {
            const nextDistance = Math.abs(position - sorted[i].position);
            if (nextDistance < distance) {
                nearest = sorted[i];
                distance = nextDistance;
            }
        }
        return nearest.color || "#ffffff";
    }

    startDrag(index, event) {
        event.preventDefault();
        this.dragIndex = index;
        this.dragPointerId = event.pointerId;
        this.dragMoved = false;
        event.currentTarget.setAttribute("aria-current", "true");
        event.currentTarget.removeAttribute("data-delete");
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    dragStop(event) {
        if (this.dragIndex === null) return;
        if (this.dragPointerId !== null && event.pointerId !== this.dragPointerId) return;
        const track = this._dom.default.querySelector(".track");
        const rect = track.getBoundingClientRect();
        const position = getPositionFromEvent(event, track);
        const shouldDelete = this.stops.length > 2 && event.clientY > rect.bottom + 24;
        if (Math.abs(position - this.stops[this.dragIndex].position) > 0.5) this.dragMoved = true;
        if (shouldDelete) this.dragMoved = true;
        this.stops[this.dragIndex].position = clamp(position);
        event.currentTarget.style.setProperty("--position", this.stops[this.dragIndex].position);
        event.currentTarget.toggleAttribute("data-delete", shouldDelete);
        if (this._dom.popover?.hasAttribute("open")) this.positionPopover(event.currentTarget);
        this.commit({ render: false, sort: false, change: false });
    }

    endDrag() {
        this.dragIndex = null;
        this.dragPointerId = null;
        this._dom.default?.querySelectorAll(".stop").forEach((marker) => {
            marker.removeAttribute("aria-current");
            marker.removeAttribute("data-delete");
        });
    }

    finishStop(index, marker) {
        if (marker.hasAttribute("data-delete") && this.stops.length > 2) {
            this.deleteStop(index);
            this.endDrag();
            return;
        }

        if (this.dragMoved) {
            this.commit();
        } else {
            this.editStop(index, marker);
        }

        this.endDrag();
    }

    deleteStop(index) {
        if (!this.stops[index] || this.stops.length <= 2) return;
        this.stops.splice(index, 1);
        this.closePopover();
        this.commit();
    }

    positionPopover(marker) {
        const track = this._dom.default.querySelector(".track");
        const trackRect = track.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const left = ((markerRect.left + markerRect.width / 2 - trackRect.left) / trackRect.width) * 100;
        this._dom.popover.style.setProperty("--popover-left", `${clamp(left, 0, 100)}%`);
    }

    editStop(index, marker) {
        this._dom.default.querySelectorAll(".stop").forEach((stop) => stop.removeAttribute("data-editing"));
        marker.setAttribute("data-editing", "true");
        this._dom.popover.dataset.index = index;
        this._dom.color.value = this.stops[index].color;
        this.positionPopover(marker);
        this._dom.popover.setAttribute("open", "");
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
            marker.addEventListener("pointerup", () => this.finishStop(index, marker));
            marker.addEventListener("pointercancel", () => this.endDrag());
            marker.addEventListener("lostpointercapture", () => this.endDrag());
            track.appendChild(marker);
        });
    }
}

customElements.define(InputColorStops.tag, InputColorStops);

export default InputColorStops;
