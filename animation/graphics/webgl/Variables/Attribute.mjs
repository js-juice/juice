/**
 * WebGL attribute variable for shader inputs.
 * Manages vertex attribute data for WebGL shaders.
 * @module Graphics/WebGL/Variables/Attribute
 */

import WebGL from "../Lib/WebGL.mjs";
import VariableSettings from "./VariableSettings.mjs";
import VariableBase from "./VariableBase.mjs";
import { checkGLError } from "../Lib/Helper.mjs";

/**
 * Attribute variable for vertex shader input.
 * @class Attribute
 * @extends VariableBase
 */
export class Attribute extends VariableBase {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} name - Parameter value.
     * @param {*} type - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(name, type, value) {
        super("in", name, type, value);
    }

    /**
     * Returns the current location value.
     * @returns {*} Current location value.
     */
    get location() {
        if (!this.program || !this.gl) return null;
        if (this._location) return this._location;
        this._location = this.gl.getAttribLocation(this.program, this.name);
        return this._location;
    }

    /**
     * Executes createBuffer.
     * @returns {*} Result of createBuffer.
     */
    createBuffer() {
        const { gl } = this;
        this.buffer = gl.createBuffer();
    }

    /**
     * Executes upload.
     * @returns {*} Result of upload.
     */
    upload() {
        const { gl, settings } = this;
        if (this._value === undefined || !this._location) return;
        // console.log("upload buffer", this._buffer, this._value);
        if (!this.buffer) this.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._value), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(this._location, settings.args, gl[settings.argType], false, 0, 0);
        gl.enableVertexAttribArray(this._location);
        checkGLError(this.gl);
    }

    /**
     * Executes download.
     * @returns {*} Result of download.
     */
    download() {
        const downloaded = new Float32Array(this.length * this.settings.args);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.getBufferSubData(gl.ARRAY_BUFFER, 0, downloaded); // Retrieve updated positions
        this._value = downloaded;
        return downloaded;
    }
}

export default VariableBase;
