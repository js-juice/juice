import InputComponent from "./input-component.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 120;
const CENTER = 60;
const RADIUS = 50;
const EPSILON = 1e-6;
const VECTOR_SYNC_EPSILON = 1e-3;
const RING_SEGMENTS = 80;
const BASE_DIRECTION = { x: 0, y: 0, z: -1 };

class InputDirectionComponent extends InputComponent {
    static get observedAttributes() {
        return [...super.observedAttributes, "default-x", "default-y", "default-z"];
    }

    constructor() {
        super({ _layout: "label:default:input:>:native:status:<:validation" });
        this.inputType = "direction";

        this._vector = { x: 0, y: 0, z: -1 };
        this._orientation = { x: 0, y: 0, z: 0, w: 1 };
        this._dragPointerId = null;
        this._dragArcballVector = null;
        this._dragMoved = false;
        this._isSyncingAxisInputs = false;

        this._dom.canvas = null;
        this._dom.directionLine = null;
        this._dom.directionMarker = null;
        this._dom.ringX = null;
        this._dom.ringY = null;
        this._dom.ringZ = null;
        this._dom.axisX = null;
        this._dom.axisY = null;
        this._dom.axisZ = null;
    }

    get _styles() {
        return {
            label: {
                display: "block"
            },
            ".default-field": {
                width: "100%",
                maxWidth: "220px",
                minWidth: "120px",
                aspectRatio: "1 / 1",
                position: "relative"
            },
            ".direction-canvas": {
                width: "100%",
                height: "100%",
                display: "block",
                touchAction: "none",
                userSelect: "none",
                cursor: "grab"
            },
            ".direction-canvas:active": {
                cursor: "grabbing"
            },
            ":host([disabled]) .direction-canvas": {
                cursor: "not-allowed",
                opacity: "0.65"
            },
            ".direction-sphere": {
                fill: "var(--direction-sphere-bg, rgba(194, 204, 212, 0.5))",
                stroke: "var(--direction-sphere-stroke, rgba(50, 62, 76, 0.35))",
                strokeWidth: "1"
            },
            ".direction-ring": {
                fill: "none",
                strokeWidth: "2",
                pointerEvents: "none"
            },
            ".direction-ring.x": {
                stroke: "var(--direction-x-ring-color, rgba(226, 76, 57, 0.85))"
            },
            ".direction-ring.y": {
                stroke: "var(--direction-y-ring-color, rgba(66, 167, 86, 0.85))"
            },
            ".direction-ring.z": {
                stroke: "var(--direction-z-ring-color, rgba(66, 120, 214, 0.85))"
            },
            ".direction-line": {
                fill: "none",
                stroke: "var(--direction-line-color, rgba(20, 28, 35, 0.92))",
                strokeWidth: "1",
                strokeLinecap: "round",
                pointerEvents: "none"
            },
            ".direction-marker": {
                fill: "var(--direction-marker-fill, #f5d505)",
                stroke: "var(--direction-marker-stroke, #666666)",
                strokeWidth: "1",
                pointerEvents: "none"
            },
            ".native-wrapper": {
                display: "none"
            },
            ".direction-inputs": {
                marginTop: "0.5rem",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0.4rem"
            },
            ".axis-field": {
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem"
            },
            ".axis-label": {
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#4a5560"
            },
            ".axis-input": {
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #b7c3cf",
                borderRadius: "4px",
                padding: "0.2rem 0.35rem",
                fontSize: "0.8rem"
            }
        };
    }

    _renderDefault() {
        const defaultField = document.createElement("div");
        defaultField.className = "default-field";
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "direction-canvas");
        svg.setAttribute("viewBox", `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);
        svg.setAttribute("aria-hidden", "true");

        const sphere = this._makeSvgNode("circle", {
            class: "direction-sphere",
            cx: CENTER,
            cy: CENTER,
            r: RADIUS
        });
        const ringX = this._makeSvgNode("path", { class: "direction-ring x", d: "" });
        const ringY = this._makeSvgNode("path", { class: "direction-ring y", d: "" });
        const ringZ = this._makeSvgNode("path", { class: "direction-ring z", d: "" });
        const line = this._makeSvgNode("line", {
            class: "direction-line",
            x1: CENTER,
            y1: CENTER,
            x2: CENTER,
            y2: CENTER
        });
        const marker = this._makeSvgNode("circle", {
            class: "direction-marker",
            cx: CENTER,
            cy: CENTER,
            r: 4
        });

        svg.appendChild(sphere);
        svg.appendChild(ringX);
        svg.appendChild(ringY);
        svg.appendChild(ringZ);
        svg.appendChild(line);
        svg.appendChild(marker);
        defaultField.appendChild(svg);
        defaultField.appendChild(this._renderAxisInputs());

        this._dom.canvas = svg;
        this._dom.ringX = ringX;
        this._dom.ringY = ringY;
        this._dom.ringZ = ringZ;
        this._dom.directionLine = line;
        this._dom.directionMarker = marker;

        this._bindCanvasEvents(svg);

        this._dom.default = defaultField;
        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
        return defaultField;
    }

    _renderAxisInputs() {
        const wrap = document.createElement("div");
        wrap.className = "direction-inputs";

        const createAxisField = (axisKey) => {
            const field = document.createElement("label");
            field.className = "axis-field";

            const caption = document.createElement("span");
            caption.className = "axis-label";
            caption.textContent = axisKey.toUpperCase();

            const input = document.createElement("input");
            input.className = "axis-input";
            input.type = "number";
            input.step = "0.01";
            input.min = "-1";
            input.max = "1";
            input.inputMode = "decimal";

            field.appendChild(caption);
            field.appendChild(input);
            return { field, input };
        };

        const xField = createAxisField("x");
        const yField = createAxisField("y");
        const zField = createAxisField("z");

        this._dom.axisX = xField.input;
        this._dom.axisY = yField.input;
        this._dom.axisZ = zField.input;

        wrap.appendChild(xField.field);
        wrap.appendChild(yField.field);
        wrap.appendChild(zField.field);

        this._bindAxisInputs();
        return wrap;
    }

    _afterConnected() {
        const parsed = this._parseVector(this.getAttribute("value"));
        const initial = parsed || this._resolveDefaultVector();
        this._setVectorFromExternal(initial, { syncNative: true, syncHost: !parsed });
        this._syncVisualState();
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "hidden";
        input.autocomplete = "off";
        input.classList.add("native");
        return input;
    }

    _syncSingleAttribute(name) {
        super._syncSingleAttribute(name);

        if (name === "value") {
            const parsed = this._parseVector(this._dom.native?.value ?? this.getAttribute("value"));
            if (parsed) this._setVectorFromExternal(parsed, { syncNative: true, syncHost: false });
        }

        if ((name === "default-x" || name === "default-y" || name === "default-z") && !this.hasAttribute("value")) {
            this._setVectorFromExternal(this._resolveDefaultVector(), { syncNative: true, syncHost: true });
        }
    }

    _onNativeInputEvent() {
        const parsed = this._parseVector(this._dom.native?.value);
        if (parsed) this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
    }

    _onNativeChangeEvent() {
        const parsed = this._parseVector(this._dom.native?.value);
        if (parsed) this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
    }

    _syncVisualState() {
        if (!this._dom.default) {
            this._renderDefault();
            return;
        }

        const parsed = this._parseVector(this._dom.native?.value ?? this.getAttribute("value"));
        if (parsed && this._vectorDistance(parsed, this._vector) > VECTOR_SYNC_EPSILON) {
            this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
        }

        this._drawRings();
        this._drawDirection();
        this._syncAxisInputs();

        this.setAttribute(
            "aria-valuetext",
            `x ${this._formatFloat(this._vector.x)}, y ${this._formatFloat(this._vector.y)}, z ${this._formatFloat(this._vector.z)}`
        );
    }

    _drawDirection() {
        if (!this._dom.directionLine || !this._dom.directionMarker) return;

        const endX = CENTER + this._vector.x * RADIUS;
        const endY = CENTER - this._vector.y * RADIUS;

        this._dom.directionLine.setAttribute("x1", String(CENTER));
        this._dom.directionLine.setAttribute("y1", String(CENTER));
        this._dom.directionLine.setAttribute("x2", String(endX));
        this._dom.directionLine.setAttribute("y2", String(endY));

        this._dom.directionMarker.setAttribute("cx", String(endX));
        this._dom.directionMarker.setAttribute("cy", String(endY));

        const isBack = this._vector.z > 0;
        this._dom.directionLine.style.opacity = isBack ? "0.45" : "1";
        this._dom.directionLine.style.strokeDasharray = isBack ? "4 3" : "";
        this._dom.directionMarker.style.opacity = isBack ? "0.55" : "1";
    }

    _drawRings() {
        if (!this._dom.ringX || !this._dom.ringY || !this._dom.ringZ) return;

        this._dom.ringX.setAttribute("d", this._buildRingPath({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }));
        this._dom.ringY.setAttribute("d", this._buildRingPath({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }));
        this._dom.ringZ.setAttribute("d", this._buildRingPath({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }));
    }

    _buildRingPath(u, v) {
        let path = "";
        for (let i = 0; i <= RING_SEGMENTS; i += 1) {
            const t = (i / RING_SEGMENTS) * Math.PI * 2;
            const p = {
                x: u.x * Math.cos(t) + v.x * Math.sin(t),
                y: u.y * Math.cos(t) + v.y * Math.sin(t),
                z: u.z * Math.cos(t) + v.z * Math.sin(t)
            };
            const rotated = this._rotateVector(p, this._orientation);
            const sx = CENTER + rotated.x * RADIUS;
            const sy = CENTER - rotated.y * RADIUS;
            path += i === 0 ? `M ${sx.toFixed(2)} ${sy.toFixed(2)}` : ` L ${sx.toFixed(2)} ${sy.toFixed(2)}`;
        }
        return `${path} Z`;
    }

    _bindCanvasEvents(canvas) {
        if (!canvas) return;

        canvas.addEventListener("pointerdown", (event) => {
            if (this.disabled) return;
            event.preventDefault();

            const arcball = this._projectPointerToArcball(event);
            if (!arcball) return;

            this._dragPointerId = event.pointerId;
            this._dragArcballVector = arcball;
            this._dragMoved = false;
            this.classList.add("focused");
            this.classList.add("touched");
            try {
                canvas.setPointerCapture(event.pointerId);
            } catch (_error) {
                // Ignore pointer capture errors.
            }
        });

        canvas.addEventListener("pointermove", (event) => {
            if (this.disabled || event.pointerId !== this._dragPointerId) return;
            event.preventDefault();
            this._applyPointerRotation(event, "input");
        });

        const finishDrag = (event) => {
            if (event.pointerId !== this._dragPointerId) return;
            event.preventDefault();
            this._applyPointerRotation(event, "input");
            if (this._dragMoved) this._commitVectorToHost("change");

            this._dragPointerId = null;
            this._dragArcballVector = null;
            this.classList.remove("focused");
            try {
                canvas.releasePointerCapture(event.pointerId);
            } catch (_error) {
                // Ignore pointer release errors.
            }
        };

        canvas.addEventListener("pointerup", finishDrag);
        canvas.addEventListener("pointercancel", finishDrag);
    }

    _bindAxisInputs() {
        const onAxisInput = () => {
            this._commitAxisInputs("input");
        };
        const onAxisChange = () => {
            this._commitAxisInputs("change");
        };

        if (this._dom.axisX) {
            this._dom.axisX.addEventListener("input", onAxisInput);
            this._dom.axisX.addEventListener("change", onAxisChange);
        }
        if (this._dom.axisY) {
            this._dom.axisY.addEventListener("input", onAxisInput);
            this._dom.axisY.addEventListener("change", onAxisChange);
        }
        if (this._dom.axisZ) {
            this._dom.axisZ.addEventListener("input", onAxisInput);
            this._dom.axisZ.addEventListener("change", onAxisChange);
        }
    }

    _commitAxisInputs(eventName) {
        if (this._isSyncingAxisInputs) return;

        const x = Number(this._dom.axisX?.value);
        const y = Number(this._dom.axisY?.value);
        const z = Number(this._dom.axisZ?.value);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

        const before = this._serializeVector(this._vector);
        this._setVectorFromExternal({ x, y, z }, { syncNative: true, syncHost: true });
        this._updateFormValue();
        this._queueValidation();
        this._syncVisualState();

        const after = this._serializeVector(this._vector);
        if (before !== after) {
            this.dispatchEvent(new Event(eventName, { bubbles: true, composed: true }));
        }
    }

    _syncAxisInputs() {
        if (!this._dom.axisX || !this._dom.axisY || !this._dom.axisZ) return;
        this._isSyncingAxisInputs = true;
        this._dom.axisX.value = this._formatFloat(this._vector.x);
        this._dom.axisY.value = this._formatFloat(this._vector.y);
        this._dom.axisZ.value = this._formatFloat(this._vector.z);
        this._isSyncingAxisInputs = false;
    }

    _applyPointerRotation(event, emitEventName) {
        if (!this._dragArcballVector) return;

        const current = this._projectPointerToArcball(event);
        if (!current) return;

        const delta = this._quaternionFromUnitVectors(this._dragArcballVector, current);
        this._dragArcballVector = current;
        if (!delta) return;

        this._orientation = this._normalizeQuaternion(this._multiplyQuaternion(delta, this._orientation));
        this._vector = this._normalizeVector(this._rotateVector(BASE_DIRECTION, this._orientation));
        this._dragMoved = true;
        this._commitVectorToHost(emitEventName);
    }

    _commitVectorToHost(eventName) {
        if (!this._dom.native) return;

        const serialized = this._serializeVector(this._vector);
        const changed = this._dom.native.value !== serialized;
        this._dom.native.value = serialized;
        this._syncHostFromNative();
        this._updateFormValue();
        this._queueValidation();
        this._syncVisualState();

        if (changed) {
            this.dispatchEvent(new Event(eventName, { bubbles: true, composed: true }));
        }
    }

    _projectPointerToArcball(event) {
        if (!this._dom.canvas) return null;

        const rect = this._dom.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        let x = 1 - ((event.clientX - rect.left) / rect.width) * 2;
        let y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        const d2 = x * x + y * y;

        let z = 0;
        if (d2 <= 1) {
            z = Math.sqrt(1 - d2);
        } else {
            const invLength = 1 / Math.sqrt(d2);
            x *= invLength;
            y *= invLength;
        }

        return this._normalizeVector({ x, y, z });
    }

    _setVectorFromExternal(vector, { syncNative = false, syncHost = false } = {}) {
        const normalized = this._normalizeVector(vector);
        this._vector = normalized;
        this._orientation = this._quaternionFromUnitVectors(BASE_DIRECTION, normalized);

        if (syncNative && this._dom.native) {
            this._dom.native.value = this._serializeVector(normalized);
        }

        if (syncHost && this._dom.native) {
            this._syncHostFromNative();
            this._updateFormValue();
        }
    }

    _resolveDefaultVector() {
        return this._normalizeVector({
            x: this._readNumberAttribute("default-x", 0),
            y: this._readNumberAttribute("default-y", 0),
            z: this._readNumberAttribute("default-z", -1)
        });
    }

    _readNumberAttribute(name, fallback) {
        const raw = this.getAttribute(name);
        if (raw === null || raw === "") return fallback;
        const n = Number(raw);
        return Number.isFinite(n) ? n : fallback;
    }

    _vectorDistance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    }

    _normalizeVector(value) {
        const x = Number(value?.x);
        const y = Number(value?.y);
        const z = Number(value?.z);
        const nx = Number.isFinite(x) ? x : 0;
        const ny = Number.isFinite(y) ? y : 0;
        const nz = Number.isFinite(z) ? z : -1;

        const magnitude = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (magnitude <= EPSILON) return { x: 0, y: 0, z: -1 };

        return { x: nx / magnitude, y: ny / magnitude, z: nz / magnitude };
    }

    _dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    _cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    _normalizeQuaternion(q) {
        const mag = Math.hypot(q.x, q.y, q.z, q.w);
        if (mag <= EPSILON) return { x: 0, y: 0, z: 0, w: 1 };
        return { x: q.x / mag, y: q.y / mag, z: q.z / mag, w: q.w / mag };
    }

    _multiplyQuaternion(a, b) {
        return {
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
        };
    }

    _quaternionFromUnitVectors(from, to) {
        const f = this._normalizeVector(from);
        const t = this._normalizeVector(to);
        const dot = this._dot(f, t);

        if (dot < -1 + EPSILON) {
            let axis = this._cross({ x: 1, y: 0, z: 0 }, f);
            if (Math.hypot(axis.x, axis.y, axis.z) <= EPSILON) {
                axis = this._cross({ x: 0, y: 1, z: 0 }, f);
            }
            const n = this._normalizeVector(axis);
            return { x: n.x, y: n.y, z: n.z, w: 0 };
        }

        const axis = this._cross(f, t);
        return this._normalizeQuaternion({
            x: axis.x,
            y: axis.y,
            z: axis.z,
            w: 1 + dot
        });
    }

    _rotateVector(v, q) {
        const u = { x: q.x, y: q.y, z: q.z };
        const s = q.w;
        const dotUV = this._dot(u, v);
        const dotUU = this._dot(u, u);
        const crossUV = this._cross(u, v);

        return {
            x: 2 * dotUV * u.x + (s * s - dotUU) * v.x + 2 * s * crossUV.x,
            y: 2 * dotUV * u.y + (s * s - dotUU) * v.y + 2 * s * crossUV.y,
            z: 2 * dotUV * u.z + (s * s - dotUU) * v.z + 2 * s * crossUV.z
        };
    }

    _parseVector(raw) {
        if (raw === null || raw === undefined) return null;
        if (typeof raw === "object") return this._normalizeVector(raw);

        const text = String(raw).trim();
        if (!text) return null;

        const matches = text.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi);
        if (!matches || matches.length < 3) return null;

        const x = Number(matches[0]);
        const y = Number(matches[1]);
        const z = Number(matches[2]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;

        return this._normalizeVector({ x, y, z });
    }

    _serializeVector(vector) {
        const v = this._normalizeVector(vector);
        return `${this._formatFloat(v.x)},${this._formatFloat(v.y)},${this._formatFloat(v.z)}`;
    }

    _formatFloat(value) {
        const next = Math.abs(value) < 1e-7 ? 0 : value;
        return String(Number(next.toFixed(4)));
    }

    _makeSvgNode(tag, attrs = {}) {
        const node = document.createElementNS(SVG_NS, tag);
        const names = Object.keys(attrs);
        for (let i = 0; i < names.length; i += 1) {
            const name = names[i];
            node.setAttribute(name, String(attrs[name]));
        }
        return node;
    }
}

customElements.define("input-direction", InputDirectionComponent);
