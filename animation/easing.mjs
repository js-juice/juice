/**
 * Easing functions for smooth animations.
 * Provides common easing equations including linear, quad, cubic, quart, quint, and sine easings.
 * @module Animation/Easing
 */

/**
 * Linear easing (no acceleration).
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const linear = (t) => t;

/**
 * Quadratic ease-in (accelerating from zero velocity).
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInQuad = (t) => t * t;

/**
 * Quadratic ease-out (decelerating to zero velocity).
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutQuad = (t) => t * (2 - t);

/**
 * Quadratic ease-in-out (acceleration until halfway, then deceleration).
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/**
 * Cubic ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInCubic = (t) => t * t * t;

/**
 * Cubic ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutCubic = (t) => --t * t * t + 1;

/**
 * Cubic ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

/**
 * Quartic ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInQuart = (t) => t * t * t * t;

/**
 * Quartic ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutQuart = (t) => --t * t * t * t + 1;

/**
 * Quartic ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutQuart = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t);

/**
 * Quintic ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInQuint = (t) => t * t * t * t * t;

/**
 * Quintic ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutQuint = (t) => --t * t * t * t * t + 1;

/**
 * Quintic ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - 16 * --t * t * t * t * t);

/**
 * Sinusoidal ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);

/**
 * Sinusoidal ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);

/**
 * Sinusoidal ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Exponential ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));

/**
 * Exponential ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Exponential ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutExpo = (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
};

/**
 * Circular ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInCirc = (t) => 1 - Math.sqrt(1 - t * t);

/**
 * Circular ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutCirc = (t) => Math.sqrt(1 - Math.pow(t - 1, 2));

/**
 * Circular ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutCirc = (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

/**
 * Back ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
};

/**
 * Back ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const u = t - 1;
    return 1 + c3 * u * u * u + c1 * u * u;
};

/**
 * Back ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutBack = (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    if (t < 0.5) {
        const u = 2 * t;
        return (u * u * ((c2 + 1) * u - c2)) / 2;
    }
    const u = 2 * t - 2;
    return (u * u * ((c2 + 1) * u + c2) + 2) / 2;
};

/**
 * Elastic ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInElastic = (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

/**
 * Elastic ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutElastic = (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/**
 * Elastic ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutElastic = (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c5 = (2 * Math.PI) / 4.5;
    if (t < 0.5) {
        return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
};

/**
 * Bounce ease-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeOutBounce = (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
        const u = t - 1.5 / d1;
        return n1 * u * u + 0.75;
    }
    if (t < 2.5 / d1) {
        const u = t - 2.25 / d1;
        return n1 * u * u + 0.9375;
    }
    const u = t - 2.625 / d1;
    return n1 * u * u + 0.984375;
};

/**
 * Bounce ease-in.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInBounce = (t) => 1 - easeOutBounce(1 - t);

/**
 * Bounce ease-in-out.
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value
 */
export const easeInOutBounce = (t) => (t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2);

/**
 * Collection of all easing functions.
 * @type {Object<string, Function>}
 */
const Easing = {
    linear,
    easeInQuad,
    easeOutQuad,
    easeInOutQuad,
    easeInCubic,
    easeOutCubic,
    easeInOutCubic,
    easeInQuart,
    easeOutQuart,
    easeInOutQuart,
    easeInQuint,
    easeOutQuint,
    easeInOutQuint,
    easeInSine,
    easeOutSine,
    easeInOutSine,
    easeInExpo,
    easeOutExpo,
    easeInOutExpo,
    easeInCirc,
    easeOutCirc,
    easeInOutCirc,
    easeInBack,
    easeOutBack,
    easeInOutBack,
    easeInElastic,
    easeOutElastic,
    easeInOutElastic,
    easeInBounce,
    easeOutBounce,
    easeInOutBounce,
};

/**
 * Time-based easing wrapper that tracks animation progress.
 * @class Ease
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Animation duration
 * @param {string|Function} [easeType='linear'] - Easing function name or function
 * @example
 * const ease = new Ease(0, 100, 1000, 'easeInOutQuad');
 * ease.update(16); // Update with delta time
 * console.log(ease.value); // Get eased value
 */
export class Ease {
    /** @type {number} Current time */
    time = 0;

    constructor(start, end, duration, easeType = "linear") {
        this.easeFn = typeof easeType == "function" ? easeType : Easing[easeType];
        this.duration = duration;
    }

    /**
     * Gets eased value at specific time.
     * @param {number} time - Time value
     * @returns {number} Eased value
     */
    at(time) {
        this.time = time;
        this.progress = this.time / this.duration;
        this.value = this.easeFn(this.progress);
        return this.value;
    }

    /**
     * Updates time and returns eased value.
     * @param {number} delta - Time delta to add
     * @returns {number} Eased value
     */
    update(delta) {
        this.time += delta;
        return this.at(this.time);
    }
}

export default Easing;
