/**
 * Animation controllers for throttle, ramp, and other control mechanisms.
 * @module Animation/Controllers
 */

/**
 * ThrottleController manages acceleration/deceleration for throttle-style controls.
 * @class ThrottleController
 */
export class ThrottleController {
    /**
     * Creates a new ThrottleController.
     * @param {number} [accelerationRate=0.001] - Rate of acceleration
     * @param {number} [deceleratonRate=0.5] - Rate of deceleration
     * @param {Object} [options={}] - Additional options including idle value
     */
    constructor(accelerationRate = 0.001, deceleratonRate = 0.5, options = {}) {
        this.power = 0;
        this.value = 0;
        this.acceleration = 0;
        this.accelerationRate = accelerationRate;
        this.decelerationRate = deceleratonRate;
        this.isPressed = false;
        this.options = options;
        this.idle = options.idle || 0;
        this.update(0);
    }

    /**
     * Executes press.
     * @param {*} amount - Parameter value.
     * @returns {*} Result of press.
     */
    press(amount = 1) {
        // debug("pressing throttle");
        this.amount = Math.min(amount, 1);
        this.isPressed = true;
    }

    /**
     * Executes release.
     * @returns {*} Result of release.
     */
    release() {
        /// debug("releasing throttle");
        this.isPressed = false;
        this.amount = 0;
        this.acceleration = 0;
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} delta - Parameter value.
     * @returns {*} Result of update.
     */
    update(delta) {
        if (this.isPressed) {
            //  console.log("throttle pressed");
            this.acceleration += this.accelerationRate;
            this.power += this.acceleration * delta;
            if (this.power > 1) this.power = 1;
        } else {
            this.power -= this.decelerationRate * delta;
            if (this.power < this.idle) this.power = this.idle;
        }
    }
}

/*
Ramp:

accumulator: number - how quickly the ramp value increases per second
accumulatorMax: number - the maximum value of the ramp
value: number - the current value of the ramp
rampValue: number - the unclamped value of the ramp

*/

/**
 * Represents the Ramp animation module class.
 */
export class Ramp {
    min;
    max;
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} multiplier - Parameter value.
     * @param {*} accumulatorMax - Parameter value.
     * @param {*} drection - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(multiplier = 0.01, accumulatorMax = 1, drection = 1) {
        this.accumulator = 0;
        this.multiplier = multiplier;
        this.accumulatorMax = accumulatorMax;
        this.direction = direction;
        this.value = 0;
    }

    /**
     * Executes start.
     * @returns {*} Result of start.
     */
    start() {
        this.started = true;
    }

    /**
     * Executes stop.
     * @returns {*} Result of stop.
     */
    stop() {
        this.started = false;
    }

    /**
     * Executes reset.
     * @returns {*} Result of reset.
     */
    reset() {
        this.value = 0;
        this.maxed = false;
    }

    /**
     * Executes clamp.
     * @param {*} min - Parameter value.
     * @param {*} max - Parameter value.
     * @returns {*} Result of clamp.
     */
    clamp(min, max) {
        this.min = min;
        this.max = max;
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} delta - Parameter value.
     * @returns {*} Result of update.
     */
    update(delta) {
        if (this.maxed) return;

        if (this.accumulator < this.accumulatorMax) {
            //Increase accumulator by multiplier
            this.accumulator += this.multiplier * delta;
            //If accumlator is more then accumulatorMax limit t0 accumulatorMax
            if (this.accumulator > this.accumulatorMax) this.accumulator = this.accumulatorMax;
        }

        if (this.max === undefined || this.value < this.max) {
            this.value += this.accumulator * delta * this.direction;
        }

        if (this.value > this.max) {
            this.value = this.max;
            this.maxed = true;
        }
    }
}

/**
 * Represents the RampUp animation module class.
 */
export class RampUp extends Ramp {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} accumulator - Parameter value.
     * @param {*} max - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(accumulator, max = 1) {
        super(accumulator, max, 0, 1);
    }
}

/**
 * Represents the RampDown animation module class.
 */
export class RampDown extends Ramp {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} accumulator - Parameter value.
     * @param {*} min - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(accumulator, min = 0) {
        super(accumulator, max, min, -1);
    }
}

/**
 * Represents the RampedValue animation module class.
 */
export class RampedValue {
    direction = 0;

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} value - Parameter value.
     * @param {*} acceleration - Parameter value.
     * @param {*} deceleration - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(value = 0, acceleration, deceleration, options = {}) {
        this.acceleration = acceleration;
        this.deceleration = deceleration;
        this.min = options.min || 0;
        this.max = options.max || Infinity;
        this.value = value;
    }

    /**
     * Executes reset.
     * @returns {*} Result of reset.
     */
    reset() {
        this.value = 0;
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} delta - Parameter value.
     * @returns {*} Result of update.
     */
    update(delta) {
        if (direction == 1) {
            this.value += delta;
            if (this.value < this.max) this.value += this.acceleration;
        } else if (direction == -1) {
            this.value -= delta;
            if (this.value < this.min) this.value = this.min;
        } else if (direction == 0) {
            this.value -= delta;
            if (this.value < this.min) this.value = this.min;
        }
    }

    /**
     * Returns the current value value.
     * @returns {*} Current value value.
     */
    get value() {
        return this._value;
    }
}

/**
 * Represents the RampController animation module class.
 */
class RampController {}