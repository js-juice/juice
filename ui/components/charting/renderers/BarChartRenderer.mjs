import BaseChartRenderer from "./BaseChartRenderer.mjs";

/**
 * BarChartRenderer - Renders bar (column) charts.
 *
 * Draws rectangular bars representing data values. Supports:
 * - Vertical or horizontal bars
 * - Grouped or stacked bar layouts
 * - Multiple datasets per chart
 * - Custom colors and spacing
 *
 * @class BarChartRenderer
 * @extends BaseChartRenderer
 */
class BarChartRenderer extends BaseChartRenderer {
    /**
     * Creates a new BarChartRenderer instance.
     * @param {HTMLElement} container - The DOM element where the chart will be rendered
     * @param {Object} config - Renderer configuration
     * @param {boolean} [config.horizontal=false] - Whether bars are horizontal
     * @param {string} [config.layout='grouped'] - Bar layout: 'grouped' or 'stacked'
     * @param {number} [config.barWidth=0.8] - Width of bars as ratio of available space
     * @param {number} [config.spacing=0.2] - Space between bar groups as ratio
     */
    constructor(container, config = {}) {
        super(container, {
            horizontal: false,
            layout: "grouped", // 'grouped' or 'stacked'
            barWidth: 0.8,
            spacing: 0.2,
            ...config
        });
    }

    /**
     * Initializes the bar chart renderer.
     * @returns {BarChartRenderer}
     */
    initialize() {
        // Setup can happen here if needed
        return this;
    }

    /**
     * Renders the bar chart.
     * @returns {SVGElement} The rendered SVG chart element
     */
    render() {
        if (!this.validatePayload(this.payload)) {
            return this.container;
        }

        this.clear();

        const svg = this.createSVGElement("svg", {
            width: "100%",
            height: "100%",
            viewBox: `0 0 ${this.payload.width || 800} ${this.payload.height || 400}`,
            preserveAspectRatio: "xMidYMid meet"
        });

        const { datasets, xAxis, yAxis } = this.payload;

        if (this.config.layout === "stacked") {
            this.renderStackedBars(svg, datasets, xAxis, yAxis);
        } else {
            this.renderGroupedBars(svg, datasets, xAxis, yAxis);
        }

        this.container.appendChild(svg);
        return svg;
    }

    /**
     * Renders bars in grouped layout.
     * @protected
     * @param {SVGElement} svg - Target SVG element
     * @param {Array<Object>} datasets - Array of datasets
     * @param {Object} xAxis - X-axis configuration
     * @param {Object} yAxis - Y-axis configuration
     */
    renderGroupedBars(svg, datasets, xAxis, yAxis) {
        const values = datasets[0]?.values || [];
        const barWidth = this.config.barWidth;
        const spacing = this.config.spacing;
        const groupWidth = 1 / values.length;

        values.forEach((_, index) => {
            const groupX = this.normalizeX(index, values.length);

            datasets.forEach((dataset, datasetIndex) => {
                const value = dataset.values?.[index] || 0;
                const offset = (datasetIndex - datasets.length / 2 + 0.5) * groupWidth * barWidth;
                const x = groupX + offset;
                const y = this.normalizeY(value, yAxis);
                const height = Math.abs(this.normalizeY(0, yAxis) - y);

                const rect = this.createSVGElement("rect", {
                    x: Math.max(0, x),
                    y: y,
                    width: Math.abs(groupWidth * barWidth * 0.9),
                    height: height,
                    fill: dataset.color || this.getDefaultColor(datasetIndex)
                });

                svg.appendChild(rect);
            });
        });
    }

    /**
     * Renders bars in stacked layout.
     * @protected
     * @param {SVGElement} svg - Target SVG element
     * @param {Array<Object>} datasets - Array of datasets
     * @param {Object} xAxis - X-axis configuration
     * @param {Object} yAxis - Y-axis configuration
     */
    renderStackedBars(svg, datasets, xAxis, yAxis) {
        const values = datasets[0]?.values || [];

        values.forEach((_, index) => {
            let stackY = this.normalizeY(0, yAxis);
            const x = this.normalizeX(index, values.length);

            datasets.forEach((dataset, datasetIndex) => {
                const value = dataset.values?.[index] || 0;
                const nextStackY = this.normalizeY(value, yAxis);
                const height = Math.abs(stackY - nextStackY);

                const rect = this.createSVGElement("rect", {
                    x: x,
                    y: Math.min(stackY, nextStackY),
                    width: 0.8 / values.length,
                    height: height,
                    fill: dataset.color || this.getDefaultColor(datasetIndex)
                });

                svg.appendChild(rect);
                stackY = nextStackY;
            });
        });
    }

    /**
     * Normalizes X coordinate based on index and total count.
     * @protected
     * @param {number} index - Current index
     * @param {number} total - Total number of bars
     * @returns {number} Normalized X coordinate
     */
    normalizeX(index, total) {
        const width = this.payload.width || 800;
        const padding = 40;
        const availableWidth = width - padding * 2;
        return padding + (index / Math.max(1, total)) * availableWidth;
    }

    /**
     * Normalizes Y coordinate based on value and axis range.
     * @protected
     * @param {number} value - Data value
     * @param {Object} yAxis - Y-axis configuration
     * @returns {number} Normalized Y coordinate
     */
    normalizeY(value, yAxis) {
        const height = this.payload.height || 400;
        const padding = 40;
        const availableHeight = height - padding * 2;
        const min = yAxis?.min ?? 0;
        const max = yAxis?.max ?? 100;
        const normalized = (value - min) / Math.max(1, max - min);
        return padding + availableHeight - normalized * availableHeight;
    }

    /**
     * Gets default color for dataset by index.
     * @protected
     * @param {number} index - Dataset index
     * @returns {string} Color in hex or named format
     */
    getDefaultColor(index) {
        const colors = [
            "#2563eb", // blue
            "#dc2626", // red
            "#16a34a", // green
            "#ea580c", // orange
            "#9333ea", // purple
            "#0891b2" // cyan
        ];
        return colors[index % colors.length];
    }

    /**
     * Creates an SVG element with attributes.
     * @protected
     * @param {string} tag - SVG element tag name
     * @param {Object} attrs - Attributes object
     * @returns {SVGElement} Created SVG element
     */
    createSVGElement(tag, attrs = {}) {
        const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attrs).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }
}

export default BarChartRenderer;
