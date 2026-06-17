/**
 * Ramp controller for smooth value accumulation and transitions.
 * Provides accumulator and ramp classes for animated value changes.
 * @module Animation/Controllers/Ramp
 */

import Easing from "../easing.mjs";

/**
 * Accumulator for incrementing values over time with optional easing curves.
 * @class Accumulator
 * @example
 * const acc = new Accumulator(0.1, 0);
 * acc.add(5); // value becomes 5
 */
export class Accumulator {
    index = -1;
    value = 0;

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} increment - Parameter value.
     * @param {*} value - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(increment, value, options = {}) {
        if (typeof increment == "function") {
            this.fn = increment.bind(this);
        } else {
            this.increment = increment;
        }

        if (value !== undefined) this.value = value;
        if (options.curve) this.curve = options.curve;
        if (options.increment) this.increment = options.increment;
    }

    /**
     * Executes step.
     * @returns {*} Result of step.
     */
    step() {
        if (this.increment) {
            return this.value + this.increment;
        }
        this.index++;
    }

    /**
     * Executes add.
     * @param {*} value - Parameter value.
     * @returns {*} Result of add.
     */
    add(value) {
        this.value += value;
        if (this.max && this.value > this.max) this.value = this.max;
    }

    /**
     * Executes multiply.
     * @param {*} value - Parameter value.
     * @returns {*} Result of multiply.
     */
    multiply(value) {
        this.value *= value;
        if (this.max && this.value > this.max) this.value = this.max;
    }

    /**
     * Executes reset.
     * @returns {*} Result of reset.
     */
    reset() {
        this.value = 0;
        this.index = 0;
    }

    /**
     * Executes next.
     * @returns {*} Result of next.
     */
    next() {
        this.index++;
        if (this.fn) {
            this.value = this.fn();
        } else {
            this.value = this.step();
        }
        return this.valueOf();
    }

    /**
     * Executes valueOf.
     * @returns {*} Result of valueOf.
     */
    valueOf() {
        return this.value;
    }
}

/**
const acc = new Accumulator(( index, value ) => {
    return index + value;
});
acc.next();
*/

/**
 * Represents the Ramp animation module class.
 */
export class Ramp {
    easing = Easing.linear;
    time = {
        start: 0,
        end: 0,
        current: 0,
    };
    tmp = {};
    curve = 0;
    curveAccumulator = 0;
    active = false;
    value = 0;
    defaultValue = 0;
    active = false;

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} value - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(value, options = {}) {
        if (value) {
            this.value = value;
            this.defaultValue = value;
        }
        this.curveAccumulator = new Accumulator((index, value) => {}, options.max);
        this.setOptions(options);
    }

    /**
     * Sets options values.
     * @param {*} options - Parameter value.
     * @returns {*} Result of setOptions.
     */
    setOptions(options) {
        if (options.curve) {
            this.curve = options.curve;
            const easing = function (t) {
                this.curveAccumulator += this.curve * delta;
                return t;
            };
            this.eassing = easing.bind(this);
        }
        if (options.easing) this.easing = Easing[options.easingFunction] || options.easingFunction;
        if (options.max) this.max = options.max;
        if (options.min) this.min = options.min;
        if (options.direction) this.direction = options.direction;
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} delta - Parameter value.
     * @returns {*} Result of update.
     */
    update(delta) {
        this.time.current += delta;
        if (this.time.start) {
            this.value += (this.time.current - this.time.start) * this.easing(this.time.current - this.time.start);
        } else if (this.time.end) {
        }
    }
}

export default Ramp;
