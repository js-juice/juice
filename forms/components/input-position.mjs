/**
 * AUTODOC:START
 * Component: <input-position>
 * Overview: Draggable 2D position marker that emits pointer coordinates while owning its marker visuals.
 *
 * Attribute Reference:
 * - `x`, `y`: Current position percentages.
 * - `active`: Shows the marker when present.
 * - `aria-label`: Accessible marker label.
 *
 * Events:
 * - `position-drag`: Fired during pointer drag with `{ clientX, clientY, pointerId }`.
 * AUTODOC:END
 */

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

class InputPosition extends HTMLElement {
    static tag = "input-position";

    static get observedAttributes() {
        return ["x", "y", "active", "aria-label"];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: absolute;
                    left: calc(var(--position-x, 50) * 1%);
                    top: calc(var(--position-y, 50) * 1%);
                    z-index: var(--position-z-index, 3);
                    display: none;
                    width: var(--position-marker-size, 18px);
                    height: var(--position-marker-size, 18px);
                    transform: translate(-50%, -50%);
                    touch-action: none;
                }

                :host([active]) {
                    display: block;
                }

                .marker {
                    position: relative;
                    display: block;
                    width: 100%;
                    height: 100%;
                    padding: 0;
                    border: var(--position-marker-border, 2px solid #ffffff);
                    border-radius: var(--position-marker-radius, 50%);
                    background: var(--position-marker-bg, #1d4ed8);
                    box-shadow: var(--position-marker-shadow, 0 0 0 1px rgba(15, 23, 42, 0.35), 0 6px 18px rgba(15, 23, 42, 0.28));
                    cursor: grab;
                    box-sizing: border-box;
                }

                .marker::before,
                .marker::after {
                    content: "";
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    background: var(--position-marker-cross-bg, rgba(255, 255, 255, 0.85));
                    transform: translate(-50%, -50%);
                }

                .marker::before {
                    width: var(--position-marker-cross-length, 28px);
                    height: var(--position-marker-cross-width, 2px);
                }

                .marker::after {
                    width: var(--position-marker-cross-width, 2px);
                    height: var(--position-marker-cross-length, 28px);
                }

                .marker[aria-grabbed="true"] {
                    cursor: grabbing;
                }
            </style>
            <button class="marker" type="button" part="marker" aria-label="Position marker"></button>
        `;
        this._marker = this.shadowRoot.querySelector(".marker");
        this._bindEvents();
    }

    connectedCallback() {
        this._syncPosition();
        this._syncLabel();
    }

    attributeChangedCallback() {
        this._syncPosition();
        this._syncLabel();
    }

    get x() {
        return Number(this.getAttribute("x") || 50);
    }

    set x(value) {
        this.setAttribute("x", String(clamp(Number(value) || 0)));
    }

    get y() {
        return Number(this.getAttribute("y") || 50);
    }

    set y(value) {
        this.setAttribute("y", String(clamp(Number(value) || 0)));
    }

    _bindEvents() {
        this._marker.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            this._marker.setPointerCapture?.(event.pointerId);
            this._marker.setAttribute("aria-grabbed", "true");
            this._emitDrag(event);
        });
        this._marker.addEventListener("pointermove", (event) => {
            if (this._marker.getAttribute("aria-grabbed") !== "true") return;
            this._emitDrag(event);
        });
        const endDrag = () => this._marker.removeAttribute("aria-grabbed");
        this._marker.addEventListener("pointerup", endDrag);
        this._marker.addEventListener("pointercancel", endDrag);
        this._marker.addEventListener("lostpointercapture", endDrag);
    }

    _emitDrag(event) {
        this.dispatchEvent(
            new CustomEvent("position-drag", {
                bubbles: true,
                composed: true,
                detail: {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    pointerId: event.pointerId
                }
            })
        );
    }

    _syncLabel() {
        this._marker.setAttribute("aria-label", this.getAttribute("aria-label") || "Position marker");
    }

    _syncPosition() {
        this.style.setProperty("--position-x", String(clamp(Number(this.getAttribute("x") || 50))));
        this.style.setProperty("--position-y", String(clamp(Number(this.getAttribute("y") || 50))));
    }
}

customElements.define(InputPosition.tag, InputPosition);

export default InputPosition;
