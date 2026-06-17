import EventEmitter from "../../event/emitter.mjs";

/**
 * Pointer controller for multi-pointer (mouse, touch, pen)
 * @class Pointer
 */
class Pointer extends EventEmitter {
    constructor(name) {
        super();

        this.name = name;

        // Active pointers: pointerId -> state
        this.pointers = new Map();

        // Bound handlers (so we can unbind properly)
        this._handlers = {
            down: this.onPointerDown.bind(this),
            move: this.onPointerMove.bind(this),
            up: this.onPointerUp.bind(this),
            cancel: this.onPointerCancel.bind(this)
        };
    }

    // --- Pointer State Helper ---
    _createPointerState(e) {
        return {
            id: e.pointerId,
            type: e.pointerType,
            x: e.clientX,
            y: e.clientY,
            buttons: e.buttons,
            target: e.target,
            captured: false,
            pressure: e.pressure,
            tiltX: e.tiltX,
            tiltY: e.tiltY
        };
    }

    _updatePointerState(state, e) {
        state.x = e.clientX;
        state.y = e.clientY;
        state.buttons = e.buttons;
        state.target = e.target;
        state.pressure = e.pressure;
        state.tiltX = e.tiltX;
        state.tiltY = e.tiltY;
    }

    // --- Events ---
    onPointerDown(e) {
        const state = this._createPointerState(e);
        this.pointers.set(e.pointerId, state);

        this.emit("pointerdown", state, e);
    }

    onPointerMove(e) {
        const state = this.pointers.get(e.pointerId);
        if (!state) return;

        this._updatePointerState(state, e);

        this.emit("pointermove", state, e);
    }

    onPointerUp(e) {
        const state = this.pointers.get(e.pointerId);
        if (!state) return;

        this._updatePointerState(state, e);

        this.emit("pointerup", state, e);

        // release capture if needed
        if (state.captured && e.target.hasPointerCapture?.(e.pointerId)) {
            e.target.releasePointerCapture(e.pointerId);
        }

        this.pointers.delete(e.pointerId);
    }

    onPointerCancel(e) {
        const state = this.pointers.get(e.pointerId);
        if (!state) return;

        this.emit("pointercancel", state, e);

        this.pointers.delete(e.pointerId);
    }

    // --- Capture API ---
    capture(pointerId, element) {
        const state = this.pointers.get(pointerId);
        if (!state || !element?.setPointerCapture) return false;

        try {
            element.setPointerCapture(pointerId);
            state.captured = true;
            this.emit("pointercapture", state, element);
            return true;
        } catch {
            return false;
        }
    }

    release(pointerId, element) {
        const state = this.pointers.get(pointerId);
        if (!state || !element?.releasePointerCapture) return false;

        try {
            element.releasePointerCapture(pointerId);
            state.captured = false;
            this.emit("pointerrelease", state, element);
            return true;
        } catch {
            return false;
        }
    }

    // --- Queries ---
    get(pointerId) {
        return this.pointers.get(pointerId) || null;
    }

    getAll() {
        return Array.from(this.pointers.values());
    }

    isActive(pointerId) {
        return this.pointers.has(pointerId);
    }

    // --- Bind / Unbind ---
    bindEvents(target = document) {
        const h = this._handlers;

        target.addEventListener("pointerdown", h.down);
        target.addEventListener("pointermove", h.move);
        target.addEventListener("pointerup", h.up);
        target.addEventListener("pointercancel", h.cancel);
    }

    unbindEvents(target = document) {
        const h = this._handlers;

        target.removeEventListener("pointerdown", h.down);
        target.removeEventListener("pointermove", h.move);
        target.removeEventListener("pointerup", h.up);
        target.removeEventListener("pointercancel", h.cancel);

        this.pointers.clear();
    }
}

export default Pointer;
