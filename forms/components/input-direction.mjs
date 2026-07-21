

/**
 * AUTODOC:START
 * Component: <input-direction>
 * Class: InputDirectionComponent
 * Overview: 3D unit-direction control with arcball interaction, SVG visualization, and axis value editing.
 *
 * Features:
 * - Drag-to-rotate arcball UI for directional vectors.
 * - Live axis readout and optional numeric axis editing mode.
 * - Serializes values to normalized `x,y,z` text for form submission.
 * - Supports default vector components via attributes.
 *
 * Example:
 * `<input-direction label="Light Direction" default-x="0" default-y="0.4" default-z="-1"></input-direction>`
 *
 * Attribute Reference:
 * - `value`: Current direction as `x,y,z`.
 * - `default-x`, `default-y`, `default-z`: Fallback vector components used when `value` is not provided.
 *
 * Property Reference:
 * - Inherits base InputComponent properties (`value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - `--direction-sphere-stroke`: Sphere outline color.
 * - `--direction-x-ring-color`, `--direction-y-ring-color`, `--direction-z-ring-color`: Axis ring colors.
 * - `--direction-line-color`: Direction line color.
 * - `--direction-marker-fill`, `--direction-marker-stroke`: Endpoint marker styling.
 * - `--direction-display-color`: Axis readout text color.
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 120;
const CENTER = 60;
const RADIUS = 50;
const EPSILON = 1e-6;
const VECTOR_SYNC_EPSILON = 1e-3;
const RING_SEGMENTS = 80;
const BASE_DIRECTION = { x: 0, y: 0, z: -1 };

class InputDirectionComponent extends InputComponent {
    // TODO(refactor): Extract quaternion/vector math utilities to a shared module to shrink this class.
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observed() {
        return ["default-x", "default-y", "default-z"];
    }

    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:default:input:>:native:status:<:validation" });
        this.inputType = "direction";

        this._vector = { x: 0, y: 0, z: -1 };
        this._orientation = { x: 0, y: 0, z: 0, w: 1 };
        this._dragPointerId = null;
        this._dragArcballVector = null;
        this._dragAxis = null;
        this._dragAxisPoint = null;
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

    /**
       * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    static get styles() {
        return {
            label: {
                display: "block"
            },
            ".input-wrapper": {
                border: 0
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
                //fill: "var(--direction-sphere-bg, rgba(194, 204, 212, 0.5))",
                fill: "url(#sphere-grad)",
                stroke: "var(--direction-sphere-stroke, rgba(50, 62, 76, 0.35))",
                strokeWidth: "1"
            },
            ".direction-ring": {
                fill: "none",
                strokeWidth: "2",
                pointerEvents: "stroke",
                cursor: "grab"
            },
            ".direction-ring:active": {
                cursor: "grabbing"
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
            },
            ".direction-inputs": {
                display: "none"
            },
            ".direction-display": {
                position: "relative",
                display: "flex",
                gap: "1rem",
                flexDirection: "row",
                justifyContent: "center",
                marginTop: "0rem",
                color: "var(--direction-display-color, #FFFFFF)",
                background: "rgba(0,0,0,0.7)",
                borderRadius: "5px",
                padding: "0.25rem"
            },
            ".direction-display .axis-display": {
                fontSize: "0.65rem",
                fontWeight: "500",
                color: "var(--direction-display-color, #FFFFFF)",
                width: "calc(33.333% - 0.66rem)"
            },
            ".pivit-marker": {
                fill: "url(#pivit-grad)",
                pointerEvents: "none"
            },
            ".edit-btn": {
                width: "15px",
                height: "15px",
                position: "relative",
                flex: "0 0 auto"
            },
            ".edit-btn svg": {
                width: "100%",
                height: "100%",
                transform: "translateY(-2px)"
            },
            ".edit-btn:hover": {
                cursor: "pointer"
            },
            ".edit-mode .direction-inputs": {
                display: "flex"
            },
            ".edit-mode .direction-display": {
                display: "none"
            }
        };
    }

    /**
      * Builds the default dial DOM (SVG rings, knob, labels, value display).
     * @returns {*} Rendered default dial container node.
     */
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
            r: RADIUS - 3
        });

        const ringX = this._makeSvgNode("path", { class: "direction-ring x", d: "", "data-axis": "x" });
        const ringY = this._makeSvgNode("path", { class: "direction-ring y", d: "", "data-axis": "y" });
        const ringZ = this._makeSvgNode("path", { class: "direction-ring z", d: "", "data-axis": "z" });
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

        const pivit = this._makeSvgNode("circle", {
            class: "pivit-marker",
            cx: CENTER,
            cy: CENTER,
            r: 4
        });

        const defs = this._makeSvgNode("defs");
        defs.innerHTML = `
        <radialGradient id="sphere-grad" cx="40%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="100%" stop-color="#bccbe3" />
        </radialGradient>
        <radialGradient id="pivit-grad" cx="40%" cy="40%" r="70%">
            <stop offset="0%" stop-color="#999999" />
            <stop offset="100%" stop-color="#333333" />
        </radialGradient>
        `;

        svg.appendChild(sphere);
        svg.appendChild(pivit);
        svg.appendChild(ringX);
        svg.appendChild(ringY);
        svg.appendChild(ringZ);
        svg.appendChild(line);
        svg.appendChild(marker);
        svg.appendChild(defs);
        defaultField.appendChild(svg);
        defaultField.appendChild(this._renderAxisInputs());
        defaultField.appendChild(this._renderAxisDisplay());

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

    /**
      * Renders axis display UI content.
     * @returns {*} void.
     */
    _renderAxisDisplay() {
        this._display = {};

        const displayWrap = document.createElement("div");
        displayWrap.className = "direction-display";

        const editBtn = document.createElement("a");
        editBtn.className = "edit-btn";
        editBtn.innerHTML = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46.12 46.18"><title>icon-edit</title><path d="M2.48,45.42c.38-1.25.76-2.5,1.13-3.75,1-3.43,2-6.87,3-10.29a1.74,1.74,0,0,1,.5-.68q9.54-9.57,19.09-19.11l.08-.06,2.6,2.6a2.5,2.5,0,0,0-.24.16L9.53,33.46a1.08,1.08,0,0,0-.27.43Q8,38,6.69,42.14a.47.47,0,0,0,.1.41c.39.42.75,1,1.23,1.15s1.07-.28,1.61-.46L16.29,41a1.08,1.08,0,0,0,.43-.27Q26.34,31.14,36,21.52a.41.41,0,0,1,.39,0c.79.77,1.57,1.56,2.44,2.42a1.7,1.7,0,0,0-.3.18L19.83,42.77a4,4,0,0,1-1.72,1c-4.33,1.3-8.64,2.65-13,4a.53.53,0,0,1-.45-.12C4,47,3.22,46.23,2.48,45.51Z" transform="translate(-2.48 -1.62)"/><path d="M15.33,39c0-1.28,0-2.53,0-3.77,0-.25-.05-.33-.32-.33-1.15,0-2.3,0-3.46,0h-.26L30.5,15.67l.1.08q1.92,1.92,3.83,3.85a.32.32,0,0,1,0,.3l-18.95,19A1.16,1.16,0,0,1,15.33,39Z" transform="translate(-2.48 -1.62)"/><path d="M32.65,5.33c.92-1,1.79-2,2.79-2.88a3.51,3.51,0,0,1,4.74.18q3.74,3.66,7.41,7.4a3.58,3.58,0,0,1,0,5c-.86.89-1.75,1.75-2.61,2.61Z" transform="translate(-2.48 -1.62)"/><path fill="currentColor" d="M43.35,19.22,40.27,22.3c-1-1-2-2-3-3q-4.58-4.58-9.14-9.16a.38.38,0,0,1,0-.36C29,8.83,29.92,7.91,30.84,7a.29.29,0,0,1,.27,0l12.21,12.2Z" transform="translate(-2.48 -1.62)"/></svg>`;
        displayWrap.appendChild(editBtn);

        const createAxisField = (axisKey) => {
            const display = document.createElement("div");
            display.className = "axis-display";
            display.innerHTML =
                axisKey.toUpperCase() + `: <span id="axis-display-${axisKey}">${this._vector[axisKey]}</span>`;

            this._display[axisKey] = display;

            return display;
        };

        const xDisplay = createAxisField("x");
        const yDisplay = createAxisField("y");
        const zDisplay = createAxisField("z");

        this._dom.displayX = xDisplay.querySelector(`#axis-display-x`);
        this._dom.displayY = yDisplay.querySelector(`#axis-display-y`);
        this._dom.displayZ = zDisplay.querySelector(`#axis-display-z`);

        this._dom.displayX.textContent = this._formatFloat(this._vector.x);
        this._dom.displayY.textContent = this._formatFloat(this._vector.y);
        this._dom.displayZ.textContent = this._formatFloat(this._vector.z);

        displayWrap.appendChild(xDisplay);
        displayWrap.appendChild(yDisplay);
        displayWrap.appendChild(zDisplay);

        editBtn.addEventListener("click", () => {
            this._editMode = !this._editMode;
            this._syncVisualState();
        });

        return displayWrap;
    }

    /**
      * Renders axis inputs UI content.
     * @returns {*} void.
     */
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

    /**
      * Performs post-connect setup after the component has its default DOM nodes.
     * @returns {*} void.
     */
    _afterConnected() {
        const parsed = this._parseVector(this.getAttribute("value"));
        const initial = parsed || this._resolveDefaultVector();
        this._setVectorFromExternal(initial, { syncNative: true, syncHost: !parsed });
        this._syncVisualState();
    }

    /**
      * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "hidden";
        input.autocomplete = "off";
        input.classList.add("native");
        return input;
    }

    /**
      * Synchronizes single attribute between state, attributes, and UI.
     * @param {*} name - Attribute or field name.
     * @returns {*} void.
     */
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

    /**
      * Handles native input event events and updates component state.
     * @returns {*} void.
     */
    _onNativeInputEvent() {
        const parsed = this._parseVector(this._dom.native?.value);
        if (parsed) this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
    }

    /**
      * Handles native change event events and updates component state.
     * @returns {*} void.
     */
    _onNativeChangeEvent() {
        const parsed = this._parseVector(this._dom.native?.value);
        if (parsed) this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
    }

    /**
      * Recomputes ring/progress/tick geometry and knob placement from current value state.
     * @returns {*} void.
     */
    _syncVisualState() {
        if (!this._dom.default) {
            this._renderDefault();
            return;
        }

        if (this._editMode) {
            this._wireframe.root.classList.add("edit-mode");
        } else {
            this._wireframe.root.classList.remove("edit-mode");
        }

        const parsed = this._parseVector(this._dom.native?.value ?? this.getAttribute("value"));
        if (parsed && this._vectorDistance(parsed, this._vector) > VECTOR_SYNC_EPSILON) {
            this._setVectorFromExternal(parsed, { syncNative: false, syncHost: false });
        }

        this._drawRings();
        this._drawDirection();
        this._syncAxisInputs();
        this._syncAxisDisplay();

        this.setAttribute(
            "aria-valuetext",
            `x ${this._formatFloat(this._vector.x)}, y ${this._formatFloat(this._vector.y)}, z ${this._formatFloat(this._vector.z)}`
        );
    }

    /**
      * Updates indicator geometry for the current direction vector.
     * @returns {*} Derived internal value or completion status.
     */
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

    /**
      * Draws base/progress rings for directional magnitude visualization.
     * @returns {*} Derived internal value or completion status.
     */
    _drawRings() {
        if (!this._dom.ringX || !this._dom.ringY || !this._dom.ringZ) return;

        this._dom.ringX.setAttribute("d", this._buildRingPath({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }));
        this._dom.ringY.setAttribute("d", this._buildRingPath({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }));
        this._dom.ringZ.setAttribute("d", this._buildRingPath({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }));
    }

    /**
      * Builds an SVG arc path for a ring segment.
     * @param {*} u - Input value for u.
     * @param {*} v - Numeric value candidate.
     * @returns {*} SVG path data string for the requested arc segment.
     */
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

    /**
       * Attaches pointer/wheel/keyboard handlers to the canvas and related nodes.
     * @param {*} canvas - Input value for canvas.
     * @returns {*} void.
     */
    _bindCanvasEvents(canvas) {
        if (!canvas) return;

        canvas.addEventListener("pointerdown", (event) => {
            if (this.disabled) return;
            event.preventDefault();

            const arcball = this._projectPointerToArcball(event);
            if (!arcball) return;

            this._dragPointerId = event.pointerId;
            this._dragArcballVector = arcball;
            this._dragAxis = event.target?.dataset?.axis || null;
            this._dragAxisPoint = this._projectPointerToLocalPoint(event);
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
            this._dragAxis = null;
            this._dragAxisPoint = null;
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

    /**
       * Attaches input listeners for axis fields and forwards updates to vector state.
     * @returns {*} void.
     */
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

    /**
      * Reads axis sub-inputs, normalizes them, and commits to host value.
     * @param {*} eventName - Input value for event name.
     * @returns {*} void.
     */
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

    /**
      * Synchronizes axis inputs between state, attributes, and UI.
     * @returns {*} void.
     */
    _syncAxisInputs() {
        if (!this._dom.axisX || !this._dom.axisY || !this._dom.axisZ) return;
        this._isSyncingAxisInputs = true;
        this._dom.axisX.value = this._formatFloat(this._vector.x);
        this._dom.axisY.value = this._formatFloat(this._vector.y);
        this._dom.axisZ.value = this._formatFloat(this._vector.z);
        this._isSyncingAxisInputs = false;
    }

    /**
      * Synchronizes axis display between state, attributes, and UI.
     * @returns {*} void.
     */
    _syncAxisDisplay() {
        if (!this._dom.displayX || !this._dom.displayY || !this._dom.displayZ) return;
        this._dom.displayX.textContent = this._formatFloat(this._vector.x);
        this._dom.displayY.textContent = this._formatFloat(this._vector.y);
        this._dom.displayZ.textContent = this._formatFloat(this._vector.z);
    }

    /**
      * Applies pointer rotation to rendered output.
     * @param {*} event - Event payload.
     * @param {*} emitEventName - Input value for emit event name.
     * @returns {*} void.
     */
    _applyPointerRotation(event, emitEventName) {
        if (!this._dragArcballVector) return;

        if (this._dragAxis) {
            this._applyAxisDrag(event, emitEventName);
            return;
        }

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

    _applyAxisDrag(event, emitEventName) {
        const current = this._projectPointerToLocalPoint(event);
        if (!current || !this._dragAxisPoint) return;

        const delta = this._axisDragDelta(current);
        this._dragAxisPoint = current;
        if (Math.abs(delta) <= EPSILON) return;

        const next = { ...this._vector };
        next[this._dragAxis] = Math.max(-1, Math.min(1, next[this._dragAxis] + delta));
        this._vector = this._normalizeVector(next);
        this._orientation = this._quaternionFromUnitVectors(BASE_DIRECTION, this._vector);
        this._dragMoved = true;
        this._commitVectorToHost(emitEventName);
    }

    _axisDragDelta(current) {
        if (this._dragAxis === "z") {
            const previousAngle = Math.atan2(this._dragAxisPoint.y - CENTER, this._dragAxisPoint.x - CENTER);
            const currentAngle = Math.atan2(current.y - CENTER, current.x - CENTER);
            return this._normalizeAngleDelta(previousAngle - currentAngle);
        }

        return this._dragAxis === "y"
            ? (this._dragAxisPoint.y - current.y) / RADIUS
            : (current.x - this._dragAxisPoint.x) / RADIUS;
    }

    _normalizeAngleDelta(delta) {
        if (delta > Math.PI) return delta - Math.PI * 2;
        if (delta < -Math.PI) return delta + Math.PI * 2;
        return delta;
    }

    _projectPointerToLocalPoint(event) {
        if (!this._dom.canvas) return null;
        const rect = this._dom.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEWBOX_SIZE,
            y: ((event.clientY - rect.top) / rect.height) * VIEWBOX_SIZE
        };
    }

    /**
      * Serializes current vector state into host/native value fields.
     * @param {*} eventName - Input value for event name.
     * @returns {*} void.
     */
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

    _getFormValue() {
        const name = this.getAttribute("name") || this._dom.native?.name || "";
        if (!name) return this._dom.native?.value ?? "";
        const vector = this._normalizeVector(this._vector);
        const data = new FormData();
        data.append(`${name}[x]`, this._formatFloat(vector.x));
        data.append(`${name}[y]`, this._formatFloat(vector.y));
        data.append(`${name}[z]`, this._formatFloat(vector.z));
        return data;
    }

    /**
      * Projects pointer coordinates onto a virtual arcball for 3D direction control.
     * @param {*} event - Event payload.
     * @returns {*} Projected unit vector on the arcball surface.
     */
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

    /**
     * Updates internal component state and applies side effects.
     * @param {*} vector - Input value for vector.
     * @param {*} param2 - Options object controlling behavior.
     * @param {*} syncHost - Input value for sync host.
     * @returns {*} Derived internal value or completion status.
     */
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

    /**
      * Resolves effective default vector configuration.
     * @returns {*} Derived value.
     */
    _resolveDefaultVector() {
        return this._normalizeVector({
            x: this._readNumberAttribute("default-x", 0),
            y: this._readNumberAttribute("default-y", 0),
            z: this._readNumberAttribute("default-z", -1)
        });
    }

    /**
      * Reads a numeric attribute with fallback handling for invalid values.
     * @param {*} name - Attribute or field name.
     * @param {*} fallback - Fallback value used when input is invalid.
     * @returns {*} Parsed numeric value or provided fallback.
     */
    _readNumberAttribute(name, fallback) {
        const raw = this.getAttribute(name);
        if (raw === null || raw === "") return fallback;
        const n = Number(raw);
        return Number.isFinite(n) ? n : fallback;
    }

    /**
      * Computes Euclidean distance between two vectors.
     * @param {*} a - First vector/quaternion operand.
     * @param {*} b - Second vector/quaternion operand.
     * @returns {*} Numeric Euclidean distance.
     */
    _vectorDistance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    }

    /**
      * Normalizes vector into a safe internal representation.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} Derived value.
     */
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

    /**
      * Computes the dot product of two vectors.
     * @param {*} a - First vector/quaternion operand.
     * @param {*} b - Second vector/quaternion operand.
     * @returns {*} Numeric dot product.
     */
    _dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    /**
      * Computes the cross product of two vectors.
     * @param {*} a - First vector/quaternion operand.
     * @param {*} b - Second vector/quaternion operand.
     * @returns {*} Vector cross-product components.
     */
    _cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    /**
      * Normalizes quaternion into a safe internal representation.
     * @param {*} q - Quaternion used for vector rotation.
     * @returns {*} Derived value.
     */
    _normalizeQuaternion(q) {
        const mag = Math.hypot(q.x, q.y, q.z, q.w);
        if (mag <= EPSILON) return { x: 0, y: 0, z: 0, w: 1 };
        return { x: q.x / mag, y: q.y / mag, z: q.z / mag, w: q.w / mag };
    }

    /**
      * Multiplies two quaternions and returns the composed rotation.
     * @param {*} a - First vector/quaternion operand.
     * @param {*} b - Second vector/quaternion operand.
     * @returns {*} Quaternion components representing the composed rotation.
     */
    _multiplyQuaternion(a, b) {
        return {
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
        };
    }

    /**
      * Builds a quaternion that rotates one unit vector into another.
     * @param {*} from - Input value for from.
     * @param {*} to - Input value for to.
     * @returns {*} Quaternion rotating vector `a` into vector `b`.
     */
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

    /**
      * Rotates a vector by a quaternion.
     * @param {*} v - Numeric value candidate.
     * @param {*} q - Quaternion used for vector rotation.
     * @returns {*} Rotated vector components.
     */
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

    /**
      * Parses vector into normalized internal data.
     * @param {*} raw - Input value for raw.
     * @returns {*} Derived value.
     */
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

    /**
      * Serializes vector coordinates into the component value format.
     * @param {*} vector - Input value for vector.
     * @returns {*} Serialized vector string value.
     */
    _serializeVector(vector) {
        const v = this._normalizeVector(vector);
        return `${this._formatFloat(v.x)},${this._formatFloat(v.y)},${this._formatFloat(v.z)}`;
    }

    /**
      * Formats a float using component precision rules.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} Formatted numeric string.
     */
    _formatFloat(value) {
        const next = Math.abs(value) < 1e-7 ? 0 : value;
        return String(Number(next.toFixed(4)));
    }

    /**
      * Creates an SVG element with provided attributes.
     * @param {*} tag - Input value for tag.
     * @param {*} attrs - Attribute map applied to a created node.
     * @returns {*} Created SVG element node.
     */
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
