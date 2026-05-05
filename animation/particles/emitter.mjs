/**
 * Particle emitter for spawning particles at a specified rate.
 * Emits particles with configurable direction, speed, spread, and lifespan.
 * @module Animation/Particles/Emitter
 */

import Particle from "./particle.mjs";

/**
 * Particle emitter that creates particles continuously at a specified rate.
 * @class ParticleEmitter
 * @example
 * const emitter = new ParticleEmitter({
 *   x: 100, y: 100,
 *   particlesPerSecond: 50,
 *   direction: Math.PI / 2,
 *   speed: 100
 * });
 */
class ParticleEmitter {
    constructor(
        container,
        {
            x,
            y,
            particlesPerSecond = 10,
            pps,
            direction = 0,
            speed = 100,
            spread = Math.PI / 8,
            size = 2,
            lifespan = 2,
            forces = [],
            useDOM = false,
            generator = null
        }
    ) {
        this.x = x;
        this.y = y;
        this.particlesPerSecond = pps || particlesPerSecond;
        this.direction = direction;
        this.speed = speed;
        this.spread = spread;
        this.size = size;
        this.lifespan = lifespan;
        this.forces = forces;
        this.particles = [];
        this.lastEmissionTime = 0;

        this.generator = generator;
    }

    /**
     * Executes emit.
     * @param {*} deltaTime - Parameter value.
     * @returns {*} Result of emit.
     */
    emit(deltaTime) {
        this.lastEmissionTime += deltaTime;
        if (!Number.isFinite(this.particlesPerSecond) || this.particlesPerSecond <= 0) return;
        const emissionRate = 1 / this.particlesPerSecond;

        while (this.lastEmissionTime > emissionRate) {
            this.lastEmissionTime -= emissionRate;

            if (this.generator) {
                const particle = this.generator(this);
                this.particles.push(particle);
                continue;
            } else {
                const randomDirection = this.direction + (Math.random() * this.spread - this.spread / 2);
                const randomSpeed = this.speed + Math.random() * this.speed * 0.1 - this.speed * 0.05;
                const randomSize = this.size + Math.random() * this.size * 0.2 - this.size * 0.1;
                const randomLifespan = this.lifespan + Math.random() * this.lifespan * 0.2 - this.lifespan * 0.1;

                const velocityX = Math.cos(randomDirection) * randomSpeed;
                const velocityY = Math.sin(randomDirection) * randomSpeed;

                const particle = new Particle(
                    this.x,
                    this.y,
                    velocityX,
                    velocityY,
                    randomSize,
                    randomLifespan,
                    this.forces,
                    this.useDOM
                );
                this.particles.push(particle);
            }

            // Debug: log emission only when verbose flag is enabled to avoid
            // spamming the console every frame.
            try {
                if (typeof window !== "undefined" && window.__EMITTER_VERBOSE) {
                    if (typeof console !== "undefined" && console.debug) {
                        console.debug("ParticleEmitter.emit", { x: this.x, y: this.y, vx: velocityX, vy: velocityY });
                    }
                }
            } catch (e) {}
        }
    }

    addForce(type, force) {
        this.forces[type] = force;
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} deltaTime - Parameter value.
     * @returns {*} Result of update.
     */
    update(deltaTime) {
        // Emit new particles
        this.emit(deltaTime);

        // Update existing particles
        this.particles = this.particles.filter((particle) => {
            particle.update(deltaTime);
            if (!particle.isAlive()) {
                particle.remove(); // Remove DOM element if necessary
                return false;
            }
            return true;
        });
    }

    /**
     * Executes draw.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of draw.
     */
    draw(ctx) {
        if (!this.useDOM) {
            try {
                const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
                // If the caller applied a transform to scale by DPR (common pattern),
                // clear using CSS pixels so the transform doesn't over-clear or mis-align.
                ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
            } catch (e) {
                // fallback to full device-pixel clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            // Draw particles using a strong visible style per-particle so
            // rendering is obvious during debugging (color/size).
            this.particles.forEach((particle) => {
                try {
                    const r = Math.max(1, particle.size);
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2);
                    // ensure visible color (white) and slight stroke for contrast
                    ctx.fillStyle = "#ffffff";
                    ctx.fill();
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = "rgba(255,255,255,0.6)";
                    ctx.stroke();
                } catch (e) {
                    // defensive: don't let one particle break rendering
                }
            });
        }
    }
}

export default ParticleEmitter;
