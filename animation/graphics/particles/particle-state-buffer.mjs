/**
 * CPU-side particle seed/state buffer for the WebGL particle system.
 *
 * Responsibilities:
 * - Hold typed arrays for position/velocity/state/color.
 * - Build initial distributions (random or mask-based).
 * - Maintain projection data used by the simulation/render shaders.
 *
 * @module Animation/Graphics/Particles/ParticleStateBuffer
 */

import PerspectiveProjection from "../projection/perspective-projection.mjs";
import { mat4 } from "../matrix/mat4.mjs";
import { randomBetween } from "../../../core/Util/Math.mjs";
import { lerp } from "../../../core/Util/Geometry.mjs";

const BUFFER_LAYOUT = {
    positions: 3,
    velocities: 3,
    destinations: 3,
    colors: 4,
    states: 4,
    sizes: 1,
    lifes: 1,
    transitions: 4
};

const DEFAULT_INTERLEAVED_LAYOUT = [
    "positions",
    "velocities",
    "destinations",
    "colors",
    "states",
    "sizes",
    "lifes",
    "transitions"
];

/**
 * Executes seededRandom.
 * @param {*} seed - Parameter value.
 * @returns {*} Result of seededRandom.
 */
function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/**
 * Container for particle arrays and projection helpers.
 * This does not perform GPU simulation by itself; it prepares data consumed by WebGL.
 *
 * @class ParticleStateBuffer
 */
class ParticleStateBuffer {
    config = {
        normalize: true,
        maxSpeed: 0.5
    };

    normals = {
        top: 1,
        right: -1,
        bottom: -1,
        left: 1,
        width: 2,
        height: 2
    };

    coords;
    _listeners;

    /**
     * @param {number} maxCount Maximum particle capacity.
     * @param {number} width Initial viewport width.
     * @param {number} height Initial viewport height.
     */
    constructor(maxCount, width, height, masks = []) {
        const normalizedMaxCount = Number.isFinite(maxCount) && maxCount > 0 ? Math.floor(maxCount) : 100;
        this.maxCount = normalizedMaxCount;
        this.count = 0;
        this._listeners = new Map();
        this.positions = new Float32Array(normalizedMaxCount * 3);
        this.lifes = new Float32Array(normalizedMaxCount);
        this.velocities = new Float32Array(normalizedMaxCount * 3);
        this.destinations = new Float32Array(normalizedMaxCount * 3);
        this.colors = new Float32Array(normalizedMaxCount * 4);
        this.sizes = new Float32Array(normalizedMaxCount);
        this.states = new Float32Array(normalizedMaxCount * 4);
        //StartTime, Duration, Easing, Complete
        this.transitions = new Float32Array(normalizedMaxCount * 4);

        this.masks = [];
        masks.forEach((mask) => this.loadMask(mask));

        this.resize(width, height);
    }

    /**
     * Adds an event listener.
     *
     * Supported events:
     * - `particlesadded`
     * - `particlesremoved`
     * - `countchange`
     * - `capacitychange`
     *
     * @param {string} type
     * @param {(event:object)=>void} listener
     */
    addEventListener(type, listener) {
        if (!type || typeof listener !== "function") return;
        const existing = this._listeners.get(type);
        if (existing) {
            existing.add(listener);
            return;
        }
        this._listeners.set(type, new Set([listener]));
    }

    /**
     * Removes an event listener.
     *
     * @param {string} type
     * @param {(event:object)=>void} listener
     */
    removeEventListener(type, listener) {
        const existing = this._listeners.get(type);
        if (!existing) return;
        existing.delete(listener);
        if (!existing.size) this._listeners.delete(type);
    }

    /**
     * Dispatches a custom event to listeners.
     *
     * @param {string|object} event
     * @returns {boolean}
     */
    dispatchEvent(event) {
        const payload = typeof event === "string" ? { type: event } : event;
        if (!payload || !payload.type) return false;
        const listeners = this._listeners.get(payload.type);
        if (!listeners || !listeners.size) return false;

        const nextEvent = { target: this, currentTarget: this, ...payload };
        listeners.forEach((listener) => {
            try {
                listener(nextEvent);
            } catch (_error) {
                // Keep dispatch resilient; listener errors should not break simulation.
            }
        });
        return true;
    }

    /**
     * Internal count setter that emits particle add/remove/count events.
     *
     * @param {number} nextCount
     * @param {string} [source]
     * @returns {number}
     */
    _setCount(nextCount, source = "unknown") {
        const previous = Math.max(0, Math.min(this.maxCount, Math.floor(Number(this.count) || 0)));
        const next = Math.max(0, Math.min(this.maxCount, Math.floor(Number(nextCount) || 0)));
        if (next === previous) {
            this.count = next;
            return next;
        }

        this.count = next;
        const delta = next - previous;

        if (delta > 0) {
            this.dispatchEvent({
                type: "particlesadded",
                source,
                added: delta,
                previousCount: previous,
                count: next
            });
        } else {
            this.dispatchEvent({
                type: "particlesremoved",
                source,
                removed: -delta,
                previousCount: previous,
                count: next
            });
        }

        this.dispatchEvent({
            type: "countchange",
            source,
            delta,
            previousCount: previous,
            count: next
        });

        return next;
    }

    /**
     * Resolves a layout token list to buffer metadata.
     *
     * @param {string[]} [layout]
     * @returns {{key:string,components:number}[]}
     */
    _resolveLayout(layout = DEFAULT_INTERLEAVED_LAYOUT) {
        return layout
            .map((key) => ({ key, components: BUFFER_LAYOUT[key] || 0 }))
            .filter((entry) => entry.components > 0);
    }

    /**
     * Returns a normalized copy range.
     *
     * @param {number} [start=0]
     * @param {number} [count]
     * @returns {{start:number,count:number}}
     */
    _resolveRange(start = 0, count) {
        const safeStart = Math.max(0, Math.floor(Number(start) || 0));
        const maxAvailable = Math.max(0, this.maxCount - safeStart);
        const safeCount = Math.max(0, Math.min(maxAvailable, Math.floor(Number(count ?? maxAvailable) || 0)));
        return { start: safeStart, count: safeCount };
    }

    /**
     * Resolves mask reference from explicit index or current active mask.
     *
     * @param {number} [maskIndex]
     * @returns {Float32Array|null}
     */
    _resolveMask(maskIndex) {
        const hasIndex = Number.isFinite(maskIndex) && maskIndex >= 0;
        if (hasIndex) return this.masks[Math.floor(maskIndex)] || null;
        return this.mask || null;
    }

    /**
     * Normalizes raw mask entries into a consistent structure.
     *
     * @param {Float32Array|{points:Float32Array,colors?:Float32Array,options?:object}|null} maskEntry
     * @returns {{points:Float32Array|null,colors:Float32Array|null,options:object}}
     */
    _normalizeMaskEntry(maskEntry) {
        if (!maskEntry) {
            return { points: null, colors: null, options: {} };
        }
        if (maskEntry instanceof Float32Array) {
            return { points: maskEntry, colors: null, options: {} };
        }
        return {
            points: maskEntry.points instanceof Float32Array ? maskEntry.points : null,
            colors: maskEntry.colors instanceof Float32Array ? maskEntry.colors : null,
            options: maskEntry.options && typeof maskEntry.options === "object" ? maskEntry.options : {}
        };
    }

    /**
     * Resolves a numeric option that may be expressed as fraction or percent.
     *
     * @param {*} value
     * @param {number} fallback
     * @returns {number}
     */
    _resolveFractionOrPercent(value, fallback) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallback;
        if (Math.abs(numeric) > 2) return numeric / 100;
        return numeric;
    }

    /**
     * Maps normalized mask coordinates to world coordinates at depth.
     *
     * @param {number} mx Mask x in [-1, 1].
     * @param {number} my Mask y in [-1, 1], where +1 is top.
     * @param {number} depth Negative camera-space depth.
     * @returns {{x:number,y:number,z:number}}
     */
    _maskPointToWorld(mx, my, depth) {
        let left = -1;
        let right = 1;
        let top = 1;
        let bottom = -1;

        if (this.projectionType === "perspective" && this.projection?.getBoundsAtDepth) {
            const bounds = this.projection.getBoundsAtDepth(depth);
            left = bounds.left;
            right = bounds.right;
            top = bounds.top;
            bottom = bounds.bottom;
        } else if (this.projectionType === "orthographic" && this.projection) {
            left = Number(this.projection.left ?? -1);
            right = Number(this.projection.right ?? 1);
            top = Number(this.projection.top ?? 1);
            bottom = Number(this.projection.bottom ?? -1);
        }

        const tX = (mx + 1) * 0.5;
        const tY = (my + 1) * 0.5;
        const x = left + (right - left) * tX;
        const y = bottom + (top - bottom) * tY;
        return { x, y, z: depth };
    }

    _clampUnit(value, fallback = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, Math.min(1, number));
    }

    _resolveRotation(value, fallback = 0) {
        if (typeof value === "string") {
            const text = value.trim().toLowerCase();
            const number = Number.parseFloat(text);
            if (!Number.isFinite(number)) return fallback;
            return text.endsWith("deg") ? (number * Math.PI) / 180 : number;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    _resolveRotationVector(value) {
        if (value && typeof value === "object") {
            return {
                x: this._resolveRotation(value.x, 0),
                y: this._resolveRotation(value.y, 0),
                z: this._resolveRotation(value.z, 0)
            };
        }
        if (typeof value === "string") {
            const matches = value.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?:deg|rad)?/gi);
            if (matches && matches.length >= 3) {
                return {
                    x: this._resolveRotation(matches[0], 0),
                    y: this._resolveRotation(matches[1], 0),
                    z: this._resolveRotation(matches[2], 0)
                };
            }
        }
        return { x: 0, y: 0, z: this._resolveRotation(value, 0) };
    }

    _resolveMaskAnchor(anchor, bounds) {
        if (anchor && typeof anchor === "object") {
            const x = Number(anchor.x);
            const y = Number(anchor.y);
            const z = Number(anchor.z);
            const space = String(anchor.space ?? anchor.anchorSpace ?? anchor.mode ?? "").toLowerCase();
            if (["bounds", "mask", "normalized", "relative"].includes(space)) {
                const anchorX = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
                const anchorY = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
                return {
                    x: bounds.min.x + (bounds.max.x - bounds.min.x) * ((anchorX + 1) * 0.5),
                    y: bounds.min.y + (bounds.max.y - bounds.min.y) * ((anchorY + 1) * 0.5),
                    z: Number.isFinite(z) ? z : (bounds.min.z + bounds.max.z) / 2
                };
            }
            return {
                x: Number.isFinite(x) ? x : (bounds.min.x + bounds.max.x) / 2,
                y: Number.isFinite(y) ? y : (bounds.min.y + bounds.max.y) / 2,
                z: Number.isFinite(z) ? z : (bounds.min.z + bounds.max.z) / 2
            };
        }

        return {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
            z: (bounds.min.z + bounds.max.z) / 2
        };
    }

    _transformMaskRange(start, count, options = {}) {
        if (!count) return;
        const bounds = {
            min: { x: Infinity, y: Infinity, z: Infinity },
            max: { x: -Infinity, y: -Infinity, z: -Infinity }
        };

        for (let i = start; i < start + count; i++) {
            const i3 = i * 3;
            const x = this.positions[i3];
            const y = this.positions[i3 + 1];
            const z = this.positions[i3 + 2];
            if (x < bounds.min.x) bounds.min.x = x;
            if (y < bounds.min.y) bounds.min.y = y;
            if (z < bounds.min.z) bounds.min.z = z;
            if (x > bounds.max.x) bounds.max.x = x;
            if (y > bounds.max.y) bounds.max.y = y;
            if (z > bounds.max.z) bounds.max.z = z;
        }

        const anchor = this._resolveMaskAnchor(options.anchor ?? options.maskAnchor, bounds);
        const scatter = this._clampUnit(options.scatter ?? options.maskScatter, 0);
        const scatterShape = ["sphere", "ball", "radial"].includes(
            String(options.scatterShape ?? options.maskScatterShape ?? "box").toLowerCase()
        )
            ? "sphere"
            : "box";
        const rotation = this._resolveRotationVector(options.rotation ?? options.rotate ?? options.maskRotation);
        const cosX = Math.cos(rotation.x);
        const sinX = Math.sin(rotation.x);
        const cosY = Math.cos(rotation.y);
        const sinY = Math.sin(rotation.y);
        const cosZ = Math.cos(rotation.z);
        const sinZ = Math.sin(rotation.z);
        const hasRotation = Math.abs(rotation.x) > 0 || Math.abs(rotation.y) > 0 || Math.abs(rotation.z) > 0;
        const scatterRadius =
            scatter *
            Math.max(
                bounds.max.x - bounds.min.x,
                bounds.max.y - bounds.min.y,
                bounds.max.z - bounds.min.z,
                0
            );

        this.activeMaskTransform = {
            start,
            count,
            bounds,
            anchor,
            scatter,
            scatterShape,
            scatterRadius,
            rotation
        };

        if (!scatterRadius && !hasRotation) return;

        for (let i = start; i < start + count; i++) {
            const i3 = i * 3;
            const i4 = i * 4;
            let x = this.positions[i3] - anchor.x;
            let y = this.positions[i3 + 1] - anchor.y;
            let z = this.positions[i3 + 2] - anchor.z;

            if (hasRotation) {
                let rx = x;
                let ry = y * cosX - z * sinX;
                let rz = y * sinX + z * cosX;

                const yx = rx * cosY + rz * sinY;
                const yz = -rx * sinY + rz * cosY;
                rx = yx;
                rz = yz;

                const zx = rx * cosZ - ry * sinZ;
                const zy = rx * sinZ + ry * cosZ;
                rx = zx;
                ry = zy;

                x = rx;
                y = ry;
                z = rz;
            }

            let nx = anchor.x + x;
            let ny = anchor.y + y;
            let nz = anchor.z + z;

            if (scatterRadius) {
                const rng = seededRandom((i + 1) * 2654435761);
                if (scatterShape === "sphere") {
                    const theta = rng() * Math.PI * 2;
                    const u = rng() * 2 - 1;
                    const r = Math.cbrt(rng()) * scatterRadius;
                    const radial = Math.sqrt(Math.max(0, 1 - u * u));
                    nx += Math.cos(theta) * radial * r;
                    ny += Math.sin(theta) * radial * r;
                    nz += u * r;
                } else {
                    nx += (rng() * 2 - 1) * scatterRadius;
                    ny += (rng() * 2 - 1) * scatterRadius;
                    nz += (rng() * 2 - 1) * scatterRadius;
                }
            }

            this.positions[i3] = nx;
            this.positions[i3 + 1] = ny;
            this.positions[i3 + 2] = nz;
            this.destinations[i3] = nx;
            this.destinations[i3 + 1] = ny;
            this.destinations[i3 + 2] = nz;
            this.states[i4] = nz;
            this.states[i4 + 2] = nx;
            this.states[i4 + 3] = ny;
        }
    }

    _maskPointIndex(offset, count, maskCount) {
        if (maskCount <= 0 || count <= 0) return 0;
        if (count >= maskCount) return offset % maskCount;
        return Math.min(maskCount - 1, Math.floor((offset * maskCount) / count));
    }

    /**
     * Configures projection used for spawn bounds and render matrix.
     *
     * @param {"perspective"|"orthographic"} projectionType
     * @param {object} [options={}]
     * @returns {number[]} Projection matrix.
     */
    setProjection(projectionType, options = {}) {
        const currentType = projectionType || this.projectionType || "perspective";
        const mergedOptions = { ...(this.projectionOptions || {}), ...(options || {}) };
        const width = Number.isFinite(mergedOptions.width) ? mergedOptions.width : this.width;
        const height = Number.isFinite(mergedOptions.height) ? mergedOptions.height : this.height;
        const near = Number.isFinite(mergedOptions.near) ? mergedOptions.near : 0.01;
        const far = Number.isFinite(mergedOptions.far) ? mergedOptions.far : 20;
        let projectionMatrix;

        this.projectionType = currentType;
        this.projectionOptions = { ...mergedOptions, width, height, near, far };

        switch (currentType) {
            case "perspective":
                const fov = Number.isFinite(mergedOptions.fov) ? mergedOptions.fov : 45;
                this.projectionOptions.fov = fov;
                this.projection = new PerspectiveProjection(fov, width / height, near, far);
                break;

            case "orthographic":
                const { left, right, bottom, top } = mergedOptions;
                projectionMatrix = mat4.create();
                this.projection = {
                    type: "orthographic",
                    width,
                    height,
                    near,
                    far,
                    left,
                    right,
                    bottom,
                    top,
                    matrix: projectionMatrix
                };
                mat4.ortho(
                    projectionMatrix,
                    left || -width / 2, // left plane
                    right || width / 2, // right plane
                    bottom || -height / 2, // bottom plane
                    top || height / 2, // top plane
                    near, // near clipping plane
                    far // far clipping plane
                );
                break;

            default:
                throw new Error('Unknown projection type. Use "perspective" or "orthographic".');
        }

        this.projection.type = currentType;
        this.projection.options = { ...this.projectionOptions };

        return this.projection.matrix;
    }

    /**
     * Resizes buffer capacity and optionally preserves existing data.
     *
     * @param {number} nextMax
     * @param {{preserve?:boolean}} [options={}]
     * @returns {number} Applied max capacity.
     */
    resizeCapacity(nextMax, options = {}) {
        const { preserve = true } = options;
        const target = Math.max(1, Math.floor(Number(nextMax) || this.maxCount || 1));
        if (target === this.maxCount) return target;
        const previousMax = this.maxCount;

        const next = {};
        for (const key in BUFFER_LAYOUT) {
            const components = BUFFER_LAYOUT[key];
            next[key] = new Float32Array(target * components);
            if (preserve && this[key]) {
                const copyLength = Math.min(this[key].length, next[key].length);
                next[key].set(this[key].subarray(0, copyLength));
            }
        }

        this.maxCount = target;
        for (const key in BUFFER_LAYOUT) {
            this[key] = next[key];
        }
        this._setCount(Math.min(this.count || 0, this.maxCount), "resizeCapacity");
        this.dispatchEvent({
            type: "capacitychange",
            previousMax,
            maxCount: this.maxCount
        });
        return this.maxCount;
    }

    /**
     * Clears all buffer arrays.
     *
     * @param {{resetState?:boolean}} [options={}]
     * @returns {ParticleStateBuffer}
     */
    clear(options = {}) {
        const { resetState = true } = options;
        for (const key in BUFFER_LAYOUT) {
            this[key].fill(0);
        }
        if (resetState) this._setCount(0, "clear");
        return this;
    }

    /**
     * Captures a full copy of current data and metadata.
     *
     * @returns {object}
     */
    snapshot() {
        const buffers = {};
        for (const key in BUFFER_LAYOUT) {
            buffers[key] = this[key].slice();
        }
        return {
            maxCount: this.maxCount,
            count: this.count || 0,
            width: this.width,
            height: this.height,
            projectionType: this.projectionType,
            projectionOptions: this.projectionOptions ? { ...this.projectionOptions } : null,
            spawnVolume: this.spawnVolume ? { ...this.spawnVolume, params: { ...(this.spawnVolume.params || {}) } } : null,
            stateDefaults: this.stateDefaults ? { ...this.stateDefaults } : null,
            buffers
        };
    }

    /**
     * Restores buffer and metadata from a snapshot.
     *
     * @param {object} snapshot
     * @returns {ParticleStateBuffer}
     */
    restore(snapshot) {
        if (!snapshot || typeof snapshot !== "object") return this;
        this.resizeCapacity(snapshot.maxCount, { preserve: false });
        this.resize(snapshot.width, snapshot.height);

        if (snapshot.projectionType) {
            this.setProjection(snapshot.projectionType, snapshot.projectionOptions || {});
        }

        this.spawnVolume = snapshot.spawnVolume ? { ...snapshot.spawnVolume } : this.spawnVolume;
        this.stateDefaults = snapshot.stateDefaults ? { ...snapshot.stateDefaults } : this.stateDefaults;

        for (const key in BUFFER_LAYOUT) {
            if (!(snapshot.buffers && snapshot.buffers[key])) continue;
            const src = snapshot.buffers[key];
            const copyLength = Math.min(src.length, this[key].length);
            this[key].set(src.subarray(0, copyLength));
        }

        this._setCount(Math.max(0, Math.min(this.maxCount, Math.floor(snapshot.count || 0))), "restore");
        return this;
    }

    /**
     * Creates a deep copy of this state buffer.
     *
     * @returns {ParticleStateBuffer}
     */
    clone() {
        const copy = new ParticleStateBuffer(this.maxCount, this.width, this.height);
        copy.restore(this.snapshot());
        return copy;
    }

    /**
     * Validates current buffer integrity.
     *
     * @returns {{valid:boolean,errors:string[]}}
     */
    validate() {
        const errors = [];
        if (!Number.isFinite(this.maxCount) || this.maxCount < 1) {
            errors.push("maxCount must be a positive finite number");
        }
        if (!Number.isFinite(this.count || 0) || (this.count || 0) < 0 || (this.count || 0) > this.maxCount) {
            errors.push("count must be between 0 and maxCount");
        }

        for (const key in BUFFER_LAYOUT) {
            const expected = this.maxCount * BUFFER_LAYOUT[key];
            if (!(this[key] instanceof Float32Array)) {
                errors.push(`${key} must be Float32Array`);
                continue;
            }
            if (this[key].length !== expected) {
                errors.push(`${key} length mismatch: expected ${expected}, got ${this[key].length}`);
            }
        }

        const active = Math.max(0, Math.min(this.maxCount, this.count || 0));
        for (let i = 0; i < active * 3; i++) {
            if (!Number.isFinite(this.positions[i])) {
                errors.push(`positions contains non-finite value at ${i}`);
                break;
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Merges particles from another state buffer into this one.
     *
     * @param {ParticleStateBuffer} other
     * @param {{
     *   mode?: "append"|"overwrite",
     *   startIndex?: number,
     *   sourceStart?: number,
     *   count?: number,
     *   preserveProjection?: boolean
     * }} [options={}]
     * @returns {{start:number,count:number,total:number}}
     */
    mergeFrom(other, options = {}) {
        if (!other) return { start: 0, count: 0, total: this.count || 0 };

        const {
            mode = "append",
            startIndex,
            sourceStart = 0,
            count,
            preserveProjection = true
        } = options;

        const sourceCount = Math.max(0, Math.min(other.maxCount, other.count || other.maxCount || 0));
        const srcStart = Math.max(0, Math.floor(Number(sourceStart) || 0));
        const maxCopy = Math.max(0, sourceCount - srcStart);
        const copyCount = Math.max(0, Math.min(maxCopy, Math.floor(Number(count ?? maxCopy) || 0)));

        const appendStart = Math.max(0, this.count || 0);
        const targetStart = Math.max(0, Math.floor(Number(startIndex ?? (mode === "overwrite" ? 0 : appendStart)) || 0));
        const required = targetStart + copyCount;
        if (required > this.maxCount) this.resizeCapacity(required, { preserve: true });

        for (const key in BUFFER_LAYOUT) {
            const components = BUFFER_LAYOUT[key];
            const srcOffset = srcStart * components;
            const dstOffset = targetStart * components;
            const length = copyCount * components;
            this[key].set(other[key].subarray(srcOffset, srcOffset + length), dstOffset);
        }

        this._setCount(Math.max(this.count || 0, targetStart + copyCount), "mergeFrom");

        if (!preserveProjection && other.projectionType) {
            this.setProjection(other.projectionType, other.projectionOptions || {});
        }

        return { start: targetStart, count: copyCount, total: this.count };
    }

    /**
     * Creates a new combined state buffer from many buffers.
     *
     * @param {ParticleStateBuffer[]} buffers
     * @param {{maxCount?:number,preserveProjection?:boolean}} [options={}]
     * @returns {ParticleStateBuffer}
     */
    static combine(buffers, options = {}) {
        const valid = (buffers || []).filter(Boolean);
        if (!valid.length) return new ParticleStateBuffer(1, 1, 1);

        const first = valid[0];
        const totalCount = valid.reduce((sum, buffer) => sum + Math.max(0, buffer.count || 0), 0);
        const maxCount = Math.max(1, Math.floor(Number(options.maxCount ?? totalCount) || 1));
        const combined = new ParticleStateBuffer(maxCount, first.width || 1, first.height || 1);

        if (first.projectionType) {
            combined.setProjection(first.projectionType, first.projectionOptions || {});
        }

        valid.forEach((buffer) => {
            combined.mergeFrom(buffer, {
                mode: "append",
                preserveProjection: options.preserveProjection !== false
            });
        });

        return combined;
    }

    /**
     * Loads an image and converts non-transparent pixels into normalized mask points.
     *
     * @param {string} source Image URL.
     * @param {{preserveColor?:boolean,alphaThreshold?:number,contentBox?:object,position?:object,particleGap?:number,gap?:number}|Function} [options={}]
     * @returns {Promise<number>} Mask index in `this.masks`.
     */
    loadMask(source, options = {}) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const image = new Image();
        image.crossOrigin = "anonymous";
        return new Promise((resolve, reject) => {
            image.onload = () => {
                if (!ctx) {
                    reject(new Error("Mask canvas context unavailable."));
                    return;
                }
                if (typeof options === "function") {
                    options = options(image) || {};
                }
                if (options && typeof options === "object" && !options.position) {
                    const pixelX = Number(options.x);
                    const pixelY = Number(options.y);
                    if (Number.isFinite(pixelX) || Number.isFinite(pixelY)) {
                        const stageWidth = Math.max(1, Number(this.width) || image.width);
                        const stageHeight = Math.max(1, Number(this.height) || image.height);
                        const x = Number.isFinite(pixelX) ? pixelX : 0;
                        const y = Number.isFinite(pixelY) ? pixelY : 0;
                        options = {
                            ...options,
                            contentBox: {
                                width: image.width / stageWidth,
                                height: image.height / stageHeight,
                                ...(options.contentBox || {})
                            },
                            position: {
                                x: ((x + image.width / 2) / stageWidth) * 2 - 1,
                                y: 1 - ((y + image.height / 2) / stageHeight) * 2
                            }
                        };
                    }
                }

                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                let imageData;
                try {
                    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                } catch (error) {
                    reject(new Error(`Failed to read mask image pixels: ${error.message}`));
                    return;
                }
                const pixels = imageData.data; // RGBA array
                const mapped = [];
                const preserveColor = options.preserveColor === true;
                const alphaThreshold = Math.max(0, Math.min(255, Number(options.alphaThreshold) || 1));
                const requestedGap = Number(options.particleGap ?? options.gap);
                const particleGap = Number.isFinite(requestedGap) ? Math.max(0, Math.floor(requestedGap)) : 0;
                const sampleStep = particleGap + 1;
                // Iterate over every pixel
                for (let y = 0; y < canvas.height; y += sampleStep) {
                    for (let x = 0; x < canvas.width; x += sampleStep) {
                        const index = (y * canvas.width + x) * 4; // Each pixel has 4 values (R, G, B, A)
                        // Check if the pixel is non-transparent (A > 0)
                        const alpha = pixels[index + 3];
                        if (alpha >= alphaThreshold) {
                            if (preserveColor) {
                                mapped.push({
                                    x,
                                    y,
                                    r: pixels[index] / 255,
                                    g: pixels[index + 1] / 255,
                                    b: pixels[index + 2] / 255,
                                    a: alpha / 255
                                });
                            } else {
                                mapped.push({ x, y });
                            }
                        }
                    }
                }
                const points = new Float32Array(mapped.length * 2);
                const colors = preserveColor ? new Float32Array(mapped.length * 4) : null;
                const widthDenom = Math.max(1, canvas.width - 1);
                const heightDenom = Math.max(1, canvas.height - 1);
                const contentBox = options.contentBox && typeof options.contentBox === "object" ? options.contentBox : {};
                const position = options.position && typeof options.position === "object" ? options.position : {};
                const scaleX = this._resolveFractionOrPercent(contentBox.width, 1);
                const scaleY = this._resolveFractionOrPercent(contentBox.height, 1);
                const offsetX = this._resolveFractionOrPercent(position.x, 0);
                const offsetY = this._resolveFractionOrPercent(position.y, 0);
                for (let i = 0; i < mapped.length; i++) {
                    const i2 = i * 2;
                    const nx = mapped[i].x / widthDenom;
                    const ny = mapped[i].y / heightDenom;
                    // Normalize to clip-like range where +Y is top.
                    points[i2] = (nx * 2 - 1) * scaleX + offsetX;
                    points[i2 + 1] = (1 - ny * 2) * scaleY + offsetY;

                    if (colors) {
                        const i4 = i * 4;
                        colors[i4] = mapped[i].r;
                        colors[i4 + 1] = mapped[i].g;
                        colors[i4 + 2] = mapped[i].b;
                        colors[i4 + 3] = mapped[i].a;
                    }
                }

                this.masks.push({
                    points,
                    colors,
                    options: {
                        contentBox: {
                            width: scaleX,
                            height: scaleY
                        },
                        preserveColor,
                        position: {
                            x: offsetX,
                            y: offsetY,
                            z: Number(position.z)
                        },
                        particleGap,
                        scatter: this._clampUnit(options.scatter, 0),
                        scatterShape: options.scatterShape ?? options.maskScatterShape ?? "box",
                        anchor: options.anchor || options.maskAnchor || null,
                        rotation: options.rotation ?? options.rotate ?? options.maskRotation ?? 0,
                        maskMode: options.maskMode || options.mode || "replace",
                        transition: options.transition,
                        transitionDuration: options.transitionDuration ?? options.duration,
                        transitionSpread: options.transitionSpread ?? options.randomizeTransition
                    }
                });
                resolve(this.masks.length - 1);
            };
            image.onerror = () => reject(new Error(`Failed to load mask image: ${source}`));
            image.src = source;
        });
    }

    /**
     * Sets active mask and rebuilds destination map from that mask.
     *
     * @param {number} maskIndex
     * @returns {Float32Array}
     */
    setMask(maskIndex) {
        this.mask = this.masks[maskIndex];
        return this.getDestinations();
    }

    /**
     * Builds destination positions either from a mask or random normalized spread.
     *
     * @param {number} [maskIndex]
     * @returns {Float32Array}
     */
    getDestinations(maskIndex) {
        const maskEntry = this._normalizeMaskEntry(this._resolveMask(maskIndex));
        const maskPoints = maskEntry.points;
        const maskCount = maskPoints ? Math.floor(maskPoints.length / 2) : 0;
        const count = Math.min(this.maxCount, maskPoints ? maskCount : this.maxCount);
        const near = Number(this.projection?.near) || 0.01;
        const far = Number(this.projection?.far) || 20;
        const optionDepth = Number(maskEntry.options?.position?.z);
        const defaultDepth = Number.isFinite(optionDepth) ? optionDepth : -2;
        const minDepth = -far + 0.0001;
        const maxDepth = -near - 0.0001;
        const maskDepth = Math.min(maxDepth, Math.max(minDepth, defaultDepth));
        for (let i = 0; i < this.maxCount; i++) {
            const i3 = i * 3;
            if (maskPoints && i < count) {
                const pi = this._maskPointIndex(i, count, maskCount);
                const mx = maskPoints[pi * 2];
                const my = maskPoints[pi * 2 + 1];
                const mapped = this._maskPointToWorld(mx, my, maskDepth);
                this.destinations[i3] = mapped.x;
                this.destinations[i3 + 1] = mapped.y;
                this.destinations[i3 + 2] = mapped.z;
            } else {
                this.destinations[i3] = randomBetween(-1, 1);
                this.destinations[i3 + 1] = randomBetween(-1, 1);
                this.destinations[i3 + 2] = 0;
            }
        }

        return this.destinations;
    }

    /**
     * Seeds initial particle positions/states.
     *
     * - If mask is present: particles start on mask points.
     * - Otherwise: particles start at random visible depths/positions.
     *
     * @param {number} [maskIndex]
     * @param {object} [options={}]
     */
    build(maskIndex, options = {}) {
        const maskEntry = this._normalizeMaskEntry(this._resolveMask(maskIndex));
        const maskPoints = maskEntry.points;
        const maskColors = maskEntry.colors;
        const keepMaskVelocity = options.keepMaskVelocity === true;
        const stateDefaults = {
            state: 0,
            age: 0,
            random: null,
            size: 1,
            life: 0,
            color: [1, 1, 1, 1],
            ...(this.stateDefaults || {}),
            ...(options.stateDefaults || {})
        };
        const spawnVolume = options.spawnVolume || this.spawnVolume || null;
        const transformOptions = { ...(maskEntry.options || {}), ...(options || {}) };
        const maskMode = String(transformOptions.maskMode ?? transformOptions.mode ?? "replace").toLowerCase();
        const explicitStart = Number(transformOptions.startIndex);
        const appendMask =
            maskPoints && !Number.isFinite(explicitStart) && (maskMode === "append" || transformOptions.append === true);
        const startIndex = Number.isFinite(explicitStart)
            ? Math.max(0, Math.min(this.maxCount, Math.floor(explicitStart)))
            : appendMask
              ? Math.max(0, Math.min(this.maxCount, this.count || 0))
              : 0;
        const capacity = Math.max(0, this.maxCount - startIndex);
        const maskCount = maskPoints ? Math.floor(maskPoints.length / 2) : 0;
        const requestedCount = Number(transformOptions.count);
        const requestedApplyGap = Number(options.particleGap ?? options.gap);
        const applyGap = Number.isFinite(requestedApplyGap) ? Math.max(0, Math.floor(requestedApplyGap)) : 0;
        const gapStride = Math.max(1, Math.pow(applyGap + 1, 2));
        const availableCount = maskPoints ? maskCount : this.maxCount;
        const count = Math.min(
            capacity,
            Number.isFinite(requestedCount) ? Math.max(0, Math.floor(requestedCount)) : availableCount
        );
        const near = Number(this.projection?.near) || 0.01;
        const far = Number(this.projection?.far) || 20;
        const requestedMaskDepth = Number(options.maskDepth ?? maskEntry.options?.position?.z);
        const defaultMaskDepth = Number.isFinite(requestedMaskDepth) ? requestedMaskDepth : -2;
        const minDepth = -far + 0.0001;
        const maxDepth = -near - 0.0001;
        const maskDepth = Math.min(maxDepth, Math.max(minDepth, defaultMaskDepth));
        const preserveMaskColor =
            options.preserveMaskColor === true ||
            (options.preserveMaskColor !== false && maskEntry.options?.preserveColor === true);
        for (let offset = 0; offset < count; offset++) {
            const i = startIndex + offset;
            const i3 = i * 3;
            const i4 = i * 4;
            let maskColor = null;
            if (maskPoints) {
                const pi = this._maskPointIndex(offset, count, maskCount);
                const mx = maskPoints[pi * 2];
                const my = maskPoints[pi * 2 + 1];
                const mapped = this._maskPointToWorld(mx, my, maskDepth);
                this.positions[i3] = mapped.x;
                this.positions[i3 + 1] = mapped.y;
                this.positions[i3 + 2] = mapped.z;
                if (preserveMaskColor && maskColors) {
                    const m4 = pi * 4;
                    maskColor = [maskColors[m4], maskColors[m4 + 1], maskColors[m4 + 2], maskColors[m4 + 3]];
                }
            } else {
                if (spawnVolume && spawnVolume.type) {
                    const params = spawnVolume.params || {};
                    const cx = Number(params.x) || 0;
                    const cy = Number(params.y) || 0;
                    const cz = Number(params.z) || 0;

                    if (spawnVolume.type === "box") {
                        const minX = Number(params.minX ?? -1);
                        const maxX = Number(params.maxX ?? 1);
                        const minY = Number(params.minY ?? -1);
                        const maxY = Number(params.maxY ?? 1);
                        const minZ = Number(params.minZ ?? -1);
                        const maxZ = Number(params.maxZ ?? 1);
                        this.positions[i3] = randomBetween(minX, maxX);
                        this.positions[i3 + 1] = randomBetween(minY, maxY);
                        this.positions[i3 + 2] = randomBetween(minZ, maxZ);
                    } else if (spawnVolume.type === "sphere") {
                        const radius = Math.max(0.0001, Number(params.radius) || 1);
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(2 * Math.random() - 1);
                        const r = radius * Math.cbrt(Math.random());
                        this.positions[i3] = cx + r * Math.sin(phi) * Math.cos(theta);
                        this.positions[i3 + 1] = cy + r * Math.sin(phi) * Math.sin(theta);
                        this.positions[i3 + 2] = cz + r * Math.cos(phi);
                    } else if (spawnVolume.type === "ring") {
                        const radius = Math.max(0.0001, Number(params.radius) || 1);
                        const thickness = Math.max(0, Number(params.thickness) || 0.05);
                        const angle = Math.random() * Math.PI * 2;
                        const radial = radius + randomBetween(-thickness, thickness);
                        this.positions[i3] = cx + Math.cos(angle) * radial;
                        this.positions[i3 + 1] = cy + Math.sin(angle) * radial;
                        this.positions[i3 + 2] = cz + randomBetween(-thickness, thickness);
                    }
                } else {
                    // Get perspective depth position and in-frustum XY range.
                    const { near, far } = this.projection;
                    const zPosition = randomBetween(-near, -far);
                    const { left, right, top, bottom } = this.projection.getBoundsAtDepth(zPosition);
                    this.positions[i3] = randomBetween(left, right);
                    this.positions[i3 + 1] = randomBetween(top, bottom);
                    this.positions[i3 + 2] = zPosition;
                }
            }

            // Reserve state channels for home-position encoding used by GPU simulation.
            // state.x = home.z, state.y = age, state.z = home.x, state.w = home.y.
            this.states[i4] = this.positions[i3 + 2];
            this.states[i4 + 1] = Number(stateDefaults.age) || 0;
            this.states[i4 + 2] = this.positions[i3];
            this.states[i4 + 3] = this.positions[i3 + 1];

            if (maskPoints && !keepMaskVelocity) {
                // Keep mask shapes stable unless explicitly opting into inherited/random velocity.
                this.velocities[i3] = 0;
                this.velocities[i3 + 1] = 0;
                this.velocities[i3 + 2] = 0;
            } else {
                this.velocities[i3] = randomBetween(-this.config.maxSpeed, this.config.maxSpeed);
                this.velocities[i3 + 1] = randomBetween(-this.config.maxSpeed, this.config.maxSpeed);
                this.velocities[i3 + 2] = 0;
            }
            // "Home" for orbit eligibility/return behavior is the spawn position.
            this.destinations[i3] = this.positions[i3];
            this.destinations[i3 + 1] = this.positions[i3 + 1];
            this.destinations[i3 + 2] = this.positions[i3 + 2];
            this.lifes[i] = Number(stateDefaults.life) || 0;
            this.colors[i4] = Number(stateDefaults.color?.[0] ?? 1);
            this.colors[i4 + 1] = Number(stateDefaults.color?.[1] ?? 1);
            this.colors[i4 + 2] = Number(stateDefaults.color?.[2] ?? 1);
            this.colors[i4 + 3] = Number(stateDefaults.color?.[3] ?? 1);
            if (maskColor) {
                this.colors[i4] = maskColor[0];
                this.colors[i4 + 1] = maskColor[1];
                this.colors[i4 + 2] = maskColor[2];
                this.colors[i4 + 3] = maskColor[3];
            }
            if (maskPoints && applyGap > 0 && offset % gapStride !== 0) {
                this.colors[i4 + 3] = 0;
            }
            this.sizes[i] = Number(stateDefaults.size) || 1;
        }

        if (maskPoints) {
            this._transformMaskRange(startIndex, count, transformOptions);
        }

        if (maskPoints) {
            this.activeMaskRange = {
                maskIndex: Number.isFinite(maskIndex) ? Math.floor(maskIndex) : null,
                start: startIndex,
                count,
                mode: appendMask ? "append" : "replace"
            };
        }

        const nextCount = appendMask || transformOptions.preserveParticleCount === true
            ? Math.max(this.count || 0, startIndex + count)
            : count;
        this._setCount(nextCount, "build");
    }

    /**
     * Sets default seeded state values used by `build`.
     *
     * @param {object} defaults
     * @returns {ParticleStateBuffer}
     */
    setStateDefaults(defaults = {}) {
        this.stateDefaults = { ...(this.stateDefaults || {}), ...defaults };
        return this;
    }

    /**
     * Sets spawn volume mode for non-mask initialization.
     *
     * Supported types: `box`, `sphere`, `ring`.
     *
     * @param {"box"|"sphere"|"ring"} type
     * @param {object} [params={}]
     * @returns {ParticleStateBuffer}
     */
    setSpawnVolume(type, params = {}) {
        this.spawnVolume = { type, params: { ...params } };
        return this;
    }

    /**
     * Applies a position transform for a range.
     *
     * @param {number[]|function} matrixOrFn 4x4 matrix or mapper callback.
     * @param {{start?:number,count?:number,includeDestinations?:boolean}} [options={}]
     * @returns {ParticleStateBuffer}
     */
    applyTransform(matrixOrFn, options = {}) {
        const { start = 0, count = this.count || this.maxCount, includeDestinations = false } = options;
        const range = this._resolveRange(start, count);
        const isFn = typeof matrixOrFn === "function";
        const matrix = Array.isArray(matrixOrFn) || matrixOrFn instanceof Float32Array ? matrixOrFn : null;
        if (!isFn && (!matrix || matrix.length < 16)) return this;

        for (let i = range.start; i < range.start + range.count; i++) {
            const i3 = i * 3;
            const x = this.positions[i3];
            const y = this.positions[i3 + 1];
            const z = this.positions[i3 + 2];

            let nx = x;
            let ny = y;
            let nz = z;

            if (isFn) {
                const mapped = matrixOrFn(x, y, z, i);
                if (Array.isArray(mapped)) {
                    nx = Number(mapped[0] ?? x);
                    ny = Number(mapped[1] ?? y);
                    nz = Number(mapped[2] ?? z);
                } else if (mapped && typeof mapped === "object") {
                    nx = Number(mapped.x ?? x);
                    ny = Number(mapped.y ?? y);
                    nz = Number(mapped.z ?? z);
                }
            } else {
                nx = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
                ny = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
                nz = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
            }

            this.positions[i3] = nx;
            this.positions[i3 + 1] = ny;
            this.positions[i3 + 2] = nz;

            if (includeDestinations) {
                this.destinations[i3] = nx;
                this.destinations[i3 + 1] = ny;
                this.destinations[i3 + 2] = nz;
            }
        }

        return this;
    }

    /**
     * Re-seeds particles with deterministic randomness when a seed is provided.
     *
     * @param {number} [seed]
     * @returns {ParticleStateBuffer}
     */
    randomize(seed) {
        const rng = Number.isFinite(seed) ? seededRandom(Math.floor(seed)) : Math.random;
        const count = Math.max(0, Math.min(this.maxCount, this.count || this.maxCount));
        const maxSpeed = Number(this.config.maxSpeed) || 0;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const i4 = i * 4;
            const z = this.positions[i3 + 2];
            let bounds = null;

            if (this.projectionType === "perspective" && this.projection?.getBoundsAtDepth) {
                try {
                    bounds = this.projection.getBoundsAtDepth(z || -1);
                } catch (_error) {
                    bounds = null;
                }
            }

            if (bounds) {
                this.positions[i3] = bounds.left + (bounds.right - bounds.left) * rng();
                this.positions[i3 + 1] = bounds.bottom + (bounds.top - bounds.bottom) * rng();
            } else {
                this.positions[i3] = -1 + 2 * rng();
                this.positions[i3 + 1] = -1 + 2 * rng();
                this.positions[i3 + 2] = -1 + 2 * rng();
            }

            this.velocities[i3] = -maxSpeed + 2 * maxSpeed * rng();
            this.velocities[i3 + 1] = -maxSpeed + 2 * maxSpeed * rng();
            this.velocities[i3 + 2] = -maxSpeed + 2 * maxSpeed * rng();
            this.destinations[i3] = this.positions[i3];
            this.destinations[i3 + 1] = this.positions[i3 + 1];
            this.destinations[i3 + 2] = this.positions[i3 + 2];
            this.states[i4] = this.positions[i3 + 2];
            this.states[i4 + 2] = this.positions[i3];
            this.states[i4 + 3] = this.positions[i3 + 1];
        }

        return this;
    }

    /**
     * Returns bounds for current active positions.
     *
     * @returns {{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}|null}
     */
    getBounds() {
        const count = Math.max(0, Math.min(this.maxCount, this.count || 0));
        if (!count) return null;

        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const x = this.positions[i3];
            const y = this.positions[i3 + 1];
            const z = this.positions[i3 + 2];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
        }

        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }

    /**
     * Keeps particles where predicate returns true and compacts arrays in-place.
     *
     * @param {(particle:object,index:number)=>boolean} predicate
     * @returns {number} New count.
     */
    prune(predicate) {
        if (typeof predicate !== "function") return this.count || 0;
        const originalCount = Math.max(0, Math.min(this.maxCount, this.count || 0));
        let writeIndex = 0;

        for (let readIndex = 0; readIndex < originalCount; readIndex++) {
            const particle = this.get(readIndex);
            if (!predicate(particle, readIndex)) continue;

            if (writeIndex !== readIndex) {
                for (const key in BUFFER_LAYOUT) {
                    const components = BUFFER_LAYOUT[key];
                    const srcOffset = readIndex * components;
                    const dstOffset = writeIndex * components;
                    for (let c = 0; c < components; c++) {
                        this[key][dstOffset + c] = this[key][srcOffset + c];
                    }
                }
            }

            writeIndex++;
        }

        this._setCount(writeIndex, "prune");
        return this.count;
    }

    /**
     * Builds positions from a selected mask index.
     *
     * @param {number} maskIndex
     * @param {object} [options={}]
     * @returns {number} New count.
     */
    fillFromMask(maskIndex, options = {}) {
        this.setMask(maskIndex);
        const buildOptions = { ...options };
        if (buildOptions.reuseMaskRange === true && this.activeMaskRange?.maskIndex === Math.floor(maskIndex)) {
            const hasDynamicCount =
                Number.isFinite(Number(options.count)) || Number.isFinite(Number(options.particleGap ?? options.gap));
            buildOptions.startIndex = this.activeMaskRange.start;
            if (!hasDynamicCount) {
                buildOptions.count = this.activeMaskRange.count;
                buildOptions.preserveParticleCount = true;
            }
            buildOptions.maskMode = "replace";
        }
        this.build(maskIndex, buildOptions);
        return this.count;
    }

    /**
     * Packs selected buffers into one interleaved float array.
     *
     * @param {{layout?:string[],count?:number}} [options={}]
     * @returns {{data:Float32Array,stride:number,layout:{key:string,components:number}[],count:number}}
     */
    toInterleaved(options = {}) {
        const layout = this._resolveLayout(options.layout || DEFAULT_INTERLEAVED_LAYOUT);
        const count = Math.max(0, Math.min(this.maxCount, Math.floor(Number(options.count ?? this.count ?? this.maxCount) || 0)));
        const stride = layout.reduce((sum, entry) => sum + entry.components, 0);
        const data = new Float32Array(count * stride);

        for (let i = 0; i < count; i++) {
            let cursor = i * stride;
            for (let l = 0; l < layout.length; l++) {
                const { key, components } = layout[l];
                const srcOffset = i * components;
                for (let c = 0; c < components; c++) {
                    data[cursor++] = this[key][srcOffset + c];
                }
            }
        }

        return { data, stride, layout, count };
    }

    /**
     * Unpacks interleaved data into this buffer.
     *
     * @param {Float32Array|{data:Float32Array,layout?:string[]|object[],stride?:number,count?:number}} interleaved
     * @param {{layout?:string[],stride?:number,count?:number,startIndex?:number}} [options={}]
     * @returns {number} Number of particles written.
     */
    fromInterleaved(interleaved, options = {}) {
        const payload = interleaved?.data ? interleaved : { data: interleaved };
        const rawData = payload.data instanceof Float32Array ? payload.data : new Float32Array(payload.data || []);
        const layoutInput = options.layout || payload.layout || DEFAULT_INTERLEAVED_LAYOUT;
        const layout = Array.isArray(layoutInput)
            ? layoutInput.map((entry) =>
                  typeof entry === "string" ? { key: entry, components: BUFFER_LAYOUT[entry] || 0 } : entry
              )
            : this._resolveLayout(DEFAULT_INTERLEAVED_LAYOUT);
        const normalizedLayout = layout.filter((entry) => entry && entry.key && entry.components > 0);
        const stride = Math.max(1, Math.floor(Number(options.stride ?? payload.stride) || normalizedLayout.reduce((sum, e) => sum + e.components, 0)));
        const inferredCount = Math.floor(rawData.length / stride);
        const count = Math.max(0, Math.floor(Number(options.count ?? payload.count ?? inferredCount) || 0));
        const startIndex = Math.max(0, Math.floor(Number(options.startIndex) || 0));

        const required = startIndex + count;
        if (required > this.maxCount) this.resizeCapacity(required, { preserve: true });

        for (let i = 0; i < count; i++) {
            let cursor = i * stride;
            const dstIndex = startIndex + i;
            for (let l = 0; l < normalizedLayout.length; l++) {
                const { key, components } = normalizedLayout[l];
                const dstOffset = dstIndex * components;
                for (let c = 0; c < components; c++) {
                    this[key][dstOffset + c] = rawData[cursor++];
                }
            }
        }

        this._setCount(Math.max(this.count || 0, required), "fromInterleaved");
        return count;
    }

    /**
     * Legacy CPU update path (not used by active transform-feedback flow).
     *
     * @param {number} delta
     */
    update(delta) {
        for (let i = 0; i < this.maxCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;
            const i2 = i * 2;
            this.velocities[i3] = lerp(this.velocities[i3], this.destinations[i3], delta);
            this.velocities[i3 + 1] = lerp(this.velocities[i3 + 1], this.destinations[i3 + 1], delta);
            this.velocities[i3 + 2] = lerp(this.velocities[i3 + 2], this.destinations[i3 + 2], delta);

            this.positions[i3] += this.velocities[i3] * delta;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

            this.lifes[i] += delta;
        }
    }

    /**
     * Updates internal dimensions and projection when viewport changes.
     *
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this.width = Math.max(1, Number(width) || this.width || 1);
        this.height = Math.max(1, Number(height) || this.height || 1);

        width = this.width;
        height = this.height;
        this.aspectRatio = width / height;

        if (this.aspectRatio > 1) {
            this.normals.left = -this.aspectRatio;
            this.normals.right = this.aspectRatio;
            this.normals.width = 2 * this.aspectRatio;
        } else {
            this.normals.top = this.aspectRatio;
            this.normals.bottom = -this.aspectRatio;
            this.normals.height = 2 * this.aspectRatio;
        }
        if (this.projectionType) {
            this.setProjection(this.projectionType, { ...this.projectionOptions, width, height });
        }
    }

    /**
     * Reads a single particle snapshot.
     *
     * @param {number} index
     * @returns {object}
     */
    get(index) {
        const i3 = index * 3;
        const i4 = index * 4;
        return {
            x: this.positions[i3],
            y: this.positions[i3 + 1],
            z: this.positions[i3 + 2],
            vx: this.velocities[i3],
            vy: this.velocities[i3 + 1],
            vz: this.velocities[i3 + 2],
            destinationX: this.destinations[i3],
            destinationY: this.destinations[i3 + 1],
            destinationZ: this.destinations[i3 + 2],
            color: {
                r: this.colors[i4],
                g: this.colors[i4 + 1],
                b: this.colors[i4 + 2],
                a: this.colors[i4 + 3]
            },
            size: this.sizes[index],
            life: this.lifes[index]
        };
    }

    /**
     * Legacy helper to randomize destinations.
     */
    scatter() {
        const { normals } = this;
        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;
            const i4 = i * 4;
            this.destinations[i3] = randomBetween(normals.left, normals.right);
            this.destinations[i3 + 1] = randomBetween(normals.top, normals.bottom);
            this.destinations[i3 + 2] = randomBetween(-1, 1);
        }
    }

    /**
     * No-op render hook for API symmetry with higher-level systems.
     */
    render() {}
}

export default ParticleStateBuffer;
