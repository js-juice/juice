/**
 * Timeline and ticker system for managing frame-based animations.
 * Provides requestAnimationFrame-based animation loop with multiple timeline support.
 * @module Animation/Timeline
 */

import AnimationTime from "./time.mjs";

const root = typeof globalThis !== "undefined" ? globalThis : {};

const raf =
    (typeof root.requestAnimationFrame === "function" && root.requestAnimationFrame.bind(root)) ||
    (typeof root.mozRequestAnimationFrame === "function" && root.mozRequestAnimationFrame.bind(root)) ||
    (typeof root.webkitRequestAnimationFrame === "function" && root.webkitRequestAnimationFrame.bind(root)) ||
    (typeof root.msRequestAnimationFrame === "function" && root.msRequestAnimationFrame.bind(root)) ||
    ((fn) => setTimeout(() => fn(Date.now()), 1000 / 60));

const caf =
    (typeof root.cancelAnimationFrame === "function" && root.cancelAnimationFrame.bind(root)) ||
    (typeof root.mozCancelAnimationFrame === "function" && root.mozCancelAnimationFrame.bind(root)) ||
    ((requestID) => clearTimeout(requestID));

function nowMS() {
    if (root.performance && typeof root.performance.now === "function") {
        return root.performance.now();
    }
    return Date.now();
}

/**
 * Manages multiple timelines with a single requestAnimationFrame loop.
 * @class Ticker
 * @param {...Timeline} timelines - Initial timelines to manage
 * @example
 * const ticker = new Ticker();
 * ticker.add(timeline1, timeline2);
 * ticker.start();
 */
class Ticker {
    /** @type {boolean} Whether ticker is active */
    active = false;
    /** @type {Array<Timeline>} Managed timelines */
    timelines = [];
    /** @type {number} Current timestamp in milliseconds */
    ms = 0;
    /** @type {AnimationTime} Time tracking instance */
    time = new AnimationTime();

    constructor(...timelines) {
        this.timelines = timelines;
        this._frameHandle = null;
        this._tick = this._tick.bind(this);
    }

    _tick(ms) {
        if (!this.active) return;
        this.ms = ms;

        const timelines = this.timelines;
        let writeIndex = 0;

        for (let i = 0; i < timelines.length; i += 1) {
            const timeline = timelines[i];
            timeline.tick(ms);
            if (timeline.active) {
                timelines[writeIndex] = timeline;
                writeIndex += 1;
            }
        }

        timelines.length = writeIndex;

        if (writeIndex === 0) {
            this.stop();
            return;
        }

        this._frameHandle = raf(this._tick);
    }

    /**
     * Starts the animation ticker loop.
     */
    start() {
        if (this.active) return;
        this.active = true;
        this._frameHandle = raf(this._tick);
    }

    /**
     * Stops the animation ticker loop.
     */
    stop() {
        this.active = false;
        if (this._frameHandle != null) {
            caf(this._frameHandle);
            this._frameHandle = null;
        }
    }

    /**
     * Adds timelines to the ticker and starts if not active.
     * @param {...Timeline} timelines - Timelines to add
     */
    add(...timelines) {
        for (let i = 0; i < timelines.length; i += 1) {
            const timeline = timelines[i];
            if (this.timelines.indexOf(timeline) === -1) {
                this.timelines.push(timeline);
            }
        }
        if (this.timelines.length && !this.active) this.start();
    }

    /**
     * Removes a timeline from the ticker.
     * Stops ticker if no timelines remain.
     * @param {Timeline} timeline - Timeline to remove
     */
    remove(timeline) {
        const timelines = this.timelines;
        for (let i = 0; i < timelines.length; i += 1) {
            if (timelines[i] === timeline) {
                timelines.splice(i, 1);
                break;
            }
        }
        if (!timelines.length) this.stop();
    }
}

/**
 * Global ticker instance for managing timelines.
 * @type {Ticker}
 */
const ticker = new Ticker();

/**
 * Timeline class for managing time-based animations.
 * @class Timeline
 * @example
 * const timeline = new Timeline();
 * ticker.add(timeline);
 */
class Timeline {
    static instances = [];
    debugging = false;
    _active = false;
    _complete = false;
    _update = null;
    _render = null;
    fps = null;
    duration = null;
    time = null;
    props = {};
    paused = true;
    started = false;
    lastFrame = 0;
    timeScale = 1;
    animators = {
        updaters: [],
        renderers: []
    };

    constructor(scope = this, options = {}) {
        if (scope) this.scope = scope;
        this.options = options;

        const requestedFPS = Number(options.fps);
        if (Number.isFinite(requestedFPS) && requestedFPS > 0) {
            this.fps = requestedFPS;
            this._fpsSource = requestedFPS;
            this._fpsMinFrameMs = 1000 / requestedFPS;
            this._fpsAccumulatorMs = 0;
        } else {
            this.fps = null;
            this._fpsSource = null;
            this._fpsMinFrameMs = 0;
            this._fpsAccumulatorMs = 0;
        }

        const requestedTimeScale = Number(options.timeScale);
        this.timeScale = Number.isFinite(requestedTimeScale) && requestedTimeScale !== 0 ? requestedTimeScale : 1;
        if (options.reverse === true && this.timeScale > 0) {
            this.timeScale = -this.timeScale;
        }

        this._afterUpdate = [];
        this.time = new AnimationTime({ max: options.stop, fps: this.fps || Infinity });

        if (options.stats) {
            this.debug();
        }

        Timeline.instances.push(this);
        this.index = Timeline.instances.length - 1;
        if (!options.defer) this.start();
    }

    debug(parent = document.body) {
        if (!this._stats) {
            this._stats = document.createElementNS("http://www.w3.org/1999/xhtml", "animation-stats");
            parent.appendChild(this._stats);
        }
    }

    _hasWork() {
        return !!(
            this._update ||
            this._render ||
            this._afterUpdate.length ||
            this.animators.updaters.length ||
            this.animators.renderers.length
        );
    }

    _syncActivity() {
        const isStopped = !!(this.time && this.time.stopped);
        const shouldRun = this.started && !this.paused && !isStopped && this._hasWork();
        if (!shouldRun) {
            this.active = false;
            return false;
        }

        if (!this.active) {
            this.lastFrame = nowMS();
            this._fpsAccumulatorMs = 0;
        }
        this.active = true;
        return true;
    }

    start() {
        this.started = true;
        this.paused = false;
        if (this.time && this.time.stopped) this.time.stopped = false;
        this._syncActivity();
    }

    cancel() {
        this._complete = true;
        this.active = false;
    }

    reset() {
        this.time.reset();
    }

    pause() {
        this.paused = true;
        this.active = false;
    }

    setTimeScale(value = 1) {
        const next = Number(value);
        if (!Number.isFinite(next) || next === 0) return this;
        this.timeScale = next;
        this._syncActivity();
        return this;
    }

    setReverse(reverse = true) {
        const speed = Math.abs(this.timeScale) || 1;
        this.timeScale = reverse ? -speed : speed;
        this._syncActivity();
        return this;
    }

    get reverse() {
        return this.timeScale < 0;
    }

    set reverse(value) {
        this.setReverse(Boolean(value));
    }

    play(duration) {
        if (!this.started) this.start();
        if (this.time && this.time.stopped) this.time.stopped = false;
        this.paused = false;
        this._syncActivity();
        if (duration) setTimeout(() => this.pause(), duration);
    }

    get active() {
        return this._active;
    }

    set active(active) {
        if (active && !this._active) {
            this._active = active;
            ticker.add(this);
        } else {
            this._active = active;
        }
    }

    set render(fn) {
        this._render = typeof fn === "function" ? fn.bind(this.scope) : null;
        this._syncActivity();
    }

    set update(fn) {
        this._update = typeof fn === "function" ? fn.bind(this.scope) : null;
        this._syncActivity();
    }

    set complete(fn) {
        this._complete = fn.bind(this.scope);
    }

    afterUpdate(fn, options = {}) {
        if (typeof fn !== "function") return;
        this._afterUpdate.push({ fn, scope: this.scope, ...options });
        this._syncActivity();
    }

    _executeAfterUpdate() {
        const hooks = this._afterUpdate;
        for (let i = 0; i < hooks.length; i += 1) {
            const hook = hooks[i];
            hook.fn.call(hook.scope);
            if (hook.once) {
                hooks.splice(i, 1);
                i -= 1;
            }
        }
    }

    addUpdate(fn) {
        if (typeof fn !== "function") return;
        const updaters = this.animators.updaters;
        if (updaters.indexOf(fn) === -1) {
            updaters.push(fn);
        }
        this._syncActivity();
    }

    addRender(fn) {
        if (typeof fn !== "function") return;
        const renderers = this.animators.renderers;
        if (renderers.indexOf(fn) === -1) {
            renderers.push(fn);
        }
        this._syncActivity();
    }

    addAnimator(animator) {
        animator._timeline = this;
        const scope = animator.scope || animator;
        const updaters = this.animators.updaters;
        const renderers = this.animators.renderers;
        if (animator.animation) {
            animator = animator.animation;
        }
        if (typeof animator.update === "function") {
            updaters.push(animator.update.bind(scope));
        }
        if (typeof animator.render === "function") {
            renderers.push(animator.render.bind(scope));
        }
        this._syncActivity();
    }

    tick(ms) {
        if (this.paused) return;
        if (!this._hasWork()) {
            this.active = false;
            return;
        }

        const frameDelta = ms - this.lastFrame;
        this.lastFrame = ms;
        if (!Number.isFinite(frameDelta) || frameDelta <= 0) {
            return;
        }

        let deltaForStep = frameDelta;
        if (this.fps) {
            if (this._fpsSource !== this.fps) {
                this._fpsSource = this.fps;
                this._fpsMinFrameMs = 1000 / this.fps;
                this._fpsAccumulatorMs = 0;
            }
            this._fpsAccumulatorMs += frameDelta;
            if (this._fpsAccumulatorMs < this._fpsMinFrameMs) {
                return;
            }
            const steps = Math.floor(this._fpsAccumulatorMs / this._fpsMinFrameMs);
            deltaForStep = steps * this._fpsMinFrameMs;
            this._fpsAccumulatorMs -= deltaForStep;
        } else {
            this._fpsAccumulatorMs = 0;
        }

        const scaledDelta = deltaForStep * this.timeScale;
        if (!Number.isFinite(scaledDelta) || scaledDelta === 0) {
            return;
        }

        const updated = this.time.advance(scaledDelta, deltaForStep);
        if (updated) {
            const time = this.time;
            if (this._update) this._update(time);

            const updaters = this.animators.updaters;
            for (let i = 0; i < updaters.length; i += 1) {
                updaters[i](time);
            }

            this._executeAfterUpdate();

            if (this._render) this._render(time);
            const renderers = this.animators.renderers;
            for (let i = 0; i < renderers.length; i += 1) {
                renderers[i](time);
            }
        } else if (this.time && this.time.stopped) {
            this.active = false;
            if (typeof this._complete === "function") {
                this._complete();
            }
        }
    }
}

export default Timeline;
