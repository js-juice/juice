/**
 * Simple particle class for particle system effects.
 * Particles have position, velocity, size, lifespan, and can be rendered to canvas or DOM.
 * @module Animation/Particles/Particle
 */

/**
 * Represents a single particle with physics properties and rendering capabilities.
 * @class Particle
 * @param {number} x - Initial X position
 * @param {number} y - Initial Y position
 * @param {number} velocityX - X velocity
 * @param {number} velocityY - Y velocity
 * @param {number} size - Particle size
 * @param {number} lifespan - Particle lifespan in seconds
 * @param {Array<Object>} [forces=[]] - Forces to apply to particle
 * @param {boolean} [useDOM=false] - Whether to render using DOM elements
 */
class Particle {
    /**
     * Checks whether a value is a valid finite number.
     *
     * @param {*} value
     * @returns {boolean}
     */
    static isFiniteNumber(value) {
        return Number.isFinite(value);
    }

    /**
     * Returns true for supported dynamic value sources.
     * Supported source types:
     * - function(context) => number
     * - number arrays / typed arrays (sampled by normalized lifetime)
     * - keyframe-like objects (`getValueAt*`, `sample`, `at`, `keyframes`, `frame`+`value`)
     *
     * @param {*} value
     * @returns {boolean}
     */
    static isValueSource(value) {
        if (typeof value === "function") return true;
        if (Array.isArray(value)) return true;
        if (ArrayBuffer.isView(value)) return true;
        if (!value || typeof value !== "object") return false;
        if (typeof value.getValueAt === "function") return true;
        if (typeof value.getValueAtProgress === "function") return true;
        if (typeof value.getValueAtFrame === "function") return true;
        if (typeof value.sample === "function") return true;
        if (typeof value.at === "function") return true;
        if (Array.isArray(value.keyframes)) return true;
        if ("frame" in value && "value" in value) return true;
        return false;
    }

    /**
     * Clamps a number between min/max.
     *
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Samples an array/typed-array with linear interpolation.
     *
     * @param {Array<number>|Float32Array|Float64Array|Int32Array|Uint32Array} values
     * @param {number} progress Normalized [0..1]
     * @returns {number|undefined}
     */
    static sampleArray(values, progress) {
        if (!values || values.length === 0) return undefined;
        if (values.length === 1) return Number(values[0]);
        const t = Particle.clamp(Number(progress) || 0, 0, 1) * (values.length - 1);
        const i0 = Math.floor(t);
        const i1 = Math.min(values.length - 1, i0 + 1);
        const lerpT = t - i0;
        const a = Number(values[i0]);
        const b = Number(values[i1]);
        if (!Number.isFinite(a)) return Number.isFinite(b) ? b : undefined;
        if (!Number.isFinite(b)) return a;
        return a + (b - a) * lerpT;
    }

    /**
     * Samples a keyframe array [{percentage,value}, ...] with linear interpolation.
     *
     * @param {Array<{percentage:number,value:number}>} keyframes
     * @param {number} progress Normalized [0..1]
     * @returns {number|undefined}
     */
    static sampleKeyframes(keyframes, progress) {
        if (!Array.isArray(keyframes) || keyframes.length === 0) return undefined;
        if (keyframes.length === 1) return Number(keyframes[0]?.value);
        const sorted = keyframes
            .filter((kf) => kf && Number.isFinite(Number(kf.percentage)) && Number.isFinite(Number(kf.value)))
            .slice()
            .sort((a, b) => Number(a.percentage) - Number(b.percentage));
        if (sorted.length === 0) return undefined;
        if (sorted.length === 1) return Number(sorted[0].value);

        const percent = Particle.clamp(Number(progress) || 0, 0, 1) * 100;
        if (percent <= Number(sorted[0].percentage)) return Number(sorted[0].value);
        if (percent >= Number(sorted[sorted.length - 1].percentage)) return Number(sorted[sorted.length - 1].value);

        for (let i = 0; i < sorted.length - 1; i += 1) {
            const a = sorted[i];
            const b = sorted[i + 1];
            const ap = Number(a.percentage);
            const bp = Number(b.percentage);
            if (percent < ap || percent > bp) continue;
            const span = Math.max(0.000001, bp - ap);
            const t = (percent - ap) / span;
            return Number(a.value) + (Number(b.value) - Number(a.value)) * t;
        }
        return Number(sorted[sorted.length - 1].value);
    }

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} velocityX - Parameter value.
     * @param {*} velocityY - Parameter value.
     * @param {*} size - Parameter value.
     * @param {*} lifespan - Parameter value.
     * @param {*} forces - Parameter value.
     * @param {*} useDOM - Parameter value.
     * @param {{
     *  valueSources?:Record<string,*>,
     *  keyframes?:Record<string,*>,
     *  values?:Record<string,*>,
     *  opacity?:number|Array<number>|Object|Function
     * }} [options={}]
     * @returns {*} Result of constructor.
     */
    constructor(x, y, velocityX, velocityY, size, lifespan, forces = [], useDOM = false, options = {}) {
        if (forces && typeof forces === "object" && !Array.isArray(forces)) {
            options = forces;
            forces = options.forces || [];
            useDOM = options.useDOM ?? useDOM;
        } else if (useDOM && typeof useDOM === "object") {
            options = useDOM;
            useDOM = options.useDOM ?? false;
        }

        this.valueSources = {};

        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.size = 1;
        this.lifespan = 1;
        this.opacity = 1;
        this.age = 0;
        this.forces = Array.isArray(forces) ? forces : [];
        this.useDOM = !!useDOM;

        this.x = this._resolveInitialPropertyValue("x", x, 0);
        this.y = this._resolveInitialPropertyValue("y", y, 0);
        this.velocityX = this._resolveInitialPropertyValue("velocityX", velocityX, 0);
        this.velocityY = this._resolveInitialPropertyValue("velocityY", velocityY, 0);
        this.size = this._resolveInitialPropertyValue("size", size, 1);
        this.lifespan = this._resolveInitialPropertyValue("lifespan", lifespan, 1);

        const explicitSources = options.valueSources || options.keyframes || options.values || {};
        this.setValueSources(explicitSources);
        if (Object.prototype.hasOwnProperty.call(options, "opacity")) {
            this.setValueSource("opacity", options.opacity);
        }
        this.applyValueSources(0);

        // Create a DOM element if useDOM is true
        if (this.useDOM) {
            this.element = document.createElement("div");
            this.element.style.position = "absolute";
            this.element.style.width = `${this.size}px`;
            this.element.style.height = `${this.size}px`;
            this.element.style.backgroundColor = "black";
            this.element.style.borderRadius = "50%";
            document.body.appendChild(this.element);
            this.render = this.renderDom;
        } else {
            this.render = this.renderCanvas;
        }
    }

    /**
     * Resolves a constructor property input.
     * If input is numeric it's used directly.
     * If input is a value source, it is registered and sampled at frame 0.
     *
     * @private
     * @param {string} property
     * @param {*} input
     * @param {number} fallback
     * @returns {number}
     */
    _resolveInitialPropertyValue(property, input, fallback) {
        if (Particle.isFiniteNumber(input)) return Number(input);
        if (Particle.isValueSource(input)) {
            this.valueSources[property] = input;
            const sampled = this._resolveSourceValue(property, input, 0);
            return Particle.isFiniteNumber(sampled) ? Number(sampled) : fallback;
        }
        return fallback;
    }

    /**
     * Evaluates one value source for a property.
     *
     * @private
     * @param {string} property
     * @param {*} source
     * @param {number} deltaTime
     * @returns {number|undefined}
     */
    _resolveSourceValue(property, source, deltaTime) {
        const life = Math.max(0.000001, Number(this.lifespan) || 1);
        const progress = Particle.clamp((Number(this.age) || 0) / life, 0, 1);
        const frame = progress * 100;
        const current = Number(this[property]);

        if (typeof source === "function") {
            return source({
                particle: this,
                property,
                age: this.age,
                life,
                progress,
                frame,
                deltaTime,
                current
            });
        }

        if (Array.isArray(source) || ArrayBuffer.isView(source)) {
            return Particle.sampleArray(source, progress);
        }

        if (!source || typeof source !== "object") return undefined;

        if (typeof source.getValueAtProgress === "function") {
            return source.getValueAtProgress(progress, property, this);
        }
        if (typeof source.getValueAt === "function") {
            return source.getValueAt(progress, property, this);
        }
        if (typeof source.getValueAtFrame === "function") {
            return source.getValueAtFrame(frame, property, this);
        }
        if (typeof source.sample === "function") {
            return source.sample(progress, property, this);
        }
        if (typeof source.at === "function") {
            return source.at(progress, property, this);
        }
        if (Array.isArray(source.values) || ArrayBuffer.isView(source.values)) {
            return Particle.sampleArray(source.values, progress);
        }
        if (Array.isArray(source.frames) || ArrayBuffer.isView(source.frames)) {
            return Particle.sampleArray(source.frames, progress);
        }
        if (Array.isArray(source.keyframes)) {
            return Particle.sampleKeyframes(source.keyframes, progress);
        }
        if ("frame" in source && "value" in source) {
            source.frame = frame;
            return source.value;
        }

        return undefined;
    }

    /**
     * Sets a dynamic value source for one property.
     *
     * @param {string} property
     * @param {*} source
     * @returns {Particle}
     */
    setValueSource(property, source) {
        if (!property) return this;
        if (!Particle.isValueSource(source)) {
            delete this.valueSources[property];
            return this;
        }
        this.valueSources[property] = source;
        const sampled = this._resolveSourceValue(property, source, 0);
        if (Particle.isFiniteNumber(sampled) && property in this) {
            this[property] = Number(sampled);
        }
        return this;
    }

    /**
     * Sets many dynamic value sources at once.
     *
     * @param {Record<string,*>} sources
     * @returns {Particle}
     */
    setValueSources(sources = {}) {
        if (!sources || typeof sources !== "object") return this;
        for (const [property, source] of Object.entries(sources)) {
            this.setValueSource(property, source);
        }
        return this;
    }

    /**
     * Applies all configured value sources for current particle age.
     *
     * @param {number} deltaTime
     */
    applyValueSources(deltaTime = 0) {
        if (!this.valueSources || typeof this.valueSources !== "object") return;
        for (const [property, source] of Object.entries(this.valueSources)) {
            const sampled = this._resolveSourceValue(property, source, deltaTime);
            if (!Particle.isFiniteNumber(sampled)) continue;
            this[property] = Number(sampled);
        }
    }

    /**
     * Executes applyForces.
     * @param {*} deltaTime - Parameter value.
     * @returns {*} Result of applyForces.
     */
    applyForces(deltaTime) {
        this.forces.forEach((force) => {
            this.velocityX += force.x * deltaTime;
            this.velocityY += force.y * deltaTime;
        });
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} deltaTime - Parameter value.
     * @returns {*} Result of update.
     */
    update(deltaTime) {
        // Apply forces to the particle
        this.applyForces(deltaTime);

        // Age the particle first so keyframes evaluate against current progress.
        this.age += deltaTime;

        // Apply lifecycle/keyframed overrides before integration so keyframed
        // velocity affects this frame. Keyframed x/y are treated as absolute.
        this.applyValueSources(deltaTime);
        const hasXSource = Object.prototype.hasOwnProperty.call(this.valueSources, "x");
        const hasYSource = Object.prototype.hasOwnProperty.call(this.valueSources, "y");

        // Update particle position based on velocity when x/y are not keyframed.
        if (!hasXSource) this.x += this.velocityX * deltaTime;
        if (!hasYSource) this.y += this.velocityY * deltaTime;

        // Update DOM element position if using DOM
        if (this.useDOM && this.element) {
            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
            this.element.style.width = `${this.size}px`;
            this.element.style.height = `${this.size}px`;
            const autoOpacity = this.age / Math.max(0.000001, Number(this.lifespan) || 1);
            const opacity = this.valueSources?.opacity ? this.opacity : autoOpacity;
            this.element.style.opacity = `${Particle.clamp(Number(opacity) || 0, 0, 1)}`;
        }
    }

    /**
     * Renders output from current module state.
     * @returns {*} Result of renderDom.
     */
    renderDom() {
        if (this.useDOM && this.element) {
            const autoOpacity = this.age / Math.max(0.000001, Number(this.lifespan) || 1);
            const opacity = this.valueSources?.opacity ? this.opacity : autoOpacity;
            this.element.style.opacity = `${Particle.clamp(Number(opacity) || 0, 0, 1)}`;
        }
    }

    /**
     * Renders output from current module state.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of renderCanvas.
     */
    renderCanvas(ctx) {
        if (!this.useDOM) {
            const autoOpacity = this.age / Math.max(0.000001, Number(this.lifespan) || 1);
            const opacity = this.valueSources?.opacity ? this.opacity : autoOpacity;
            const previousAlpha = ctx.globalAlpha;
            ctx.globalAlpha = Particle.clamp(Number(opacity) || 0, 0, 1);
            ctx.fillStyle = "black";
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.globalAlpha = previousAlpha;
        }
    }

    /**
     * Executes isAlive.
     * @returns {*} Result of isAlive.
     */
    isAlive() {
        return this.age < this.lifespan;
    }

    /**
     * Executes remove.
     * @returns {*} Result of remove.
     */
    remove() {
        if (this.useDOM && this.element) {
            if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
        }
    }
}

export default Particle;
