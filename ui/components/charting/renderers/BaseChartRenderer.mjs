/**
 * BaseChartRenderer - Abstract base class for all chart renderers.
 *
 * All chart renderers must extend this class and implement the required methods.
 * Renderers are responsible for converting normalized chart data into visual representation.
 *
 * @class BaseChartRenderer
 * @abstract
 */
class BaseChartRenderer {
    /**
     * Creates a new BaseChartRenderer instance.
     * @param {HTMLElement} container - The DOM element where the chart will be rendered
     * @param {Object} config - Renderer configuration options
     */
    constructor(container, config = {}) {
        this.container = container;
        this.config = { ...config };
        this.payload = null;
    }

    /**
     * Initializes the renderer and prepares it for rendering.
     * Must be called before calling render().
     *
     * @returns {BaseChartRenderer} Returns this for method chaining
     */
    initialize() {
        // Override in subclass
        return this;
    }

    /**
     * Ingest normalized chart payload.
     *
     * @param {Object} payload - Normalized chart payload from ChartData.toChartPayload()
     * @returns {BaseChartRenderer} Returns this for method chaining
     */
    ingest(payload) {
        this.payload = payload;
        return this;
    }

    /**
     * Renders the chart based on the ingested payload.
     * Must be implemented by subclasses.
     *
     * @throws {Error} If not implemented by subclass
     * @returns {HTMLElement|SVGElement} The rendered chart element
     */
    render() {
        throw new Error("render() must be implemented by subclass");
    }

    /**
     * Clears the renderer and removes all rendered content.
     *
     * @returns {BaseChartRenderer} Returns this for method chaining
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = "";
        }
        this.payload = null;
        return this;
    }

    /**
     * Updates the renderer configuration.
     *
     * @param {Object} newConfig - New configuration options to merge
     * @returns {BaseChartRenderer} Returns this for method chaining
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this;
    }

    /**
     * Gets the current renderer configuration.
     *
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Validates that the payload has required structure.
     *
     * @protected
     * @param {Object} payload - Payload to validate
     * @returns {boolean} True if payload is valid
     */
    validatePayload(payload) {
        return payload && typeof payload === "object" && Array.isArray(payload.datasets) && payload.datasets.length > 0;
    }
}

export default BaseChartRenderer;
