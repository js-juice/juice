import EventEmitter from "../../event/emitter.mjs";

/**
 * Mouse controller for managing mouse events.
 * @class Mouse
 */
class Mouse extends EventEmitter {
    constructor(name) {
        super(); // ✅ required

        this.name = name;
        this.pressed = [];
        this.moving = false;
        this.over = null;

        this.moveTO = null;
        this.wheelTO = null;
        this.wheelActive = false;

        this._rafMove = null;
        this._rafWheel = null;

        // ✅ bind once so removeEventListener works
        this._handlers = {
            mousemove: this.onMouseMove.bind(this),
            pointerdown: this.onMouseDown.bind(this),
            pointerup: this.onMouseUp.bind(this),
            wheel: this.onMouseWheel.bind(this),
            click: this.run.bind(this),
            dblclick: this.run.bind(this),
            contextmenu: this.run.bind(this),
            mouseleave: this.run.bind(this),
            mouseenter: this.run.bind(this)
        };
    }

    onMouseDown(e) {
        if (!this.pressed.includes(e.button)) {
            this.pressed.push(e.button);
        }
    }

    onMouseUp(e) {
        const i = this.pressed.indexOf(e.button);
        if (i !== -1) this.pressed.splice(i, 1); // ✅ safe removal
    }

    onMouseMove(e) {
        clearTimeout(this.moveTO);

        this.moving = true;
        this.over = e.target;
        this._lastMoveEvent = e;

        this.moveTO = setTimeout(() => {
            this.moving = false;
        }, 100);

        if (!this._rafMove) {
            this._rafMove = requestAnimationFrame(() => this.emitMouseMove());
        }
    }

    emitMouseMove() {
        if (!this._lastMoveEvent) return;

        this.emit("mousemove", this._lastMoveEvent);

        if (this.moving) {
            this._rafMove = requestAnimationFrame(() => this.emitMouseMove());
        } else {
            cancelAnimationFrame(this._rafMove);
            this._rafMove = null;
        }
    }

    onMouseWheel(e) {
        clearTimeout(this.wheelTO);

        this.wheelActive = true;
        this._lastWheelEvent = e;

        if (!this._rafWheel) {
            this._rafWheel = requestAnimationFrame(() => this.emitMouseWheel());
        }

        this.wheelTO = setTimeout(() => {
            this.wheelActive = false;
        }, 100);
    }

    emitMouseWheel() {
        if (!this._lastWheelEvent) return;

        this.emit("wheel", this._lastWheelEvent);

        if (this.wheelActive) {
            this._rafWheel = requestAnimationFrame(() => this.emitMouseWheel());
        } else {
            cancelAnimationFrame(this._rafWheel);
            this._rafWheel = null;
        }
    }

    isPressed(button) {
        return this.pressed.includes(button);
    }

    isOver(element) {
        return this.over && (this.over === element || this.over.contains(element));
    }

    run(e) {
        const target = e.target;
        const event = e.type;

        if (event === "click" || event === "dblclick") {
            this.emit("click", target, event === "dblclick", e);
            return;
        }

        this.emit(event, target, e);

        console.log(`${this.name} is running`);
    }

    bindEvents() {
        const h = this._handlers;

        document.addEventListener("mousemove", h.mousemove);
        document.addEventListener("pointerdown", h.pointerdown);
        document.addEventListener("pointerup", h.pointerup);
        document.addEventListener("wheel", h.wheel);
        document.addEventListener("click", h.click);
        document.addEventListener("dblclick", h.dblclick);
        document.addEventListener("contextmenu", h.contextmenu);
        document.addEventListener("mouseleave", h.mouseleave);
        document.addEventListener("mouseenter", h.mouseenter);
    }

    unbindEvents() {
        const h = this._handlers;

        document.removeEventListener("mousemove", h.mousemove);
        document.removeEventListener("pointerdown", h.pointerdown);
        document.removeEventListener("pointerup", h.pointerup);
        document.removeEventListener("wheel", h.wheel);
        document.removeEventListener("click", h.click);
        document.removeEventListener("dblclick", h.dblclick);
        document.removeEventListener("contextmenu", h.contextmenu);
        document.removeEventListener("mouseleave", h.mouseleave);
        document.removeEventListener("mouseenter", h.mouseenter);

        // ✅ cleanup
        clearTimeout(this.moveTO);
        clearTimeout(this.wheelTO);

        if (this._rafMove) cancelAnimationFrame(this._rafMove);
        if (this._rafWheel) cancelAnimationFrame(this._rafWheel);
    }
}

export default Mouse;
