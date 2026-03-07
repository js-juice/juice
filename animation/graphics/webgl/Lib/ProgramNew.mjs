/**
 * New WebGL program implementation with improved architecture.
 * Alternative program class with enhanced shader management.
 * @module Graphics/WebGL/Lib/ProgramNew
 */

import Shaders from "./Shader.mjs";

/**
 * Enhanced WebGL program manager.
 * @class Program
 */
class Program {
    /**
     * Executes fromCanvas.
     * @param {*} canvas - Parameter value.
     * @returns {*} Result of fromCanvas.
     */
    static fromCanvas(canvas) {
        const gl = canvas.getContext("webgl");
        return new Program(canvas.width, canvas.height, gl);
    }

    buffers = {};
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} webgl - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(webgl) {
        if (gl) this.gl = webgl.gl;
        this.vertexShader = null;
        this.fragmentShader = null;
        this.build();
    }

    /**
     * Executes attribLocation.
     * @param {*} name - Parameter value.
     * @returns {*} Result of attribLocation.
     */
    attribLocation(name) {
        const { gl } = this;
        return gl.getAttribLocation(this.native, name);
    }

    /**
     * Executes uniformLocation.
     * @param {*} name - Parameter value.
     * @returns {*} Result of uniformLocation.
     */
    uniformLocation(name) {
        const { gl } = this;
        return gl.getUniformLocation(this.native, name);
    }

    /**
     * Executes buffer.
     * @param {*} name - Parameter value.
     * @returns {*} Result of buffer.
     */
    buffer(name) {
        return this.buffers[name];
    }

    /**
     * Executes createBuffer.
     * @param {*} name - Parameter value.
     * @param {*} TYPE - Parameter value.
     * @param {*} value - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of createBuffer.
     */
    createBuffer(name, TYPE, value, options = { usage: "STATIC_DRAW" }) {
        const { gl } = this;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl[TYPE], buffer);
        if (value) gl.bufferData(gl[TYPE], new Float32Array(value), gl[options.usage]);
        this.buffers[name] = buffer;
        return buffer;
    }

    /**
     * Executes attach.
     * @param {*} vertex - Parameter value.
     * @param {*} fragment - Parameter value.
     * @returns {*} Result of attach.
     */
    attach(vertex, fragment) {
        this.vertexShader = vertex;
        this.fragmentShader = fragment;
        return this;
    }

    /**
     * Executes build.
     * @returns {*} Result of build.
     */
    build() {
        let gl = this.gl;
        if (!gl) {
            const canvas = document.createElement("canvas");
            canvas.width = this.width;
            canvas.height = this.height;
            gl = canvas.getContext("webgl");
            this.gl = gl;
            this.canvas = canvas;
        }

        this.native = gl.createProgram();
        gl.attachShader(this.native, this.vertexShader.shader);
        gl.attachShader(this.native, this.fragmentShader.shader);
        gl.linkProgram(this.native);

        var success = gl.getProgramParameter(this.native, gl.LINK_STATUS);
        if (success) {
            return this.native;
        }
        console.log(gl.getProgramInfoLog(this.native));
        gl.deleteProgram(this.native);
    }
}

export default Program;