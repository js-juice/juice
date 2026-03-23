

/**
 * AUTODOC:START
 * Component: <input-dial>
 * Class: InputDialComponent
 * Overview: Rotary dial input with configurable sweep gap, anchor offset, ticks, labels, and progress visualization.
 *
 * Features:
 * - Pointer, wheel, and keyboard interaction support.
 * - Configurable arc geometry via `start-offset`, `end-offset`, and `offset`.
 * - Optional unbounded multi-turn mode when no min/max and no gap are defined.
 * - Supports option labels and explicit marker labels around the dial.
 *
 * Example:
 * `<input-dial min="0" max="100" step="1" offset="180" start-offset="30" end-offset="30"></input-dial>`
 *
 * Attribute Reference:
 * - `min`, `max`: Finite dial range bounds (required for bounded mode).
 * - `step`: Increment/rounding interval.
 * - `decimals`: Decimal precision for rounded values.
 * - `offset`: Angular anchor for zero point (or gap center when a gap exists).
 * - `start-offset`, `end-offset`: Excluded arc degrees before/after sweep.
 * - `rotation-value`: Units represented by one full turn in unbounded mode.
 * - `options`: Comma-delimited option labels used for tick labeling.
 * - `labels`: Extra labels in `value:Text` or `percent%:Text` format.
 * - `size`: Component pixel width.
 *
 * Property Reference:
 * - Inherits base InputComponent properties (`value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - `--jform-dial-progress`: Progress ring and active tick color.
 * - `--dial-knob-fill`: Dial knob fill color.
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const SIZE = 120;
const CENTER = SIZE / 2;
const RADIUS = 44;
const RING_STROKE = 6;
const PROGRESS_STROKE = 3;
const OUTER_GAP = 1; // radial spacing between main ring outer edge and progress inner edge
const OUTER_RADIUS = RADIUS + RING_STROKE / 2 + OUTER_GAP + PROGRESS_STROKE / 2;
const TICK_GAP_FROM_PROGRESS = 1.5;
const TICK_LENGTH = 6;
const EDGE_SNAP_DEGREES = 8; // snap near sweep endpoints so drag can hit exact min/max
const MAX_TICKS = 24;

class InputDialComponent extends InputComponent {
    // TODO(refactor): Split arc math, interaction handling, and rendering into separate modules/helpers.
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return [
            ...super.observedAttributes.filter((name) => name !== "type"),
            "units",
            "step",
            "decimals",
            "min",
            "max",
            "rotation-value",
            "start-offset",
            "end-offset",
            "offset",
            "labels",
            "size",
            "options"
        ];
    }

    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:default:input:>:native:status:<:validation" });
        this.inputType = "dial";

        this._dom.canvas = null;
        this._dom.ring = null;
        this._dom.knob = null;
        this._dom.progress = null;
        this._dom.ticks = null;
        this._dom.labels = null;
        this._dom.valueDisplay = null;
        this._dragPointerId = null;
        this._startOffset = 0;
        this._endOffset = 0;
        this._offset = 180;
        this._rotationValue = 100;
        this._dragLastDeg = null;
        this._min = 0;
        this._max = 100;
        this._step = 1;
        this._decimals = 0;
        this._options = null; // parsed options (if provided)
        this._dialLabels = []; // custom labels parsed from `labels` attribute
        this._boundOnPointerDown = this._onPointerDown.bind(this);
        this._boundOnPointerMove = this._onPointerMove.bind(this);
        this._boundOnPointerUp = this._onPointerUp.bind(this);
        this._boundOnKeyDown = this._onKeyDown.bind(this);
    }

    /**
     * Responds to observed attribute changes and synchronizes state.
     * @param {*} name - Attribute or field name.
     * @param {*} oldValue - Previous value.
     * @param {*} newValue - Next value.
     * @returns {*} void.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        // respond to runtime attribute changes
        if (name === "start-offset" || name === "end-offset" || name === "offset") {
            this._syncDialArcConfigFromAttributes();
        }
        if (name === "rotation-value") {
            this._syncRotationValueFromAttribute();
        }
        if (name === "size") {
            if (newValue != null && Number.isFinite(Number(newValue))) this.style.width = `${Number(newValue)}px`;
        }
        if (name === "options" || name === "labels") {
            this._collectOptions();
            this._renderTicksAndLabels();
        }
        if (
            name === "min" ||
            name === "max" ||
            name === "step" ||
            name === "rotation-value" ||
            name === "start-offset" ||
            name === "end-offset" ||
            name === "offset"
        ) {
            // re-render ticks/labels and visual state
            this._collectOptions();
            this._renderTicksAndLabels();
        }
        // keep visuals in sync
        // update native control attributes when present
        if (this._dom && this._dom.native) {
            if (name === "min") {
                if (newValue != null && Number.isFinite(Number(newValue)))
                    this._dom.native.setAttribute("min", String(newValue));
                else this._dom.native.removeAttribute("min");
            }
            if (name === "max") {
                if (newValue != null && Number.isFinite(Number(newValue)))
                    this._dom.native.setAttribute("max", String(newValue));
                else this._dom.native.removeAttribute("max");
            }
            if (name === "step") {
                if (newValue != null && Number.isFinite(Number(newValue)))
                    this._dom.native.setAttribute("step", String(newValue));
                else this._dom.native.removeAttribute("step");
            }
        }
        this._syncVisualState();
    }

    /**
       * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    get _styles() {
        return {
            ":host": {
                display: "inline-block",
                width: "6rem"
            },
            label: {
                marginBottom: "1rem"
            },
            ".default-field": {
                width: "100%",
                aspectRatio: "1 / 1",
                position: "relative",
                overflow: "visible"
            },
            ".input-wrapper": {
                overflow: "visible"
            },
            "svg.dial": {
                width: "100%",
                height: "100%",
                display: "block",
                touchAction: "none",
                userSelect: "none",
                cursor: "grab",
                overflow: "visible"
            },
            "svg.dial:active": {
                cursor: "grabbing"
            },
            ".dial-ring": {
                fill: "none",
                stroke: "#c8c8c8",
                strokeWidth: String(RING_STROKE),
                strokeLinecap: "round"
            },
            ".dial-progress": {
                fill: "none",
                stroke: "var(--jform-dial-progress, #f5d505)",
                strokeWidth: String(PROGRESS_STROKE)
            },
            ".dial-tick": {
                stroke: "#aaa",
                strokeWidth: "1"
            },
            ".dial-tick.active": {
                stroke: "var(--jform-dial-progress, #f5d505)"
            },
            ".dial-tick-label": {
                fill: "#333",
                fontSize: "10px"
            },
            ".dial-html-labels": {
                position: "absolute",
                inset: "0",
                pointerEvents: "none",
                overflow: "visible"
            },
            ".dial-html-label": {
                position: "absolute",
                transform: "translate(-50%, -50%)",
                fontSize: "10px",
                color: "#333",
                whiteSpace: "nowrap"
            },
            ".dial-value": {
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "0.9rem",
                fontWeight: "600",
                pointerEvents: "none"
            },
            ".dial-knob": {
                fill: "var(--dial-knob-fill, #f5d505)",
                stroke: "#666",
                strokeWidth: "1"
            },
            ".native-wrapper": {
                display: "none"
            }
        };
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        super.connectedCallback();
        // initialize numeric attrs
        const minAttr = this.getAttribute("min");
        const maxAttr = this.getAttribute("max");
        const sizeAttr = this.getAttribute("size");
        const stepAttr = this.getAttribute("step");
        const decAttr = this.getAttribute("decimals");
        if (minAttr != null && Number.isFinite(Number(minAttr))) this._min = Number(minAttr);
        if (maxAttr != null && Number.isFinite(Number(maxAttr))) this._max = Number(maxAttr);
        if (stepAttr != null && Number.isFinite(Number(stepAttr))) this._step = Number(stepAttr);
        if (decAttr != null && Number.isFinite(Number(decAttr))) this._decimals = Number(decAttr);
        this._syncDialArcConfigFromAttributes();
        this._syncRotationValueFromAttribute();
        if (sizeAttr != null && Number.isFinite(Number(sizeAttr))) this.style.width = `${Number(sizeAttr)}px`;
    }

    /**
      * Normalizes a degree value into the `[0, 360)` range.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} Normalized degree value in the inclusive range `[0, 360)`.
     */
    _normalizeAngle(value) {
        const normalized = Number(value);
        if (!Number.isFinite(normalized)) return 0;
        return ((normalized % 360) + 360) % 360;
    }

    /**
      * Reads dial arc-related attributes and updates start/sweep/gap configuration.
     * @returns {*} void.
     */
    _syncDialArcConfigFromAttributes() {
        const startAttr = this.getAttribute("start-offset");
        const endAttr = this.getAttribute("end-offset");
        const offsetAttr = this.getAttribute("offset");

        this._startOffset =
            startAttr != null && Number.isFinite(Number(startAttr)) ? this._normalizeAngle(startAttr) : 0;
        this._endOffset = endAttr != null && Number.isFinite(Number(endAttr)) ? this._normalizeAngle(endAttr) : 0;
        this._offset =
            offsetAttr != null && Number.isFinite(Number(offsetAttr)) ? this._normalizeAngle(offsetAttr) : 180;
    }

    /**
      * Reads `rotation-value` and updates unbounded rotation behavior.
     * @returns {*} void.
     */
    _syncRotationValueFromAttribute() {
        const rotationAttr = this.getAttribute("rotation-value");
        const parsed = rotationAttr != null ? Number(rotationAttr) : 100;
        if (Number.isFinite(parsed) && Math.abs(parsed) > 1e-9) {
            this._rotationValue = Math.abs(parsed);
        } else {
            this._rotationValue = 100;
        }
    }

    /**
      * Returns how much value a full rotation represents.
     * @returns {*} Numeric value represented by one full rotation.
     */
    _getRotationValue() {
        return Number.isFinite(this._rotationValue) && Math.abs(this._rotationValue) > 1e-9
            ? Math.abs(this._rotationValue)
            : 100;
    }

    /**
      * Returns whether the dial arc has a non-zero configured start or end gap.
     * @returns {*} Boolean indicator of whether a dial gap is configured.
     */
    _hasConfiguredGap() {
        const start = Number.isFinite(this._startOffset) ? this._startOffset : 0;
        const end = Number.isFinite(this._endOffset) ? this._endOffset : 0;
        return start + end > 1e-9;
    }

    /**
      * Returns whether the dial should accumulate value across rotations.
     * @returns {*} Boolean indicator of unbounded rotation mode.
     */
    _isUnboundedMode() {
        // Continuous multi-turn mode is only valid when there is no excluded gap.
        return !this._hasConfiguredGap() && !this.hasAttribute("min") && !this.hasAttribute("max");
    }

    /**
      * Builds normalized arc geometry from start/end offset and anchor configuration.
     * @returns {*} Derived value.
     */
    _resolveDialArc() {
        const startOffset = Number.isFinite(this._startOffset) ? this._startOffset : 0;
        const endOffset = Number.isFinite(this._endOffset) ? this._endOffset : 0;
        const sweep = Math.max(1e-9, 360 - startOffset - endOffset);
        // offset targets the shared reference point:
        // - with a gap: center of the excluded gap
        // - without a gap: the 0-point
        const target = this._normalizeAngle(Number.isFinite(this._offset) ? this._offset : 180);
        let start = target;
        if (sweep < 359.999999) {
            const baseGapCenter = this._normalizeAngle((startOffset - endOffset) / 2);
            const rotation = target - baseGapCenter;
            start = this._normalizeAngle(startOffset + rotation);
        }

        return { start, sweep };
    }

    /**
      * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.classList.add("native");
        // ensure native control reflects min/max/step if present
        const minAttr = this.getAttribute("min");
        const maxAttr = this.getAttribute("max");
        const stepAttr = this.getAttribute("step");
        if (minAttr != null && Number.isFinite(Number(minAttr))) input.setAttribute("min", String(minAttr));
        if (maxAttr != null && Number.isFinite(Number(maxAttr))) input.setAttribute("max", String(maxAttr));
        if (stepAttr != null && Number.isFinite(Number(stepAttr))) input.setAttribute("step", String(stepAttr));
        return input;
    }

    /**
      * Builds the default dial DOM (SVG rings, knob, labels, value display).
     * @returns {*} Rendered default dial container node.
     */
    _renderDefault() {
        const defaultField = document.createElement("div");
        defaultField.className = "default-field";

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "dial");
        svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
        svg.setAttribute("aria-hidden", "true");

        const ring = document.createElementNS(SVG_NS, "circle");
        ring.setAttribute("class", "dial-ring");
        ring.setAttribute("cx", String(CENTER));
        ring.setAttribute("cy", String(CENTER));
        ring.setAttribute("r", String(RADIUS));

        const knob = document.createElementNS(SVG_NS, "circle");
        knob.setAttribute("class", "dial-knob");
        knob.setAttribute("r", "6");
        knob.setAttribute("cx", String(CENTER));
        knob.setAttribute("cy", String(CENTER - RADIUS));
        // ensure knob can receive pointer events
        knob.style.pointerEvents = "auto";

        // progress, ticks, labels, base ring, knob
        const progress = document.createElementNS(SVG_NS, "circle");
        progress.setAttribute("class", "dial-progress");
        progress.setAttribute("cx", String(CENTER));
        progress.setAttribute("cy", String(CENTER));
        progress.setAttribute("r", String(OUTER_RADIUS));

        const ticksGroup = document.createElementNS(SVG_NS, "g");
        ticksGroup.setAttribute("class", "dial-ticks");
        const labelsOverlay = document.createElement("div");
        labelsOverlay.className = "dial-html-labels";

        svg.appendChild(progress);
        svg.appendChild(ring);
        svg.appendChild(ticksGroup);
        svg.appendChild(knob);
        defaultField.appendChild(svg);
        defaultField.appendChild(labelsOverlay);

        this._dom.canvas = svg;
        this._dom.ring = ring;
        this._dom.progress = progress;
        this._dom.ticks = ticksGroup;
        this._dom.labels = labelsOverlay;
        this._dom.knob = knob;

        // visible numeric/label display in center
        const valueDisplay = document.createElement("div");
        valueDisplay.className = "dial-value";
        valueDisplay.textContent = "";
        defaultField.appendChild(valueDisplay);
        this._dom.valueDisplay = valueDisplay;

        // bind pointer/keyboard events (store bound handlers so we can remove them)
        svg.addEventListener("pointerdown", this._boundOnPointerDown);
        svg.addEventListener("keydown", this._boundOnKeyDown);
        // also allow clicking the knob directly
        knob.addEventListener("pointerdown", this._boundOnPointerDown);
        // wheel for fine adjust
        svg.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });
        svg.setAttribute("tabindex", "0");
        svg.style.pointerEvents = "auto";
        // mount default view so base class can insert it
        this._dom.default = defaultField;

        // parse options and render ticks/labels
        this._collectOptions();
        this._renderTicksAndLabels();

        // keep visual synced
        this._syncVisualState();
        return defaultField;
    }

    /**
      * Collects dial tick/label configuration from attributes or child options.
     * @returns {*} Normalized option/tick/label descriptors.
     */
    _collectOptions() {
        this._options = null;
        this._dialLabels = [];
        // prefer <option> children
        const children = Array.from(this.querySelectorAll("option"));
        if (children.length) {
            this._options = children.map((o) => ({
                label: o.label || o.textContent.trim(),
                value: o.value || o.textContent.trim()
            }));
        } else {
            const optsAttr = this.getAttribute("options");
            if (optsAttr) {
                const parts = optsAttr
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (parts.length) this._options = parts.map((p) => ({ label: p, value: p }));
            }
        }

        const labelsAttr = this.getAttribute("labels");
        if (!labelsAttr) return;
        const parts = labelsAttr
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        for (let i = 0; i < parts.length; i += 1) {
            const entry = parts[i];
            const idx = entry.indexOf(":");
            if (idx <= 0) continue;
            const marker = entry.slice(0, idx).trim();
            const label = entry.slice(idx + 1).trim();
            if (!label) continue;
            if (marker.endsWith("%")) {
                const percent = Number(marker.slice(0, -1));
                if (!Number.isFinite(percent)) continue;
                this._dialLabels.push({ kind: "ratio", ratio: percent / 100, label });
                continue;
            }
            const value = Number(marker);
            if (!Number.isFinite(value)) continue;
            this._dialLabels.push({ kind: "value", value, label });
        }
    }

    /**
      * Returns effective dial bounds based on min/max or default rotation range.
     * @returns {*} Dial bounds descriptor containing min and max values.
     */
    _getDialBounds() {
        const minAttr = this.getAttribute("min");
        const maxAttr = this.getAttribute("max");
        const min = minAttr != null && Number.isFinite(Number(minAttr)) ? Number(minAttr) : 0;
        const max = maxAttr != null && Number.isFinite(Number(maxAttr)) ? Number(maxAttr) : 100;
        return { min, max };
    }

    /**
      * Maps a numeric value into a normalized arc ratio between 0 and 1.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} Normalized ratio in the inclusive range `[0, 1]`.
     */
    _valueToRatio(value) {
        if (!Number.isFinite(value)) return 0;
        if (this._isUnboundedMode()) {
            return (((value / this._getRotationValue()) % 1) + 1) % 1;
        }
        const { min, max } = this._getDialBounds();
        const range = Math.max(1e-9, max - min);
        const ratio = (value - min) / range;
        return Math.max(0, Math.min(1, ratio));
    }

    /**
      * Creates and positions one dial label in the HTML overlay.
     * @param {*} label - Label text or label descriptor.
     * @param {*} ratio - Normalized position on the active arc.
     * @param {*} start - Arc start angle in degrees.
     * @param {*} sweep - Arc sweep in degrees.
     * @returns {*} Created label node, or `null` when skipped.
     */
    _appendDialLabel(label, ratio, start, sweep) {
        if (!this._dom.labels || !label) return;
        const safeRatio = Math.max(0, Math.min(1, ratio));
        const ang = start + safeRatio * sweep;
        const rad = (ang - 90) * (Math.PI / 180);
        const txt = document.createElement("span");
        txt.className = "dial-html-label";
        const lx = CENTER + Math.cos(rad) * (OUTER_RADIUS + 16);
        const ly = CENTER + Math.sin(rad) * (OUTER_RADIUS + 16);
        // Convert from SVG viewBox units to responsive overlay percentages.
        txt.style.left = `${(lx / SIZE) * 100}%`;
        txt.style.top = `${(ly / SIZE) * 100}%`;
        txt.textContent = label;
        this._dom.labels.appendChild(txt);
    }

    /**
      * Renders dial tick marks and label markers for the active arc.
     * @returns {*} void.
     */
    _renderTicksAndLabels() {
        const svg = this._dom.canvas;
        if (!svg || !this._dom.ticks || !this._dom.labels) return;
        // clear existing
        while (this._dom.ticks.firstChild) this._dom.ticks.removeChild(this._dom.ticks.firstChild);
        while (this._dom.labels.firstChild) this._dom.labels.removeChild(this._dom.labels.firstChild);
        let count = 0;
        if (this._options && this._options.length) count = this._options.length;
        else {
            const range = Math.abs(this._max - this._min);
            const step = this._step || 1;
            count = Math.min(MAX_TICKS, Math.max(2, Math.round(range / step) + 1));
        }
        const { start, sweep } = this._resolveDialArc();
        const sweepStart = start;
        const sweepEnd = (start + sweep) % 360;
        const inSweep = (angle) => {
            // normalize
            const a = (angle + 360) % 360;
            if (sweep >= 360) return true;
            if (sweepStart <= sweepEnd) return a >= sweepStart && a <= sweepEnd;
            // wrapped around zero
            return a >= sweepStart || a <= sweepEnd;
        };
        for (let i = 0; i < count; i++) {
            // place ticks centered inside each segment so they don't sit exactly on the gap edges
            const ang = start + ((i + 0.5) / count) * sweep;
            const rad = (ang - 90) * (Math.PI / 180);
            // skip ticks that fall into the excluded gap (outside sweep)
            if (!inSweep(ang)) continue;
            const tickInnerRadius = OUTER_RADIUS + PROGRESS_STROKE / 2 + TICK_GAP_FROM_PROGRESS;
            const tickOuterRadius = tickInnerRadius + TICK_LENGTH;
            const x1 = CENTER + Math.cos(rad) * tickOuterRadius;
            const y1 = CENTER + Math.sin(rad) * tickOuterRadius;
            const x2 = CENTER + Math.cos(rad) * tickInnerRadius;
            const y2 = CENTER + Math.sin(rad) * tickInnerRadius;
            const line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("class", "dial-tick");
            line.setAttribute("x1", String(x1));
            line.setAttribute("y1", String(y1));
            line.setAttribute("x2", String(x2));
            line.setAttribute("y2", String(y2));
            this._dom.ticks.appendChild(line);
            if (this._options && this._options[i]) {
                this._appendDialLabel(this._options[i].label, (i + 0.5) / count, start, sweep);
            }
        }
        if (this._dialLabels && this._dialLabels.length) {
            for (let i = 0; i < this._dialLabels.length; i += 1) {
                const marker = this._dialLabels[i];
                const ratio = marker.kind === "ratio" ? marker.ratio : this._valueToRatio(marker.value);
                this._appendDialLabel(marker.label, ratio, start, sweep);
            }
        }
    }

    /**
      * Handles pointer down events and updates component state.
     * @param {*} ev - Pointer/keyboard event payload.
     * @returns {*} void.
     */
    _onPointerDown(ev) {
        if (this.disabled) return;
        ev.preventDefault();
        const svg = this._dom.canvas;
        console.debug("input-dial: pointerdown", ev.pointerId, ev.clientX, ev.clientY);
        // use the event target for pointer capture if available (works when clicking the knob)
        try {
            if (ev.target && typeof ev.target.setPointerCapture === "function")
                ev.target.setPointerCapture(ev.pointerId);
            else svg.setPointerCapture(ev.pointerId);
        } catch (e) {}
        this._dragPointerId = ev.pointerId;
        window.addEventListener("pointermove", this._boundOnPointerMove);
        window.addEventListener("pointerup", this._boundOnPointerUp, { once: true });
        window.addEventListener("pointercancel", this._boundOnPointerUp, { once: true });
        this._activeMove = { move: this._boundOnPointerMove, up: this._boundOnPointerUp };
        this._dragLastDeg = null;
        this._updateValueFromPointer(ev);
    }

    /**
      * Handles pointer move events and updates component state.
     * @param {*} ev - Pointer/keyboard event payload.
     * @returns {*} void.
     */
    _onPointerMove(ev) {
        if (this._dragPointerId !== ev.pointerId) return;
        console.debug("input-dial: pointermove", ev.pointerId, ev.clientX, ev.clientY);
        // console.debug('input-dial: pointermove', ev.pointerId, ev.clientX, ev.clientY);
        ev.preventDefault();
        this._updateValueFromPointer(ev);
    }

    /**
      * Handles pointer up events and updates component state.
     * @param {*} ev - Pointer/keyboard event payload.
     * @returns {*} void.
     */
    _onPointerUp(ev) {
        if (this._activeMove) {
            window.removeEventListener("pointermove", this._activeMove.move);
            window.removeEventListener("pointercancel", this._activeMove.up);
            // up handler was once: true
            this._activeMove = null;
        }
        this._dragPointerId = null;
        this._dragLastDeg = null;
        // release capture if possible
        try {
            if (ev.target && typeof ev.target.releasePointerCapture === "function")
                ev.target.releasePointerCapture(ev.pointerId);
        } catch (e) {}
        // dispatch change
        if (this._dom.native) this._dom.native.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    /**
      * Handles wheel events and updates component state.
     * @param {*} ev - Pointer/keyboard event payload.
     * @returns {*} void.
     */
    _onWheel(ev) {
        ev.preventDefault();
        const delta = ev.deltaY || ev.wheelDelta || 0;
        // deltaY positive when scrolling down -> decrease value
        const dir = delta > 0 ? -1 : 1;
        this._stepBy(dir);
    }

    /**
     * Cleans up listeners and observers when the element is disconnected.
     * @returns {*} void.
     */
    disconnectedCallback() {
        // cleanup any global listeners and bound handlers
        try {
            if (this._activeMove) {
                window.removeEventListener("pointermove", this._activeMove.move);
                this._activeMove = null;
            }
            if (this._dom && this._dom.canvas) {
                this._dom.canvas.removeEventListener("pointerdown", this._boundOnPointerDown);
                this._dom.canvas.removeEventListener("keydown", this._boundOnKeyDown);
            }
            if (this._dom && this._dom.knob) {
                this._dom.knob.removeEventListener("pointerdown", this._boundOnPointerDown);
            }
        } catch (e) {}
        if (super.disconnectedCallback) super.disconnectedCallback();
    }

    /**
      * Handles key down events and updates component state.
     * @param {*} ev - Pointer/keyboard event payload.
     * @returns {*} void.
     */
    _onKeyDown(ev) {
        if (this.disabled) return;
        const key = ev.key;
        if (key === "ArrowLeft" || key === "ArrowDown") {
            this._stepBy(-1);
            ev.preventDefault();
        } else if (key === "ArrowRight" || key === "ArrowUp") {
            this._stepBy(1);
            ev.preventDefault();
        }
    }

    /**
      * Applies a signed step increment and commits the resulting dial value.
     * @param {*} dir - Signed direction (`-1` or `1`) for stepping.
     * @returns {*} Derived internal value or completion status.
     */
    _stepBy(dir) {
        const step = Number(this.getAttribute("step")) || this._step || 1;
        const cur = Number(this._dom.native?.value) || 0;
        const next = this._clamp(cur + dir * step);
        this._setNativeValue(next, { emitInput: true, emitChange: true });
    }

    /**
      * Projects pointer coordinates to the dial arc and commits the nearest stepped value.
     * @param {*} ev - Pointer/keyboard event payload.
     * @returns {*} Derived internal value or completion status.
     */
    _updateValueFromPointer(ev) {
        const rect = this._dom.canvas.getBoundingClientRect();
        console.debug("input-dial: rect", rect.left, rect.top, rect.width, rect.height);
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        console.debug("input-dial: center", cx, cy);
        const dx = ev.clientX - cx;
        const dy = ev.clientY - cy;
        console.debug("input-dial: delta", dx, dy, "client", ev.clientX, ev.clientY);
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180 where 0 is +x
        // convert so 0 is at top and increases clockwise
        deg = (deg + 90 + 360) % 360;
        console.debug("input-dial: deg", deg);
        if (this._isUnboundedMode()) {
            const rotationValue = this._getRotationValue();
            if (this._dragLastDeg == null) {
                this._dragLastDeg = deg;
                return;
            }
            let deltaDeg = deg - this._dragLastDeg;
            // shortest signed angular delta (prevents wrap jumps at 0/360)
            deltaDeg = ((deltaDeg + 540) % 360) - 180;
            this._dragLastDeg = deg;
            const currentRaw = Number(this._dom.native?.value);
            const current = Number.isFinite(currentRaw) ? currentRaw : 0;
            const value = current + (deltaDeg / 360) * rotationValue;
            const stepped = this._roundToStep(value);
            this._setNativeValue(stepped, { emitInput: true });
            return;
        }
        // map deg into sweep between startOffset..(360-endOffset)
        const { start, sweep } = this._resolveDialArc();
        let adjusted = (deg - start + 360) % 360;
        let ratio = 0;
        if (adjusted <= sweep) {
            if (adjusted <= EDGE_SNAP_DEGREES) {
                ratio = 0;
            } else if (adjusted >= sweep - EDGE_SNAP_DEGREES) {
                ratio = 1;
            } else {
                ratio = adjusted / sweep;
            }
        } else {
            // Pointer is in the excluded gap. Snap to the nearest sweep edge so
            // zero-side stays at zero until crossing the gap midpoint.
            const gap = Math.max(0, 360 - sweep);
            if (gap <= 1e-9) {
                ratio = 1;
            } else {
                const gapProgress = adjusted - sweep; // 0..gap from end edge toward start edge
                ratio = gapProgress <= gap / 2 ? 1 : 0;
            }
        }
        console.debug("input-dial: ratio", ratio, "min/max", this._min, this._max, "start/sweep", start, sweep);
        // guard against zero or nearly-zero range (min === max)
        let range = this._max - this._min;
        if (!Number.isFinite(range) || Math.abs(range) < 1e-9) {
            console.warn(
                "input-dial: min/max range is zero or invalid, falling back to default range 100",
                this._min,
                this._max
            );
            range = 100;
        }
        const value = this._min + ratio * range;
        if (!Number.isFinite(value)) {
            console.warn("input-dial: computed value not finite", value, this._min, this._max, ratio);
            return;
        }
        const stepped = this._roundToStep(value);
        console.log(stepped);
        console.debug("input-dial: updateValueFromPointer", value, stepped);
        this._setNativeValue(stepped, { emitInput: true });
    }

    /**
      * Clamps a value to the configured minimum/maximum range when bounds exist.
     * @param {*} v - Numeric value candidate.
     * @returns {*} Clamped numeric value.
     */
    _clamp(v) {
        if (this._isUnboundedMode()) return v;
        if (v < this._min) return this._min;
        if (v > this._max) return this._max;
        return v;
    }

    /**
      * Rounds a value to the configured step and decimal precision.
     * @param {*} v - Numeric value candidate.
     * @returns {*} Step-rounded numeric value.
     */
    _roundToStep(v) {
        const step = Number(this.getAttribute("step")) || this._step || 1;
        const decimals = Number(this.getAttribute("decimals")) || this._decimals || 0;
        const inv = 1 / step;
        const rounded = Math.round(v * inv) / inv;
        return Number(rounded.toFixed(decimals));
    }

    /**
     * Updates internal component state and applies side effects.
     * @param {*} v - Numeric value candidate.
     * @param {*} param2 - Options object controlling behavior.
     * @param {*} emitChange - Whether to dispatch a `change` event after update.
     * @returns {*} Derived internal value or completion status.
     */
    _setNativeValue(v, { emitInput = false, emitChange = false } = {}) {
        const val = String(v);
        // console.debug('input-dial: setNativeValue', v);
        if (this._dom.native) {
            this._dom.native.value = val;
            if (emitInput) this._dom.native.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            if (emitChange) this._dom.native.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        }
        // emit events from host for convenience
        if (emitInput)
            this.dispatchEvent(new CustomEvent("input", { detail: { value: v }, bubbles: true, composed: true }));
        if (emitChange)
            this.dispatchEvent(new CustomEvent("change", { detail: { value: v }, bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent("value-changed", { detail: { value: v }, bubbles: true, composed: true }));
        this._syncVisualState();
    }

    /**
      * Recomputes ring/progress/tick geometry and knob placement from current value state.
     * @returns {*} void.
     */
    _syncVisualState() {
        try {
            if (!this._dom.knob) return;
            const raw = this._dom.native ? this._dom.native.value : this.getAttribute("value");
            const n = Number(raw);
            const v = Number.isFinite(n) ? n : Number(this.getAttribute("value")) || this._min;
            // ensure min/max updated — only use attribute when present
            const minAttr = this.getAttribute("min");
            this._min = minAttr != null && Number.isFinite(Number(minAttr)) ? Number(minAttr) : 0;
            const maxAttr = this.getAttribute("max");
            this._max = maxAttr != null && Number.isFinite(Number(maxAttr)) ? Number(maxAttr) : 100;
            const ratio = this._isUnboundedMode()
                ? (((v / this._getRotationValue()) % 1) + 1) % 1
                : (this._clamp(v) - this._min) / Math.max(1e-9, this._max - this._min);
            const { start, sweep } = this._resolveDialArc();
            const deg = start + ratio * sweep;
            const rad = (deg - 90) * (Math.PI / 180);
            const kx = CENTER + Math.cos(rad) * RADIUS;
            const ky = CENTER + Math.sin(rad) * RADIUS;
            this._dom.knob.setAttribute("cx", String(kx));
            this._dom.knob.setAttribute("cy", String(ky));
            // update base track ring so excluded gap is visually explicit
            if (this._dom.ring) {
                const ringCirc = 2 * Math.PI * RADIUS;
                const ringArcLen = ringCirc * (sweep / 360);
                if (sweep >= 359.999999) {
                    // Full sweep: draw complete ring without dash pattern artifacts.
                    this._dom.ring.removeAttribute("stroke-dasharray");
                    this._dom.ring.removeAttribute("stroke-dashoffset");
                } else {
                    const ringGapLen = Math.max(1e-6, ringCirc - ringArcLen);
                    this._dom.ring.setAttribute("stroke-dasharray", `${ringArcLen} ${ringGapLen}`);
                    // SVG circle dash starts at 3 o'clock; dial angles are top-based.
                    const strokeStart = start - 90;
                    this._dom.ring.setAttribute("stroke-dashoffset", String(-ringCirc * (strokeStart / 360)));
                }
            }
            // update progress ring stroke
            if (this._dom.progress) {
                const circ = 2 * Math.PI * OUTER_RADIUS;
                const arcLen = circ * (sweep / 360);
                const valueArcLen = Math.max(0, Math.min(arcLen, arcLen * ratio));
                const valueGapLen = Math.max(1e-6, circ - valueArcLen);
                this._dom.progress.setAttribute("stroke-dasharray", `${valueArcLen} ${valueGapLen}`);
                // Keep value arc anchored to the same top-based start as the base ring.
                const strokeStart = start - 90;
                this._dom.progress.setAttribute("stroke-dashoffset", String(-circ * (strokeStart / 360)));
            }
            // update ticks active state
            if (this._dom.ticks) {
                const children = Array.from(this._dom.ticks.children || []);
                const count = children.length;
                children.forEach((el, idx) => {
                    const tRatio = count > 0 ? (idx + 0.5) / count : 0;
                    if (tRatio <= ratio) el.classList.add("active");
                    else el.classList.remove("active");
                });
            }
            // update center display (option label if present)
            if (this._dom.valueDisplay) {
                if (this._options && this._options.length) {
                    // pick nearest option by ratio
                    const idx = Math.min(
                        this._options.length - 1,
                        Math.max(0, Math.round(ratio * (this._options.length - 1)))
                    );
                    this._dom.valueDisplay.textContent = this._options[idx].label;
                } else {
                    this._dom.valueDisplay.textContent = String(v);
                }
            }
        } catch (e) {}
    }
}

customElements.define("input-dial", InputDialComponent);

export default InputDialComponent;
