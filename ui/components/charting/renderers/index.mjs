/**
 * Chart Renderers Index - Pluggable renderer system for different chart types.
 *
 * This module exports all available chart renderers and provides
 * the chart type registry with metadata for each renderer type.
 */

import BaseChartRenderer from "./BaseChartRenderer.mjs";
import LineChartRenderer from "./LineChartRenderer.mjs";
import BarChartRenderer from "./BarChartRenderer.mjs";
import PieChartRenderer from "./PieChartRenderer.mjs";
import AreaChartRenderer from "./AreaChartRenderer.mjs";
import ScatterChartRenderer from "./ScatterChartRenderer.mjs";

/**
 * Complete registry of all available chart types and their renderers.
 * This array defines all chart types that can be used with the chart component,
 * including those that are currently implemented and future planned types.
 *
 * Each entry includes:
 * - type: Unique identifier for the chart type
 * - label: Human-readable name for the chart type
 * - description: Detailed description of what this chart type is used for
 * - renderer: The renderer class to use (or null for planned types)
 * - planned: Whether this is a planned future type (not yet implemented)
 *
 * @type {Array<Object>}
 */
export const CHART_TYPES_REGISTRY = [
    {
        type: "line",
        label: "Line Chart",
        description: "Connect data points with lines, ideal for showing trends over time",
        renderer: LineChartRenderer,
        planned: false
    },
    {
        type: "bar",
        label: "Bar Chart",
        description: "Display data as vertical bars, good for comparing values across categories",
        renderer: BarChartRenderer,
        planned: false
    },
    {
        type: "pie",
        label: "Pie Chart",
        description: "Show parts of a whole as proportional slices, useful for composition analysis",
        renderer: PieChartRenderer,
        planned: false
    },
    {
        type: "area",
        label: "Area Chart",
        description: "Combination of line chart with filled area, emphasizing magnitude of change",
        renderer: AreaChartRenderer,
        planned: false
    },
    {
        type: "scatter",
        label: "Scatter Chart",
        description: "Plot individual points to show relationship between two variables",
        renderer: ScatterChartRenderer,
        planned: false
    },
    {
        type: "bubble",
        label: "Bubble Chart",
        description: "Scatter chart with bubble sizes representing a third dimension",
        renderer: null,
        planned: true
    },
    {
        type: "doughnut",
        label: "Doughnut Chart",
        description: "Pie chart variant with a hollow center for better readability",
        renderer: null,
        planned: true
    },
    {
        type: "histogram",
        label: "Histogram",
        description: "Bar chart for distribution of continuous data, grouped into bins",
        renderer: null,
        planned: true
    },
    {
        type: "heatmap",
        label: "Heatmap",
        description: "Grid of colored cells showing intensity of values across two dimensions",
        renderer: null,
        planned: true
    },
    {
        type: "waterfall",
        label: "Waterfall Chart",
        description: "Show sequential positive/negative contributions to a total",
        renderer: null,
        planned: true
    },
    {
        type: "candlestick",
        label: "Candlestick Chart",
        description: "Display OHLC (open, high, low, close) data for financial charts",
        renderer: null,
        planned: true
    },
    {
        type: "sankey",
        label: "Sankey Diagram",
        description: "Show flow and relationships between categories",
        renderer: null,
        planned: true
    },
    {
        type: "treemap",
        label: "Treemap",
        description: "Hierarchical rectangles showing part-to-whole relationships",
        renderer: null,
        planned: true
    },
    {
        type: "sunburst",
        label: "Sunburst Chart",
        description: "Radial treemap showing hierarchical data structure",
        renderer: null,
        planned: true
    },
    {
        type: "gauge",
        label: "Gauge Chart",
        description: "Speedometer-style chart for showing current value within a range",
        renderer: null,
        planned: true
    },
    {
        type: "radarbox",
        label: "Radar Chart",
        description: "Multi-axis chart for comparing multiple variables across datasets",
        renderer: null,
        planned: true
    },
    {
        type: "box",
        label: "Box Plot",
        description: "Show distribution quartiles, median, and outliers",
        renderer: null,
        planned: true
    },
    {
        type: "violin",
        label: "Violin Plot",
        description: "Show distribution density alongside individual data points",
        renderer: null,
        planned: true
    }
];

/**
 * Gets a chart type configuration from the registry.
 * @param {string} type - The chart type identifier
 * @returns {Object|null} Chart type configuration or null if not found
 */
export function getChartTypeConfig(type) {
    return CHART_TYPES_REGISTRY.find((config) => config.type === type) || null;
}

/**
 * Gets the renderer class for a chart type.
 * @param {string} type - The chart type identifier
 * @returns {Function|null} Renderer class or null if not found or not implemented
 */
export function getRendererForType(type) {
    const config = getChartTypeConfig(type);
    return config?.renderer || null;
}

/**
 * Gets all implemented chart types (not including planned types).
 * @returns {Array<Object>} Array of implemented chart type configurations
 */
export function getImplementedChartTypes() {
    return CHART_TYPES_REGISTRY.filter((config) => !config.planned);
}

/**
 * Gets all planned (not yet implemented) chart types.
 * @returns {Array<Object>} Array of planned chart type configurations
 */
export function getPlannedChartTypes() {
    return CHART_TYPES_REGISTRY.filter((config) => config.planned);
}

/**
 * Gets all available chart type identifiers.
 * @returns {Array<string>} Array of all chart type identifiers
 */
export function getAllChartTypes() {
    return CHART_TYPES_REGISTRY.map((config) => config.type);
}

export {
    BaseChartRenderer,
    LineChartRenderer,
    BarChartRenderer,
    PieChartRenderer,
    AreaChartRenderer,
    ScatterChartRenderer
};
