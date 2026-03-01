/**
 * WebGL particle simulation + renderer using transform feedback.
 *
 * Responsibilities:
 * - Build and own GPU simulation/render pipelines.
 * - Expose runtime controls (orbit/repel/motion scales).
 * - Load/apply masks and sync particle state to stage buffers.
 *
 * @module Animation/Graphics/WebGL/WebGLParticleSystem
 */

import WebGL from "./Lib/WebGL.mjs";
const { VariableTypes } = WebGL;
import { Vector4D } from "../../properties/Vector.mjs";
import ParticleStateBuffer from "../particles/particle-state-buffer.mjs";
import AnimationValue from "../../properties/Value.mjs";
import TransformFeedback from "./Lib/TransformFeedback.mjs";

/**
 * Creates a deterministic RNG when a seed is provided.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function createSeededRandom(seed) {
    let state = (Math.floor(seed) || 1) >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/**
 * GPU particle system wrapper.
 */
class WebGLParticleSystem {
    particleSize = "3.0";

    /**
     * @param {HTMLCanvasElement} canvas Render target.
     * @param {number} maxParticles Max active particle count.
     * @param {number} [emitRate=10] Reserved for emitter-driven usage.
     */
    constructor(canvas, maxParticles, emitRate = 10) {
        this.canvas = canvas;
        this.maxParticles = maxParticles;
        this.emitRate = emitRate;

        // Interactive controls used by playground/component bindings.
        this.repel = new AnimationValue(0, { type: "int" });
        this.repelPoint = new Vector4D(0.0, 0.0, 0.0, 0.0);
        this.orbit = new AnimationValue(0, { type: "int" });
        this.orbitPoint = new Vector4D(0.0, 0.0, 0.0, 0.0);
        this.orbitFieldRadius = null;
        this.repelFieldRadius = null;

        // uMotion = [driftScale, orbitSpeedScale, repelStrengthScale, orbitPullScale]
        this.driftScale = 1.0;
        this.orbitSpeedScale = 1.0;
        this.repelStrengthScale = 1.0;
        this.orbitPullScale = 1.0;
        this._snapshots = new Map();
        this._maskTransition = null;

        this.particles = new ParticleStateBuffer(maxParticles, canvas.width, canvas.height);
        this.particles.setProjection("perspective", { fov: 45, near: 0.01, far: 20 });

        this.setupWebGL();
    }

    /**
     * Smoothstep easing used for mask transitions.
     *
     * @private
     * @param {number} t
     * @returns {number}
     */
    _easeMaskTransition(t) {
        const clamped = Math.max(0, Math.min(1, Number(t) || 0));
        return clamped * clamped * (3 - 2 * clamped);
    }

    /**
     * Applies in-flight mask transition values to CPU/GPU buffers.
     *
     * @private
     * @param {number} nowMs RAF timestamp in milliseconds.
     * @returns {boolean} True while transition is active for this frame.
     */
    _applyMaskTransition(nowMs) {
        const transition = this._maskTransition;
        if (!transition) return false;

        if (!Number.isFinite(transition.startTimeMs)) {
            transition.startTimeMs = nowMs;
        }

        const elapsed = Math.max(0, nowMs - transition.startTimeMs);
        const durationMs = Math.max(1, Number(transition.durationMs) || 1);
        const progress = Math.min(1, elapsed / durationMs);
        const eased = this._easeMaskTransition(progress);
        const positionCount = Math.min(
            this.particles.positions.length,
            transition.fromPositions.length,
            transition.toPositions.length
        );
        const colorCount = Math.min(this.particles.colors.length, transition.fromColors.length, transition.toColors.length);

        for (let i = 0; i < positionCount; i += 1) {
            const from = transition.fromPositions[i];
            const to = transition.toPositions[i];
            this.particles.positions[i] = from + (to - from) * eased;
        }

        for (let i = 0; i < colorCount; i += 1) {
            const from = transition.fromColors[i];
            const to = transition.toColors[i];
            this.particles.colors[i] = from + (to - from) * eased;
        }

        if (Number.isFinite(transition.count) && transition.count >= 0) {
            this.particles.count = Math.max(0, Math.min(this.maxParticles, Math.floor(transition.count)));
        }

        this._syncStageFromParticles();

        if (progress >= 1) {
            this._maskTransition = null;
            return false;
        }

        return true;
    }

    /**
     * Builds simulation and render pipelines.
     */
    setupWebGL() {
        this.webgl = new WebGL(this.canvas);
        const { gl, shaders } = this.webgl;
        this.gl = gl;

        // Seed initial particle data on CPU.
        this.particles.build();

        // Build transform-feedback simulation pipeline.
        this.feedback = new TransformFeedback(this.maxParticles, gl);

        this.feedback.addFunction(
            "vec4",
            "calculateVisibleDimensions",
            ["mat4 projectionMatrix", "float depth"],
            `
            float near = -1.0 / projectionMatrix[2][2];
            float far = projectionMatrix[2][3] / (1.0 + projectionMatrix[2][2]);

            if (depth < near || depth > far) {
                return vec4(0.0);
            }

            float halfHeight = depth * tan(radians(45.0));
            float aspectRatio = projectionMatrix[0][0] / projectionMatrix[1][1];
            float halfWidth = halfHeight * aspectRatio;

            return vec4(-halfWidth, halfWidth, halfHeight, -halfHeight);
            `
        );

        this.feedback.addFunction("float", "random", ["float x"], "return fract(sin(x) * 43758.5453123);");

        this.uTargetPoint = this.feedback.addUniform("uTargetPoint", VariableTypes.FLOAT_VEC4, [0.0, 0.0, -2.0, 0.0], {
            debug: false
        });
        this.uScene = this.feedback.addUniform(
            "uScene",
            VariableTypes.FLOAT_VEC4,
            [Number(this.canvas.width), Number(this.canvas.height), 0.0, -1.0],
            { debug: false, clearGLErrors: false }
        );





















































































































































































































































































































































































































































































































































































































































































export default WebGLParticleSystem;}    }
        this.rafId = requestAnimationFrame(this._boundUpdate);        gl.drawArrays(gl.POINTS, 0, this.particles.count);        gl.useProgram(this.program);        this.feedback.applyDownStreamData();
        // Bind latest TF read buffers as render attributes.        gl.enable(gl.DEPTH_TEST);        gl.clear(gl.COLOR_BUFFER_BIT);        gl.clearColor(0, 0, 0, 0);
        gl.useProgram(this.program);        }            gl.flush();
            this.feedback.update(this.time.delta);            }                this.uTargetPoint.value = this.orbitPoint.toArray();            if (this.orbit.value === 1) {            }                this.orbit.save();
            if (this.uOrbit && this.orbit.dirty && (this.uOrbit.value = this.orbit.value) !== false) {            }                this.uTargetPoint.value = this.repelPoint.toArray();            if (this.repel.value === 1) {            }                this.repel.save();
            if (this.uRepel && this.repel.dirty && (this.uRepel.value = this.repel.value) !== false) {            if (this.uRepelFieldRadius) this.uRepelFieldRadius.value = repelFieldRadius;            if (this.uOrbitFieldRadius) this.uOrbitFieldRadius.value = orbitFieldRadius;                    : repelRadius * 3;                    ? Math.max(repelRadius, Number(this.repelFieldRadius))                Number.isFinite(Number(this.repelFieldRadius)) && Number(this.repelFieldRadius) > 0            const repelFieldRadius =                    : orbitRadius * 3;                    ? Math.max(orbitRadius, Number(this.orbitFieldRadius))                Number.isFinite(Number(this.orbitFieldRadius)) && Number(this.orbitFieldRadius) > 0            const orbitFieldRadius =            const repelRadius = Math.max(0.0001, Number(this.repelPoint[3]) || 0.4);            const orbitRadius = Math.max(0.0001, Number(this.orbitPoint[3]) || 0.4);            ];                Number(this.orbitPullScale) || 0                Number(this.repelStrengthScale) || 0,                Number(this.orbitSpeedScale) || 0,                Number(this.driftScale) || 0,            this.uMotion.value = [            ];                Number(this.time.delta)                Number(this.time.current),                Number(this.canvas.height),                Number(this.canvas.width),            this.uScene.value = [            gl.useProgram(this.feedback.program);
        if (!maskTransitionActive) {
        const maskTransitionActive = this._applyMaskTransition(time);        this.time.delta = this.time.current - this.time.last;        this.time.current = time / 1000;
        this.time.last = this.time.current || 0;        if (!this.running || !this.feedback) return;        const { gl } = this;    update(time) {     */     * @param {number} time RAF timestamp in milliseconds.     *     * Executes one simulation + render frame.    /**    }        this.rafId = 0;        cancelAnimationFrame(this.rafId);        if (!this.rafId) return;        this.running = false;    stop() {     */     * Stops RAF-driven simulation/rendering.    /**    }        this.rafId = requestAnimationFrame(this._boundUpdate);        this._boundUpdate ||= this.update.bind(this);        this.time = { current: 0, last: 0, delta: 0 };        this.running = true;        if (this.running) return;    start() {     */     * Starts RAF-driven simulation/rendering.    /**    }        }            this[name][index.toString()] = value;        } else if (this[name] && typeof this[name] === "object") {            this[name] = value;        if (index === undefined) {        }            return;            this[name][index.toString()] = value;            if (index === undefined) return;        if (this[name] instanceof Vector4D) {        }            return;            this[name].value = value;        if (this[name] instanceof AnimationValue) {        if (this[name] === undefined || this[name] === value) return;        if (!isNaN(value)) value = Number(value);        }            if (!isNaN(index)) index = parseInt(index, 10);            [name, index] = name.split(/[\[\]]/);        if (name.includes("[")) {        let index;    setValue(name, value) {     */     * @param {*} value New value.     * @param {string} name Property name.     *     * Supports vector index notation like `orbitPoint[0]`.     * Generic runtime setter used by playground controls.    /**    }        return this.particles.getBounds();    getBounds() {     */     * @returns {{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}|null}     *     * Returns active world-space bounds for particles.    /**    }        if (captureAs) this.captureSnapshot(captureAs);        this._syncStageFromParticles();        }            positions[i3 + 2] += (rng() * 2 - 1) * jitterAmount;            positions[i3 + 1] += (rng() * 2 - 1) * jitterAmount;            positions[i3] += (rng() * 2 - 1) * jitterAmount;            const i3 = i * 3;        for (let i = 0; i < count; i++) {        const positions = this.particles.positions;        const count = Math.max(0, Math.min(this.particles.maxCount, this.particles.count || 0));        const jitterAmount = Math.max(0, Number(amount) || 0);        const rng = Number.isFinite(seed) ? createSeededRandom(seed) : Math.random;        const { seed, captureAs = null } = options;    jitter(amount = 0.05, options = {}) {     */     * @param {{seed?:number,captureAs?:string|null}} [options={}]     * @param {number} [amount=0.05]     *     * Adds random jitter offset to active particles.    /**    }        if (captureAs) this.captureSnapshot(captureAs);        this._syncStageFromParticles();        }            positions[i3 + 2] += dz * inv * push + (rng() * 2 - 1) * jitterAmount;            positions[i3 + 1] += dy * inv * push + (rng() * 2 - 1) * jitterAmount;            positions[i3] += dx * inv * push + (rng() * 2 - 1) * jitterAmount;            const push = minPush + rng() * (maxPush - minPush);            const inv = 1 / len;            }                len = Math.hypot(dx, dy, dz) || 1;                dz = rng() * 2 - 1;                dy = rng() * 2 - 1;                dx = rng() * 2 - 1;            if (len < 0.0001) {            let len = Math.hypot(dx, dy, dz);            let dz = positions[i3 + 2] - centerZ;            let dy = positions[i3 + 1] - centerY;            let dx = positions[i3] - centerX;            const i3 = i * 3;        for (let i = 0; i < count; i++) {        const positions = this.particles.positions;        const count = Math.max(0, Math.min(this.particles.maxCount, this.particles.count || 0));        const rng = Number.isFinite(options.seed) ? createSeededRandom(options.seed) : Math.random;        const { captureAs = null } = options;        const jitterAmount = Math.max(0, Number(options.jitter) || 0.05);        const maxPush = Math.max(minPush, Number(options.maxPush) || 0.6);        const minPush = Math.max(0, Number(options.minPush) || 0.1);        const centerZ = Number(options.z ?? this.orbitPoint[2]) || 0;        const centerY = Number(options.y ?? this.orbitPoint[1]) || 0;        const centerX = Number(options.x ?? this.orbitPoint[0]) || 0;    scatter(options = {}) {     */     * }} [options={}]     *   captureAs?:string|null     *   seed?:number,     *   jitter?:number,     *   maxPush?:number,     *   minPush?:number,     *   z?:number,     *   y?:number,     *   x?:number,     * @param {{     *     * Pushes particles away from a center point for an explosive scatter effect.    /**    }        if (config.orbitPull !== undefined) this.orbitPullScale = Math.max(0, Number(config.orbitPull) || 0);        if (config.repelStrength !== undefined) this.repelStrengthScale = Math.max(0, Number(config.repelStrength) || 0);        if (config.orbitSpeed !== undefined) this.orbitSpeedScale = Math.max(0, Number(config.orbitSpeed) || 0);        if (config.drift !== undefined) this.driftScale = Math.max(0, Number(config.drift) || 0);    setMotion(config = {}) {     */     * @param {{drift?:number,orbitSpeed?:number,repelStrength?:number,orbitPull?:number}} [config={}]     *     * Applies motion multiplier values.    /**    }        }                break;                this.repel.value = 0;                this.orbit.value = 0;            default:                break;                this.setRepel(true);            case "repel":                break;                this.setOrbit(true);            case "orbit":        switch (mode) {    setMode(mode) {     */     * @param {"idle"|"orbit"|"repel"} mode     *     * Sets simulation interaction mode.    /**    }        if (enabled) this.orbit.value = 0;        this.repel.value = enabled ? 1 : 0;        }            this.repelFieldRadius = Number.isFinite(nextField) && nextField > 0 ? nextField : null;            const nextField = Number(options.fieldRadius);        if (options.fieldRadius !== undefined) {        }            this.repelPoint[3] = Math.max(0.0001, Number(options.radius) || this.repelPoint[3] || 0.4);        if (options.radius !== undefined) {        if (options.z !== undefined) this.repelPoint[2] = Number(options.z) || 0;        if (options.y !== undefined) this.repelPoint[1] = Number(options.y) || 0;        if (options.x !== undefined) this.repelPoint[0] = Number(options.x) || 0;    setRepel(enabled, options = {}) {     */     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]     * @param {boolean} enabled     *     * Enables/disables repel mode and optional target update.    /**    }        if (enabled) this.repel.value = 0;        this.orbit.value = enabled ? 1 : 0;        }            this.orbitFieldRadius = Number.isFinite(nextField) && nextField > 0 ? nextField : null;            const nextField = Number(options.fieldRadius);        if (options.fieldRadius !== undefined) {        }            this.orbitPoint[3] = Math.max(0.0001, Number(options.radius) || this.orbitPoint[3] || 0.4);        if (options.radius !== undefined) {        if (options.z !== undefined) this.orbitPoint[2] = Number(options.z) || 0;        if (options.y !== undefined) this.orbitPoint[1] = Number(options.y) || 0;        if (options.x !== undefined) this.orbitPoint[0] = Number(options.x) || 0;    setOrbit(enabled, options = {}) {     */     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]     * @param {boolean} enabled     *     * Enables/disables orbit mode and optional target update.    /**    }        this.repelPoint[3] = nr;        this.repelPoint[2] = nz;        this.repelPoint[1] = ny;        this.repelPoint[0] = nx;        this.orbitPoint[3] = nr;        this.orbitPoint[2] = nz;        this.orbitPoint[1] = ny;        this.orbitPoint[0] = nx;        const nr = Math.max(0.0001, Number(radius) || 0.4);        const nz = Number(z) || 0;        const ny = Number(y) || 0;        const nx = Number(x) || 0;    setTarget(x, y, z, radius = 0.4) {     */     * @param {number} [radius=0.4]     * @param {number} z     * @param {number} y     * @param {number} x     *     * Sets the shared interaction target for orbit and repel.    /**    }        return this.restoreSnapshot(snapshot);        const { snapshot = "origin" } = options;    reset(options = {}) {     */     * @returns {boolean}     * @param {{snapshot?:string}} [options={}]     *     * Resets particle state back to a stored snapshot.    /**    }        return true;        this._syncStageFromParticles();        this.particles.restore(snapshot);        if (!snapshot || !this.particles?.restore) return false;        const snapshot = this._snapshots.get(name);    restoreSnapshot(name = "origin") {     */     * @returns {boolean}     * @param {string} [name="origin"] Snapshot key.     *     * Restores a previously captured snapshot.    /**    }        return snapshot;        this._snapshots.set(name, snapshot);        const snapshot = this.particles.snapshot();        if (!this.particles?.snapshot) return null;    captureSnapshot(name = "origin") {     */     * @returns {object|null}     * @param {string} [name="origin"] Snapshot key.     *     * Captures the current particle state snapshot.    /**    }        this._syncStageFromParticles();        this.particles.build(undefined, buildOptions);        this.maskIndex = null;        this.particles.mask = null;        this._maskTransition = null;        if (!this.particles) return;    clearMask(buildOptions = {}) {     */     * @param {object} [buildOptions={}]     *     * Clears mask influence and rebuilds random/free particle distribution.    /**    }        return { maskIndex, count: this.particles.count || 0 };        }            }
            this.applyMask(maskIndex, applyOptions);                applyOptions.preserveMaskColor = maskOptions.preserveColor === true;            if (applyOptions.preserveMaskColor === undefined && maskOptions.preserveColor !== undefined) {            const applyOptions = { ...buildOptions };        if (apply) {        const maskIndex = await this.particles.loadMask(source, maskOptions);        }            return { maskIndex: -1, count: this.particles?.count || 0 };        if (!source || !this.particles?.loadMask) {        const { apply = true, buildOptions = {}, ...maskOptions } = options;    async loadMask(source, options = {}) {     */     * @returns {Promise<{maskIndex:number,count:number}>}     * }} [options={}]     *   alphaThreshold?:number     *   position?:{x?:number,y?:number,z?:number},     *   preserveColor?:boolean,     *   contentBox?:{width?:number,height?:number},     *   buildOptions?:object,     *   apply?:boolean,     * @param {{     * @param {string} source Image URL.     *     * Loads a mask image and optionally applies it immediately.    /**    }        return true;        this.maskIndex = normalizedIndex;        }            this._syncStageFromParticles();            this.particles.fillFromMask(normalizedIndex, buildOptions);            this._maskTransition = null;        } else {            this._syncStageFromParticles();            };                count: nextCount                toColors,                fromColors,                toPositions,                fromPositions,                durationMs: transitionDurationMs,                startTimeMs: NaN,            this._maskTransition = {            this.particles.count = Math.max(0, Math.min(this.maxParticles, Math.floor(nextCount)));            this.particles.colors.set(fromColors);            this.particles.positions.set(fromPositions);            const nextCount = this.particles.count || this.maxParticles;            const toColors = this.particles.colors.slice();            const toPositions = this.particles.positions.slice();            this.particles.fillFromMask(normalizedIndex, buildOptions);            const fromColors = this.particles.colors.slice();            const fromPositions = this.particles.positions.slice();        if (transitionEnabled && transitionDurationMs > 0) {        const transitionDurationMs = Math.max(0, Number(buildOptions?.transitionDuration ?? buildOptions?.duration ?? 1400) || 0);        const transitionEnabled = buildOptions?.transition !== false;        if (!this.particles?.masks?.[normalizedIndex]) return false;        const normalizedIndex = Math.floor(maskIndex);        if (!Number.isFinite(maskIndex)) return false;    applyMask(maskIndex, buildOptions = {}) {     */     * @returns {boolean}     * @param {object} [buildOptions={}]     * @param {number} maskIndex     *     * Applies a previously loaded mask index to the active stage.    /**    }        }            this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));        if (this.feedback) {        this._syncFeedbackVariable(this.feedbackColor, this.particles.colors);        this._syncFeedbackVariable(this.feedbackState, this.particles.states);        this._syncFeedbackVariable(this.feedbackPosition, this.particles.positions);    _syncStageFromParticles() {     */     * @private     *     * Syncs current CPU particle data into GPU simulation buffers.    /**    }        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);        this.gl.bufferData(this.gl.ARRAY_BUFFER, payload, this.gl.DYNAMIC_DRAW);        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, variable.buffer.write);        this.gl.bufferData(this.gl.ARRAY_BUFFER, payload, this.gl.DYNAMIC_DRAW);        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, variable.buffer.read);        variable._value = payload;        const payload = data instanceof Float32Array ? data : new Float32Array(data || []);        if (!variable || !variable.buffer || !this.gl) return;    _syncFeedbackVariable(variable, data) {     */     * @param {Float32Array|number[]} data Source data.     * @param {*} variable Feedback variable containing read/write buffers.     * @private     *     * Uploads CPU particle arrays to both TF ping-pong buffers.    /**    }        this.captureSnapshot("origin");        this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));        // Keep TF draw count aligned to active particles.        this.program = this.webgl.build();        fragment.main(`fragColor = vec4(particleStateColor, 1.0);`);        fragment.addInput("particleStateColor", VariableTypes.FLOAT_VEC3);        fragment.addOutput("fragColor", VariableTypes.FLOAT_VEC4);        fragment.setPrecision("high", "float");        `);            particleStateColor = aColor.rgb;            gl_PointSize = max(1.5, ${this.particleSize} / depth);            float depth = max(0.2, abs(aPosition.z));            gl_Position = uProjectionMatrix * vec4(aPosition, 1.0);        vertex.main(`        );            this.particles.projection.matrix            VariableTypes.FLOAT_MAT4,            "uProjectionMatrix",        this.uProjectionMatrix = vertex.addUniform(        vertex.addOutput("particleStateColor", VariableTypes.FLOAT_VEC3);        this.feedbackColor.addChild(this.aColor);        this.aColor = vertex.addInput("aColor", VariableTypes.FLOAT_VEC4, this.particles.colors);        this.feedbackPosition.addChild(this.aPosition);        this.aPosition = vertex.addInput("aPosition", VariableTypes.FLOAT_VEC3);        this.feedbackState.addChild(this.aState);        this.aState = vertex.addInput("aState", VariableTypes.FLOAT_VEC4, new Float32Array(this.particles.maxCount * 4));        vertex.setPrecision("high", "float");        const { vertex, fragment } = shaders;        // Build render shader.        this.feedback.build();        `);            aColorOut = aColor;            aStateOut = vec4(particleState, particleAge, 0.0, 0.0);            aPositionOut = position;            if (position.z > -near) position.z = -far;            if (position.z < -far) position.z = -near;            if (position.y > boundTop) position.y = boundBottom;            if (position.y < boundBottom) position.y = boundTop;            if (position.x > boundRight) position.x = boundLeft;            if (position.x < boundLeft) position.x = boundRight;            }                position.y += cos(time * 0.8 + driftSeed * 1.7) * drift;                position.x += sin(time * 0.9 + driftSeed) * drift;                float drift = 0.0012 * uMotion.x;                float driftSeed = float(index) * 0.013;            } else {                }                    particleState = 0.0;                } else {                    particleState = 1.0;                    position += tangent * orbitSpeed * (0.2 + 0.8 * ringLock) * max(0.0, fieldInfluence);                    float ringLock = 1.0 - clamp(abs(desiredRadius - targetRadius) / (targetRadius * 8.0), 0.0, 1.0);                    float orbitSpeed = (0.0015 + 0.0035 * random(float(index) + 13.0)) * uMotion.y;                    tangent = tangent / max(0.0001, tangentLen);                    }                        }                            tangentLen = length(tangent);                            tangent = cross(vec3(1.0, 0.0, 0.0), dir);                        if (tangentLen < 0.0001) {                        tangentLen = length(tangent);                        tangent = cross(vec3(0.0, 1.0, 0.0), dir);                    if (tangentLen < 0.0001) {                    float tangentLen = length(tangent);                    vec3 tangent = cross(axis, dir);                    ));                        sin(seed * 1.37 + 2.1)                        cos(seed * 1.11),                        sin(seed * 0.73),                    vec3 axis = normalize(vec3(                    float seed = float(index) + 1.0;                    dir = rel / d;                    d = max(0.0001, length(rel));                    rel = position - target;                    position = target + dir * desiredRadius;                    float desiredRadius = mix(d, targetRadius, radialLerp);                    radialLerp = clamp(radialLerp, 0.0, 0.05 * max(0.1, fieldInfluence));                    float radialLerp = 1.0 - exp(-convergeRate * max(0.0, delta));                    float convergeRate = (0.04 + (0.18 * pullScale)) * max(0.02, fieldInfluence);                    float fieldInfluence = 1.0 - smoothstep(targetRadius, fieldRadius, d);                    float pullScale = max(0.0, uMotion.w);                    vec3 dir = rel / d;                    }                        d = length(rel);                        )) * targetRadius;                            fract(sin(a * 1.73) * 13976.1239) * 2.0 - 1.0                            fract(sin(a * 1.31) * 28001.8384) * 2.0 - 1.0,                            fract(sin(a) * 43758.5453) * 2.0 - 1.0,                        rel = normalize(vec3(                        float a = float(index) * 12.9898;                    if (d < 0.0001) {                if (d <= fieldRadius) {                float d = length(rel);                vec3 rel = position - target;                float fieldRadius = max(targetRadius, uOrbitFieldRadius);                float targetRadius = max(0.02, uTargetPoint.w);                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);            } else if (uOrbit) {                particleState = 0.0;                }                    position.z += (target.z - position.z) * (0.012 + 0.03 * influence);                    position += repelDirection * repelSpeed;                    float repelSpeed = (0.002 + influence * 0.038) * uMotion.z * influence;                    float influence = 1.0 - smoothstep(targetRadius, fieldRadius, targetDistance);                if (targetDistance <= fieldRadius) {                vec3 repelDirection = away / targetDistance;                }                    targetDistance = length(away);                    );                        0.0                        cos(time * 1.21 + float(index) * 0.11),                        sin(time + float(index) * 0.17),                    away = vec3(                if (targetDistance < 0.0001) {                float targetDistance = length(away);                vec3 away = position - target;                float fieldRadius = max(targetRadius, uRepelFieldRadius);                float targetRadius = max(0.0001, uTargetPoint.w);                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);            if (uRepel) {            float boundBottom = bounds[3];            float boundTop = bounds[2];            float boundRight = bounds[1];            float boundLeft = bounds[0];            vec4 bounds = calculateVisibleDimensions(uProjectionMatrix, -position.z);            float particleAge = aState[1];            float particleState = aState[0];            vec3 position = aPosition;            float far = uProjectionMatrix[2][3] / (1.0 + uProjectionMatrix[2][2]);            float near = -1.0 / uProjectionMatrix[2][2];            float delta = uScene[3];            float time = uScene[2];            int index = gl_VertexID;        this.feedback.setScript(`        // - wrap to frustum bounds        // - light drift when no force mode is enabled        // - orbit/repel around uTargetPoint        // Simulation shader:        );            { debug: false }            this.particles.colors,            VariableTypes.FLOAT_VEC4,            "aColor",        this.feedbackColor = this.feedback.addVariable(        );            {}            new Float32Array(this.particles.maxCount * 4),            VariableTypes.FLOAT_VEC4,            "aState",        this.feedbackState = this.feedback.addVariable(        );            { debug: false }            this.particles.positions,            VariableTypes.FLOAT_VEC3,            "aPosition",        this.feedbackPosition = this.feedback.addVariable(        this.uRepelFieldRadius = this.feedback.addUniform("uRepelFieldRadius", VariableTypes.FLOAT, 1.2);        this.uOrbitFieldRadius = this.feedback.addUniform("uOrbitFieldRadius", VariableTypes.FLOAT, 1.2);        this.uOrbit = this.feedback.addUniform("uOrbit", VariableTypes.BOOL, false);        this.uRepel = this.feedback.addUniform("uRepel", VariableTypes.BOOL, false);        );            this.particles.projection.matrix            VariableTypes.FLOAT_MAT4,            "uProjectionMatrix",        this.projectionMatrix = this.feedback.addUniform(        this.uMotion = this.feedback.addUniform("uMotion", VariableTypes.FLOAT_VEC4, [1.0, 1.0, 1.0, 0.0]);