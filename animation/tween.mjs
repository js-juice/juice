/**
 * Tween class for animating values with easing functions.
 * Provides requestAnimationFrame-based animation with callbacks for updates and completion.
 * @module Animation/Tween
 */

import Easing from "./easing.mjs";

import EventEmitter from "../core/Event/Emitter.mjs";

import { change } from "../core/Util/Object.mjs";

const root = typeof globalThis !== "undefined" ? globalThis : {};
const raf =
    (typeof root.requestAnimationFrame === "function" && root.requestAnimationFrame.bind(root)) ||
    ((fn) => setTimeout(() => fn(nowMS()), 1000 / 60));
const caf =
    (typeof root.cancelAnimationFrame === "function" && root.cancelAnimationFrame.bind(root)) ||
    ((requestID) => clearTimeout(requestID));

function nowMS() {
    if (root.performance && typeof root.performance.now === "function") {
        return root.performance.now();
    }
    return Date.now();
}

export function resolveEasing(easing = Easing.linear) {
    if (typeof easing === "function") return easing;
    if (typeof easing === "string" && Easing[easing]) return Easing[easing];
    return Easing.linear;
}

/**
 * Animates a single value from start to end over duration with easing.
 * @class Tween
 * @param {number} startValue - Initial value
 * @param {number} endValue - Target value
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} [easingFunction=Easing.linear] - Easing function
 * @param {number} [easeDuration] - Optional separate easing duration
 * @example
 * const tween = new Tween(0, 100, 2000, Easing.easeInOutQuad);
 * tween.update((value, progress) => {
 *   element.style.opacity = value / 100;
 * }).complete(() => {
 *   console.log('Animation done');
 * }).start();
 */
export default class Tween extends EventEmitter {
    /** @type {Object} Callback functions */
    callbacks = {};

    constructor(startValue, endValue, duration, easingFunction = Easing.linear, easeDuration) {
        super();
        this.startValue = startValue;
        this.endValue = endValue;
        this.duration = Math.max(0, Number(duration) || 0);
        this.easeDuration = easeDuration || duration;
        this.easingFunction = resolveEasing(easingFunction);
        this.startTime = null;
        this.animationFrameId = null;
        this.running = false;
        this.value = {
            start: startValue,
            end: endValue,
            diff: endValue - startValue
        };
        this.time = {
            start: null,
            end: 0,
            current: 0,
            last: 0,
            delta: 0
        };
        this.callbacks = {
            update: null,
            complete: null
        };
        this._update = this._update.bind(this);
    }

    /**
     * Starts the tween animation.
     */
    start() {
        this.stop();
        this.running = true;
        this.time.start = nowMS();
        this.time.current = 0;
        this.time.last = 0;
        this.time.delta = 0;

        if (this.duration === 0) {
            if (this.callbacks.update) this.callbacks.update(this.value.end, 1);
            if (this.callbacks.complete) this.callbacks.complete();
            this.running = false;
            return this;
        }

        this.animationFrameId = raf(this._update);
        return this;
    }

    /**
     * Registers update callback.
     * @param {Function} fn - Callback receiving (value, progress)
     * @returns {Tween} This instance for chaining
     */
    update(fn) {
        this.callbacks.update = fn.bind(this);
        return this;
    }

    /**
     * Registers completion callback.
     * @param {Function} fn - Callback when animation completes
     * @returns {Tween} This instance for chaining
     */
    complete(fn) {
        this.callbacks.complete = fn.bind(this);
        return this;
    }

    /**
     * Internal update method called on each frame.
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     * @private
     */
    _update(currentTime) {
        if (!this.running) return;

        this.time.last = this.time.current;
        this.time.current = Math.max(0, currentTime - this.time.start);
        this.time.delta = this.time.current - this.time.last;

        const progress = Math.min(this.time.current / this.duration, 1);
        const easedProgress = this.easingFunction(progress);
        const currentValue = this.value.start + this.value.diff * easedProgress;

        if (this.callbacks.update) this.callbacks.update(currentValue, progress);

        if (progress < 1) {
            this.animationFrameId = raf(this._update);
        } else {
            if (this.callbacks.complete) this.callbacks.complete();
            this.stop();
        }
    }

    /**
     * Stops the tween animation.
     */
    stop() {
        if (this.animationFrameId) {
            caf(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.running = false;
        return this;
    }
}

/**
 * Tweens multiple object properties simultaneously.
 * @class TweenObject
 * @extends EventEmitter
 * @param {Object} startValue - Object with initial property values
 * @param {Object} endValue - Object with target property values
 * @param {number} duration - Animation duration
 * @param {Function} [easingFunction=Easing.linear] - Easing function
 */
class TweenObject extends EventEmitter {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} startValue - Parameter value.
     * @param {*} endValue - Parameter value.
     * @param {*} duration - Parameter value.
     * @param {*} easingFunction - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(startValue, endValue, duration, easingFunction = Easing.linear) {
        super();
        this.tweens = [];
        const diff = change(startValue, endValue);
        for (const key in diff) {
            this.tweens.push(new Tween(diff[key][0], diff[key][1], duration, easingFunction));
        }
    }

    /**
     * Executes start.
     * @returns {*} Result of start.
     */
    start() {
        this.tweens.forEach((tween) => tween.start());
    }
}
/*
// Usage example
const tween = new Tween(0, 100, 2000, Easing.easeInOutQuad);
tween.update((value, progress) => {
    console.log(`Value: ${value}, Progress: ${progress}`);
});

tween.complete(() => {
    console.log("Tween complete");
});
tween.start();
*/
