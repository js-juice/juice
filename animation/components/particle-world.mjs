/**
 * Particle world component wrapper for ParticleWorld animation system.
 * Custom element integrating the particle engine with WebGL/Canvas rendering.
 *
 * Runtime responsibilities:
 * - Own the host canvas element.
 * - Keep renderer size in sync with host layout.
 * - Bridge playground controls to particle engine state.
 *
 * @module Animation/Components/ParticleWorld
 *
 * @attribute {"canvas"|"webgl"|"dom"} renderer - Renderer backend. WebGL is required for masks and simulation controls.
 * @attribute {number|string} width - Component width handled by the base component.
 * @attribute {number|string} height - Component height handled by the base component.
 * @attribute {number|string} depth - Reserved depth value exposed for markup parity.
 * @attribute {number} particles - Maximum particle capacity. Alias: `max-particles`.
 * @attribute {number} emit-rate - Reserved constructor value passed to the WebGL particle system.
 * @attribute {string} particle-color - Hex particle color, for example `#ffffff`.
 * @attribute {string} particle-type - Stored particle type label. The current WebGL renderer does not consume this value.
 * @attribute {number} particle-radius - Shared orbit/repel target radius. Alias: `radius`.
 * @attribute {number} particle-size - WebGL point size used when rendering particles.
 * @attribute {number} min-particle-size - Smallest WebGL point size after depth scaling.
 * @attribute {"square"|"circle"|"soft-circle"} particle-shape - WebGL point sprite shape.
 * @attribute {number} drift - Motion drift multiplier from 0 to 1.
 * @attribute {number} drift-speed - Drift animation speed multiplier.
 * @attribute {"relative"|"absolute"} drift-type - Drift coordinate mode.
 * @attribute {number} orbit-speed - Orbit speed multiplier.
 * @attribute {number} orbit-pull - Orbit convergence multiplier.
 * @attribute {number} orbit-escape - Ratio of orbiting particles that can flare away from the orbit, from 0 to 1.
 * @attribute {number} orbit-escape-push - Outward push strength for orbit escape particles.
 * @attribute {number} repel-strength - Repel force multiplier.
 * @attribute {"idle"|"orbit"|"repel"} mode - Interaction mode. `orbit` and `repel` boolean attributes also toggle modes.
 * @attribute {boolean} orbit - Enables orbit mode.
 * @attribute {boolean} repel - Enables repel mode.
 * @attribute {number|string} target - Shared target as JSON, comma list, or space list: `x,y,z,radius`.
 * @attribute {number} target-x - Shared target X coordinate.
 * @attribute {number} target-y - Shared target Y coordinate.
 * @attribute {number} target-z - Shared target Z coordinate.
 * @attribute {number} orbit-radius - Orbit target radius.
 * @attribute {number} repel-radius - Repel target radius.
 * @attribute {number} orbit-reach - Orbit field radius.
 * @attribute {number} repel-reach - Repel field radius.
 * @attribute {number|string} gravity - Gravity vector as JSON, comma list, or space list: `x,y,z`.
 * @attribute {number} gravity-x - Gravity X component.
 * @attribute {number} gravity-y - Gravity Y component.
 * @attribute {number} gravity-z - Gravity Z component.
 * @attribute {number} friction - Simulation damping per second.
 * @attribute {string} mask - Mask image URL/data URL loaded with `setMask()`.
 * @attribute {string|object} mask-options - JSON object passed to `setMask()`.
 * @attribute {"replace"|"append"} mask-mode - `replace` uses the active particles for the mask; `append` creates new mask particles after existing particles.
 * @attribute {number} mask-scatter - Random mask-point offset from 0 to 1. `0` keeps pristine mask positions.
 * @attribute {"box"|"sphere"} mask-scatter-shape - Scatter distribution. `box` preserves rectangular/cubic bounds; `sphere` disperses points radially.
 * @attribute {number|string} mask-anchor - Mask transform anchor as JSON, comma list, or space list: `x,y,z`.
 * @attribute {number} mask-anchor-x - Mask transform anchor X coordinate.
 * @attribute {number} mask-anchor-y - Mask transform anchor Y coordinate.
 * @attribute {number} mask-anchor-z - Mask transform anchor Z coordinate.
 * @attribute {number|string} mask-rotation - Mask rotation around the anchor in radians, or a string ending in `deg`.
 * @attribute {number} mask-width - Mask content width as a fraction; values above 2 are treated as percentages.
 * @attribute {number} mask-height - Mask content height as a fraction; values above 2 are treated as percentages.
 * @attribute {"center"|"top-left"|"top-center"|"top-right"|"center-left"|"center-right"|"bottom-left"|"bottom-center"|"bottom-right"|"custom"} mask-align - Mask alignment when explicit mask position is not provided.
 * @attribute {number|string} mask-position - Mask position as JSON, comma list, or space list: `x,y,z`.
 * @attribute {number} mask-x - Mask X offset used with `mask-align="custom"`.
 * @attribute {number} mask-y - Mask Y offset used with `mask-align="custom"`.
 * @attribute {number} mask-z - Mask depth.
 * @attribute {boolean} preserve-color - Uses mask pixel colors. Alias: `mask-preserve-color`.
 * @attribute {number} particle-gap - Mask pixel sampling gap. Alias: `mask-particle-gap`.
 * @attribute {number} alpha-threshold - Minimum mask pixel alpha, 0 to 255.
 * @attribute {boolean} transition - Enables mask transition. Omit or set false to disable.
 * @attribute {number} transition-duration - Mask transition duration in milliseconds.
 * @attribute {number} transition-spread - Mask transition stagger from 0 to 1.
 * @attribute {string|object} spawn-volume - JSON object with `{type, params}` for random non-mask seeding.
 * @attribute {number} max-speed - Initial random velocity range used by the particle buffer.
 * @attribute {number|string} camera-pan - Fake camera pan as JSON, comma list, or space list: `x,y,z`.
 * @attribute {number|string} camera-angle - Fake camera yaw/pitch as JSON, comma list, or space list: `yaw,pitch`.
 * @attribute {number} camera-pan-x - Fake camera pan X value.
 * @attribute {number} camera-pan-y - Fake camera pan Y value.
 * @attribute {number} camera-pan-z - Fake camera pan Z value.
 * @attribute {number} camera-yaw - Fake camera yaw value.
 * @attribute {number} camera-pitch - Fake camera pitch value.
 * @attribute {number} camera-pan-scale - Pan movement multiplier.
 * @attribute {number} camera-angle-scale - Yaw/pitch movement multiplier.
 * @attribute {number} camera-depth-effect - Depth parallax strength.
 * @attribute {number} camera-max-step - Maximum fake camera movement applied per frame.
 * @attribute {boolean} ignore-positioning - When slotted as a stage background, prevents stage camera positioning from moving this world.
 * @attribute {boolean} emitter - Enables the WebGL emitter adapter.
 * @attribute {string|object} emitter-config - JSON object passed to `addEmitter()`.
 *
 * DOM methods for imperative controls:
 * - `setMask(source, options)` loads and applies a mask image.
 * - `setMaskSettings(options)` updates active mask settings like `particleGap`, `scatter`, and transition values.
 * - `loadMask(source, options)` loads a mask and optionally applies it.
 * - `applyMask(maskIndex, buildOptions)` applies a previously loaded mask.
 * - `clearMask(buildOptions)` removes mask influence and rebuilds particles.
 * - `setParticleCount(count)` recreates the WebGL engine with a new capacity.
 * - `setParticleColor(color)` changes active/default particle color.
 * - `setTarget(x, y, z, radius)` updates the shared orbit/repel target.
 * - `setOrbit(enabled, options)`, `setRepel(enabled, options)`, and `setMode(mode)` change interaction mode.
 * - `createRepelPoint(options)` and `createOrbitPoint(options)` return handles with `moveTo()`, `position()`, `update()`, and `disable()`.
 * - `setMotion(config)` / `applyMotionConfig(config)` update drift/orbit/repel motion.
 * - `setCameraPan(x, y, z)`, `moveCameraPan(x, y, z)`, `setCameraAngle(yaw, pitch)`, `moveCameraAngle(yaw, pitch)`,
 *   `setCameraMotion(config)`, and `setCameraDepthEffect(value)` control the fake depth/parallax camera.
 * - `setDebugCrosshair(mode)` controls the particle debug overlay.
 * - `setGravity([x, y, z])` and `setFriction(value)` update simulation environment.
 * - `addEmitter(config)`, `removeEmitter()`, `getEmitter()`, `clearParticles()`, and `setParticleBehavior(config)` control emitter particles.
 * - `scatter(options)`, `jitter(amount, options)`, `captureSnapshot(name)`, `restoreSnapshot(name)`, `reset(options)`,
 *   `getBounds()`, `start()`, `stop()`, `particles`, and `setValue(name, value)` are also callable on the element.
 */

import Component from "../../ui/component.mjs";
import { random, randomBetween } from "../../core/Util/Math.mjs";
import WebGLParticleSystem from "../graphics/webgl/webgl-particle-system.mjs";

const PARTICLE_CONFIG = {
    maxParticles: 2000,
    density: 0,
    randomness: 1,
    mask: null,
    env: {
        forces: []
    }
};

function createParticleConfig() {
    return {
        maxParticles: PARTICLE_CONFIG.maxParticles,
        density: PARTICLE_CONFIG.density,
        randomness: PARTICLE_CONFIG.randomness,
        mask: PARTICLE_CONFIG.mask,
        emitRate: 10,
        env: {
            forces: [...PARTICLE_CONFIG.env.forces]
        }
    };
}

function parseNumber(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function parseBoolean(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined) return false;
    const text = String(value).trim().toLowerCase();
    if (!text.length) return true;
    return !["false", "0", "no", "off", "unchecked"].includes(text);
}

function parseObject(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_error) {
        return fallback;
    }
}

function parseVector(value, fallback = []) {
    if (Array.isArray(value)) return value.map(Number);
    if (value && typeof value === "object") {
        return [value.x, value.y, value.z, value.radius ?? value.r].map(Number);
    }
    if (typeof value !== "string") return fallback;
    const text = value.trim();
    if (!text.length) return fallback;
    if (text.startsWith("[") || text.startsWith("{")) return parseVector(parseObject(text, fallback), fallback);
    return text
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(Number);
}

function normalizeScale(value, fallback = null) {
    const number = parseNumber(value, fallback);
    if (number === null) return fallback;
    return Math.abs(number) > 2 ? number / 100 : number;
}

function alignMaskPosition(align, scaleX, scaleY) {
    const left = -1 + scaleX;
    const right = 1 - scaleX;
    const top = 1 - scaleY;
    const bottom = -1 + scaleY;

    switch (align) {
        case "top-left":
            return { x: left, y: top };
        case "top-center":
            return { x: 0, y: top };
        case "top-right":
            return { x: right, y: top };
        case "center-left":
            return { x: left, y: 0 };
        case "center-right":
            return { x: right, y: 0 };
        case "bottom-left":
            return { x: left, y: bottom };
        case "bottom-center":
            return { x: 0, y: bottom };
        case "bottom-right":
            return { x: right, y: bottom };
        default:
            return { x: 0, y: 0 };
    }
}

/**
 * Represents the ParticleWorldComponent animation module class.
 */
class ParticleWorldComponent extends Component.HTMLElement {
    static tag = "particle-world";

    animate = true;
    count = 0;
    maskSettings = {};

    RESIZE_ACTION = "fill";

    static config = {
        properties: {
            renderer: { type: "string", default: "canvas", linked: true },
            width: { type: "number", default: 100, unit: "percent", linked: true },
            height: { type: "number", default: 100, unit: "percent", linked: true },
            depth: { type: "number", default: 100, unit: "percent", linked: true },
            particles: { type: "int", default: 2000, linked: true },
            "emit-rate": { type: "number", default: 10, linked: true },
            mask: { type: "string", default: "", linked: true },
            "mask-options": { type: "string", default: "{}", linked: true },
            "particle-color": { type: "string", default: "#ffffff", linked: true },
            "particle-type": { type: "string", default: "sphere", linked: true },
            "particle-radius": { type: "number", default: 0.4, linked: true },
            "particle-size": { type: "number", default: 3, linked: true },
            "min-particle-size": { type: "number", default: 1.5, linked: true },
            "particle-shape": { type: "string", default: "square", linked: true },
            drift: { type: "number", default: 0.1, linked: true },
            "drift-speed": { type: "number", default: 1, linked: true },
            "drift-type": { type: "string", default: "relative", linked: true },
            "orbit-speed": { type: "number", default: 1.5, linked: true },
            "orbit-pull": { type: "number", default: 1, linked: true },
            "orbit-escape": { type: "number", default: 0, linked: true },
            "orbit-escape-push": { type: "number", default: 1, linked: true },
            "repel-strength": { type: "number", default: 1, linked: true },
            mode: { type: "string", default: "idle", linked: true },
            orbit: { type: "exists", default: false, linked: true },
            repel: { type: "exists", default: false, linked: true },
            "target-x": { type: "number", default: 0, linked: true },
            "target-y": { type: "number", default: 0, linked: true },
            "target-z": { type: "number", default: -4, linked: true },
            "orbit-radius": { type: "number", default: 0.4, linked: true },
            "repel-radius": { type: "number", default: 0.4, linked: true },
            "orbit-reach": { type: "number", default: 1.2, linked: true },
            "repel-reach": { type: "number", default: 1.2, linked: true },
            gravity: { type: "string", default: "0,0,0", linked: true },
            "gravity-x": { type: "number", default: 0, linked: true },
            "gravity-y": { type: "number", default: 0, linked: true },
            "gravity-z": { type: "number", default: 0, linked: true },
            friction: { type: "number", default: 0, linked: true },
            "mask-width": { type: "number", default: 1, linked: true },
            "mask-height": { type: "number", default: 1, linked: true },
            "mask-align": { type: "string", default: "center", linked: true },
            "mask-mode": { type: "string", default: "replace", linked: true },
            "mask-scatter": { type: "number", default: 0, linked: true },
            "mask-scatter-shape": { type: "string", default: "box", linked: true },
            "mask-anchor-x": { type: "number", default: null, linked: true },
            "mask-anchor-y": { type: "number", default: null, linked: true },
            "mask-anchor-z": { type: "number", default: null, linked: true },
            "mask-rotation": { type: "string", default: 0, linked: true },
            "mask-x": { type: "number", default: 0, linked: true },
            "mask-y": { type: "number", default: 0, linked: true },
            "mask-z": { type: "number", default: -2, linked: true },
            "preserve-color": { type: "exists", default: false, linked: true },
            "particle-gap": { type: "int", default: 0, linked: true },
            "alpha-threshold": { type: "number", default: 1, linked: true },
            transition: { type: "boolean", default: true, linked: true },
            "transition-duration": { type: "number", default: 1400, linked: true },
            "transition-spread": { type: "number", default: 0, linked: true },
            "max-speed": { type: "number", default: 0.03, linked: true },
            "camera-pan-x": { type: "number", default: 0, linked: true },
            "camera-pan-y": { type: "number", default: 0, linked: true },
            "camera-pan-z": { type: "number", default: 0, linked: true },
            "camera-yaw": { type: "number", default: 0, linked: true },
            "camera-pitch": { type: "number", default: 0, linked: true },
            "camera-pan-scale": { type: "number", default: 1, linked: true },
            "camera-angle-scale": { type: "number", default: 1, linked: true },
            "camera-depth-effect": { type: "number", default: 1, linked: true },
            "camera-max-step": { type: "number", default: 0.04, linked: true },
            emitter: { type: "exists", default: false, linked: true },
            "emitter-config": { type: "string", default: "{}", linked: true }
        }
    };

    static attributeControls = [
        "max-particles",
        "radius",
        "target",
        "camera-pan",
        "camera-angle",
        "mask-position",
        "mask-anchor",
        "mask-preserve-color",
        "mask-particle-gap",
        "spawn-volume"
    ];

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: Object.keys(ParticleWorldComponent.config.properties),
            attributes: ParticleWorldComponent.attributeControls
        };
    }

    /**
     * Returns the current style value.
     * @returns {*} Current style value.
     */
    static get style() {
        return [
            {
                ":host": {
                    width: "100%",
                    height: "100%",
                    position: "absolute"
                },
                "#renderer": {
                    width: "100%",
                    height: "100%",
                    position: "relative"
                }
            }
        ];
    }

    /**
     * Executes html.
     * @returns {*} Result of html.
     */
    static html() {
        if (this.hasAttribute("renderer")) {
            this.renderer = this.getAttribute("renderer");
        }
        return `${this.renderer == "dom" ? `<div id="renderer"></div>` : `<canvas id="renderer"></canvas>`}`;
    }

    /**
     * Initializes component state.
     */
    constructor() {
        super();
    }

    openDebugPanel(bounds = [0, 0, 0, 0]) {
        const viewer = this.getViewer();
        if (!viewer?.openDebugPanel) return;
        const root = this.getRootNode?.() || document;
        const worlds = Array.from(
            root.querySelectorAll?.("particle-world") || document.querySelectorAll("particle-world")
        );
        viewer.openDebugPanel({
            world: this,
            bounds,
            worlds,
            instanceCount: worlds.length,
            instanceIndex: worlds.indexOf(this)
        });
    }

    _propertyName(attribute) {
        return String(attribute || "")
            .split("-")
            .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
            .join("");
    }

    _readSetting(name, fallback = null) {
        if (this.hasAttribute(name)) return this.getAttribute(name);
        const prop = this._propertyName(name);
        if (this[name] !== undefined) return this[name];
        if (this[prop] !== undefined) return this[prop];
        return fallback;
    }

    _readNumber(name, fallback = null) {
        return parseNumber(this._readSetting(name, fallback), fallback);
    }

    _readBoolean(name, fallback = false) {
        if (this.hasAttribute(name)) return parseBoolean(this.getAttribute(name));
        const value = this._readSetting(name, fallback);
        return value === fallback ? fallback : parseBoolean(value);
    }

    _syncParticleConfigFromAttributes() {
        const maxParticles = this._readNumber(
            "max-particles",
            this._readNumber("particles", this.particleConfig.maxParticles)
        );
        const emitRate = this._readNumber("emit-rate", this.particleConfig.emitRate);
        this.particleConfig.maxParticles = Math.max(8, Math.floor(maxParticles || this.particleConfig.maxParticles));
        this.particleConfig.emitRate = Math.max(0, Number(emitRate) || 0);
    }

    _buildTargetOptions() {
        const vector = parseVector(this._readSetting("target", null), []);
        const radius = this._readNumber("radius", this._readNumber("particle-radius", 0.4));
        return {
            x: parseNumber(vector[0], this._readNumber("target-x", 0)),
            y: parseNumber(vector[1], this._readNumber("target-y", 0)),
            z: parseNumber(vector[2], this._readNumber("target-z", -4)),
            radius: parseNumber(vector[3], radius)
        };
    }

    _buildMaskOptions() {
        const options = { ...parseObject(this._readSetting("mask-options", "{}"), {}) };
        const contentBox = { ...(options.contentBox || {}) };
        const width = normalizeScale(this._readSetting("mask-width", contentBox.width ?? 1), null);
        const height = normalizeScale(this._readSetting("mask-height", contentBox.height ?? 1), null);
        if (width !== null || height !== null) {
            options.contentBox = {
                width: width ?? height ?? 1,
                height: height ?? width ?? 1
            };
        }

        const positionVector = parseVector(this._readSetting("mask-position", null), []);
        const align = String(this._readSetting("mask-align", "center") || "center").toLowerCase();
        const position = { ...(options.position || {}) };
        if (positionVector.length) {
            if (Number.isFinite(positionVector[0])) position.x = positionVector[0];
            if (Number.isFinite(positionVector[1])) position.y = positionVector[1];
            if (Number.isFinite(positionVector[2])) position.z = positionVector[2];
        } else if (align === "custom") {
            position.x = this._readNumber("mask-x", position.x ?? 0);
            position.y = this._readNumber("mask-y", position.y ?? 0);
        } else {
            Object.assign(
                position,
                alignMaskPosition(align, options.contentBox?.width ?? 1, options.contentBox?.height ?? 1)
            );
        }
        const maskZ = this._readNumber("mask-z", position.z);
        if (maskZ !== null) position.z = maskZ;
        if (Object.keys(position).length) options.position = position;

        const maskMode = String(
            this._readSetting("mask-mode", options.maskMode || options.mode || "replace") || "replace"
        ).toLowerCase();
        options.maskMode = maskMode === "append" ? "append" : "replace";

        const scatter = this._readNumber("mask-scatter", options.scatter);
        if (scatter !== null) options.scatter = Math.max(0, Math.min(1, scatter));
        const scatterShape = String(
            this._readSetting("mask-scatter-shape", options.scatterShape || "box")
        ).toLowerCase();
        options.scatterShape = scatterShape === "sphere" ? "sphere" : "box";

        const anchorVector = parseVector(this._readSetting("mask-anchor", null), []);
        const anchor = { ...(options.anchor || options.maskAnchor || {}) };
        if (anchorVector.length) {
            if (Number.isFinite(anchorVector[0])) anchor.x = anchorVector[0];
            if (Number.isFinite(anchorVector[1])) anchor.y = anchorVector[1];
            if (Number.isFinite(anchorVector[2])) anchor.z = anchorVector[2];
        }
        const anchorX = this._readNumber("mask-anchor-x", anchor.x);
        const anchorY = this._readNumber("mask-anchor-y", anchor.y);
        const anchorZ = this._readNumber("mask-anchor-z", anchor.z);
        if (anchorX !== null) anchor.x = anchorX;
        if (anchorY !== null) anchor.y = anchorY;
        if (anchorZ !== null) anchor.z = anchorZ;
        if (Object.keys(anchor).length) options.anchor = anchor;

        const rotation = this._readSetting("mask-rotation", options.rotation ?? options.rotate);
        if (rotation !== null && rotation !== undefined && rotation !== "") options.rotation = rotation;

        options.preserveColor = this._readBoolean(
            "mask-preserve-color",
            this._readBoolean("preserve-color", options.preserveColor === true)
        );
        const particleGap = this._readNumber(
            "mask-particle-gap",
            this._readNumber("particle-gap", options.particleGap)
        );
        if (particleGap !== null) options.particleGap = Math.max(0, Math.floor(particleGap));
        const alphaThreshold = this._readNumber("alpha-threshold", options.alphaThreshold);
        if (alphaThreshold !== null) options.alphaThreshold = Math.max(0, Math.min(255, alphaThreshold));

        options.buildOptions = { ...(options.buildOptions || {}) };
        options.buildOptions.maskMode = options.maskMode;
        if (options.scatter !== undefined) options.buildOptions.scatter = options.scatter;
        if (options.anchor !== undefined) options.buildOptions.anchor = options.anchor;
        if (options.rotation !== undefined) options.buildOptions.rotation = options.rotation;
        options.buildOptions.transition = this._readBoolean("transition", options.buildOptions.transition !== false);
        options.transition = options.buildOptions.transition;
        const duration = this._readNumber("transition-duration", options.buildOptions.transitionDuration);
        if (duration !== null) {
            options.buildOptions.transitionDuration = Math.max(0, duration);
            options.transitionDuration = options.buildOptions.transitionDuration;
        }
        const spread = this._readNumber("transition-spread", options.buildOptions.transitionSpread);
        if (spread !== null) {
            options.buildOptions.transitionSpread = Math.max(0, Math.min(1, spread));
            options.transitionSpread = options.buildOptions.transitionSpread;
        }
        return options;
    }

    _applyEngineAttributes({ applyMask = false, reloadMask = false, rebuildFreeParticles = false } = {}) {
        const viewer = this.getViewer();
        if (!viewer) return;

        const maxSpeed = this._readNumber("max-speed", null);
        if (maxSpeed !== null && viewer.particles?.config) viewer.particles.config.maxSpeed = maxSpeed;

        const spawnVolume = parseObject(this._readSetting("spawn-volume", null), null);
        if (spawnVolume?.type && viewer.particles?.setSpawnVolume) {
            viewer.particles.setSpawnVolume(spawnVolume.type, spawnVolume.params || {});
            rebuildFreeParticles = rebuildFreeParticles || !this._readSetting("mask", "");
        }

        this.setMotion({
            drift: this._readNumber("drift", 0.1),
            driftSpeed: this._readNumber("drift-speed", 1),
            driftType: this._readSetting("drift-type", "relative"),
            orbitSpeed: this._readNumber("orbit-speed", 1.5),
            orbitPull: this._readNumber("orbit-pull", 1),
            orbitEscape: this._readNumber("orbit-escape", 0),
            orbitEscapePush: this._readNumber("orbit-escape-push", 1),
            repelStrength: this._readNumber("repel-strength", 1)
        });

        const target = this._buildTargetOptions();
        this.setTarget(target.x, target.y, target.z, target.radius);
        this.setParticleRenderSize(this._readNumber("particle-size", 3), this._readNumber("min-particle-size", 1.5));
        this.setParticleShape(this._readSetting("particle-shape", "square"));
        this.setParticleColor(this._readSetting("particle-color", "#ffffff"));
        this.setValue("particleType", this._readSetting("particle-type", "sphere"));
        const gravity = this.hasAttribute("gravity")
            ? parseVector(this.getAttribute("gravity"), [0, 0, 0])
            : [this._readNumber("gravity-x", 0), this._readNumber("gravity-y", 0), this._readNumber("gravity-z", 0)];
        this.setGravity(gravity);
        this.setFriction(this._readNumber("friction", 0));
        const cameraPan = parseVector(this._readSetting("camera-pan", null), [
            this._readNumber("camera-pan-x", 0),
            this._readNumber("camera-pan-y", 0),
            this._readNumber("camera-pan-z", 0)
        ]);
        const cameraAngle = parseVector(this._readSetting("camera-angle", null), [
            this._readNumber("camera-yaw", 0),
            this._readNumber("camera-pitch", 0)
        ]);
        this.setCameraPan(parseNumber(cameraPan[0], 0), parseNumber(cameraPan[1], 0), parseNumber(cameraPan[2], 0));
        this.setCameraAngle(parseNumber(cameraAngle[0], 0), parseNumber(cameraAngle[1], 0));
        this.setCameraMotion({
            panScale: this._readNumber("camera-pan-scale", 1),
            angleScale: this._readNumber("camera-angle-scale", 1),
            depthEffect: this._readNumber("camera-depth-effect", 1),
            maxStep: this._readNumber("camera-max-step", 0.04)
        });

        const orbitEnabled = this._readBoolean("orbit", false) || this._readSetting("mode", "idle") === "orbit";
        const repelEnabled = this._readBoolean("repel", false) || this._readSetting("mode", "idle") === "repel";
        this.setOrbit(orbitEnabled && !repelEnabled, {
            ...target,
            radius: this._readNumber("orbit-radius", target.radius),
            fieldRadius: this._readNumber("orbit-reach", null),
            escape: this._readNumber("orbit-escape", 0),
            escapePush: this._readNumber("orbit-escape-push", 1)
        });
        this.setRepel(repelEnabled, {
            ...target,
            radius: this._readNumber("repel-radius", target.radius),
            fieldRadius: this._readNumber("repel-reach", null)
        });

        if (this._readBoolean("emitter", false)) {
            this.addEmitter(parseObject(this._readSetting("emitter-config", "{}"), {}));
        } else {
            this.removeEmitter();
        }

        if (rebuildFreeParticles && !this._readSetting("mask", "")) {
            this.clearMask();
        }

        const mask = this._readSetting("mask", "");
        if (applyMask && mask && (reloadMask || !Number.isFinite(viewer.maskIndex))) {
            this.setMask(mask, this._buildMaskOptions()).catch(() => {});
        } else if (applyMask) {
            this.applyActiveMaskSettings();
        }
    }

    /**
     * Returns the active particle renderer when available.
     *
     * @returns {WebGLParticleSystem|null}
     */
    get particles() {
        return this.particleViewer || null;
    }

    /**
     * Legacy alias for the active particle renderer.
     *
     * @returns {WebGLParticleSystem|null}
     */
    getViewer() {
        return this.particleViewer || null;
    }

    /**
     * Registers an external force descriptor on the component instance.
     * (Force integration is not currently wired into the WebGL path.)
     */
    addForce(force, vx, vy) {
        this.forces ||= {};
        this.forces[force] = { x: vx, y: vy };
    }

    /**
     * Removes a registered force descriptor.
     */
    removeForce(force) {
        delete this.forces[force];
    }

    /**
     * Legacy local arrays kept for optional non-WebGL/debug paths.
     * The active world flow uses `this.particleViewer` buffers.
     */
    beforeCreate() {
        this.particleConfig = createParticleConfig();
        this._viewerReadyPromise = new Promise((resolve) => {
            this._resolveViewerReady = resolve;
        });
        this._syncParticleConfigFromAttributes();
        const { maxParticles } = this.particleConfig;
        this.positions = new Float32Array(maxParticles * 3); // (x, y) positions
        this.velocities = new Float32Array(maxParticles * 3); // (vx, vy) velocities
        this.sizes = new Float32Array(maxParticles); // Particle sizes
        this.colors = new Float32Array(maxParticles * 4); // (r, g, b, a) colors
        this.lifetimes = new Float32Array(maxParticles); // Lifetimes

        this.orbits = new Float32Array(maxParticles * 3);
    }

    /**
     * Legacy update hook for non-WebGL/debug paths.
     */
    update(time) {
        // if (this.particleViewer) this.particleViewer.update(time.delta);
    }

    /**
     * Legacy render hook for non-WebGL/debug paths.
     */
    render() {
        /*
        const buffer = new CanvasBuffer(this.canvas);
        for (let i = 0; i < this.count; i++) {
            const p = i * 3;
            const x = this.positions[p];
            const y = this.positions[p + 1];
            const z = this.positions[p + 2];
            buffer.pixel(x, y, [255, 255, 255, 255]);
        }
        buffer.put(this.ctx);

        */
    }

    /**
     * Seeds local fallback arrays; active WebGL simulation uses engine-side buffers.
     */
    build() {
        const { randomness, maxParticles } = this.particleConfig || PARTICLE_CONFIG;
        this._ensureLocalParticleBuffers(maxParticles);
        const width = this.renderWidth || this.clientWidth || this.width || 1;
        const height = this.renderHeight || this.clientHeight || this.height || 1;
        const spawnPoint = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
        for (let i = 0; i < maxParticles; i++) {
            const position = [randomBetween(-1, 1), randomBetween(-1, 1), randomBetween(-1, 1)];
            const orbits = [100 + random(200), random(Math.PI * 2), 0.01 + random(0.02)];
            this.orbits.set(orbits, i * 3);
            this.positions.set(position, i * 3);
            this.lifetimes[i] = 0;
            this.count = i;
        }

        this.spawnPoint = spawnPoint;

        this.update({ delta: 0 });
        this.render();
    }

    _ensureLocalParticleBuffers(maxParticles = this.particleConfig?.maxParticles || PARTICLE_CONFIG.maxParticles) {
        const count = Math.max(8, Math.floor(Number(maxParticles) || PARTICLE_CONFIG.maxParticles));
        if (!this.positions || this.positions.length < count * 3) this.positions = new Float32Array(count * 3);
        if (!this.velocities || this.velocities.length < count * 3) this.velocities = new Float32Array(count * 3);
        if (!this.sizes || this.sizes.length < count) this.sizes = new Float32Array(count);
        if (!this.colors || this.colors.length < count * 4) this.colors = new Float32Array(count * 4);
        if (!this.lifetimes || this.lifetimes.length < count) this.lifetimes = new Float32Array(count);
        if (!this.orbits || this.orbits.length < count * 3) this.orbits = new Float32Array(count * 3);
    }

    /**
     * Computes render size from explicit params or host element metrics.
     *
     * @param {number} [width]
     * @param {number} [height]
     * @returns {{width:number,height:number}}
     */
    getRenderSize(width, height) {
        const rect = this.getBoundingClientRect();
        const w = Math.max(1, Math.floor(width || rect.width || this.clientWidth || this.offsetWidth || 1));
        const h = Math.max(1, Math.floor(height || rect.height || this.clientHeight || this.offsetHeight || 1));
        return { width: w, height: h };
    }

    /**
     * Resizes canvas and syncs projection uniforms/matrices.
     *
     * @param {number} width
     * @param {number} height
     */
    onResize(width, height) {
        const size = this.getRenderSize(width, height);
        this.renderWidth = size.width;
        this.renderHeight = size.height;
        if (this.renderer == "canvas" || this.renderer == "webgl") {
            const canvas = this.ref("renderer");
            canvas.width = size.width;
            canvas.height = size.height;
            if (this.particleViewer?.particles?.resize) {
                this.particleViewer.particles.resize(size.width, size.height);
                const matrix = this.particleViewer.particles.projection?.matrix;
                if (matrix) {
                    if (this.particleViewer.projectionMatrix) this.particleViewer.projectionMatrix.value = matrix;
                    if (this.particleViewer.uProjectionMatrix) this.particleViewer.uProjectionMatrix.value = matrix;
                }
            }
        }
        if (this.renderer === "webgl") return;
        this.build();
    }

    /**
     * First-connect lifecycle:
     * - create renderer context
     * - instantiate WebGL particle system
     * - attach resize observer
     */
    onFirstConnect() {
        const canvas = this.ref("renderer");
        this.canvas = canvas;
        const size = this.getRenderSize();
        canvas.width = size.width;
        canvas.height = size.height;
        this.renderWidth = size.width;
        this.renderHeight = size.height;
        if (this.renderer == "webgl") {
            this._syncParticleConfigFromAttributes();
            const { maxParticles, emitRate } = this.particleConfig;
            try {
                this.particleViewer = new WebGLParticleSystem(this.canvas, maxParticles, emitRate, {
                    particleSize: this._readNumber("particle-size", 3),
                    minParticleSize: this._readNumber("min-particle-size", 1.5),
                    particleShape: this._readSetting("particle-shape", "square")
                });
                this.particleViewer.worldElement = this;
                this.particleViewer.start();
                this._applyEngineAttributes({ applyMask: true, rebuildFreeParticles: true });
            } catch (_error) {
                this.renderer = "canvas";
                this.ctx = canvas.getContext("2d");
            }
        } else {
            this.ctx = canvas.getContext("2d");
        }
        if (this._resolveViewerReady) {
            this._resolveViewerReady(this.getViewer());
            this._resolveViewerReady = null;
        }
        this.dispatchEvent(new CustomEvent("viewer-ready", { detail: { viewer: this.getViewer() } }));

        // Keep canvas dimensions in sync with actual host size.
        if (typeof ResizeObserver === "function") {
            this._resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (!entry) return;
                const box = entry.contentRect;
                const w = Math.max(1, Math.floor(box.width));
                const h = Math.max(1, Math.floor(box.height));
                if (w !== this.renderWidth || h !== this.renderHeight) this.onResize(w, h);
            });
            this._resizeObserver.observe(this);
        } else {
            this._onWindowResize = () => {
                const next = this.getRenderSize();
                if (next.width !== this.renderWidth || next.height !== this.renderHeight) {
                    this.onResize(next.width, next.height);
                }
            };
            window.addEventListener("resize", this._onWindowResize);
        }

        requestAnimationFrame(() => {
            const next = this.getRenderSize();
            if (next.width !== this.renderWidth || next.height !== this.renderHeight) {
                this.onResize(next.width, next.height);
            }
        });
    }

    /**
     * Recreates the particle engine with a new max particle count.
     *
     * @param {number} nextCount
     * @returns {number} Applied particle count.
     */
    setParticleCount(nextCount, force = false) {
        const value = Math.max(8, Math.floor(Number(nextCount) || this.particleConfig.maxParticles));
        if (!force && value === this.particleConfig.maxParticles) return value;
        this.particleConfig.maxParticles = value;
        if (this.renderer !== "webgl" || !this.canvas) return value;

        const previous = this.particleViewer;
        if (previous?.stop) previous.stop();

        const { emitRate } = this.particleConfig;
        this.particleViewer = new WebGLParticleSystem(this.canvas, value, emitRate, {
            particleSize: this._readNumber("particle-size", 3),
            minParticleSize: this._readNumber("min-particle-size", 1.5),
            particleShape: this._readSetting("particle-shape", "square")
        });
        this.particleViewer.worldElement = this;
        this.particleViewer.start();
        this._applyEngineAttributes({ applyMask: true, rebuildFreeParticles: true });
        this.dispatchEvent(new CustomEvent("particle-count", { detail: { value } }));
        return value;
    }

    /**
     * Loads and applies a mask to the active WebGL particle stage.
     *
     * @param {string} source
     * @param {{
     *   buildOptions?:object,
     *   contentBox?:{width?:number,height?:number},
     *   preserveColor?:boolean,
     *   particleGap?:number,
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}|null>}
     */
    async setMask(source, options = {}) {
        if (!source || this.renderer !== "webgl") return null;
        const viewer = this.getViewer()?.loadMask ? this.getViewer() : await this._viewerReadyPromise;
        if (!viewer?.loadMask) return null;
        const baseOptions = { apply: true, ...this.maskSettings, ...this._buildMaskOptions() };
        const loadOptions =
            typeof options === "function"
                ? (...args) => this._mergeMaskResolverOptions(baseOptions, options(...args))
                : { ...baseOptions, ...options };
        const result = await viewer.loadMask(source, loadOptions);
        this.dispatchEvent(new CustomEvent("mask-loaded", { detail: { source, ...result } }));
        return result;
    }

    /**
     * Updates active mask settings and reapplies the loaded mask without reloading the source image.
     *
     * @param {{maskMode?:"replace"|"append",particleGap?:number,scatter?:number,anchor?:object,rotation?:number|string,transition?:boolean,transitionDuration?:number,transitionSpread?:number}} [settings={}]
     * @returns {object} Active mask settings.
     */
    setMaskSettings(settings = {}) {
        if (!settings || typeof settings !== "object") return this.maskSettings;
        this.maskSettings = { ...this.maskSettings, ...settings };
        this.applyActiveMaskSettings();
        return this.maskSettings;
    }

    /**
     * Reapplies the active loaded mask with current component and runtime settings.
     *
     * @param {object} [settings={}]
     * @returns {boolean}
     */
    applyActiveMaskSettings(settings = {}) {
        if (settings && typeof settings === "object") {
            this.maskSettings = { ...this.maskSettings, ...settings };
        }
        const viewer = this.getViewer();
        if (viewer?.applyMask && Number.isFinite(viewer.maskIndex)) {
            return viewer.applyMask(viewer.maskIndex, {
                ...this._buildMaskOptions(),
                ...this.maskSettings,
                reuseMaskRange: true
            });
        }
        return false;
    }

    /**
     * Loads a mask image to the WebGL particle system.
     *
     * @param {string} source
     * @param {{
     *   apply?:boolean,
     *   buildOptions?:object,
     *   contentBox?:{width?:number,height?:number},
     *   preserveColor?:boolean,
     *   particleGap?:number,
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}|null>}
     */
    async loadMask(source, options = {}) {
        if (!source || this.renderer !== "webgl") return null;
        const viewer = this.getViewer()?.loadMask ? this.getViewer() : await this._viewerReadyPromise;
        if (!viewer?.loadMask) return null;
        const baseOptions = { ...this.maskSettings, ...this._buildMaskOptions() };
        return viewer.loadMask(
            source,
            typeof options === "function"
                ? (...args) => this._mergeMaskResolverOptions(baseOptions, options(...args))
                : { ...baseOptions, ...options }
        );
    }

    _mergeMaskResolverOptions(baseOptions, resolvedOptions = {}) {
        const resolved = resolvedOptions && typeof resolvedOptions === "object" ? resolvedOptions : {};
        const merged = { ...baseOptions, ...resolved };
        const usesPixelPosition =
            (Number.isFinite(Number(resolved.x)) || Number.isFinite(Number(resolved.y))) && !resolved.position;
        if (usesPixelPosition) {
            delete merged.position;
            if (!resolved.contentBox) delete merged.contentBox;
        }
        return merged;
    }

    /**
     * Applies a preloaded mask index to active particles.
     *
     * @param {number} maskIndex
     * @param {object} [buildOptions={}]
     * @returns {boolean}
     */
    applyMask(maskIndex, buildOptions = {}) {
        const viewer = this.getViewer();
        if (!viewer?.applyMask) return false;
        return viewer.applyMask(maskIndex, buildOptions);
    }

    /**
     * Clears active mask influence and rebuilds random particle seed.
     *
     * @param {object} [buildOptions={}]
     */
    clearMask(buildOptions = {}) {
        const viewer = this.getViewer();
        if (!viewer?.clearMask) return;
        viewer.clearMask(buildOptions);
    }

    /**
     * Sets a runtime particle property (supports vector index notation).
     *
     * @param {string} name
     * @param {*} value
     */
    setValue(name, value) {
        const viewer = this.getViewer();
        if (!viewer?.setValue) return;
        viewer.setValue(name, value);
    }

    /**
     * Sets a single default particle color for active particles and future rebuilds.
     *
     * @param {string|number[]|Float32Array} color
     */
    setParticleColor(color) {
        const viewer = this.getViewer();
        if (!viewer?.setParticleColor) return;
        viewer.setParticleColor(color);
    }

    setParticleRenderSize(size, minSize) {
        const viewer = this.getViewer();
        if (!viewer?.setParticleRenderSize) return;
        viewer.setParticleRenderSize(size, minSize);
    }

    setParticleShape(shape) {
        const viewer = this.getViewer();
        if (!viewer?.setParticleShape) return;
        viewer.setParticleShape(shape);
    }

    /**
     * Sets simulation gravity.
     *
     * @param {number[]|{x?:number,y?:number,z?:number}} gravity
     */
    setGravity(gravity) {
        const viewer = this.getViewer();
        if (!viewer?.setGravity) return;
        viewer.setGravity(parseVector(gravity, [0, 0, 0]));
    }

    /**
     * Sets simulation friction.
     *
     * @param {number} value
     */
    setFriction(value) {
        const viewer = this.getViewer();
        if (!viewer?.setFriction) return;
        viewer.setFriction(value);
    }

    /**
     * Sets shared orbit/repel target.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} [radius=0.4]
     */
    setTarget(x, y, z, radius = 0.4) {
        const viewer = this.getViewer();
        if (!viewer?.setTarget) return;
        viewer.setTarget(x, y, z, radius);
    }

    /**
     * Enables/disables orbit mode.
     *
     * @param {boolean} enabled
     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]
     */
    setOrbit(enabled, options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.setOrbit) return;
        viewer.setOrbit(enabled, options);
    }

    /**
     * Enables/disables repel mode.
     *
     * @param {boolean} enabled
     * @param {{x?:number,y?:number,z?:number,radius?:number,fieldRadius?:number}} [options={}]
     */
    setRepel(enabled, options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.setRepel) return;
        viewer.setRepel(enabled, options);
    }

    /**
     * Sets interaction mode.
     *
     * @param {"idle"|"orbit"|"repel"} mode
     */
    setMode(mode) {
        const viewer = this.getViewer();
        if (!viewer?.setMode) return;
        viewer.setMode(mode);
    }

    createRepelPoint(options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.createRepelPoint) return null;
        return viewer.createRepelPoint(options);
    }

    createOrbitPoint(options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.createOrbitPoint) return null;
        return viewer.createOrbitPoint(options);
    }

    /**
     * Applies motion multipliers to particle simulation.
     *
     * @param {{drift?:number,driftSpeed?:number,driftType?:"relative"|"absolute",orbitSpeed?:number,repelStrength?:number,orbitPull?:number}} [config={}]
     */
    setMotion(config = {}) {
        const viewer = this.getViewer();
        if (!viewer?.setMotion) return;
        viewer.setMotion(config);
    }

    /**
     * Sets fake camera pan in world units.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setCameraPan(x = 0, y = 0, z = 0) {
        const viewer = this.getViewer();
        if (!viewer?.setCameraPan) return;
        viewer.setCameraPan(x, y, z);
    }

    /**
     * Adds fake camera pan movement in world units.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    moveCameraPan(x = 0, y = 0, z = 0) {
        const viewer = this.getViewer();
        if (!viewer?.moveCameraPan) return;
        viewer.moveCameraPan(x, y, z);
    }

    /**
     * Sets fake camera yaw/pitch values.
     *
     * @param {number} yaw
     * @param {number} pitch
     */
    setCameraAngle(yaw = 0, pitch = 0) {
        const viewer = this.getViewer();
        if (!viewer?.setCameraAngle) return;
        viewer.setCameraAngle(yaw, pitch);
    }

    /**
     * Adds fake camera yaw/pitch movement.
     *
     * @param {number} yaw
     * @param {number} pitch
     */
    moveCameraAngle(yaw = 0, pitch = 0) {
        const viewer = this.getViewer();
        if (!viewer?.moveCameraAngle) return;
        viewer.moveCameraAngle(yaw, pitch);
    }

    /**
     * Sets fake camera movement multipliers.
     *
     * @param {{panScale?:number,angleScale?:number,depthEffect?:number}} [config={}]
     */
    setCameraMotion(config = {}) {
        const viewer = this.getViewer();
        if (!viewer?.setCameraMotion) return;
        viewer.setCameraMotion(config);
    }

    /**
     * Sets fake camera depth parallax strength.
     *
     * @param {number} value
     */
    setCameraDepthEffect(value = 1) {
        const viewer = this.getViewer();
        if (!viewer?.setCameraDepthEffect) return;
        viewer.setCameraDepthEffect(value);
    }

    setDebugCrosshair(mode = "none") {
        const viewer = this.getViewer();
        if (!viewer?.setDebugCrosshair) return;
        viewer.setDebugCrosshair(mode);
    }

    /**
     * Adds or replaces the active WebGL emitter adapter.
     *
     * @param {object} [config={}]
     * @returns {object|null}
     */
    addEmitter(config = {}) {
        const viewer = this.getViewer();
        if (!viewer?.addEmitter) return null;
        this.activeEmitter = viewer.addEmitter(config);
        return this.activeEmitter;
    }

    /**
     * Returns the active emitter adapter.
     *
     * @returns {object|null}
     */
    getEmitter() {
        return this.activeEmitter || this.getViewer()?.emitter || null;
    }

    /**
     * Removes the active WebGL emitter adapter.
     */
    removeEmitter() {
        const viewer = this.getViewer();
        if (!viewer?.removeEmitter) return;
        viewer.removeEmitter();
        this.activeEmitter = null;
    }

    /**
     * Clears active particles without rebuilding the default free-particle field.
     *
     * @returns {boolean}
     */
    clearParticles() {
        const viewer = this.getViewer();
        return !!viewer?.clearParticles?.();
    }

    /**
     * Defines how emitter particles change over their normalized lifetime.
     *
     * @param {{startScale?:number,endScale?:number,fadeStart?:number,fadeEnd?:number}} config
     */
    setParticleBehavior(config = {}) {
        const viewer = this.getViewer();
        if (!viewer?.setParticleBehavior) return;
        viewer.setParticleBehavior(config);
    }

    /**
     * Scatters particles from a center point.
     *
     * @param {object} [options={}]
     */
    scatter(options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.scatter) return;
        viewer.scatter(options);
    }

    /**
     * Applies random positional jitter to active particles.
     *
     * @param {number} [amount=0.05]
     * @param {{seed?:number,captureAs?:string|null}} [options={}]
     */
    jitter(amount = 0.05, options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.jitter) return;
        viewer.jitter(amount, options);
    }

    /**
     * Captures a named snapshot of particle state.
     *
     * @param {string} [name="origin"]
     * @returns {object|null}
     */
    captureSnapshot(name = "origin") {
        const viewer = this.getViewer();
        if (!viewer?.captureSnapshot) return null;
        return viewer.captureSnapshot(name);
    }

    /**
     * Restores a named snapshot of particle state.
     *
     * @param {string} [name="origin"]
     * @returns {boolean}
     */
    restoreSnapshot(name = "origin") {
        const viewer = this.getViewer();
        if (!viewer?.restoreSnapshot) return false;
        return viewer.restoreSnapshot(name);
    }

    /**
     * Resets particle state to a snapshot.
     *
     * @param {{snapshot?:string}} [options={}]
     * @returns {boolean}
     */
    reset(options = {}) {
        const viewer = this.getViewer();
        if (!viewer?.reset) return false;
        return viewer.reset(options);
    }

    /**
     * Gets bounds of active particles.
     *
     * @returns {{min:{x:number,y:number,z:number},max:{x:number,y:number,z:number}}|null}
     */
    getBounds() {
        const viewer = this.getViewer();
        if (!viewer?.getBounds) return null;
        return viewer.getBounds();
    }

    /**
     * Starts simulation if viewer is initialized.
     */
    start() {
        const viewer = this.getViewer();
        if (!viewer?.start) return;
        viewer.start();
    }

    /**
     * Stops simulation if viewer is initialized.
     */
    stop() {
        const viewer = this.getViewer();
        if (!viewer?.stop) return;
        viewer.stop();
    }

    /**
     * Applies motion scale multipliers to the active engine instance.
     *
     * Supported keys:
     * - `drift`
     * - `driftSpeed`
     * - `driftType` (`relative` uses current position, `absolute` uses starting position)
     * - `orbitSpeed`
     * - `orbitPull`
     * - `repelStrength`
     *
     * @param {object} [config={}]
     */
    applyMotionConfig(config = {}) {
        this.setMotion(config);
    }

    /**
     * Disconnect lifecycle: stop renderer and clean observers/listeners.
     */
    onDisconnect() {
        this.stop();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._onWindowResize) {
            window.removeEventListener("resize", this._onWindowResize);
            this._onWindowResize = null;
        }
    }

    /**
     * Property change hook (reserved for future width/height/reactive behavior).
     */
    onPropertyChanged(property, prevous, value) {
        switch (property) {
            case "width":
            case "height":
                break;
            case "particles":
                this._syncParticleConfigFromAttributes();
                this.setParticleCount(this.particleConfig.maxParticles, property !== "particles");
                break;
            case "emit-rate":
                this._syncParticleConfigFromAttributes();
                if (this.particleViewer) this.particleViewer.emitRate = this.particleConfig.emitRate;
                break;
            case "particle-size":
            case "min-particle-size":
                this.setParticleRenderSize(this._readNumber("particle-size", 3), this._readNumber("min-particle-size", 1.5));
                break;
            case "particle-shape":
                this.setParticleShape(value);
                break;
            case "mask":
                this._applyEngineAttributes({ applyMask: true, reloadMask: true });
                break;
            default:
                this._applyEngineAttributes({
                    applyMask: [
                        "mask-options",
                        "mask-width",
                        "mask-height",
                        "mask-align",
                        "mask-mode",
                        "mask-scatter",
                        "mask-scatter-shape",
                        "mask-anchor-x",
                        "mask-anchor-y",
                        "mask-anchor-z",
                        "mask-rotation",
                        "mask-x",
                        "mask-y",
                        "mask-z",
                        "preserve-color",
                        "particle-gap",
                        "alpha-threshold",
                        "transition",
                        "transition-duration",
                        "transition-spread"
                    ].includes(property),
                    rebuildFreeParticles: ["spawn-volume", "max-speed"].includes(property)
                });
                break;
        }
    }

    /**
     * Applies attribute-only aliases that are not component properties.
     */
    onAttributeChanged(property) {
        switch (property) {
            case "max-particles":
                this.setParticleCount(this._readNumber("max-particles", this.particleConfig.maxParticles));
                break;
            case "mask":
            case "mask-options":
            case "mask-width":
            case "mask-height":
            case "mask-align":
            case "mask-mode":
            case "mask-scatter":
            case "mask-scatter-shape":
            case "mask-anchor":
            case "mask-anchor-x":
            case "mask-anchor-y":
            case "mask-anchor-z":
            case "mask-rotation":
            case "mask-position":
            case "mask-x":
            case "mask-y":
            case "mask-z":
            case "mask-preserve-color":
            case "preserve-color":
            case "mask-particle-gap":
            case "particle-gap":
            case "alpha-threshold":
            case "transition":
            case "transition-duration":
            case "transition-spread":
                this._applyEngineAttributes({ applyMask: true, reloadMask: property === "mask" });
                break;
            default:
                this._applyEngineAttributes({
                    rebuildFreeParticles: ["spawn-volume", "max-speed"].includes(property)
                });
                break;
        }
    }
}

customElements.define(ParticleWorldComponent.tag, ParticleWorldComponent);
