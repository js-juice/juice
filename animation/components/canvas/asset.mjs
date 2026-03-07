/**
 * Canvas asset for image and graphic loading.
 * Manages asset loading and positioning for canvas rendering.
 * @module Components/Animation/Canvas/Asset
 */

/**
 * Asset for canvas rendering with position and dimensions.
 * @class CanvasAsset
 */
class CanvasAsset {
    loading = false;
    width = 1;
    height = 1;
    x = 0;
    y = 0;

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.initialize();
    }

    /**
     * Executes link.
     * @param {*} canvas - Parameter value.
     * @returns {*} Result of link.
     */
    link(canvas) {
        this.canvas = canvas;
        canvas.addAsset(this);
    }

    /**
     * Executes initialize.
     * @returns {*} Result of initialize.
     */
    initialize() {}
}

export default CanvasAsset;

/**
 * Represents the CanvasPixel animation module class.
 */
class CanvasPixel extends CanvasAsset {
    rgb = [0, 0, 0];
    alpha = 1;
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y) {
        super(x, y);
    }

    /**
     * Returns the current r value.
     * @returns {*} Current r value.
     */
    get r() {
        return this.rgb[0];
    }

    /**
     * Returns the current g value.
     * @returns {*} Current g value.
     */
    get g() {
        return this.rgb[1];
    }

    /**
     * Returns the current b value.
     * @returns {*} Current b value.
     */
    get b() {
        return this.rgb[2];
    }

    /**
     * Updates the r value.
     * @param {*} v - Parameter value.
     * @returns {*} void.
     */
    set r(v) {
        this.rgb[0] = v;
    }
    /**
     * Updates the g value.
     * @param {*} v - Parameter value.
     * @returns {*} void.
     */
    set g(v) {
        this.rgb[1] = v;
    }
    /**
     * Updates the b value.
     * @param {*} v - Parameter value.
     * @returns {*} void.
     */
    set b(v) {
        this.rgb[2] = v;
    }

    /**
     * Executes initialize.
     * @returns {*} Result of initialize.
     */
    initialize() {}
}