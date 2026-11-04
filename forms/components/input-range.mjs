import InputComponent from "./input-component.mjs";

class InputRangeComponent extends InputComponent {
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

    static get observed() {
        return ["min", "max", "step", "span", "multiple", "precision"];
    }

    constructor() {
        super({ _layout: "label:input:>:default:native:>:status" });
        this.inputType = "range";
        this.values = [];
        this.markerIndex = 0;
        this.precision = 2;
        this._syncFrame = null;
        this._resizeObserver = null;
    }

    static get styles() {
        return {
            ".bar": {
                position: "relative",
                marginLeft: "0.5rem",
                marginRight: "0.5rem",
                marginTop: "0.5rem",
                width: "calc(100% - 1rem)",
                height: "5px",
                border: "1px solid #d2d2d2"
            },
            ".marker": {
                position: "absolute",
                cursor: "drag",
                height: "5px",
                width: "15px",
                left: 0,
                top: 0,
                zIndex: 100,
                backgroundColor: "var(--form-primary-color, #333333)"
            },
            ".marker:before": {
                content: '""',
                display: "block",
                width: "8px",
                height: "5px",
                position: "absolute",
                left: "50%",
                top: "100%",
                transform: "translateX(-50%)",
                backgroundColor: "inherit",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)"
            },
            ".marker:after": {
                content: '""',
                display: "block",
                width: "200%",
                height: "200%",
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
            },
            ".default-field": {
                position: "relative",
                zIndex: 100,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "center"
            },
            ".slider": {
                position: "relative",
                flex: "0 1 auto",
                width: "100%"
            },
            ".slider .labels": {
                marginLeft: "0.5rem",
                marginRight: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: "bold",
                color: "#666666",
                marginTop: "0.3rem"
            },
            ".slider .labels:after": {
                content: '""',
                display: "block",
                clear: "both"
            },
            ".labels .min-label": {
                float: "left",
                lineHeight: 1
            },
            ".labels .max-label": {
                float: "right",
                lineHeight: 1
            },
            ".value-display": {
                flex: "0 0 auto"
            },
            ".value-display input": {
                width: "100%",
                height: "var(--input-height)",
                margin: 0,
                padding: 0,
                border: 0,
                textAlign: "center",
                maxWidth: "65px"
            },
            ".native-wrapper": {
                width: 0
            },
            ".status-wrapper": {
                position: "absolute !important",
                zIndex: 10
            }
        };
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "number";
        input.autocomplete = "off";
        input.value = this.getAttribute("value") || 0;
        input.setAttribute("readonly", "readonly");
        input.setAttribute("form", "none");
        input.classList.add("native");
        this._dom.native = input;
        return input;
    }

    _normalizeNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    _formatValue(value) {
        const precision = Math.max(0, Math.floor(this._normalizeNumber(this.precision, 2)));
        return this._normalizeNumber(value).toFixed(precision);
    }

    _setRangeValue(value, eventType = "input") {
        const next = this._formatValue(value);
        const native = this._dom.native;
        if (native) native.value = next;
        if (this._valueInput) this._valueInput.value = next;
        this._syncHostFromNative();
        this._updateFormValue();
        this._queueValidation();
        this._queueVisualSync();
        this.dispatchEvent(new CustomEvent(eventType, { bubbles: true, composed: true, detail: { from: "range" } }));
    }

    _queueVisualSync() {
        if (this._syncFrame) cancelAnimationFrame(this._syncFrame);
        this._syncFrame = requestAnimationFrame(() => {
            this._syncFrame = requestAnimationFrame(() => {
                this._syncFrame = null;
                this._syncVisualState();
            });
        });
    }

    _syncVisualState() {
        const field = this._dom.default;
        if (!field) return;
        const marker = field.querySelector(".marker");
        const bar = field.querySelector(".bar");
        const valueInput = field.querySelector(".value-display input");
        const min = this._normalizeNumber(this.min, 0);
        const max = this._normalizeNumber(this.max, 100);
        const value = this._normalizeNumber(this.value, min);

        if (valueInput && valueInput.value !== this._formatValue(value)) {
            valueInput.value = this._formatValue(value);
        }
        if (!marker || !bar) return;

        const barWidth = bar.getBoundingClientRect().width;
        const markerWidth = marker.getBoundingClientRect().width;
        if (barWidth <= 0 || markerWidth <= 0) return;

        const maxX = Math.max(0, barWidth - markerWidth);
        const range = max - min;
        const percent = range ? Math.max(0, Math.min(1, (value - min) / range)) : 0;
        marker.style.left = `${maxX * percent}px`;
    }

    _afterConnected() {
        const bar = this._dom.default?.querySelector(".bar");
        if (bar && typeof ResizeObserver !== "undefined") {
            this._resizeObserver?.disconnect();
            this._resizeObserver = new ResizeObserver(() => this._queueVisualSync());
            this._resizeObserver.observe(bar);
        }
        this._queueVisualSync();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._syncFrame) cancelAnimationFrame(this._syncFrame);
        this._syncFrame = null;
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }

    _renderDefault() {
        const defaultField = document.createElement("div");
        defaultField.className = "default-field";

        const slider = document.createElement("div");
        slider.className = "slider";
        defaultField.appendChild(slider);

        const bar = document.createElement("div");
        bar.className = "bar";
        slider.appendChild(bar);

        const marker = document.createElement("div");
        marker.className = "marker";
        bar.appendChild(marker);

        const labels = document.createElement("div");
        labels.className = "labels";

        const minLabel = document.createElement("div");
        minLabel.className = "min-label";
        minLabel.innerText = this.min || "0";
        labels.appendChild(minLabel);

        const maxLabel = document.createElement("div");
        maxLabel.className = "max-label";
        maxLabel.innerText = this.max || "1";
        labels.appendChild(maxLabel);

        slider.appendChild(labels);

        const valueDisplay = document.createElement("div");
        valueDisplay.className = "value-display";
        defaultField.appendChild(valueDisplay);

        const valueInput = document.createElement("input");
        valueInput.setAttribute("step", this.step || 0.001);
        valueInput.setAttribute("type", "text");
        valueInput.setAttribute("value", this._formatValue(this.value || 0));
        valueInput.addEventListener("input", () => {
            this._setRangeValue(valueInput.value, "input");
        });
        valueInput.addEventListener("change", () => {
            this._setRangeValue(valueInput.value, "change");
        });

        valueDisplay.appendChild(valueInput);
        this._valueInput = valueInput;

        this.addBarListeners(defaultField);

        this._dom.default = defaultField;

        return defaultField;
    }

    addBarListeners(defaultField) {
        let drag = null;

        const bar = defaultField.querySelector(".bar");
        const marker = defaultField.querySelector(".marker");
        const valueInput = defaultField.querySelector(".value-display input");
        const valueFromClientX = (clientX, barRect, markerWidth) => {
            const min = this._normalizeNumber(this.min, 0);
            const max = this._normalizeNumber(this.max, 100);
            const step = Math.max(0.000001, this._normalizeNumber(this.step, 0.01));
            const maxX = Math.max(0, barRect.width - markerWidth);
            const x = Math.min(Math.max(clientX - barRect.left - markerWidth / 2, 0), maxX);
            const percent = maxX > 0 ? Math.min(x / maxX, 1) : 0;
            const rawValue = min + percent * (max - min);
            const value = Math.round(rawValue / step) * step;
            return Math.max(min, Math.min(max, value));
        };

        function onDragMove(e) {
            if (!drag) return;
            e.preventDefault();
            drag.lastClientX = e.clientX;
            const min = this._normalizeNumber(this.min, 0);
            const max = this._normalizeNumber(this.max, 100);
            const step = Math.max(0.000001, this._normalizeNumber(this.step, 0.01));
            const maxX = Math.max(0, drag.containRect.width - drag.rect.width);
            const diffX = e.clientX - drag.x;
            const x = Math.min(Math.max(drag.startX + diffX, 0), maxX);
            const percent = maxX > 0 ? Math.min(x / maxX, 1) : 0;
            const value = Math.floor((min + percent * (max - min)) / step) * step;
            this._setRangeValue(value, "input");
            drag.target.style.left = `${x}px`;
        }

        function cleanupDrag(releaseCapture = true) {
            if (!drag) return;
            const current = drag;
            drag = null;
            current.target.removeEventListener("pointermove", current.onMove);
            current.target.removeEventListener("pointerup", current.onStop);
            current.target.removeEventListener("pointercancel", current.onCancel);
            current.target.removeEventListener("lostpointercapture", current.onLostCapture);
            if (releaseCapture && current.target.hasPointerCapture?.(current.pointerId)) {
                current.target.releasePointerCapture(current.pointerId);
            }
        }

        function onDragStop(e) {
            if (!drag) return;
            e.preventDefault();
            const current = drag;
            const clientX = Number.isFinite(e.clientX) ? e.clientX : current.lastClientX;
            const maxX = Math.max(0, current.containRect.width - current.rect.width);
            const diffX = clientX - current.x;
            const x = Math.min(Math.max(current.startX + diffX, 0), maxX);

            current.target.style.left = `${x}px`;
            this._setRangeValue(valueInput.value, "change");
            cleanupDrag(true);
        }

        bar.addEventListener("pointerdown", (e) => {
            if (e.target === marker) return;
            e.preventDefault();
            const value = valueFromClientX(
                e.clientX,
                bar.getBoundingClientRect(),
                marker.getBoundingClientRect().width
            );
            this._setRangeValue(value, "input");
            this._setRangeValue(value, "change");
        });

        marker.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            cleanupDrag(true);
            const target = e.currentTarget;
            target.setPointerCapture(e.pointerId);
            drag = {
                x: e.clientX,
                lastClientX: e.clientX,
                startX: target.offsetLeft,
                offset: { x: e.offsetX, y: e.offsetY },
                rect: target.getBoundingClientRect(),
                containRect: target.parentNode.getBoundingClientRect(),
                target,
                pointerId: e.pointerId,
                onMove: onDragMove.bind(this),
                onStop: onDragStop.bind(this),
                onCancel: () => cleanupDrag(false),
                onLostCapture: () => cleanupDrag(false)
            };
            target.addEventListener("pointermove", drag.onMove);
            target.addEventListener("pointerup", drag.onStop);
            target.addEventListener("pointercancel", drag.onCancel);
            target.addEventListener("lostpointercapture", drag.onLostCapture);
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (name == "min") {
            this.min = Number(newValue);
        } else if (name == "max") {
            this.max = Number(newValue);
        } else if (name == "precision") {
            this.precision = Number(newValue);
        } else if (name == "step") {
            this.step = Number(newValue);
        }
        this._queueVisualSync();
    }
}
customElements.define(InputRangeComponent.tag, InputRangeComponent);
