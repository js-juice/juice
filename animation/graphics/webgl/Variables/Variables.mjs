/**
 * WebGL shader variable classes (Attribute, Uniform, Varying).
 * Provides typed variable wrappers for shader programming.
 * @module Graphics/WebGL/Variables/Variables
 */

import VariableBase from "./VariableBase.mjs";

import { checkGLError } from "../Lib/Helper.mjs";

/**
 * Attribute variable for vertex shader inputs.
 * @class Attribute
 * @extends VariableBase
 * @private
 */
class Attribute extends VariableBase {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("attribute", ...args);
        this.constructor.index++;
    }
}

/**
 * Represents the Uniform animation module class.
 */
export class Uniform extends VariableBase {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("uniform", ...args);
        this.constructor.index++;
    }

    /**
     * Executes download.
     * @returns {*} Result of download.
     */
    download() {
        if (!this.location) return;
        return this.gl.getUniform(this.program, this.location);
    }

    /**
     * Executes upload.
     * @returns {*} Result of upload.
     */
    upload() {
        const { gl, program, name, settings } = this;
        if (!program) return false;
        gl.useProgram(program);
        // Ensure we have a valid location before attempting upload
        const loc = this.location;
        if (loc === null || loc === undefined || loc === -1) return false;

        // Drain any previous GL errors silently. A lingering GL error (e.g. INVALID_OPERATION)
        // can block uniform uploads; clearing old errors keeps upload behavior deterministic.
        try {
            let _e;
            while ((_e = gl.getError()) !== gl.NO_ERROR) {
                // intentionally empty: clear the GL error state
            }
        } catch (e) {
            // ignore getError failures
        }

        let v = this._value;
        if (settings.generate) v = settings.generate(this._value);

        const valArray = Array.isArray(v) ? v : [v];
        try {
            if (settings.setFn.endsWith("fv") && !settings.setFn.includes("Matrix")) {
                gl[settings.setFn](this.location, new Float32Array(valArray));
            } else if (settings.setFn.includes("Matrix")) {
                const args = valArray.slice();
                if (Array.isArray(args[args.length - 1]))
                    args[args.length - 1] = new Float32Array(args[args.length - 1]);
                gl[settings.setFn](this.location, ...args);
            } else {
                gl[settings.setFn](this.location, ...valArray);
            }
        } catch (e) {
            console.error(`Failed to upload uniform ${name}: ${e.message}`);
            return false;
        }
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error(`Failed to update uniform ${this.name}:`, error);
            return false;
        }
        return true;
    }
}

/**
 * Represents the Varying animation module class.
 */
class Varying extends VariableBase {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("varying", ...args);
        this.constructor.index++;
    }
}

/**
 * Represents the InputAttribute animation module class.
 */
class InputAttribute extends Attribute {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("in", ...args);
        this.constructor.index++;
    }
}

/**
 * Represents the OutputAttribute animation module class.
 */
class OutputAttribute extends Attribute {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("out", ...args);
        this.constructor.index++;
    }
}