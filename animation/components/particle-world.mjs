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

class ParticleWorldComponent extends Component.HTMLElement {
    static tag = "particle-world";

    animate = true;
    count = 0;

    RESIZE_ACTION = "fill";

    static config = {
        properties: {
            renderer: { type: "string", default: "canvas", linked: true },
            width: { type: "number", default: 100, unit: "percent", linked: true },
            height: { type: "number", default: 100, unit: "percent", linked: true },
            depth: { type: "number", default: 100, unit: "percent", linked: true }
            // mask is intentionally not exposed as a main control
        }
    };

    static get observed() {
        return {
            all: ["width", "height", "renderer"]
        };
    }

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

    /**
     * Returns active WebGL particle viewer when available.
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
        const { maxParticles } = PARTICLE_CONFIG;
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
        // console.log("Updated", this.count);
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
            if (i == 0) console.log(x, y);
            buffer.pixel(x, y, [255, 255, 255, 255]);
        }
        buffer.put(this.ctx);

        console.log("Rendered", this.count);
        */
    }

    /**
     * Seeds local fallback arrays; active WebGL simulation uses engine-side buffers.
     */
    build() {
        const { randomness, maxParticles } = PARTICLE_CONFIG;
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
        console.log("Built", maxParticles);

        this.update({ delta: 0 });
        this.render();
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
            const { maxParticles, emitRate } = PARTICLE_CONFIG;
            try {
                this.particleViewer = new WebGLParticleSystem(this.canvas, maxParticles, emitRate);
                this.particleViewer.start();
                if (this.mask) {
                    this.setMask(this.mask).catch((error) => {
                        console.error("[particle-world] Failed to apply mask:", error);
                    });
                }
            } catch (error) {
                console.error("[particle-world] WebGL init failed. Falling back to 2d canvas.", error);
                this.renderer = "canvas";
                this.ctx = canvas.getContext("2d");
            }
        } else {
            this.ctx = canvas.getContext("2d");
        }

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
    setParticleCount(nextCount) {
        const value = Math.max(8, Math.floor(Number(nextCount) || PARTICLE_CONFIG.maxParticles));
        if (value === PARTICLE_CONFIG.maxParticles) return value;
        PARTICLE_CONFIG.maxParticles = value;
        if (this.renderer !== "webgl" || !this.canvas) return value;

        const previous = this.particleViewer;
        if (previous?.stop) previous.stop();

        const { emitRate } = PARTICLE_CONFIG;
        this.particleViewer = new WebGLParticleSystem(this.canvas, value, emitRate);
        this.particleViewer.start();
        if (this.mask) {
            this.setMask(this.mask).catch((error) => {
                console.error("[particle-world] Failed to reapply mask after particle count change:", error);
            });
        }
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
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}|null>}
     */
    async setMask(source, options = {}) {
        if (!source || this.renderer !== "webgl" || !this.getViewer()?.loadMask) return null;
        const result = await this.getViewer().loadMask(source, { apply: true, ...options });
        this.dispatchEvent(new CustomEvent("mask-loaded", { detail: { source, ...result } }));
        return result;
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
     *   position?:{x?:number,y?:number,z?:number},
     *   alphaThreshold?:number
     * }} [options={}]
     * @returns {Promise<{maskIndex:number,count:number}|null>}
     */
    async loadMask(source, options = {}) {
        if (!source || this.renderer !== "webgl" || !this.getViewer()?.loadMask) return null;
        return this.getViewer().loadMask(source, options);
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

    /**
     * Applies motion multipliers to particle simulation.
     *
     * @param {{drift?:number,orbitSpeed?:number,repelStrength?:number,orbitPull?:number}} [config={}]
     */
    setMotion(config = {}) {
        const viewer = this.getViewer();
        if (!viewer?.setMotion) return;
        viewer.setMotion(config);
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
                break;
            case "height":
                break;
            case "mask":
                if (value && this.particleViewer) {
                    this.setMask(value).catch((error) => {
                        console.error("[particle-world] Failed to apply mask attribute update:", error);
                    });
                }
                break;
        }
    }
}

customElements.define(ParticleWorldComponent.tag, ParticleWorldComponent);
