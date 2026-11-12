import * as Easing from "./easing.mjs";

/**
 * Represents the KeyFramedValue animation module class.
 */
class KeyFramedValue {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} keyframes - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(keyframes = []) {
        this.keyframes = [];
        this.filters = [];
        if (Array.isArray(keyframes)) {
            keyframes.forEach((kf) => {
                if (!kf) return;
                this.keyFrame(kf.percentage, kf.value, kf.easing);
            });
        }
    }

    /**
     * Executes keyFrame.
     * @param {*} percentage - Parameter value.
     * @param {*} value - Parameter value.
     * @param {*} easing - Parameter value.
     * @returns {*} Result of keyFrame.
     */
    keyFrame(percentage, value, easing = "linear") {
        let normalizedPercent = Number(percentage);
        if (!Number.isFinite(normalizedPercent)) return;
        if (Math.abs(normalizedPercent) <= 1) normalizedPercent *= 100;
        normalizedPercent = Math.max(0, Math.min(100, normalizedPercent));

        if (Easing[easing] === undefined && typeof easing !== "function") {
            console.warn(`Easing function "${easing}" not found. Defaulting to linear.`);
            easing = "linear";
        }

        this.keyframes.push({ percentage: normalizedPercent, value: Number(value), easing });
        this.keyframes.sort((a, b) => a.percentage - b.percentage);
    }

    /**
     * Registers a post-curve filter segment.
     */
    addFilter(value, filter, startAt, endAt, easing = "linear") {
        this.filters.push({ value, filter, startAt, endAt, easing });
        this.filters.sort((a, b) => Number(a.startAt) - Number(b.startAt));
    }

    /**
     * Resolves easing function for one segment.
     *
     * @private
     * @param {string|Function} easing
     * @returns {Function}
     */
    _resolveEasing(easing) {
        if (typeof easing === "function") return easing;
        if (typeof easing === "string" && typeof Easing[easing] === "function") return Easing[easing];
        return Easing.linear || ((t) => t);
    }

    /**
     * Samples value at normalized progress [0..1].
     *
     * @param {number} progress
     * @returns {number}
     */
    getValueAtProgress(progress = 0) {
        if (!Array.isArray(this.keyframes) || this.keyframes.length === 0) return 0;
        if (this.keyframes.length === 1) return Number(this.keyframes[0].value) || 0;

        const percent = Math.max(0, Math.min(1, Number(progress) || 0)) * 100;
        const frames = this.keyframes;

        if (percent <= frames[0].percentage) return Number(frames[0].value) || 0;
        if (percent >= frames[frames.length - 1].percentage) return Number(frames[frames.length - 1].value) || 0;

        for (let i = 0; i < frames.length - 1; i++) {
            const a = frames[i];
            const b = frames[i + 1];
            if (percent < a.percentage || percent > b.percentage) continue;
            const span = Math.max(0.000001, b.percentage - a.percentage);
            const t = (percent - a.percentage) / span;
            const easing = this._resolveEasing(a.easing);
            const easedT = Math.max(0, Math.min(1, easing(t)));
            return Number(a.value) + (Number(b.value) - Number(a.value)) * easedT;
        }
        return Number(frames[frames.length - 1].value) || 0;
    }

    /**
     * Samples value at percentage [0..100].
     *
     * @param {number} percent
     * @returns {number}
     */
    getValueAtPercent(percent = 0) {
        const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
        return this.getValueAtProgress(normalized / 100);
    }

    /**
     * Samples value at frame index.
     *
     * @param {number} frame
     * @param {number} [totalFrames=60]
     * @returns {number}
     */
    getValueAtFrame(frame = 0, totalFrames = 60) {
        const count = Math.max(1, Math.floor(Number(totalFrames) || 60));
        if (count <= 1) return this.getValueAtProgress(0);
        const normalizedFrame = Math.max(0, Math.min(count - 1, Number(frame) || 0));
        return this.getValueAtProgress(normalizedFrame / (count - 1));
    }

    /**
     * Executes compile.
     * @param {*} opts - Parameter value.
     * @returns {*} Result of compile.
     */
    compile(opts = {}) {
        let duration = Number(opts.duration);
        let frames = Number(opts.frames);
        const fps = Math.max(1, Number(opts.fps) || 60);

        if (Number.isFinite(duration) && Number.isFinite(frames)) {
            console.warn("Both duration and frames specified. Defaulting to duration.");
        }

        if (Number.isFinite(duration) && duration > 0) {
            frames = Math.max(1, Math.round(duration * fps));
        } else if (!(Number.isFinite(frames) && frames > 0)) {
            frames = fps;
        } else {
            frames = Math.round(frames);
        }

        this.duration = Number.isFinite(duration) && duration > 0 ? duration : frames / fps;
        this.frames = frames;
        this.fps = fps;

        const frameArr = new Float32Array(frames);
        for (let frame = 0; frame < frames; frame++) {
            const progress = frames <= 1 ? 0 : frame / (frames - 1);
            frameArr[frame] = Number(this.getValueAtProgress(progress)) || 0;
        }

        return {
            isKeyFramedValue: true,
            frames: frameArr,
            duration: this.duration,
            fps: this.fps,
            frame: (f) => {
                const idx = Math.max(0, Math.min(frameArr.length - 1, Math.floor(Number(f) || 0)));
                return frameArr[idx];
            },
            getFrameBySecs: (t) => {
                const sec = Number(t) || 0;
                const progress = this.duration <= 0 ? 0 : Math.max(0, Math.min(1, sec / this.duration));
                const idx = Math.floor(progress * (frameArr.length - 1));
                return frameArr[Math.max(0, Math.min(frameArr.length - 1, idx))];
            },
            getFrameByMS: (t) => {
                const ms = Number(t) || 0;
                const progress = this.duration <= 0 ? 0 : Math.max(0, Math.min(1, ms / (this.duration * 1000)));
                const idx = Math.floor(progress * (frameArr.length - 1));
                return frameArr[Math.max(0, Math.min(frameArr.length - 1, idx))];
            }
        };
    }
}

class KeyFramedObject {
    head = {};

    seek(time) {
        const t = Number(time) || 0;
        for (const prop in this) {
            if (this[prop] && this[prop].isKeyFramedValue && typeof this[prop].getFrameBySecs === "function") {
                this.head[prop] = this[prop].getFrameBySecs(t);
            }
        }
        return this;
    }

    getCurrentValues() {
        const properties = {};
        for (const prop in this.head) {
            properties[prop] = this.head[prop];
        }
        return properties;
    }

    getPropertyValue(prop, time) {
        const entry = this[prop];
        if (entry && entry.isKeyFramedValue && typeof entry.getFrameBySecs === "function") {
            return entry.getFrameBySecs(Number(time) || 0);
        }
    }

    getKeyFramedValue(prop, opts = {}) {
        if (this[prop] instanceof KeyFramedValue) {
            return this[prop].compile(opts);
        }
        return this[prop];
    }
}

export { KeyFramedObject, KeyFramedValue };
export default KeyFramedValue;
