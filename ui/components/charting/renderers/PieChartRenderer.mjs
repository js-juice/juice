import BaseChartRenderer from "./BaseChartRenderer.mjs";

/**
 * PieChartRenderer - Renders pie and donut charts.
 *
 * Draws pie slices representing data proportions. Supports:
 * - Pie and donut variations
 * - Slice labels and percentages
 * - Custom colors per slice
 * - Configurable inner radius for donut effect
 *
 * @class PieChartRenderer
 * @extends BaseChartRenderer
 */
class PieChartRenderer extends BaseChartRenderer {
    /**
     * Creates a new PieChartRenderer instance.
     * @param {HTMLElement} container - The DOM element where the chart will be rendered
     * @param {Object} config - Renderer configuration
     * @param {number} [config.innerRadius=0] - Inner radius for donut effect (0-1)
     * @param {boolean} [config.showLabels=true] - Whether to show slice labels
     * @param {boolean} [config.showPercentages=true] - Whether to show percentage values
     */
    constructor(container, config = {}) {
        super(container, {
            innerRadius: 0,
            showLabels: true,
            showPercentages: true,
            ...config
        });
    }

    /**
     * Initializes the pie chart renderer.
     * @returns {PieChartRenderer}
     */
    initialize() {
        // Setup can happen here if needed
        return this;
    }

    /**
     * Renders the pie chart.
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
            viewBox: `0 0 ${this.payload.width || 400} ${this.payload.height || 400}`,
            preserveAspectRatio: "xMidYMid meet"
        });

        const { datasets } = this.payload;
        const centerX = (this.payload.width || 400) / 2;
        const centerY = (this.payload.height || 400) / 2;
        const radius = Math.min(centerX, centerY) * 0.8;

        // Flatten all datasets into single value array for pie chart
        const values = datasets.flatMap((ds) => ds.values || []);
        const total = values.reduce((sum, v) => sum + (v || 0), 0);

        if (total <= 0) {
            return this.container;
        }

        let currentAngle = -Math.PI / 2;

        values.forEach((value, index) => {
            const percentage = value / total;
            const angle = percentage * 2 * Math.PI;

            const slice = this.createSlice(centerX, centerY, radius, currentAngle, angle, index, value, total);

            svg.appendChild(slice);
            currentAngle += angle;
        });

        this.container.appendChild(svg);
        return svg;
    }

    /**
     * Creates a pie slice element.
     * @protected
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Radius of the pie
     * @param {number} startAngle - Start angle in radians
     * @param {number} angle - Angle span in radians
     * @param {number} index - Slice index
     * @param {number} value - Data value
     * @param {number} total - Total of all values
     * @returns {SVGElement} Group containing slice and labels
     */
    createSlice(centerX, centerY, radius, startAngle, angle, index, value, total) {
        const group = this.createSVGElement("g");

        const endAngle = startAngle + angle;
        const innerRadius = radius * Math.max(0, Math.min(1, this.config.innerRadius));

        // Calculate path coordinates
        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);

        const ix1 = centerX + innerRadius * Math.cos(startAngle);
        const iy1 = centerY + innerRadius * Math.sin(startAngle);
        const ix2 = centerX + innerRadius * Math.cos(endAngle);
        const iy2 = centerY + innerRadius * Math.sin(endAngle);

        const largeArc = angle > Math.PI ? 1 : 0;

        let pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

        if (innerRadius > 0) {
            pathData += ` L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
        } else {
            pathData += ` L ${centerX} ${centerY} Z`;
        }

        const path = this.createSVGElement("path", {
            d: pathData,
            fill: this.getDefaultColor(index),
            stroke: "#ffffff",
            "stroke-width": 2
        });

        group.appendChild(path);

        // Add labels if enabled
        if (this.config.showLabels || this.config.showPercentages) {
            const labelAngle = startAngle + angle / 2;
            const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.67;
            const labelX = centerX + labelRadius * Math.cos(labelAngle);
            const labelY = centerY + labelRadius * Math.sin(labelAngle);

            const text = this.createSVGElement("text", {
                x: labelX,
                y: labelY,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                fill: "#ffffff",
                "font-size": "12",
                "font-weight": "bold"
            });

            const percentage = ((value / total) * 100).toFixed(1);
            text.textContent = this.config.showPercentages ? `${percentage}%` : value;

            group.appendChild(text);
        }

        return group;
    }

    /**
     * Gets default color for slice by index.
     * @protected
     * @param {number} index - Slice index
     * @returns {string} Color in hex or named format
     */
    getDefaultColor(index) {
        const colors = [
            "#2563eb", // blue
            "#dc2626", // red
            "#16a34a", // green
            "#ea580c", // orange
            "#9333ea", // purple
            "#0891b2", // cyan
            "#f59e0b", // amber
            "#ec4899" // pink
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

export default PieChartRenderer;
