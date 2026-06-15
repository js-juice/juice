/**
 * WebGL helper utilities for texture loading and program creation.
 * @module Graphics/WebGL/Lib/Helper
 */

/**
 * Checks if a value is a power of 2.
 * @param {number} value - The value to check
 * @returns {boolean} True if the value is a power of 2
 */
export function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

/**
 * Executes loadTexture.
 * @param {*} gl - Parameter value.
 * @param {*} url - Parameter value.
 * @returns {*} Result of loadTexture.
 */
export function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Initial temporary 1x1 pixel texture
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // A blue default pixel
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

            // Check if the image is power-of-two
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D); // Safe to generate mipmaps
            } else {
                // Use clamp-to-edge and disable mipmapping for NPOT textures
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
            resolve({ texture, image });
        };
        image.src = url;
    });
}

/**
 * Creates and returns program data.
 * @param {*} gl - Parameter value.
 * @param {*} vertexShaderSource - Parameter value.
 * @param {*} fragmentShaderSource - Parameter value.
 * @returns {*} Result of createProgram.
 */
export function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

/**
 * Creates and returns shader data.
 * @param {*} gl - Parameter value.
 * @param {*} type - Parameter value.
 * @param {*} source - Parameter value.
 * @returns {*} Result of createShader.
 */
export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Creates and returns texture data.
 * @param {*} gl - Parameter value.
 * @param {*} image - Parameter value.
 * @returns {*} Result of createTexture.
 */
export function createTexture(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
}

/**
 * Executes loadJSON.
 * @param {*} url - Parameter value.
 * @returns {*} Result of loadJSON.
 */
export function loadJSON(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "json";
        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = (error) => {
            reject(error);
        };
        xhr.send();
    });
}

/**
 * Executes loadText.
 * @param {*} url - Parameter value.
 * @returns {*} Result of loadText.
 */
export function loadText(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "text";
        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject(xhr.statusText);
            }
        };
        xhr.onerror = (error) => {
            reject(error);
        };
        xhr.send();
    });
}

/**
 * Executes checkGLError.
 * @param {*} gl - Parameter value.
 * @param {*} operation - Parameter value.
 * @returns {*} Result of checkGLError.
 */
export function checkGLError(gl, operation) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        switch (error) {
            case gl.INVALID_ENUM:
                break;
            case gl.INVALID_VALUE:
                break;
            case gl.INVALID_OPERATION:
                break;
            case gl.INVALID_FRAMEBUFFER_OPERATION:
                break;
            case gl.OUT_OF_MEMORY:
                break;
            case gl.CONTEXT_LOST_WEBGL:
                break;
            default:
        }
    }
}
