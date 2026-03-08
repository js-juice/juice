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
 * Parses hex color input to normalized RGBA floats.
 *
 * @param {string|number[]|Float32Array} input
 * @returns {[number, number, number, number]|null}
 */
function normalizeColorInput(input) {
    if (Array.isArray(input) || input instanceof Float32Array) {
        const r = Number(input[0]);
        const g = Number(input[1]);
        const b = Number(input[2]);
        const a = Number(input[3]);
        if ([r, g, b].every(Number.isFinite)) {
            return [
                Math.max(0, Math.min(1, r)),
                Math.max(0, Math.min(1, g)),
                Math.max(0, Math.min(1, b)),
                Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1
            ];
        }
        return null;
    }
    if (typeof input !== "string") return null;
    const text = input.trim().toLowerCase();
    const full = text.match(/^#([0-9a-f]{6})$/);
    const short = text.match(/^#([0-9a-f]{3})$/);
    const hex = full
        ? full[1]
        : short
          ? `${short[1][0]}${short[1][0]}${short[1][1]}${short[1][1]}${short[1][2]}${short[1][2]}`
          : null;
    if (!hex) return null;
    return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
        1
    ];
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
        this.driftSpeedScale = 1.0;
        this.driftType = "relative";
        this.orbitSpeedScale = 1.0;
        this.repelStrengthScale = 1.0;
        this.orbitPullScale = 1.0;
        this._snapshots = new Map();
        this._maskTransition = null;
        this.emitter = null;

        this.particles = new ParticleStateBuffer(maxParticles, canvas.width, canvas.height);
        // Keep baseline motion subtle so drift reads as wobble, not ballistic travel.
        this.particles.config.maxSpeed = 0.03;
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
        this._refreshHomeStateFromDestinations();

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

            // For a standard perspective matrix:
            // projectionMatrix[1][1] = 1 / tan(fovY / 2)
            // projectionMatrix[0][0] = projectionMatrix[1][1] / aspect
            // So visible half-extents at a given depth are depth / m11 and depth / m00.
            float halfHeight = depth / projectionMatrix[1][1];
            float halfWidth = depth / projectionMatrix[0][0];

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
        this.uDriftSpeed = this.feedback.addUniform("uDriftSpeed", VariableTypes.FLOAT, 1.0);
        this.uDriftMode = this.feedback.addUniform("uDriftMode", VariableTypes.FLOAT, 0.0);
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
        this.uGravity = this.feedback.addUniform("uGravity", VariableTypes.FLOAT_VEC3, [0.0, 0.0, 0.0]);
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
        this.feedbackState = this.feedback.addVariable("aState", VariableTypes.FLOAT_VEC4, this.particles.states, {});
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
            float particleAge = aState[1];
            vec3 home = vec3(aState[2], aState[3], aState[0]);
            if (home.z > -near || home.z < -far) {
                home.z = position.z;
            }
            float absoluteDriftX = position.x;
            float absoluteDriftY = position.y;
            bool driftAbsolute = false;

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

            } else if (uOrbit) {
                vec3 target = vec3(uTargetPoint.x, uTargetPoint.y, uTargetPoint.z);
                float targetRadius = max(0.02, uTargetPoint.w);
                float fieldRadius = max(targetRadius, uOrbitFieldRadius);
                // Orbit reach is evaluated in XY so depth variation doesn't disqualify most particles.
                float homeDistanceToTarget = length(home.xy - target.xy);
                bool orbitEligible = homeDistanceToTarget <= fieldRadius;

                vec3 rel = position - target;
                float d = length(rel);

                if (orbitEligible) {
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

                } else {
                    // Outside orbit reach (based on original/home position), ease back home.
                    vec3 toHome = home - position;
                    float homeDistance = length(toHome);
                    if (homeDistance > 0.0001) {
                        float homeLerp = 1.0 - exp(-max(0.0, delta) * 5.0);
                        homeLerp = clamp(homeLerp, 0.0, 0.2);
                        position += toHome * homeLerp;
                    }
                    float settle = clamp(delta * 8.0, 0.0, 1.0);
                    velocity *= (1.0 - settle);
                }
            } else {
                // Orbit is off: settle particles back toward home.
                vec3 toHome = home - position;
                float homeDistance = length(toHome);
                if (homeDistance > 0.0001) {
                    float homeLerp = 1.0 - exp(-max(0.0, delta) * 6.0);
                    homeLerp = clamp(homeLerp, 0.0, 0.25);
                    position += toHome * homeLerp;
                }
                float settle = clamp(delta * 10.0, 0.0, 1.0);
                velocity *= (1.0 - settle);

                float driftSeed = float(index) * 0.013;
                float drift = 0.0045 * uMotion.x;
                float driftSpeed = max(0.0, uDriftSpeed);
                float driftTime = time * max(0.001, driftSpeed);
                float driftAmount = drift * step(0.0001, driftSpeed);
                float wobbleX = sin(driftTime * 1.9 + driftSeed) + sin(driftTime * 0.63 + driftSeed * 2.3) * 0.45;
                float wobbleY = cos(driftTime * 1.7 + driftSeed * 1.7) + cos(driftTime * 0.57 + driftSeed * 2.9) * 0.45;
                if (uDriftMode >= 0.5) {
                    // Absolute: oscillate around the particle's anchor (starting XY).
                    absoluteDriftX = home.x + wobbleX * driftAmount;
                    absoluteDriftY = home.y + wobbleY * driftAmount;
                    position.x = absoluteDriftX;
                    position.y = absoluteDriftY;
                    driftAbsolute = true;
                } else {
                    // Relative: accumulate from current position.
                    position.x += wobbleX * driftAmount;
                    position.y += wobbleY * driftAmount;
                }
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
            if (driftAbsolute) {
                // Keep absolute drift centered on anchor in XY.
                velocity.x = 0.0;
                velocity.y = 0.0;
            }
            position += velocity * delta;
            if (driftAbsolute) {
                position.x = absoluteDriftX;
                position.y = absoluteDriftY;
            }

            aPositionOut = position;
            aVelocityOut = velocity;
            aStateOut = vec4(home.z, particleAge + delta, home.x, home.y);
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
     * Stores each active particle's home position in state channels used by the shader.
     * Encoding: state.x = home.z, state.z = home.x, state.w = home.y.
     *
     * @private
     */
    _refreshHomeStateFromDestinations() {
        if (!this.particles?.states || !this.particles?.destinations || !this.particles?.positions) return;
        const count = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        for (let i = 0; i < count; i += 1) {
            const i3 = i * 3;
            const i4 = i * 4;
            const homeX = Number.isFinite(this.particles.destinations[i3])
                ? this.particles.destinations[i3]
                : this.particles.positions[i3];
            const homeY = Number.isFinite(this.particles.destinations[i3 + 1])
                ? this.particles.destinations[i3 + 1]
                : this.particles.positions[i3 + 1];
            const homeZ = Number.isFinite(this.particles.destinations[i3 + 2])
                ? this.particles.destinations[i3 + 2]
                : this.particles.positions[i3 + 2];
            this.particles.states[i4] = homeZ;
            this.particles.states[i4 + 2] = homeX;
            this.particles.states[i4 + 3] = homeY;
        }
    }

    /**
     * Syncs current CPU particle data into GPU simulation buffers.
     *
     * @private
     */
    _syncStageFromParticles() {
        this._refreshHomeStateFromDestinations();
        this._syncFeedbackVariable(this.feedbackPosition, this.particles.positions);
        this._syncFeedbackVariable(this.feedbackVelocity, this.particles.velocities);
        this._syncFeedbackVariable(this.feedbackState, this.particles.states);
        this._syncFeedbackVariable(this.feedbackColor, this.particles.colors);
        if (this.feedback) {
            this.feedback.points = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        }
    }

    /**
     * Refreshes and uploads only encoded home state channels.
     *
     * @private
     */
    _syncHomeState() {
        this._refreshHomeStateFromDestinations();
        this._syncFeedbackVariable(this.feedbackState, this.particles.states);
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
     * Sets a single default particle color.
     * Also updates particle state defaults used by rebuilds/masks in non-preserve mode.
     *
     * @param {string|number[]|Float32Array} color
     */
    setParticleColor(color) {
        const resolved = normalizeColorInput(color);
        if (!resolved || !this.particles?.colors) return;

        if (typeof this.particles.setStateDefaults === "function") {
            this.particles.setStateDefaults({ color: resolved.slice() });
        }

        const count = Math.max(0, Math.min(this.maxParticles, this.particles.count || 0));
        for (let i = 0; i < count; i += 1) {
            const i4 = i * 4;
            this.particles.colors[i4] = resolved[0];
            this.particles.colors[i4 + 1] = resolved[1];
            this.particles.colors[i4 + 2] = resolved[2];
            this.particles.colors[i4 + 3] = resolved[3];
        }

        this._syncFeedbackVariable(this.feedbackColor, this.particles.colors);
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
     *   particleGap?:number,
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}>}
     */
    async loadMask(source, options = {}) {
        console.log("loadMask", source, options);
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
        this._syncHomeState();
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
        this._syncHomeState();
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
     * @param {{drift?:number,driftSpeed?:number,driftType?:"relative"|"absolute",orbitSpeed?:number,repelStrength?:number,orbitPull?:number}} [config={}]
     */
    setMotion(config = {}) {
        if (config.drift !== undefined) this.driftScale = Math.min(1, Math.max(0, Number(config.drift) || 0));
        if (config.driftSpeed !== undefined) this.driftSpeedScale = Math.max(0, Number(config.driftSpeed) || 0);
        if (config.driftType !== undefined) {
            const nextType = String(config.driftType || "")
                .trim()
                .toLowerCase();
            this.driftType = nextType === "absolute" ? "absolute" : "relative";
        }
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
            if (this.uDriftSpeed) this.uDriftSpeed.value = Number(this.driftSpeedScale) || 0;
            if (this.uDriftMode) this.uDriftMode.value = this.driftType === "absolute" ? 1 : 0;
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
