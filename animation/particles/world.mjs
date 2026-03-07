/**
 * Particle world system with lifecycle states and property-based particle management.
 * Alternative particle system implementation with state-based transitions.
 * @module Animation/Particles/World
 */

import { sortedIndex } from "../../core/DataTypes/Index.mjs";
import PropertyArray from "../../core/DataTypes/PropertyArray.mjs";
import geom from "../../core/Util/Geometry.mjs";
import { random, randomBetween, randomInt, pow, cos, sin } from "../../core/Util/Math.mjs";

const { angle, distance, lerp, clamp, norm, pointDiff, diff } = geom;

const STATE_PROPS = ["state", "distance", "alpha"];
const POSITION_PROPS = ["x", "y", "z", "bx", "by", "bz", "vx", "vy", "vz"];

/**
 * Executes anyLerp.
 * @param {*} a - Parameter value.
 * @param {*} b - Parameter value.
 * @param {*} t - Parameter value.
 * @returns {*} Result of anyLerp.
 */
function anyLerp(a, b, t) {
    if (typeof a === "number") {
        return lerp(a, b, t);
    } else if (Array.isArray(a)) {
        return a.map((n, i) => lerp(n, b[i], t));
    } else if (typeof a === "object") {
        return Object.keys(a).reduce((r, k) => {
            r[k] = lerp(a[k], b[k], t);
            return r;
        }, {});
    }
    return lerp(a, b, t);
}
/*
const lifeState = new ParticleLifeState(Particle.States.SPAWNED, {
    duration: 1,
    size: 0,
    color: [255, 255, 255, 1],
    get position() {
        return { x: 0, y: 0, z: 0 };
    },
    get velocity() {
        return { x: 0, y: 0, z: 0 };
    },
});
*/
/**
 * Represents the ParticleLifeState animation module class.
 */
class ParticleLifeState {
    /**
     * Executes chain.
     * @param {*} states - Parameter value.
     * @returns {*} Result of chain.
     */
    static chain(states) {
        const sorted = states.sort((a, b) => a.state - b.state);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] !== undefined) {
                sorted[i].after(sorted[i + 1]);
            }
        }
    }

    prev;
    next;
    properties = ["duration", "size", "color", "position", "velocity"];

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} state - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(state, options = {}) {
        this.state = state;
        this.time = 0;
        this.duration = options.duration || 2;
        this.size = options.size || 1;
        this.color = options.color || [255, 255, 255, 1];
        this.spawnPoint = options.spawnPoint || { x: 0, y: 0, z: 0 };
        this.position = options.position || { x: 0, y: 0, z: 0 };

        this.velocity = options.velocity || { x: 0, y: 0, z: 0 };
    }

    /**
     * Executes initialize.
     * @returns {*} Result of initialize.
     */
    initialize() {
        const transitions = null;
        const { properties } = this;

        for (let i = 0; i < properties.length; i++) {
            const prop = properties[i];
            if (this[prop]) {
                transitions[prop] = [];
            }
        }
        if (this.next) {
            for (let property in transitions) {
                if (this.next[property] && this.next[property] !== this[property]) {
                    transitions[property].push(this[property]);
                    transitions[property].push(this.next[property]);
                }
                if (transitions[property].length === 0) {
                    delete transitions[property];
                }
            }
            this.transitions = transitions;
        }
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} time - Parameter value.
     * @returns {*} Result of update.
     */
    update(time) {
        this.time += time.delta;
        this.percent = this.time / this.duration;
        for (let property in this.transitions) {
            this[property] = anyLerp(this[property], this.next[property], this.percent);
        }
    }

    /**
     * Executes after.
     * @param {*} lifeState - Parameter value.
     * @returns {*} Result of after.
     */
    after(lifeState) {
        if (this.next === lifeState) return;
        if (this.next) {
            lifeState.next = this.next;
            lifeState.next.prev = lifeState;
        }
        lifeState.prev = this;
        this.next = lifeState;
    }

    /**
     * Executes before.
     * @param {*} lifeState - Parameter value.
     * @returns {*} Result of before.
     */
    before(lifeState) {
        if (this.prev === lifeState) return;
        if (this.prev) {
            lifeState.prev = this.prev;
            lifeState.prev.next = lifeState;
        }
        lifeState.next = this;
        this.prev = lifeState;
    }

    /**
     * Executes toArray.
     * @returns {*} Result of toArray.
     */
    toArray() {
        const { properties } = this;
    }
}

/**
 * Represents the Particle animation module class.
 */
class Particle {
    static States = {
        DEFAULT: 0,
        SPAWNED: 1,
        ACTIVE: 2,
        DYING: 3,
        DEAD: 4,
    };

    /**
     * Executes generateLifePath.
     * @returns {*} Result of generateLifePath.
     */
    static generateLifePath() {
        const spawn = {
            duration: 1,
            size: 0,
            color: [255, 255, 255, 0],
            get position() {
                return { x: 0, y: 0, z: 0 };
            },
            get velocity() {
                return { x: 0, y: 0, z: 0 };
            },
        };

        const active = {
            duration: 2,
            size: () => randomBetween(0.5, 1.5),
            color: [255, 255, 255, randomBetween(0.2, 1)],
            get position() {
                return { x: 0, y: 0, z: 0 };
            },
            get velocity() {
                return { x: 0, y: 0, z: 0 };
            },
        };
        return {
            spawn,
            active,
            dying,
            dead,
        };
    }

    position = { x: 0, y: 0, z: 0 };
    velocity = { x: 0, y: 0, z: 0 };
    state = 0;
    distance = 0;
    alpha = 1;
    /**
     * Executes birth.
     * @returns {*} Result of birth.
     */
    birth() {
        this.state = 0;
        this.distance = 0;
        this.alpha = 1;
    }

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} z - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, z = 0) {
        this.position = { x, y, z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.birth();
    }

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of update.
     */
    update() {
        switch (this.state) {
            case Particle.States.SPAWNED:
                if (this.updateSpawned) return this.updateSpawned();
                break;
            case Particle.States.ACTIVE:
                if (this.updateActive) return this.updateActive();
                break;
            case Particle.States.DYING:
                if (this.updateDying) return this.updateDying();
                break;
            case Particle.States.DEAD:
                if (this.updateDead) return this.updateDead();
                break;
        }
    }

    /**
     * Executes stateComplete.
     * @returns {*} Result of stateComplete.
     */
    stateComplete() {
        if (this.state < Particle.States.DEAD) this.state++;
    }

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of updateSpawned.
     */
    updateSpawned() {}

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of updateActive.
     */
    updateActive() {}

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of updateDying.
     */
    updateDying() {}

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of updateDead.
     */
    updateDead() {}
}

/**
 * Represents the ParticleWorld animation module class.
 */
class ParticleWorld {
    config = {
        density: 1,
        randomness: 1,
        mask: null,
        env: {
            forces: [],
        },
    };

    /**
     * Initializes class state and runtime dependencies.
     * @returns {*} Result of constructor.
     */
    constructor() {
        this.particles = [];
        this.emitters = [];
        this.forces = [];
        this.gravity = { x: 0, y: 0.1, z: 0 }; // Default gravity force
    }

    /**
     * Executes addEmitter.
     * @param {*} emitter - Parameter value.
     * @returns {*} Result of addEmitter.
     */
    addEmitter(emitter) {
        this.emitters.push(emitter);
    }

    /**
     * Executes addParticle.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} z - Parameter value.
     * @returns {*} Result of addParticle.
     */
    addParticle(x, y, z = 0) {
        this.particles.push(new Particle(x, y, z));
    }

    /**
     * Executes addForce.
     * @param {*} force - Parameter value.
     * @returns {*} Result of addForce.
     */
    addForce(force) {
        this.forces.push(force);
    }

    /**
     * Executes applyForces.
     * @param {*} particle - Parameter value.
     * @returns {*} Result of applyForces.
     */
    applyForces(particle) {
        // Apply all global forces (e.g., gravity, wind)
        for (const force of this.forces) {
            particle.applyForce(force);
        }
        // Apply default gravity
        particle.applyForce(this.gravity);
    }

    /**
     * Executes createParticles.
     * @returns {*} Result of createParticles.
     */
    createParticles() {
        this.particles = new PropertyArray(particles.length / POSITION_PROPS.length, POSITION_PROPS, "float");
        this.particles.set(particles, 0);
    }

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of update.
     */
    update() {
        for (const emitter of this.emitters) {
            emitter.update();
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            this.applyForces(particle);
            particle.update();
            if (particle.isDead()) {
                this.particles.splice(i, 1); // Remove dead particles
            }
        }
    }

    /**
     * Renders output from current module state.
     * @returns {*} Result of render.
     */
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const particle of this.particles) {
            particle.render(this.ctx);
        }
    }

    /**
     * Executes run.
     * @returns {*} Result of run.
     */
    run() {
        const step = () => {
            this.update();
            this.render();
            requestAnimationFrame(step);
        };
        step();
    }
}

export default ParticleWorld;
