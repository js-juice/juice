import BaseChartRenderer from "./BaseChartRenderer.mjs";

/**
 * ScatterChartRenderer - Renders scatter (bubble) charts.
 *
 * Draws individual points representing data relationships. Supports:
 * - Multiple datasets per chart
 * - Configurable point sizes
 * - Custom colors and markers
 * - Optional trend lines
 *
 * @class ScatterChartRenderer
 * @extends BaseChartRenderer
 */
class ScatterChartRenderer extends BaseChartRenderer {
    /**
     * Creates a new ScatterChartRenderer instance.
     * @param {HTMLElement} container - The DOM element where the chart will be rendered
     * @param {Object} config - Renderer configuration
     * @param {number} [config.pointRadius=4] - Radius of data points in pixels
     * @param {boolean} [config.showTrendline=false] - Whether to show trend lines
     * @param {string} [config.pointShape='circle'] - Shape of points: 'circle', 'square', 'diamond'
     */
    constructor(container, config = {}) {
        super(container, {
            pointRadius: 4,
            showTrendline: false,
            pointShape: "circle",
            ...config
        });
    }

    /**
     * Initializes the scatter chart renderer.
     * @returns {ScatterChartRenderer}
     */
    initialize() {
        // Setup can happen here if needed
        return this;
    }

    /**
     * Renders the scatter chart.
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

        datasets.forEach((dataset, index) => {
            const points = this.generatePoints(dataset, xAxis, yAxis);

            // Draw trend line if enabled
            if (this.config.showTrendline && points.length > 1) {
                const trendLine = this.createTrendLine(points, dataset, index);
                svg.appendChild(trendLine);
            }

            // Draw points
            points.forEach((point) => {
                const pointElement = this.createPoint(point, dataset.color || this.getDefaultColor(index));
                svg.appendChild(pointElement);
            });
        });

        this.container.appendChild(svg);
        return svg;
    }

    /**
     * Creates a point marker element.
     * @protected
     * @param {{x: number, y: number}} point - Point coordinates
     * @param {string} color - Point color
     * @returns {SVGElement} Point marker element
     */
    createPoint(point, color) {
        if (this.config.pointShape === "square") {
            const size = this.config.pointRadius * 1.5;
            return this.createSVGElement("rect", {
                x: point.x - size / 2,
                y: point.y - size / 2,
                width: size,
                height: size,
                fill: color,
                stroke: "#ffffff",
                "stroke-width": 1
            });
        } else if (this.config.pointShape === "diamond") {
            const size = this.config.pointRadius * 1.5;
            const points = [
                [point.x, point.y - size],
                [point.x + size, point.y],
                [point.x, point.y + size],
                [point.x - size, point.y]
            ]
                .map((p) => p.join(","))
                .join(" ");

            return this.createSVGElement("polygon", {
                points: points,
                fill: color,
                stroke: "#ffffff",
                "stroke-width": 1
            });
        } else {
            // Default to circle
            return this.createSVGElement("circle", {
                cx: point.x,
                cy: point.y,
                r: this.config.pointRadius,
                fill: color,
                stroke: "#ffffff",
                "stroke-width": 1
            });
        }
    }

    /**
     * Creates a trend line for the dataset.
     * @protected
     * @param {Array<{x: number, y: number}>} points - Array of point coordinates
     * @param {Object} dataset - Dataset object
     * @param {number} index - Dataset index
     * @returns {SVGElement} Trend line element
     */
    createTrendLine(points, dataset, index) {
        const coeffs = this.calculateLinearRegression(points);
        if (!coeffs) return this.createSVGElement("g"); // Empty group

        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        const startY = coeffs.slope * firstPoint.x + coeffs.intercept;
        const endY = coeffs.slope * lastPoint.x + coeffs.intercept;

        return this.createSVGElement("line", {
            x1: firstPoint.x,
            y1: startY,
            x2: lastPoint.x,
            y2: endY,
            stroke: dataset.color || this.getDefaultColor(index),
            "stroke-width": 1,
            "stroke-dasharray": "5,5",
            opacity: 0.6
        });
    }

    /**
     * Calculates linear regression coefficients for trend line.
     * @protected
     * @param {Array<{x: number, y: number}>} points - Array of point coordinates
     * @returns {{slope: number, intercept: number}|null} Regression coefficients or null
     */
    calculateLinearRegression(points) {
        if (points.length < 2) return null;

        const n = points.length;
        let sumX = 0,
            sumY = 0,
            sumXY = 0,
            sumX2 = 0;

        points.forEach((p) => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
        });

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return null;

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
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

export default ScatterChartRenderer;
