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
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} velocityX - Parameter value.
     * @param {*} velocityY - Parameter value.
     * @param {*} size - Parameter value.
     * @param {*} lifespan - Parameter value.
     * @param {*} forces - Parameter value.
     * @param {*} useDOM - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, velocityX, velocityY, size, lifespan, forces = [], useDOM = false) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.size = size;
        this.lifespan = lifespan;
        this.age = 0;
        this.forces = forces;
        this.useDOM = useDOM;

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

        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Update DOM element position if using DOM
        if (this.useDOM) {
            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        }

        // Age the particle
        this.age += deltaTime;
    }

    /**
     * Renders output from current module state.
     * @returns {*} Result of renderDom.
     */
    renderDom() {
        if (this.useDOM && this.element) {
            this.element.style.opacity = this.age / this.lifespan;
        }
    }

    /**
     * Renders output from current module state.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of renderCanvas.
     */
    renderCanvas(ctx) {
        if (!this.useDOM) {
            ctx.fillStyle = "black";
            ctx.fillRect(this.x, this.y, this.size, this.size);
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
            document.body.removeChild(this.element);
        }
    }
}

export default Particle;
// Update particle position based on velocity
