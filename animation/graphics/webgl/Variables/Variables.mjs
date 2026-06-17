/**
 * WebGL shader variable classes (Attribute, Uniform, Varying).
 * Provides typed variable wrappers for shader programming.
 * @module Graphics/WebGL/Variables/Variables
 */

import VariableBase from "./VariableBase.mjs";

import { checkGLError } from "../Lib/Helper.mjs";

function valueSignature(value) {
    if (ArrayBuffer.isView(value)) return Array.from(value).join(",");
    if (Array.isArray(value)) return value.join(",");

    return String(value);
}

function toFloat32Array(value, uniform) {
    const length = value.length || 0;
    if (!uniform._floatUploadValue || uniform._floatUploadValue.length !== length) {
        uniform._floatUploadValue = new Float32Array(length);
    }
    uniform._floatUploadValue.set(value);

    return uniform._floatUploadValue;
}

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
        // Ensure we have a valid location before attempting upload
        const loc = this.location;
        if (loc === null || loc === undefined || loc === -1) return false;

        let v = this._value;
        if (settings.generate) v = settings.generate(this._value);

        const valArray = Array.isArray(v) || ArrayBuffer.isView(v) ? v : [v];
        const signature = `${settings.setFn}:${valueSignature(valArray)}`;
        if (signature === this._uploadedSignature) return true;

        gl.useProgram(program);

        const shouldCheckErrors = this.options?.checkErrors || this.options?.debug;
        if (shouldCheckErrors) {
            try {
                let _e;
                while ((_e = gl.getError()) !== gl.NO_ERROR) {
                    // clear any earlier GL error before this debug-checked upload
                }
            } catch (e) {
                // ignore getError failures
            }
        }

        try {
            if (settings.setFn.endsWith("fv") && !settings.setFn.includes("Matrix")) {
                gl[settings.setFn](loc, toFloat32Array(valArray, this));
            } else if (settings.setFn.includes("Matrix")) {
                const args = valArray.slice();
                if (Array.isArray(args[args.length - 1]))
                    args[args.length - 1] = toFloat32Array(args[args.length - 1], this);
                gl[settings.setFn](loc, ...args);
            } else {
                gl[settings.setFn](loc, ...valArray);
            }
        } catch (e) {
            console.error(`Failed to upload uniform ${name}: ${e.message}`);
            return false;
        }
        if (shouldCheckErrors) {
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                console.error(`Failed to update uniform ${this.name}:`, error);
                return false;
            }
        }
        this._uploadedSignature = signature;
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
