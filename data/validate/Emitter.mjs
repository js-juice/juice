/**
 * Lightweight event emitter used across validation modules.
 */
class Emitter {
    /**
     * Create a new emitter.
     */
    constructor() {
        this._listeners = new Map();
    }

    /**
     * Register an event handler.
     * @param {string} event
     * @param {Function} handler
     * @param {{once?: boolean}} [options]
     * @returns {Emitter}
     */
    on(event, handler, options = {}) {
        if (typeof handler !== "function") return this;
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ handler, once: !!options.once });
        return this;
    }

    /**
     * Register a one-time event handler.
     * @param {string} event
     * @param {Function} handler
     * @returns {Emitter}
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }

    /**
     * Emit an event with arguments.
     * @param {string} event
     * @param {...*} args
     * @returns {Emitter}
     */
    emit(event, ...args) {
        const listeners = this._listeners.get(event);
        if (!listeners || listeners.length === 0) return this;

        for (let i = 0; i < listeners.length; i += 1) {
            const listener = listeners[i];
            listener.handler.apply(this, args);
            if (listener.once) {
                listeners.splice(i, 1);
                i -= 1;
            }
        }

        if (listeners.length === 0) {
            this._listeners.delete(event);
        }
        return this;
    }

    /**
     * Remove an event handler or all handlers for an event.
     * @param {string} event
     * @param {Function} [handler]
     * @returns {Emitter}
     */
    removeListener(event, handler) {
        if (!this._listeners.has(event)) return this;
        if (!handler) {
            this._listeners.delete(event);
            return this;
        }

        const listeners = this._listeners.get(event).filter((listener) => listener.handler !== handler);
        if (listeners.length === 0) {
            this._listeners.delete(event);
        } else {
            this._listeners.set(event, listeners);
        }
        return this;
    }

    /**
     * Alias for `removeListener`.
     * @param {string} event
     * @param {Function} [handler]
     * @returns {Emitter}
     */
    off(event, handler) {
        return this.removeListener(event, handler);
    }

    /**
     * Remove listeners for a specific event or all events.
     * @param {string} [event]
     * @returns {Emitter}
     */
    removeAllListeners(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
        return this;
    }
}

/**
 * Convenience wrapper that forwards event operations to multiple emitters.
 */
export class EmitterGroup {
    /**
     * @param {...Emitter} emitters
     */
    constructor(...emitters) {
        this.emitters = emitters;
    }

    /**
     * Register handlers on every emitter in the group.
     * @param {string} event
     * @param {Function} handler
     * @param {{once?: boolean}} [options]
     * @returns {EmitterGroup}
     */
    on(event, handler, options = {}) {
        this.emitters.forEach((emitter) => emitter.on(event, handler, options));
        return this;
    }

    /**
     * Register one-time handlers on every emitter in the group.
     * @param {string} event
     * @param {Function} handler
     * @returns {EmitterGroup}
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }

    /**
     * Emit an event on every emitter in the group.
     * @param {string} event
     * @param {...*} args
     * @returns {EmitterGroup}
     */
    emit(event, ...args) {
        this.emitters.forEach((emitter) => emitter.emit(event, ...args));
        return this;
    }
}

export default Emitter;
