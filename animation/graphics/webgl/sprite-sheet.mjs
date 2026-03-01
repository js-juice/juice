/**
 * WebGL sprite sheet renderer for 2D sprite animation.
 * Manages texture atlases and sprite rendering with WebGL.
 * @module Animation/Graphics/WebGL/SpriteSheet
 */

import Shader from "./Lib/Shader.mjs";
import Program from "./Lib/Program.mjs";
import * as WebGLHelper from "./Lib/Helper.mjs";

/**
 * Vertex shader source for sprite rendering.
 * @private
 */
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    uniform vec2 u_offset;

    varying vec2 v_texCoord;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord + u_offset;
    }
`;

const fragmentShaderSource = `

    precision mediump float;

    varying vec2 v_texCoord;

    uniform sampler2D u_texture;

    void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
    }
`;

class SpriteSheet {
    sheets = [];

    locations = {};

    rendered = {};

    offsetX = 0;
    offsetY = 0;
    _frame = 0;
    /**
     * Creates a new instance of the ScrollingBackground class.
     * @constructor
     * @param {HTMLElement} container - The container element where the background is rendered.
     * @param {HTMLImageElement} image - The image to be used as the background.
     */
    constructor(width, height, container = null) {
        /**
         * The container element where the background is rendered.
         * @type {HTMLElement}
         */
        this.container = container;

        this.width = width;
        this.height = height;

        this.sheet = null;

        /**
         * The image to be used as the background.
         * @type {HTMLImageElement}
         */
        this.dataURL = null;

        this.textureCanvas = null;
        // this.textureCanvas2 = canvas2;

        /**
         * The initial X offset of the background.
         * @type {number}
         */
        this.offsetX = 0.0;

        /**
         * The initial Y offset of the background.
         * @type {number}
         */
        this.offsetY = 0.0;
        /**
         * Initializes the background.
         */

        this.initialize();
    }

    toPositiveNumber(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        return numeric;
    }

    normalizeSheetArgs(frameWidth, frameHeight, options) {
        if (frameWidth && typeof frameWidth === "object") {
            options = frameWidth;
            frameWidth = options.frameWidth ?? options.width;
            frameHeight = options.frameHeight ?? options.height;
        } else if (frameHeight && typeof frameHeight === "object") {
            options = frameHeight;
            frameHeight = options.frameHeight ?? options.height;
        }
        return {
            frameWidth,
            frameHeight,
            options: options || {},
        };
    }

    resize(width, height) {
        const { gl, canvas } = this;
        if (!gl || !canvas) return;
        const nextWidth = this.toPositiveNumber(width);
        const nextHeight = this.toPositiveNumber(height);
        if (!nextWidth || !nextHeight) return;

        this.width = nextWidth;
        this.height = nextHeight;

        if (canvas.width !== nextWidth) canvas.width = nextWidth;
        if (canvas.height !== nextHeight) canvas.height = nextHeight;

        gl.viewport(0, 0, canvas.width, canvas.height);
        this.rendered = {};
    }

    addSheet(source, frameWidth = null, frameHeight = null, options = null) {
        const { gl } = this;
        if (!gl) return Promise.reject(new Error("WebGL context unavailable"));

        const args = this.normalizeSheetArgs(frameWidth, frameHeight, options);
        const config = args.options;

        return WebGLHelper.loadTexture(gl, source).then((resp) => {
            const { texture, image } = resp;
            const resolvedFrameWidth = this.toPositiveNumber(args.frameWidth) || this.toPositiveNumber(this.width) || image.width;
            const resolvedFrameHeight = this.toPositiveNumber(args.frameHeight) || this.toPositiveNumber(this.height) || image.height;
            const resolvedViewWidth = this.toPositiveNumber(config.viewWidth) || this.toPositiveNumber(config.width) || resolvedFrameWidth;
            const resolvedViewHeight = this.toPositiveNumber(config.viewHeight) || this.toPositiveNumber(config.height) || resolvedFrameHeight;

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(this.locations.texture, 0);

            const frameWidthP = resolvedFrameWidth / image.width;
            const frameHeightP = resolvedFrameHeight / image.height;

            const sheet = {};
            sheet.frameWidth = resolvedFrameWidth;
            sheet.frameHeight = resolvedFrameHeight;
            sheet.viewWidth = resolvedViewWidth;
            sheet.viewHeight = resolvedViewHeight;
            sheet.image = image;
            sheet.width = image.width;
            sheet.height = image.height;
            sheet.xInterval = frameWidthP;
            sheet.yInterval = frameHeightP;
            sheet.columns = Math.max(1, Math.floor(image.width / resolvedFrameWidth));
            sheet.rows = Math.max(1, Math.floor(image.height / resolvedFrameHeight));
            sheet.frameCount = sheet.columns * sheet.rows;
            sheet.texture = texture;

            this.sheets.push(sheet);
            const index = this.sheets.length - 1;

            const w = Math.min(1, sheet.xInterval);
            const h = Math.min(1, sheet.yInterval);
            sheet.coords = [0, h, w, h, 0, 0, 0, 0, w, h, w, 0];

            if (config.activate !== false) {
                this.useSheet(index, {
                    frame: config.frame ?? this._frame,
                    resize: config.resize !== false,
                });
            }

            this.ready = true;
            if (config.activate === false && config.render) this.render(true);
            return sheet;
        });
    }

    useSheet(index, options = null) {
        const { gl } = this;
        const sheet = this.sheets[index];
        if (!sheet) return;
        const config = options || {};
        this.sheet = sheet;

        if (config.resize !== false) {
            this.resize(sheet.viewWidth, sheet.viewHeight);
        }

        const texCoordBuffer = this.program.buffer("texCoord");
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sheet.coords), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(this.locations.texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.locations.texCoord);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sheet.texture);
        gl.uniform1i(this.locations.texture, 0);
        this.frame = config.frame ?? this._frame;
        return sheet;
    }

    move(x, y) {
        if (!this.sheet) return;
        this.offsetX += x / this.sheet.width;
        this.offsetY += y / this.sheet.height;
        this.dirty = true;
    }

    set(x, y) {
        if (!this.sheet) return;
        this.offsetX = x / this.sheet.width;
        this.offsetY = y / this.sheet.height;
        this.dirty = true;
    }

    update(x, y) {
        this.offsetX = x;
        this.offsetY = y;
        this.dirty = true;
    }

    setColumn(column, row = 0) {
        if (!this.sheet) return;
        column = ((column % this.sheet.columns) + this.sheet.columns) % this.sheet.columns;
        row = ((row % this.sheet.rows) + this.sheet.rows) % this.sheet.rows;
        this.offsetX = column * this.sheet.xInterval;
        this.offsetY = row * this.sheet.yInterval;
        this.dirty = true;
    }

    set frame(f) {
        if (!this.sheet) return;
        const frameCount = this.sheet.frameCount || this.sheet.columns * this.sheet.rows;
        const frame = ((f % frameCount) + frameCount) % frameCount;
        const column = frame % this.sheet.columns;
        const row = Math.floor(frame / this.sheet.columns);
        this.offsetX = column * this.sheet.xInterval;
        this.offsetY = row * this.sheet.yInterval;
        this._frame = frame;
        this.dirty = true;
        this.render();
    }

    get frame() {
        return this._frame;
    }

    play(speed) {
        this.playing = true;
        if (this.sheet && this.sheet.frameCount) {
            this.frame = this._frame + 1;
        }
        this.playTO = setTimeout(() => {
            this.play(speed);
        }, speed * 1000);
    }

    stop() {
        clearTimeout(this.playTO);
        this.playTO = null;
        this.playing = false;
    }

    /**
     * Renders the background at the specified position.
     * @param {number} x The X coordinate of the position to render the background at.
     * @param {number} y The Y coordinate of the position to render the background at.
     */
    render(force = false) {
        if (!force && (!this.ready || (this.offsetX === this.rendered.x && this.offsetY === this.rendered.y))) return;
        const { gl } = this;

        gl.uniform2f(this.locations.offset, this.offsetX, this.offsetY);

        this.rendered = {
            x: this.offsetX,
            y: this.offsetY,
        };

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    initialize() {
        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.position = "absolute";
        canvas.style.top = 0;
        canvas.style.left = 0;
        this.container.appendChild(canvas);
        this.canvas = canvas;

        this.gl = this.canvas.getContext("webgl", { alpha: true });

        const { gl } = this;
        if (!gl) return;

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        const vertexShader = new Shader("VERTEX_SHADER", { gl: gl, version: 1 });
        vertexShader.build(vertexShaderSource);
        const fragmentShader = new Shader("FRAGMENT_SHADER", { gl: gl, version: 1 });
        fragmentShader.build(fragmentShaderSource);
        const program = new Program(gl, vertexShader, fragmentShader);
        this.program = program;

        gl.useProgram(program.native);

        const positions = [
            -1,
            -1,
            1,
            -1,
            -1,
            1,
            -1,
            1,
            1,
            -1,
            1,
            1, // Full quad
        ];

        // If you want to adjust the texture coordinates based on canvas size:
        const texCoords = [
            0,
            1,
            1,
            1,
            0,
            0,
            0,
            0,
            1,
            1,
            1,
            0, // Full quad
        ];

        program.createBuffer("position", "ARRAY_BUFFER", positions, { usage: "STATIC_DRAW" });
        program.createBuffer("texCoord", "ARRAY_BUFFER", texCoords, { usage: "STATIC_DRAW" });

        this.locations.position = program.attribLocation("a_position");
        this.locations.texCoord = program.attribLocation("a_texCoord");
        this.locations.offset = program.uniformLocation("u_offset");
        this.locations.texture = program.uniformLocation("u_texture");
        gl.uniform1i(this.locations.texture, 0);

        gl.enableVertexAttribArray(this.locations.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.program.buffer("position"));
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);
        // Enable the vertex attribute arrays
        gl.enableVertexAttribArray(this.locations.texCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.program.buffer("texCoord"));
        gl.vertexAttribPointer(this.locations.texCoord, 2, gl.FLOAT, false, 0, 0);

        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error("WebGL Error:", error);
        }

        if (this.onready) this.onready();
    }

    dispose() {
        this.stop();
        const { gl, program } = this;
        if (!gl) return;

        this.sheets.forEach((sheet) => {
            if (sheet && sheet.texture) gl.deleteTexture(sheet.texture);
        });

        if (program && program.buffers) {
            Object.keys(program.buffers).forEach((name) => {
                const buffer = program.buffers[name];
                if (buffer) gl.deleteBuffer(buffer);
            });
        }

        if (program && program.native) {
            gl.deleteProgram(program.native);
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export default SpriteSheet;
