import BaseChartRenderer from "./BaseChartRenderer.mjs";

/**
 * AreaChartRenderer - Renders area charts.
 *
 * Draws filled areas under lines representing cumulative or individual data series.
 * Supports:
 * - Stacked or non-stacked area layouts
 * - Multiple datasets per chart
 * - Custom colors and opacity
 * - Curved or straight line interpolation
 *
 * @class AreaChartRenderer
 * @extends BaseChartRenderer
 */
class AreaChartRenderer extends BaseChartRenderer {
    /**
     * Creates a new AreaChartRenderer instance.
     * @param {HTMLElement} container - The DOM element where the chart will be rendered
     * @param {Object} config - Renderer configuration
     * @param {boolean} [config.stacked=false] - Whether areas are stacked
     * @param {boolean} [config.curved=false] - Whether to use curved lines
     * @param {number} [config.opacity=0.7] - Opacity of filled areas (0-1)
     * @param {number} [config.strokeWidth=2] - Width of the line in pixels
     */
    constructor(container, config = {}) {
        super(container, {
            stacked: false,
            curved: false,
            opacity: 0.7,
            strokeWidth: 2,
            ...config
        });
    }

    /**
     * Initializes the area chart renderer.
     * @returns {AreaChartRenderer}
     */
    initialize() {
        // Setup can happen here if needed
        return this;
    }

    /**
     * Renders the area chart.
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

        if (this.config.stacked) {
            this.renderStackedAreas(svg, datasets, xAxis, yAxis);
        } else {
            this.renderNonStackedAreas(svg, datasets, xAxis, yAxis);
        }

        this.container.appendChild(svg);
        return svg;
    }

    /**
     * Renders non-stacked areas (overlapping).
     * @protected
     * @param {SVGElement} svg - Target SVG element
     * @param {Array<Object>} datasets - Array of datasets
     * @param {Object} xAxis - X-axis configuration
     * @param {Object} yAxis - Y-axis configuration
     */
    renderNonStackedAreas(svg, datasets, xAxis, yAxis) {
        datasets.forEach((dataset, index) => {
            const points = this.generatePoints(dataset, xAxis, yAxis);
            if (points.length > 0) {
                const pathData = this.createAreaPathData(points, yAxis);
                const area = this.createSVGElement("path", {
                    d: pathData,
                    fill: dataset.color || this.getDefaultColor(index),
                    "fill-opacity": this.config.opacity,
                    stroke: dataset.color || this.getDefaultColor(index),
                    "stroke-width": this.config.strokeWidth,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                });
                svg.appendChild(area);
            }
        });
    }

    /**
     * Renders stacked areas.
     * @protected
     * @param {SVGElement} svg - Target SVG element
     * @param {Array<Object>} datasets - Array of datasets
     * @param {Object} xAxis - X-axis configuration
     * @param {Object} yAxis - Y-axis configuration
     */
    renderStackedAreas(svg, datasets, xAxis, yAxis) {
        const values = datasets[0]?.values || [];
        const stackBase = new Array(values.length).fill(0);

        datasets.forEach((dataset, index) => {
            const points = [];
            const stackedValues = (dataset.values || []).map((v, i) => {
                stackBase[i] += v || 0;
                return stackBase[i];
            });

            stackedValues.forEach((value, pointIndex) => {
                const x = this.normalizeX(pointIndex, values.length);
                const y = this.normalizeY(value, yAxis);
                points.push({ x, y });
            });

            if (points.length > 0) {
                const pathData = this.createAreaPathData(points, yAxis);
                const area = this.createSVGElement("path", {
                    d: pathData,
                    fill: dataset.color || this.getDefaultColor(index),
                    "fill-opacity": this.config.opacity,
                    stroke: dataset.color || this.getDefaultColor(index),
                    "stroke-width": this.config.strokeWidth,
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                });
                svg.appendChild(area);
            }
        });
    }

    /**
     * Generates SVG area path data from points.
     * @protected
     * @param {Array<{x: number, y: number}>} points - Array of coordinate points
     * @param {Object} yAxis - Y-axis configuration
     * @returns {string} SVG path data string
     */
    createAreaPathData(points, yAxis) {
        if (points.length === 0) return "";

        const height = this.payload.height || 400;
        const padding = 40;
        const baselineY = padding + (height - padding * 2);

        let path = `M ${points[0].x} ${points[0].y}`;

        if (this.config.curved && points.length > 1) {
            // Bézier curve approximation
            for (let i = 1; i < points.length; i++) {
                const cp = this.getControlPoint(points, i - 1);
                path += ` Q ${cp.x} ${cp.y} ${points[i].x} ${points[i].y}`;
            }
        } else {
            // Straight lines
            for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x} ${points[i].y}`;
            }
        }

        // Close the area by drawing back to baseline
        path += ` L ${points[points.length - 1].x} ${baselineY}`;
        path += ` L ${points[0].x} ${baselineY} Z`;

        return path;
    }

    /**
     * Generates control point for Bézier curve.
     * @protected
     * @param {Array<{x: number, y: number}>} points - Array of points
     * @param {number} index - Index of control point
     * @returns {{x: number, y: number}} Control point coordinates
     */
    getControlPoint(points, index) {
        const current = points[index];
        const next = points[index + 1];
        return {
            x: (current.x + next.x) / 2,
            y: (current.y + next.y) / 2
        };
    }

    /**
     * Generates point coordinates from dataset values.
     * @protected
     * @param {Object} dataset - Dataset object with values
     * @param {Object} xAxis - X-axis information
     * @param {Object} yAxis - Y-axis information
     * @returns {Array<{x: number, y: number}>} Array of point coordinates
     */
    generatePoints(dataset, xAxis, yAxis) {
        const points = [];
        const values = dataset.values || [];

        values.forEach((value, index) => {
            const x = this.normalizeX(index, values.length);
            const y = this.normalizeY(value, yAxis);
            points.push({ x, y });
        });

        return points;
    }

    /**
     * Normalizes X coordinate based on index and total count.
     * @protected
     * @param {number} index - Current index
     * @param {number} total - Total number of points
     * @returns {number} Normalized X coordinate
     */
    normalizeX(index, total) {
        const width = this.payload.width || 800;
        const padding = 40;
        const availableWidth = width - padding * 2;
        return padding + (index / Math.max(1, total - 1)) * availableWidth;
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

export default AreaChartRenderer;
