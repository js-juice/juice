/**
 * Input attribute for shader vertex inputs.
 * Manages input vertex attributes with automatic indexing.
 * @module Graphics/WebGL/Variables/InputAttribute
 */

import VariableSettings from "./VariableSettings.mjs";
import VariableBase from "./VariableBase.mjs";

/**
 * Input attribute with automatic index tracking.
 * @class InputAttribute
 * @extends VariableBase
 */
class InputAttribute extends VariableBase {
    static index = -1;
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("in", ...args);
        this.constructor.index++;
        this.index = this.constructor.index;
    }

    /**
     * Executes lookupLocation.
     * @returns {*} Result of lookupLocation.
     */
    lookupLocation() {
        if (!this.bound) return;
        const { gl } = this;
        this.location = gl.getAttribLocation(this.program, this.name);
        return this.location;
    }

    /**
     * Executes upload.
     * @returns {*} Result of upload.
     */
    upload() {
        const { settings, gl } = this;
        if (!this.buffer) this.createBuffer();
        if (!this.buffer) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._value), gl.DYNAMIC_DRAW);

        //gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Executes download.
     * @returns {*} Result of download.
     */
    download() {
        const { settings, gl } = this;
        const data = new Float32Array(this._value.length);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return data;
    }

    /**
     * Executes bindBuffer.
     * @returns {*} Result of bindBuffer.
     */
    bindBuffer() {
        const { settings, gl } = this;
        if (!this.buffer) this.createBuffer();
        //Bind Input for Reading
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.location);
        gl.vertexAttribPointer(this.location, 3, gl.FLOAT, false, 0, 0);
    }

    /**
     * Executes createBuffer.
     * @returns {*} Result of createBuffer.
     */
    createBuffer() {
        const { settings, gl } = this;
        this.buffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        if (this._value) {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._value.length), gl.DYNAMIC_DRAW);
        }

        //Clean up
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Handles bound events.
     * @returns {*} Result of onBound.
     */
    onBound() {
        if (!this.buffer) {
            this.createBuffer();
        }
    }
}

export default InputAttribute;
