/**
 * Keyboard input management with event handling.
 * @module interactions/device/Keyboard
 */

import KeyCodes from "../key-codes.mjs";
import EventEmitter from "../../event/emitter.mjs";

/**
 * Keyboard class manages keyboard input and emits events for key presses.
 * @class Keyboard
 * @extends EventEmitter
 */
class Keyboard extends EventEmitter {
    pressed = [];
    only = [];
    global = false;
    /**
     * Creates a new Keyboard instance and sets up event listeners.
     */
    constructor() {
        super();
        this.pressed = [];
        this.only = [];
        this.global = false;
        this.keys = {};
        this.initialize();

        this.on("listener", (name) => {
            if (this.global) return;
            if (["keyup", "keydown"].includes(name)) {
                this.global = true;
                this.only = [];
                return;
            }
            this.only.push(name);
        });
    }

    listenOnly(...keys) {
        this.only = keys;
    }

    onKeyDown(event) {
        if (this.only.length && !this.only.includes(event.key)) return;
        if (!event.repeat) this.pressed.push(event.key);

        this.emit(event.key, "down", event.repeat);
        this.emit("keydown", event.key, event.repeat);
    }

    onKeyUp(event) {
        if (this.only && !this.only.includes(event.key)) return;
        this.pressed.splice(this.pressed.indexOf(event.key), 1);

        this.emit(event.key, "up");
        this.emit("keyup", event.key);
    }

    isKeyDown(key) {
        return this.pressed.indexOf(key) !== -1;
    }

    initialize() {
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));
    }
}

export default Keyboard;
