/**
 * Feedback attribute for transform feedback operations.
 * Manages attributes used in WebGL transform feedback with location binding.
 * @module Graphics/WebGL/Variables/FeedbackAttribute
 */

import VariableBase from "./VariableBase.mjs";

/**
 * Attribute variable for transform feedback operations.
 * @class FeedbackAttribute
 * @extends VariableBase
 */
class FeedbackAttribute extends VariableBase {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} args - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(...args) {
        super("in", ...args);
        this.LOCATION_LOOKUP = "getAttribLocation";
        this.children = [];
    }

    /**
     * Executes define.
     * @param {*} builder - Parameter value.
     * @returns {*} Result of define.
     */
    define(builder) {
        const { settings, gl } = this;
        builder.define(
            (this._locationId !== null ? `layout(location = ${this._locationId}) ` : "") + "in",
            this.name,
            this.type
        );
        builder.define("out", this.name + "Out", this.type);
    }

    /**
     * Returns the current definition value.
     * @returns {*} Current definition value.
     */
    get definition() {
        return (
            (this._locationId !== null ? `layout(location = ${this._locationId}) ` : "") +
            `in ${this.type} ${this.name};
            out ${this.type} ${this.name}Out;
        `
        );
    }

    /**
     * Executes addChild.
     * @param {*} attribute - Parameter value.
     * @returns {*} Result of addChild.
     */
    addChild(attribute) {
        this.children.push(attribute);
    }

    /**
     * Executes upload.
     * @returns {*} Result of upload.
     */
    upload() {
        const { settings, gl } = this;
        if (!this.buffer) this.createBuffers();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.write);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._value), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Executes download.
     * @returns {*} Result of download.
     */
    download() {
        const { settings, gl } = this;
        const data = new Float32Array(this._value.length);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.read);
        gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);
        return data;
    }

    /**
     * Executes attachCaptureBuffer.
     * @returns {*} Result of attachCaptureBuffer.
     */
    attachCaptureBuffer() {
        const { gl, index = 0, name } = this;
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, this.buffer.write);
        if (this.debug || (this.parent && this.parent.debug)) {
        }
    }

    /**
     * Executes unbindBuffer.
     * @returns {*} Result of unbindBuffer.
     */
    unbindBuffer() {
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    }

    /**
     * Executes createBuffers.
     * @returns {*} Result of createBuffers.
     */
    createBuffers() {
        console.log("CREATE BUFFERS", this.name);
        const { settings, gl } = this;
        this.buffer = {
            read: gl.createBuffer(),
            write: gl.createBuffer()
        };

        if (!this.buffer.read || !this.buffer.write) {
            throw new Error(`Failed to create buffers for ${this.name}`);
        }

        // Determine element/component count and desired item count
        const components = settings && settings.args ? settings.args : 1;
        const itemCount = this.points || (this._value ? this._value.length / components : 0);

        // Normalize value into a Float32Array and ensure proper length
        let data = null;
        if (this._value) {
            data = this._value instanceof Float32Array ? this._value : new Float32Array(this._value);
        } else if (itemCount > 0) {
            data = new Float32Array(itemCount * components);
        } else {
            // fallback: allocate at least one element per component
            data = new Float32Array(components);
        }

        // Keep normalized _value for future uploads
        this._value = data;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.read);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.write);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

        //Clean up
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Executes swapBuffers.
     * @returns {*} Result of swapBuffers.
     */
    swapBuffers() {
        const { settings, gl } = this;
        if (!this.buffer) return;

        const temp = this.buffer.read;
        this.buffer.read = this.buffer.write;
        this.buffer.write = temp;
    }

    /**
     * Handles bound events.
     * @returns {*} Result of onBound.
     */
    onBound() {
        console.log("onBound", this.name);
        if (!this.buffer) {
            this.createBuffers();
        }
    }

    /**
     * Executes resizeBuffers.
     * @param {*} newItemCount - Parameter value.
     * @returns {*} Result of resizeBuffers.
     */
    resizeBuffers(newItemCount) {
        const { settings, gl } = this;
        if (!this.buffer) {
            console.warn(`${this.name}: resizeBuffers called before createBuffers`);
            return;
        }

        const components = settings && settings.args ? settings.args : 1;
        const newSize = newItemCount * components;

        // Create new data array sized to new count
        const newData = new Float32Array(newSize);

        // Copy existing data if present
        if (this._value && this._value.length > 0) {
            const copyCount = Math.min(this._value.length, newSize);
            newData.set(this._value.subarray(0, copyCount));
        }

        // Update the stored value
        this._value = newData;

        // Reallocate GPU buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.read);
        gl.bufferData(gl.ARRAY_BUFFER, newData, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.write);
        gl.bufferData(gl.ARRAY_BUFFER, newData, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

export default FeedbackAttribute;