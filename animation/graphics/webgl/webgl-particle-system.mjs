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
import EmitterAdapter from "./emitter-adapter.mjs";

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
        this.emitter = null;

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
        const colorCount = Math.min(
            this.particles.colors.length,
            transition.fromColors.length,
            transition.toColors.length
        );

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
        this.uMotion = this.feedback.addUniform("uMotion", VariableTypes.FLOAT_VEC4, [1.0, 1.0, 1.0, 0.0]);
        this.projectionMatrix = this.feedback.addUniform(
            "uProjectionMatrix",
            VariableTypes.FLOAT_MAT4,
            this.particles.projection.matrix
        );
        this.uRepel = this.feedback.addUniform("uRepel", VariableTypes.BOOL, false);
        this.uOrbit = this.feedback.addUniform("uOrbit", VariableTypes.BOOL, false);
        this.uOrbitFieldRadius = this.feedback.addUniform("uOrbitFieldRadius", VariableTypes.FLOAT, 1.2);
        this.uRepelFieldRadius = this.feedback.addUniform("uRepelFieldRadius", VariableTypes.FLOAT, 1.2);
        // Gravity (world units/sec^2) and friction (damping per second)
        this.uGravity = this.feedback.addUniform("uGravity", VariableTypes.FLOAT_VEC3, [0.0, -0.98, 0.0]);
        this.uFriction = this.feedback.addUniform("uFriction", VariableTypes.FLOAT, 0.0);

        this.feedbackPosition = this.feedback.addVariable(
            "aPosition",
            VariableTypes.FLOAT_VEC3,
            this.particles.positions,
            { debug: false }
        );
        this.feedbackVelocity = this.feedback.addVariable(
            "aVelocity",
            VariableTypes.FLOAT_VEC3,
            this.particles.velocities,
            { debug: false }
        );
        this.feedbackState = this.feedback.addVariable(
            "aState",
            VariableTypes.FLOAT_VEC4,
            new Float32Array(this.particles.maxCount * 4),
            {}
        );
        this.feedbackColor = this.feedback.addVariable("aColor", VariableTypes.FLOAT_VEC4, this.particles.colors, {
            debug: false
        });

        // Simulation shader:
        // - orbit/repel around uTargetPoint
        // - light drift when no force mode is enabled
        // - wrap to frustum bounds
        this.feedback.setScript(`
            int index = gl_VertexID;

            float time = uScene[2];
            float delta = uScene[3];

            float near = -1.0 / uProjectionMatrix[2][2];
            float far = uProjectionMatrix[2][3] / (1.0 + uProjectionMatrix[2][2]);

            vec3 position = aPosition;
            vec3 velocity = aVelocity;
            float particleState = aState[0];
            float particleAge = aState[1];

            vec4 bounds = calculateVisibleDimensions(uProjectionMatrix, -position.z);
            float boundLeft = bounds[0];
            float boundRight = bounds[1];
            float boundTop = bounds[2];
            float boundBottom = bounds[3];

            if (uRepel) {
                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);
                float targetRadius = max(0.0001, uTargetPoint.w);
                float fieldRadius = max(targetRadius, uRepelFieldRadius);

                vec3 away = position - target;
                float targetDistance = length(away);

                if (targetDistance < 0.0001) {
                    away = vec3(
                        sin(time + float(index) * 0.17),
                        cos(time * 1.21 + float(index) * 0.11),
                        0.0
                    );
                    targetDistance = length(away);
                }

                vec3 repelDirection = away / targetDistance;
                if (targetDistance <= fieldRadius) {
                    float influence = 1.0 - smoothstep(targetRadius, fieldRadius, targetDistance);
                    float repelSpeed = (0.002 + influence * 0.038) * uMotion.z * influence;
                    position += repelDirection * repelSpeed;
                    position.z += (target.z - position.z) * (0.012 + 0.03 * influence);
                }

                particleState = 0.0;
            } else if (uOrbit) {
                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);
                float targetRadius = max(0.02, uTargetPoint.w);
                float fieldRadius = max(targetRadius, uOrbitFieldRadius);

                vec3 rel = position - target;
                float d = length(rel);

                if (d <= fieldRadius) {
                    if (d < 0.0001) {
                        float a = float(index) * 12.9898;
                        rel = normalize(vec3(
                            fract(sin(a) * 43758.5453) * 2.0 - 1.0,
                            fract(sin(a * 1.31) * 28001.8384) * 2.0 - 1.0,
                            fract(sin(a * 1.73) * 13976.1239) * 2.0 - 1.0
                        )) * targetRadius;
                        d = length(rel);
                    }

                    vec3 dir = rel / d;
                    float pullScale = max(0.0, uMotion.w);
                    float fieldInfluence = 1.0 - smoothstep(targetRadius, fieldRadius, d);
                    float convergeRate = (0.04 + (0.18 * pullScale)) * max(0.02, fieldInfluence);
                    float radialLerp = 1.0 - exp(-convergeRate * max(0.0, delta));
                    radialLerp = clamp(radialLerp, 0.0, 0.05 * max(0.1, fieldInfluence));
                    float desiredRadius = mix(d, targetRadius, radialLerp);

                    position = target + dir * desiredRadius;
                    rel = position - target;
                    d = max(0.0001, length(rel));
                    dir = rel / d;

                    float seed = float(index) + 1.0;
                    vec3 axis = normalize(vec3(
                        sin(seed * 0.73),
                        cos(seed * 1.11),
                        sin(seed * 1.37 + 2.1)
                    ));
                    vec3 tangent = cross(axis, dir);
                    float tangentLen = length(tangent);
                    if (tangentLen < 0.0001) {
                        tangent = cross(vec3(0.0, 1.0, 0.0), dir);
                        tangentLen = length(tangent);
                        if (tangentLen < 0.0001) {
                            tangent = cross(vec3(1.0, 0.0, 0.0), dir);
                            tangentLen = length(tangent);
                        }
                    }
                    tangent = tangent / max(0.0001, tangentLen);

                    float orbitSpeed = (0.0015 + 0.0035 * random(float(index) + 13.0)) * uMotion.y;
                    float ringLock = 1.0 - clamp(abs(desiredRadius - targetRadius) / (targetRadius * 8.0), 0.0, 1.0);
                    position += tangent * orbitSpeed * (0.2 + 0.8 * ringLock) * max(0.0, fieldInfluence);

                    particleState = 1.0;
                } else {
                    particleState = 0.0;
                }
            } else {
                float driftSeed = float(index) * 0.013;
                float drift = 0.0012 * uMotion.x;
                position.x += sin(time * 0.9 + driftSeed) * drift;
                position.y += cos(time * 0.8 + driftSeed * 1.7) * drift;
            }

            if (position.x < boundLeft) position.x = boundRight;
            if (position.x > boundRight) position.x = boundLeft;
            if (position.y < boundBottom) position.y = boundTop;
            if (position.y > boundTop) position.y = boundBottom;
            if (position.z < -far) position.z = -near;
            if (position.z > -near) position.z = -far;

            // Integrate velocity with gravity and friction
            velocity += uGravity * delta;
            float damp = clamp(uFriction * delta, 0.0, 1.0);
            velocity = velocity * (1.0 - damp);
            position += velocity * delta;

            aPositionOut = position;
            aVelocityOut = velocity;
            aStateOut = vec4(particleState, particleAge + delta, 0.0, 0.0);
            aColorOut = aColor;
        `);

        this.feedback.build();

        // Build render shader.
        const { vertex, fragment } = shaders;
        vertex.setPrecision("high", "float");

        this.aState = vertex.addInput(
            "aState",
            VariableTypes.FLOAT_VEC4,
            new Float32Array(this.particles.maxCount * 4)
        );
        this.feedbackState.addChild(this.aState);

        this.aPosition = vertex.addInput("aPosition", VariableTypes.FLOAT_VEC3);
        this.feedbackPosition.addChild(this.aPosition);
        this.aVelocity = vertex.addInput("aVelocity", VariableTypes.FLOAT_VEC3, this.particles.velocities);
        this.feedbackVelocity.addChild(this.aVelocity);
        this.aColor = vertex.addInput("aColor", VariableTypes.FLOAT_VEC4, this.particles.colors);
        this.feedbackColor.addChild(this.aColor);

        vertex.addOutput("particleStateColor", VariableTypes.FLOAT_VEC3);
        this.uProjectionMatrix = vertex.addUniform(
            "uProjectionMatrix",
            VariableTypes.FLOAT_MAT4,
            this.particles.projection.matrix
        );

        vertex.main(`
            gl_Position = uProjectionMatrix * vec4(aPosition, 1.0);
            float depth = max(0.2, abs(aPosition.z));
            gl_PointSize = max(1.5, ${this.particleSize} / depth);
            particleStateColor = aColor.rgb;
        `);

        fragment.setPrecision("high", "float");
        fragment.addOutput("fragColor", VariableTypes.FLOAT_VEC4);
        fragment.addInput("particleStateColor", VariableTypes.FLOAT_VEC3);
        fragment.main(`fragColor = vec4(particleStateColor, 1.0);`);

        this.program = this.webgl.build();

        // Keep TF draw count aligned to active particles.
        this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        this.captureSnapshot("origin");
    }

    /**
     * Uploads CPU particle arrays to both TF ping-pong buffers.
     *
     * @private
     * @param {*} variable Feedback variable containing read/write buffers.
     * @param {Float32Array|number[]} data Source data.
     */
    _syncFeedbackVariable(variable, data) {
        if (!variable || !variable.buffer || !this.gl) return;
        const payload = data instanceof Float32Array ? data : new Float32Array(data || []);
        variable._value = payload;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, variable.buffer.read);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, payload, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, variable.buffer.write);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, payload, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    /**
     * Syncs current CPU particle data into GPU simulation buffers.
     *
     * @private
     */
    _syncStageFromParticles() {
        this._syncFeedbackVariable(this.feedbackPosition, this.particles.positions);
        this._syncFeedbackVariable(this.feedbackVelocity, this.particles.velocities);
        this._syncFeedbackVariable(this.feedbackState, this.particles.states);
        this._syncFeedbackVariable(this.feedbackColor, this.particles.colors);
        if (this.feedback) {
            this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        }
    }

    /**
     * Set gravity vector used by the simulation shader.
     * @param {number[]} vec3
     */
    setGravity(vec3) {
        if (this.uGravity) this.uGravity.value = [Number(vec3[0] || 0), Number(vec3[1] || 0), Number(vec3[2] || 0)];
    }

    /**
     * Set friction (damping per second) used by the simulation shader.
     * @param {number} value
     */
    setFriction(value) {
        if (this.uFriction) this.uFriction.value = Number(value) || 0;
    }

    /**
     * Applies a previously loaded mask index to the active stage.
     *
     * @param {number} maskIndex
     * @param {object} [buildOptions={}]
     * @returns {boolean}
     */
    applyMask(maskIndex, buildOptions = {}) {
        if (!Number.isFinite(maskIndex)) return false;
        const normalizedIndex = Math.floor(maskIndex);
        if (!this.particles?.masks?.[normalizedIndex]) return false;
        const transitionEnabled = buildOptions?.transition !== false;
        const transitionDurationMs = Math.max(
            0,
            Number(buildOptions?.transitionDuration ?? buildOptions?.duration ?? 1400) || 0
        );

        if (transitionEnabled && transitionDurationMs > 0) {
            const fromPositions = this.particles.positions.slice();
            const fromColors = this.particles.colors.slice();

            this.particles.fillFromMask(normalizedIndex, buildOptions);
            const toPositions = this.particles.positions.slice();
            const toColors = this.particles.colors.slice();
            const nextCount = this.particles.count || this.maxParticles;

            this.particles.positions.set(fromPositions);
            this.particles.colors.set(fromColors);
            this.particles.count = Math.max(0, Math.min(this.maxParticles, Math.floor(nextCount)));

            this._maskTransition = {
                startTimeMs: NaN,
                durationMs: transitionDurationMs,
                fromPositions,
                toPositions,
                fromColors,
                toColors,
                count: nextCount
            };
            this._syncStageFromParticles();
        } else {
            this._maskTransition = null;
            this.particles.fillFromMask(normalizedIndex, buildOptions);
            this._syncStageFromParticles();
        }
        this.maskIndex = normalizedIndex;
        return true;
    }

    /**
     * Loads a mask image and optionally applies it immediately.
     *
     * @param {string} source Image URL.
     * @param {{
     *   apply?:boolean,
     *   buildOptions?:object,
     *   contentBox?:{width?:number,height?:number},
     *   preserveColor?:boolean,
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}>}
     */
    async loadMask(source, options = {}) {
        const { apply = true, buildOptions = {}, ...maskOptions } = options;
        if (!source || !this.particles?.loadMask) {
            return { maskIndex: -1, count: this.particles?.count || 0 };
        }

        const maskIndex = await this.particles.loadMask(source, maskOptions);
        if (apply) {
            const applyOptions = { ...buildOptions };
            if (applyOptions.preserveMaskColor === undefined && maskOptions.preserveColor !== undefined) {
                applyOptions.preserveMaskColor = maskOptions.preserveColor === true;
            }
            this.applyMask(maskIndex, applyOptions);
        }
        return { maskIndex, count: this.particles.count || 0 };
    }

    /**
     * Clears mask influence and rebuilds random/free particle distribution.
     *
     * @param {object} [buildOptions={}]
     */
    clearMask(buildOptions = {}) {
        if (!this.particles) return;
        this._maskTransition = null;
        this.particles.mask = null;
        this.maskIndex = null;
        this.particles.build(undefined, buildOptions);
        this._syncStageFromParticles();
    }

    /**
     * Captures the current particle state snapshot.
     *
     * @param {string} [name="origin"] Snapshot key.
     * @returns {object|null}
     */
    captureSnapshot(name = "origin") {
        if (!this.particles?.snapshot) return null;
        const snapshot = this.particles.snapshot();
        this._snapshots.set(name, snapshot);
        return snapshot;
    }

    /**
     * Restores a previously captured snapshot.
     *
     * @param {string} [name="origin"] Snapshot key.
     * @returns {boolean}
     */
    restoreSnapshot(name = "origin") {
        const snapshot = this._snapshots.get(name);
        if (!snapshot || !this.particles?.restore) return false;
        this.particles.restore(snapshot);
        this._syncStageFromParticles();
        return true;
    }

    /**
     * Resets particle state back to a stored snapshot.
     *
     * @param {{snapshot?:string}} [options={}]
     * @returns {boolean}
     */
    reset(options = {}) {
        const { snapshot = "origin" } = options;
        return this.restoreSnapshot(snapshot);
    }

    /**
     * Sets the shared interaction target for orbit and repel.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} [radius=0.4]
     */
    setTarget(x, y, z, radius = 0.4) {
        const nx = Number(x) || 0;
        const ny = Number(y) || 0;
        const nz = Number(z) || 0;
        const nr = Math.max(0.0001, Number(radius) || 0.4);
        this.orbitPoint[0] = nx;
        this.orbitPoint[1] = ny;
        this.orbitPoint[2] = nz;
        this.orbitPoint[3] = nr;
        this.repelPoint[0] = nx;
        this.repelPoint[1] = ny;
        this.repelPoint[2] = nz;
        this.repelPoint[3] = nr;
    }

    /**
     * Enables/disables orbit mode and optional target update.
     *
     * @param {boolean} enabled
     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]
     */
    setOrbit(enabled, options = {}) {
        if (options.x !== undefined) this.orbitPoint[0] = Number(options.x) || 0;
        if (options.y !== undefined) this.orbitPoint[1] = Number(options.y) || 0;
        if (options.z !== undefined) this.orbitPoint[2] = Number(options.z) || 0;
        if (options.radius !== undefined) {
            this.orbitPoint[3] = Math.max(0.0001, Number(options.radius) || this.orbitPoint[3] || 0.4);
        }
        if (options.fieldRadius !== undefined) {
            const nextField = Number(options.fieldRadius);
            this.orbitFieldRadius = Number.isFinite(nextField) && nextField > 0 ? nextField : null;
        }
        this.orbit.value = enabled ? 1 : 0;
        if (enabled) this.repel.value = 0;
    }

    /**
     * Enables/disables repel mode and optional target update.
     *
     * @param {boolean} enabled
     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]
     */
    setRepel(enabled, options = {}) {
        if (options.x !== undefined) this.repelPoint[0] = Number(options.x) || 0;
        if (options.y !== undefined) this.repelPoint[1] = Number(options.y) || 0;
        if (options.z !== undefined) this.repelPoint[2] = Number(options.z) || 0;
        if (options.radius !== undefined) {
            this.repelPoint[3] = Math.max(0.0001, Number(options.radius) || this.repelPoint[3] || 0.4);
        }
        if (options.fieldRadius !== undefined) {
            const nextField = Number(options.fieldRadius);
            this.repelFieldRadius = Number.isFinite(nextField) && nextField > 0 ? nextField : null;
        }
        this.repel.value = enabled ? 1 : 0;
        if (enabled) this.orbit.value = 0;
    }

    /**
     * Sets simulation interaction mode.
     *
     * @param {"idle"|"orbit"|"repel"} mode
     */
    setMode(mode) {
        switch (mode) {
            case "orbit":
                this.setOrbit(true);
                break;
            case "repel":
                this.setRepel(true);
                break;
            default:
                this.orbit.value = 0;
                this.repel.value = 0;
                break;
        }
    }

    /**
     * Applies motion multiplier values.
     *
     * @param {{drift?:number,orbitSpeed?:number,repelStrength?:number,orbitPull?:number}} [config={}]
     */
    setMotion(config = {}) {
        if (config.drift !== undefined) this.driftScale = Math.max(0, Number(config.drift) || 0);
        if (config.orbitSpeed !== undefined) this.orbitSpeedScale = Math.max(0, Number(config.orbitSpeed) || 0);
        if (config.repelStrength !== undefined)
            this.repelStrengthScale = Math.max(0, Number(config.repelStrength) || 0);
        if (config.orbitPull !== undefined) this.orbitPullScale = Math.max(0, Number(config.orbitPull) || 0);
    }

    /**
     * Pushes particles away from a center point for an explosive scatter effect.
     *
     * @param {{
     *   x?:number,
     *   y?:number,
     *   z?:number,
     *   minPush?:number,
     *   maxPush?:number,
     *   jitter?:number,
     *   seed?:number,
     *   captureAs?:string|null
     * }} [options={}]
     */
    scatter(options = {}) {
        const centerX = Number(options.x ?? this.orbitPoint[0]) || 0;
        const centerY = Number(options.y ?? this.orbitPoint[1]) || 0;
        const centerZ = Number(options.z ?? this.orbitPoint[2]) || 0;
        const minPush = Math.max(0, Number(options.minPush) || 0.1);
        const maxPush = Math.max(minPush, Number(options.maxPush) || 0.6);
        const jitterAmount = Math.max(0, Number(options.jitter) || 0.05);
        const { captureAs = null } = options;
        const rng = Number.isFinite(options.seed) ? createSeededRandom(options.seed) : Math.random;

        const count = Math.max(0, Math.min(this.particles.maxCount, this.particles.count || 0));
        const positions = this.particles.positions;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            let dx = positions[i3] - centerX;
            let dy = positions[i3 + 1] - centerY;
            let dz = positions[i3 + 2] - centerZ;
            let len = Math.hypot(dx, dy, dz);

            if (len < 0.0001) {
                dx = rng() * 2 - 1;
                dy = rng() * 2 - 1;
                dz = rng() * 2 - 1;
                len = Math.hypot(dx, dy, dz) || 1;
            }

            const inv = 1 / len;
            const push = minPush + rng() * (maxPush - minPush);
            positions[i3] += dx * inv * push + (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 1] += dy * inv * push + (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 2] += dz * inv * push + (rng() * 2 - 1) * jitterAmount;
        }

        this._syncStageFromParticles();
        if (captureAs) this.captureSnapshot(captureAs);
    }

    /**
     * Adds random jitter offset to active particles.
     *
     * @param {number} [amount=0.05]
     * @param {{seed?:number,captureAs?:string|null}} [options={}]
     */
    jitter(amount = 0.05, options = {}) {
        const { seed, captureAs = null } = options;
        const rng = Number.isFinite(seed) ? createSeededRandom(seed) : Math.random;
        const jitterAmount = Math.max(0, Number(amount) || 0);
        const count = Math.max(0, Math.min(this.particles.maxCount, this.particles.count || 0));
        const positions = this.particles.positions;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] += (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 1] += (rng() * 2 - 1) * jitterAmount;
            positions[i3 + 2] += (rng() * 2 - 1) * jitterAmount;
        }

        this._syncStageFromParticles();
        if (captureAs) this.captureSnapshot(captureAs);
    }

    /**
     * Returns active world-space bounds for particles.
     *
     * @returns {{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}|null}
     */
    getBounds() {
        return this.particles.getBounds();
    }

    /**
     * Generic runtime setter used by playground controls.
     * Supports vector index notation like `orbitPoint[0]`.
     *
     * @param {string} name Property name.
     * @param {*} value New value.
     */
    setValue(name, value) {
        let index;
        if (name.includes("[")) {
            [name, index] = name.split(/[\[\]]/);
            if (!isNaN(index)) index = parseInt(index, 10);
        }

        if (!isNaN(value)) value = Number(value);
        if (this[name] === undefined || this[name] === value) return;

        if (this[name] instanceof AnimationValue) {
            this[name].value = value;
            return;
        }

        if (this[name] instanceof Vector4D) {
            if (index === undefined) return;
            this[name][index.toString()] = value;
            return;
        }

        if (index === undefined) {
            this[name] = value;
        } else if (this[name] && typeof this[name] === "object") {
            this[name][index.toString()] = value;
        }
    }

    /**
     * Starts RAF-driven simulation/rendering.
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.time = { current: 0, last: 0, delta: 0 };
        this._boundUpdate ||= this.update.bind(this);
        this.rafId = requestAnimationFrame(this._boundUpdate);
    }

    /**
     * Stops RAF-driven simulation/rendering.
     */
    stop() {
        this.running = false;
        if (!this.rafId) return;
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    }

    /**
     * Executes one simulation + render frame.
     *
     * @param {number} time RAF timestamp in milliseconds.
     */
    update(time) {
        const { gl } = this;
        if (!this.running || !this.feedback) return;

        this.time.last = this.time.current || 0;
        this.time.current = time / 1000;
        this.time.delta = this.time.current - this.time.last;

        const maskTransitionActive = this._applyMaskTransition(time);

        if (!maskTransitionActive) {
            if (this.emitter) {
                try {
                    this.emitter.update(this.time.delta);
                    this._syncStageFromParticles();
                } catch (err) {
                    console.error("[WebGLParticleSystem] Emitter update failed:", err);
                }
            }
            gl.useProgram(this.feedback.program);
            this.uScene.value = [
                Number(this.canvas.width),
                Number(this.canvas.height),
                Number(this.time.current),
                Number(this.time.delta)
            ];
            this.uMotion.value = [
                Number(this.driftScale) || 0,
                Number(this.orbitSpeedScale) || 0,
                Number(this.repelStrengthScale) || 0,
                Number(this.orbitPullScale) || 0
            ];
            const orbitRadius = Math.max(0.0001, Number(this.orbitPoint[3]) || 0.4);
            const repelRadius = Math.max(0.0001, Number(this.repelPoint[3]) || 0.4);
            const orbitFieldRadius =
                Number.isFinite(Number(this.orbitFieldRadius)) && Number(this.orbitFieldRadius) > 0
                    ? Math.max(orbitRadius, Number(this.orbitFieldRadius))
                    : orbitRadius * 3;
            const repelFieldRadius =
                Number.isFinite(Number(this.repelFieldRadius)) && Number(this.repelFieldRadius) > 0
                    ? Math.max(repelRadius, Number(this.repelFieldRadius))
                    : repelRadius * 3;
            if (this.uOrbitFieldRadius) this.uOrbitFieldRadius.value = orbitFieldRadius;
            if (this.uRepelFieldRadius) this.uRepelFieldRadius.value = repelFieldRadius;

            if (this.uRepel && this.repel.dirty && (this.uRepel.value = this.repel.value) !== false) {
                this.repel.save();
            }
            if (this.repel.value === 1) {
                this.uTargetPoint.value = this.repelPoint.toArray();
            }

            if (this.uOrbit && this.orbit.dirty && (this.uOrbit.value = this.orbit.value) !== false) {
                this.orbit.save();
            }
            if (this.orbit.value === 1) {
                this.uTargetPoint.value = this.orbitPoint.toArray();
            }

            this.feedback.update(this.time.delta);
            gl.flush();
        }

        gl.useProgram(this.program);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // Bind latest TF read buffers as render attributes.
        this.feedback.applyDownStreamData();
        gl.useProgram(this.program);
        gl.drawArrays(gl.POINTS, 0, this.particles.count);

        this.rafId = requestAnimationFrame(this._boundUpdate);
    }

    /**
     * Attach a CPU emitter adapter to this particle system.
     * @param {object} config Emitter configuration (x,y,z,paticlesPerSecond,direction,speed,spread,size,lifespan)
     * @returns {EmitterAdapter}
     */
    addEmitter(config = {}) {
        if (!this.particles) return null;
        this.emitter = new EmitterAdapter(this.particles, config);
        return this.emitter;
    }

    /**
     * Remove and disable the current emitter.
     */
    removeEmitter() {
        this.emitter = null;
    }
}

export default WebGLParticleSystem;
