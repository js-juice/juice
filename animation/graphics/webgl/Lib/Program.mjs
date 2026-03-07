/**
 * WebGL Program for managing shader programs and buffers.
 * @module Graphics/WebGL/Lib/Program
 */

/**
 * Program class manages WebGL shader programs, attributes, and buffers.
 * @class Program
 */
class Program {
    buffers = {};
    /**
     * Creates a new WebGL program.
     * @param {WebGLRenderingContext} gl - The WebGL context
     * @param {Shader} vertexShader - The vertex shader
     * @param {Shader} fragmentShader - The fragment shader
     */
    constructor(gl, vertexShader, fragmentShader) {
        this.gl = gl;
        this.vertexShader = vertexShader;
        this.fragmentShader = fragmentShader;
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
     * Executes build.
     * @returns {*} Result of build.
     */
    build() {
        const gl = this.gl;

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