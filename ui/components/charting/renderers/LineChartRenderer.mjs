import BaseChartRenderer from "./BaseChartRenderer.mjs";

/**
 * LineChartRenderer - Renders line charts with SVG paths.
 *
 * Draws one or more lines representing data series. Supports:
 * - Multiple datasets per chart
 * - Point markers at data points
 * - Curved or straight line interpolation
 * - Custom colors and styles per dataset
 *
 * @class LineChartRenderer
 * @extends BaseChartRenderer
 */
class LineChartRenderer extends BaseChartRenderer {
    /**
     * Creates a new LineChartRenderer instance.
     * @param {HTMLElement} container - The DOM element where the chart will be rendered
     * @param {Object} config - Renderer configuration
     * @param {boolean} [config.showPoints=true] - Whether to show point markers
     * @param {boolean} [config.curved=false] - Whether to use curved lines (Bézier)
     * @param {number} [config.strokeWidth=2] - Width of the line in pixels
     */
    constructor(container, config = {}) {
        super(container, {
            showPoints: true,
            curved: false,
            strokeWidth: 2,
            ...config
        });
    }

    /**
     * Initializes the line chart renderer.
     * @returns {LineChartRenderer}
     */
    initialize() {
        // Setup can happen here if needed
        return this;
    }

    /**
     * Renders the line chart.
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

        // Draw lines for each dataset
        datasets.forEach((dataset, index) => {
            const points = this.generatePoints(dataset, xAxis, yAxis);
            if (points.length > 0) {
                const pathData = this.createPathData(points);
                const line = this.createSVGElement("path", {
                    d: pathData,
                    stroke: dataset.color || this.getDefaultColor(index),
                    "stroke-width": this.config.strokeWidth,
                    fill: "none",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round"
                });
                svg.appendChild(line);

                // Draw point markers if enabled
                if (this.config.showPoints) {
                    points.forEach((point) => {
                        const circle = this.createSVGElement("circle", {
                            cx: point.x,
                            cy: point.y,
                            r: 3,
                            fill: dataset.color || this.getDefaultColor(index)
                        });
                        svg.appendChild(circle);
                    });
                }
            }
        });

        this.container.appendChild(svg);
        return svg;
    }

    /**
     * Generates SVG path data from points.
     * @protected
     * @param {Array<{x: number, y: number}>} points - Array of coordinate points
     * @returns {string} SVG path data string
     */
    createPathData(points) {
        if (points.length === 0) return "";

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

export default LineChartRenderer;
