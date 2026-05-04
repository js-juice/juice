import Component from "../../component.mjs";
import ChartData from "./chart-data.mjs";
import "./grid.mjs";
import "./chart-visualization.mjs";
import { CHART_TYPES_REGISTRY, getRendererForType } from "./renderers/index.mjs";

function safeJSONStringify(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return '"[unserializable]"';
    }
}

function chartDebugEnabled() {
    if (typeof window === "undefined") {
        return false;
    }

    return window.__JUICE_CHART_DEBUG === true;
}

function chartDebugLog(message, detail = null) {
    if (!chartDebugEnabled()) {
        return;
    }

    if (detail !== null) {
        console.log(`[JUICE CHART] ${message}`, detail);
        return;
    }

    console.log(`[JUICE CHART] ${message}`);
}

class ChartComponent extends Component.HTMLElement {
    static tag = "juice-chart";

    /**
     * Complete array of all available chart types.
     * Includes both currently implemented and planned renderer types.
     * Use for populating UI selectors or validating chart type requests.
     *
     * @type {Array<Object>}
     */
    static CHART_TYPES = CHART_TYPES_REGISTRY;

    static config = {
        name: "juice-chart",
        properties: {
            data: { type: "string", default: "", linked: true },
            chartconfig: { type: "string", default: "", linked: true }
        }
    };

    static get observed() {
        return {
            all: ["data", "chartconfig"]
        };
    }

    static html() {
        return `
			<chart-grid id="grid"></chart-grid>
		`;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    width: "100%",
                    height: "100%",
                    minHeight: "260px",
                    position: "relative"
                },
                "#grid": {
                    display: "block",
                    width: "100%",
                    height: "100%"
                }
            }
        ];
    }

    onFirstConnect() {
        this.grid = this.ref("grid");
        if (!Array.isArray(this.rawData)) {
            this.rawData = [];
        }
        if (!this.rawConfig || typeof this.rawConfig !== "object") {
            this.rawConfig = {};
        }
        this.chartData = this.chartData || null;
        this.payload = this.payload || null;
        this.rebuildFrame = null;

        const initialData = this.parseMaybeJSON(this.data, []);
        const initialConfig = this.parseMaybeJSON(this.chartconfig, {});
        this.setData(initialData, initialConfig);

        requestAnimationFrame(() => {
            if (this.isConnected) {
                this.scheduleRebuild();
            }
        });
    }

    onPropertyChanged(prop) {
        if (prop === "data" || prop === "chartconfig") {
            const nextData = this.parseMaybeJSON(this.data, this.rawData || []);
            const nextConfig = this.parseMaybeJSON(this.chartconfig, this.rawConfig || {});
            this.setData(nextData, nextConfig);
        }
    }

    parseMaybeJSON(value, fallback) {
        if (value == null || value === "") {
            return fallback;
        }

        if (typeof value !== "string") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    setData(data = [], config = {}) {
        this.rawData = Array.isArray(data) ? data : [];
        this.rawConfig = config && typeof config === "object" ? config : {};
        chartDebugLog("setData", {
            points: this.rawData.length,
            type: this.rawConfig?.type || "line",
            keys: Object.keys(this.rawConfig || {})
        });
        this.scheduleRebuild();
    }

    ingest(data = [], config = {}) {
        this.setData(data, config);
    }

    scheduleRebuild() {
        if (this.rebuildFrame != null) {
            return;
        }

        this.rebuildFrame = requestAnimationFrame(() => {
            this.rebuildFrame = null;
            this.rebuild();
        });
    }

    rebuild() {
        if (!this.grid || typeof this.grid !== "object") {
            chartDebugLog("rebuild skipped: grid missing");
            return;
        }

        this.chartData = new ChartData(this.rawData, this.rawConfig).initialize();
        this.payload = this.chartData.toChartPayload();

        const datasets = Array.isArray(this.payload?.datasets) ? this.payload.datasets : [];
        const datasetSummary = datasets.map((dataset) => {
            const points = Array.isArray(dataset?.points) ? dataset.points.length : 0;
            const values = Array.isArray(dataset?.data) ? dataset.data.length : 0;
            return {
                key: dataset?.key,
                type: dataset?.type,
                points,
                values
            };
        });

        chartDebugLog("rebuild payload ready", {
            labels: Array.isArray(this.payload?.labels) ? this.payload.labels.length : 0,
            yRange: this.payload?.axis?.y?.range,
            datasets: datasetSummary
        });

        this.pushPayloadToGrid();
    }

    pushPayloadToGrid() {
        if (!this.grid || typeof this.grid !== "object") {
            chartDebugLog("pushPayloadToGrid skipped: grid missing");
            return;
        }

        if (typeof this.grid.ingest === "function") {
            chartDebugLog("pushPayloadToGrid via ingest", {
                datasets: Array.isArray(this.payload?.datasets) ? this.payload.datasets.length : 0,
                yRange: this.payload?.axis?.y?.range
            });
            this.grid.ingest.call(this.grid, this.payload);
            return;
        }

        const previousState =
            this.grid.chartState && typeof this.grid.chartState === "object" ? this.grid.chartState : {};
        this.grid.chartState = {
            payload: this.payload,
            xTicks: Array.isArray(previousState.xTicks) ? previousState.xTicks : [],
            yTicks: Array.isArray(previousState.yTicks) ? previousState.yTicks : [],
            xRange: Array.isArray(previousState.xRange) ? previousState.xRange : [0, 1],
            yRange: Array.isArray(previousState.yRange) ? previousState.yRange : [0, 1]
        };

        chartDebugLog("pushPayloadToGrid via chartState fallback", {
            datasets: Array.isArray(this.payload?.datasets) ? this.payload.datasets.length : 0,
            yRange: this.payload?.axis?.y?.range
        });
    }

    /**
     * Gets all available chart types.
     * @returns {Array<Object>} Array of chart type configurations
     */
    getAvailableChartTypes() {
        return ChartComponent.CHART_TYPES;
    }

    /**
     * Gets the renderer class for a specific chart type.
     * @param {string} type - Chart type identifier
     * @returns {Function|null} Renderer class or null if not found
     */
    getRendererClass(type) {
        return getRendererForType(type);
    }

    /**
     * Validates if a chart type is supported (implemented or planned).
     * @param {string} type - Chart type identifier
     * @returns {boolean} True if the chart type is supported
     */
    isValidChartType(type) {
        return ChartComponent.CHART_TYPES.some((config) => config.type === type);
    }

    /**
     * Checks if a chart type is currently implemented.
     * @param {string} type - Chart type identifier
     * @returns {boolean} True if the chart type is implemented
     */
    isImplementedChartType(type) {
        const config = ChartComponent.CHART_TYPES.find((c) => c.type === type);
        return config && !config.planned;
    }
}
if (typeof customElements !== "undefined") {
    if (!customElements.get(ChartComponent.tag)) {
        customElements.define(ChartComponent.tag, ChartComponent);
    }
}

export default ChartComponent;
