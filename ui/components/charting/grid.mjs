import Component from "../../component.mjs";

function toFiniteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function formatTickLabel(value) {
    if (typeof value === "number") {
        if (Math.abs(value) >= 1000) {
            return value.toFixed(0);
        }
        if (Math.abs(value) >= 10) {
            return value.toFixed(1).replace(/\.0$/, "");
        }
        return value
            .toFixed(2)
            .replace(/\.00$/, "")
            .replace(/(\.\d)0$/, "$1");
    }

    return String(value ?? "");
}

function gridDebugEnabled() {
    if (typeof window === "undefined") {
        return false;
    }

    return window.__JUICE_CHART_DEBUG === true;
}

function gridDebugLog(message, detail = null) {
    if (!gridDebugEnabled()) {
        return;
    }

    if (detail !== null) {
        console.log(`[JUICE GRID] ${message}`, detail);
        return;
    }

    console.log(`[JUICE GRID] ${message}`);
}

class ChartGridComponent extends Component.HTMLElement {
    static tag = "chart-grid";

    static config = {
        name: "chart-grid",
        properties: {
            hidexgrid: { type: "exists", default: false, linked: true },
            hideygrid: { type: "exists", default: false, linked: true },
            hidexticks: { type: "exists", default: false, linked: true },
            hideyticks: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["hidexgrid", "hideygrid", "hidexticks", "hideyticks"]
        };
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    width: "100%",
                    height: "100%",
                    minHeight: "220px",
                    position: "relative",
                    boxSizing: "border-box",
                    "--chart-grid-line-color": "rgba(148, 163, 184, 0.28)",
                    "--chart-grid-axis-color": "rgba(100, 116, 139, 0.5)",
                    "--chart-grid-tick-color": "rgba(100, 116, 139, 0.8)",
                    "--chart-grid-label-color": "#475569",
                    "--chart-grid-font-size": "11px",
                    "--chart-grid-y-axis-width": "56px",
                    "--chart-grid-x-axis-height": "28px"
                },
                ".chart-grid": {
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    gridTemplateColumns: "var(--chart-grid-y-axis-width) 1fr",
                    gridTemplateRows: "1fr var(--chart-grid-x-axis-height)",
                    overflow: "hidden",
                    position: "relative",
                    boxSizing: "border-box"
                },
                "#view": {
                    gridColumn: "2 / 3",
                    gridRow: "1 / 2",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    borderLeft: "1px solid var(--chart-grid-axis-color)",
                    borderBottom: "1px solid var(--chart-grid-axis-color)",
                    boxSizing: "border-box"
                },
                "#grid-layer": {
                    position: "absolute",
                    inset: "0",
                    pointerEvents: "none",
                    zIndex: "1"
                },
                "#series-layer": {
                    position: "absolute",
                    inset: "0",
                    pointerEvents: "none",
                    zIndex: "3"
                },
                "#view > slot": {
                    position: "absolute",
                    inset: "0",
                    display: "block",
                    zIndex: "2"
                },
                "::slotted(chart-visualization)": {
                    position: "absolute",
                    inset: "0",
                    display: "block",
                    width: "100%",
                    height: "100%"
                },
                "#y-axis": {
                    gridColumn: "1 / 2",
                    gridRow: "1 / 2",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    overflow: "visible"
                },
                "#x-axis": {
                    gridColumn: "2 / 3",
                    gridRow: "2 / 3",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    overflow: "visible"
                },
                ".grid-line": {
                    pointerEvents: "none",
                    opacity: "1"
                },
                ".x-grid-line": {
                    width: "1px",
                    background: "var(--chart-grid-line-color)"
                },
                ".y-grid-line": {
                    height: "1px",
                    background: "var(--chart-grid-line-color)"
                },
                ".axis .tick": {
                    display: "flex",
                    alignItems: "center",
                    color: "var(--chart-grid-label-color)",
                    fontSize: "var(--chart-grid-font-size)",
                    lineHeight: "1",
                    boxSizing: "border-box",
                    pointerEvents: "none"
                },
                ".y-axis .tick": {
                    justifyContent: "flex-end",
                    gap: "6px",
                    paddingRight: "8px",
                    transform: "translateY(50%)"
                },
                ".x-axis .tick": {
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    gap: "4px",
                    transform: "translateX(-50%)",
                    paddingTop: "2px"
                },
                ".tick-mark": {
                    display: "inline-block",
                    flexShrink: "0",
                    background: "var(--chart-grid-tick-color)"
                },
                ".y-axis .tick-mark": {
                    width: "6px",
                    height: "1px"
                },
                ".x-axis .tick-mark": {
                    width: "1px",
                    height: "6px"
                },
                ".tick-label": {
                    whiteSpace: "nowrap",
                    color: "var(--chart-grid-label-color)",
                    fontSize: "var(--chart-grid-font-size)",
                    fontFamily: "inherit",
                    opacity: "0.95"
                }
            }
        ];
    }

    onFirstConnect() {
        this.view = this.ref("view");
        this.gridLayer = this.ref("grid-layer");
        this.seriesLayer = this.ref("series-layer");
        this.axis = {};
        this.axis.x = { element: this.ref("x-axis") };
        this.axis.y = { element: this.ref("y-axis") };

        const previousState = this.chartState && typeof this.chartState === "object" ? this.chartState : {};

        this.chartState = {
            payload: previousState.payload ?? null,
            xTicks: Array.isArray(previousState.xTicks) ? previousState.xTicks : [],
            yTicks: Array.isArray(previousState.yTicks) ? previousState.yTicks : [],
            xRange: Array.isArray(previousState.xRange) ? previousState.xRange : [0, 1],
            yRange: Array.isArray(previousState.yRange) ? previousState.yRange : [0, 1]
        };

        if (this.chartState.payload) {
            this.refreshStateFromPayload();
            this.render();
        }
    }

    static html() {
        return `<div class="chart-grid">
        <div id="view">
        <div id="grid-layer"></div>
        <div id="series-layer"></div>
        <slot></slot>
        </div>
        <div id="y-axis" class="axis y-axis"></div>
        <div id="x-axis" class="axis x-axis"></div>
        
    </div>`;
    }

    /**
     * Accepts chart-data input and renders the axis grid.
     * Supports ChartData instances or chart payload objects.
     * Raw arrays are intentionally rejected because normalization must occur in chart-data.mjs first.
     * @param {*} values
     */
    ingest(values) {
        if (!this || typeof this !== "object") {
            return;
        }

        if (!this.chartState || typeof this.chartState !== "object") {
            this.chartState = {
                payload: null,
                xTicks: [],
                yTicks: [],
                xRange: [0, 1],
                yRange: [0, 1]
            };
        }

        this.chartState.payload = this.normalizePayload(values);
        const datasets = Array.isArray(this.chartState?.payload?.datasets) ? this.chartState.payload.datasets : [];
        gridDebugLog("ingest payload", {
            datasets: datasets.length,
            yRange: this.chartState?.payload?.axis?.y?.range,
            dataLengths: datasets.map((dataset) => {
                const points = Array.isArray(dataset?.points) ? dataset.points.length : 0;
                const data = Array.isArray(dataset?.data) ? dataset.data.length : 0;
                return { key: dataset?.key, type: dataset?.type, points, data };
            })
        });
        this.refreshStateFromPayload();
        this.render();
    }

    normalizePayload(values) {
        if (values && typeof values.toChartPayload === "function") {
            return values.toChartPayload();
        }

        if (values && typeof values === "object" && values.axis && values.datasets) {
            return values;
        }

        // Contract: this component only consumes data already normalized by chart-data.mjs.
        console.warn(
            "chart-grid.ingest expects a chart payload from ChartData#toChartPayload() or a ChartData instance."
        );

        return {
            labels: [],
            datasets: [],
            axis: {
                x: { ticks: [], labels: [] },
                y: { ticks: [0, 1], range: [0, 1] }
            }
        };
    }

    refreshStateFromPayload() {
        const payload = this.chartState.payload || {};
        const axis = payload.axis || {};
        const xAxis = axis.x || {};
        const yAxis = axis.y || {};

        const xTicksRaw = Array.isArray(xAxis.ticks)
            ? xAxis.ticks
            : Array.isArray(payload.labels)
              ? payload.labels
              : [];
        const xLabels = Array.isArray(xAxis.labels) ? xAxis.labels : xTicksRaw;

        const fullXTicks = xTicksRaw.map((value, index) => ({
            value,
            label: formatTickLabel(xLabels[index] ?? value),
            ratio: xTicksRaw.length <= 1 ? 0 : index / (xTicksRaw.length - 1)
        }));
        this.chartState.xTicks = this.compressTicks(fullXTicks, 24);

        const yTicksRaw = Array.isArray(yAxis.ticks) ? yAxis.ticks : [];
        const yRange =
            Array.isArray(yAxis.range) && yAxis.range.length >= 2
                ? [toFiniteNumber(yAxis.range[0], 0), toFiniteNumber(yAxis.range[1], 1)]
                : this.computeYRangeFromDatasets(payload.datasets);

        const minY = yRange[0];
        const maxY = yRange[1] > minY ? yRange[1] : minY + 1;
        const fallbackYTicks = [minY, maxY];
        const finalYTicks = yTicksRaw.length ? yTicksRaw : fallbackYTicks;

        const fullYTicks = finalYTicks.map((value) => {
            const numeric = toFiniteNumber(value, 0);
            const ratio = (numeric - minY) / (maxY - minY);
            return {
                value: numeric,
                label: formatTickLabel(numeric),
                ratio: Math.min(1, Math.max(0, ratio))
            };
        });
        this.chartState.yTicks = this.compressTicks(fullYTicks, 10);

        this.chartState.xRange = [0, Math.max(1, this.chartState.xTicks.length - 1)];
        this.chartState.yRange = [minY, maxY];
    }

    computeYRangeFromDatasets(datasets = []) {
        const values = [];
        for (const dataset of Array.isArray(datasets) ? datasets : []) {
            const points = Array.isArray(dataset?.points) ? dataset.points : [];
            if (points.length) {
                for (const point of points) {
                    values.push(toFiniteNumber(point?.y, Number.NaN));
                }
                continue;
            }

            const data = Array.isArray(dataset?.data) ? dataset.data : [];
            for (const v of data) {
                values.push(toFiniteNumber(v, Number.NaN));
            }
        }

        const nums = values.filter((v) => Number.isFinite(v));
        if (!nums.length) {
            return [0, 1];
        }

        const min = Math.min(...nums);
        const max = Math.max(...nums);
        if (min === max) {
            const pad = Math.max(Math.abs(min) * 0.1, 1);
            return [min - pad, max + pad];
        }

        return [min, max];
    }

    clearElement(el) {
        if (el) {
            el.innerHTML = "";
        }
    }

    compressTicks(ticks = [], maxCount = 24) {
        const source = Array.isArray(ticks) ? ticks : [];
        const limit = Math.max(2, Math.floor(toFiniteNumber(maxCount, 24)));
        if (source.length <= limit) {
            return source;
        }

        // Find a round interval (1, 2, 5, 10, etc.)
        const n = source.length;
        const rawStep = Math.ceil(n / limit);
        // Pick a "nice" step: 1, 2, 5, 10, 20, 50, ...
        function niceStep(step) {
            if (step <= 1) return 1;
            if (step <= 2) return 2;
            if (step <= 5) return 5;
            const pow10 = Math.pow(10, Math.floor(Math.log10(step)));
            if (step <= 2 * pow10) return 2 * pow10;
            if (step <= 5 * pow10) return 5 * pow10;
            return 10 * pow10;
        }
        const step = niceStep(rawStep);
        const compressed = [];
        for (let i = 0; i < n; i += 1) {
            if (i === 0 || i === n - 1 || i % step === 0) {
                compressed.push(source[i]);
            }
        }
        // Remove duplicates if last is already included
        for (let i = compressed.length - 2; i >= 0; i--) {
            if (compressed[i]?.value === compressed[compressed.length - 1]?.value) {
                compressed.splice(i, 1);
            }
        }
        return compressed;
    }

    render() {
        this.clearElement(this.gridLayer);
        this.clearElement(this.seriesLayer);
        this.clearElement(this.axis?.x?.element);
        this.clearElement(this.axis?.y?.element);

        if (!this.hideygrid) {
            this.renderYGridLines();
        }

        if (!this.hidexgrid) {
            this.renderXGridLines();
        }

        if (!this.hideyticks) {
            this.renderYAxisTicks();
        }

        if (!this.hidexticks) {
            this.renderXAxisTicks();
        }

        this.renderDatasets();

        this.dispatchRenderComplete();
    }

    renderDatasets() {
        const layer = this.seriesLayer;
        if (!layer) {
            return;
        }

        const payload = this.chartState?.payload;
        const datasets = Array.isArray(payload?.datasets) ? payload.datasets : [];
        if (!datasets.length) {
            return;
        }

        const maxCount = Math.max(
            0,
            ...datasets.map((dataset) => {
                const points = Array.isArray(dataset?.points) ? dataset.points : [];
                if (points.length) {
                    return points.length;
                }
                const data = Array.isArray(dataset?.data) ? dataset.data : [];
                return data.length;
            })
        );

        if (!maxCount) {
            return;
        }

        const minY = toFiniteNumber(this.chartState?.yRange?.[0], 0);
        const maxY = toFiniteNumber(this.chartState?.yRange?.[1], 1);
        const span = maxY > minY ? maxY - minY : 1;

        const finiteValues = [];
        for (const dataset of datasets) {
            const points = Array.isArray(dataset?.points) ? dataset.points : [];
            const sourceData = Array.isArray(dataset?.data) ? dataset.data : [];
            const values = points.length ? points.map((point) => point?.y) : sourceData;
            for (const rawValue of values) {
                const numeric = toFiniteNumber(rawValue, Number.NaN);
                if (Number.isFinite(numeric)) {
                    finiteValues.push(numeric);
                }
            }
        }

        const dataMin = finiteValues.length ? Math.min(...finiteValues) : minY;
        const dataMax = finiteValues.length ? Math.max(...finiteValues) : maxY;
        const dataSpan = dataMax > dataMin ? dataMax - dataMin : 0;

        let renderMin = minY;
        let renderMax = maxY;
        let renderSpan = span;

        // If axis range is much wider than real values, zoom the bar renderer to value spread.
        if (dataSpan > 0 && span > dataSpan * 5) {
            renderMin = dataMin;
            renderMax = dataMax;
            renderSpan = dataSpan;
        }

        if (!(renderMax > renderMin)) {
            renderMax = renderMin + 1;
            renderSpan = 1;
        }

        const zeroRatio = Math.min(1, Math.max(0, (0 - renderMin) / renderSpan));
        const zeroTopPercent = 100 - zeroRatio * 100;

        const slotPercent = 100 / maxCount;
        const seriesCount = datasets.length;
        const groupPercent = slotPercent * 0.78;
        const barPercent = Math.max(0.3, groupPercent / Math.max(1, seriesCount));

        const hasAnyNonZeroValue = finiteValues.some((value) => Math.abs(value) >= 1e-9);
        let appendedBars = 0;
        let minHeightPercent = Number.POSITIVE_INFINITY;
        let maxHeightPercent = 0;

        for (let index = 0; index < maxCount; index += 1) {
            const groupStart = index * slotPercent + (slotPercent - groupPercent) / 2;

            for (let seriesIndex = 0; seriesIndex < datasets.length; seriesIndex += 1) {
                const dataset = datasets[seriesIndex] || {};
                const color = dataset?.color || "#69d9af";

                const points = Array.isArray(dataset?.points) ? dataset.points : [];
                const sourceData = Array.isArray(dataset?.data) ? dataset.data : [];
                const rawValue = points.length ? points[index]?.y : sourceData[index];
                const value = toFiniteNumber(rawValue, Number.NaN);

                if (!Number.isFinite(value)) {
                    continue;
                }

                const valueRatio = Math.min(1, Math.max(0, (value - renderMin) / renderSpan));
                const valueTopPercent = 100 - valueRatio * 100;
                const topPercent = Math.min(valueTopPercent, zeroTopPercent);
                const rawHeightPercent = Math.abs(zeroTopPercent - valueTopPercent);
                const isZero = Math.abs(value) < 1e-9;
                if (isZero && hasAnyNonZeroValue) {
                    continue;
                }
                const heightPercent = Math.max(0.6, rawHeightPercent);
                const clampedTopPercent = Math.max(0, Math.min(100 - heightPercent, topPercent));
                const leftPercent = groupStart + seriesIndex * barPercent;

                const bar = document.createElement("div");
                bar.style.position = "absolute";
                bar.style.left = `${leftPercent.toFixed(4)}%`;
                bar.style.width = `${barPercent.toFixed(4)}%`;
                bar.style.top = `${clampedTopPercent.toFixed(4)}%`;
                bar.style.height = `${heightPercent.toFixed(4)}%`;
                bar.style.background = color;
                bar.style.opacity = isZero && !hasAnyNonZeroValue ? "0.45" : "0.92";
                bar.style.borderRadius = "2px 2px 0 0";
                layer.appendChild(bar);

                appendedBars += 1;
                minHeightPercent = Math.min(minHeightPercent, heightPercent);
                maxHeightPercent = Math.max(maxHeightPercent, heightPercent);
            }
        }

        gridDebugLog("renderDatasets metrics", {
            view: {
                width: this.view?.clientWidth || 0,
                height: this.view?.clientHeight || 0
            },
            datasetCount: datasets.length,
            maxCount,
            finiteCount: finiteValues.length,
            hasAnyNonZeroValue,
            axisRange: [minY, maxY],
            renderRange: [renderMin, renderMax],
            barsAppended: appendedBars,
            minHeightPercent: Number.isFinite(minHeightPercent) ? Number(minHeightPercent.toFixed(4)) : 0,
            maxHeightPercent: Number(maxHeightPercent.toFixed(4))
        });
    }

    dispatchRenderComplete() {
        const payload = this.chartState?.payload || null;
        this.dispatchEvent(
            new CustomEvent("grid-rendered", {
                bubbles: true,
                composed: true,
                detail: {
                    payload,
                    xTicks: Array.isArray(this.chartState?.xTicks) ? this.chartState.xTicks : [],
                    yTicks: Array.isArray(this.chartState?.yTicks) ? this.chartState.yTicks : [],
                    viewWidth: toFiniteNumber(this.view?.clientWidth, 0),
                    viewHeight: toFiniteNumber(this.view?.clientHeight, 0)
                }
            })
        );
    }

    renderYGridLines() {
        if (!this.gridLayer) {
            return;
        }

        for (const tick of this.chartState.yTicks) {
            if (!tick || tick.ratio <= 0) {
                continue;
            }

            const line = document.createElement("div");
            line.className = "grid-line y-grid-line";
            line.style.position = "absolute";
            line.style.left = "0";
            line.style.right = "0";
            line.style.bottom = `${(tick.ratio * 100).toFixed(4)}%`;
            this.gridLayer.appendChild(line);
        }
    }

    renderXGridLines() {
        if (!this.gridLayer) {
            return;
        }

        for (const tick of this.chartState.xTicks) {
            if (!tick || tick.ratio <= 0) {
                continue;
            }

            const line = document.createElement("div");
            line.className = "grid-line x-grid-line";
            line.style.position = "absolute";
            line.style.top = "0";
            line.style.bottom = "0";
            line.style.left = `${(tick.ratio * 100).toFixed(4)}%`;
            this.gridLayer.appendChild(line);
        }
    }

    renderYAxisTicks() {
        const axisElement = this.axis?.y?.element;
        if (!axisElement) {
            return;
        }

        for (const tick of this.chartState.yTicks) {
            const tickRow = document.createElement("div");
            tickRow.className = "tick y-tick";
            tickRow.style.position = "absolute";
            tickRow.style.left = "0";
            tickRow.style.right = "0";
            tickRow.style.bottom = `${(tick.ratio * 100).toFixed(4)}%`;

            const mark = document.createElement("span");
            mark.className = "tick-mark";

            const label = document.createElement("span");
            label.className = "tick-label";
            label.textContent = tick.label;

            tickRow.appendChild(mark);
            tickRow.appendChild(label);
            axisElement.appendChild(tickRow);
        }
    }

    renderXAxisTicks() {
        const axisElement = this.axis?.x?.element;
        if (!axisElement) {
            return;
        }

        // Get the full set of ticks (every value/unit)
        const payload = this.chartState?.payload;
        const xAxis = payload?.axis?.x || {};
        const xTicksRaw = Array.isArray(xAxis.ticks)
            ? xAxis.ticks
            : Array.isArray(payload?.labels)
              ? payload.labels
              : [];
        const xLabels = Array.isArray(xAxis.labels) ? xAxis.labels : xTicksRaw;
        const n = xTicksRaw.length;
        if (!n) return;

        // Build a Set of values that should have labels (compressed ticks)
        const compressed = this.chartState.xTicks.map((t) => t.value);
        const compressedSet = new Set(compressed);

        for (let i = 0; i < n; i++) {
            const value = xTicksRaw[i];
            const ratio = n <= 1 ? 0 : i / (n - 1);
            const labelText = formatTickLabel(xLabels[i] ?? value);

            const tickCol = document.createElement("div");
            tickCol.className = "tick x-tick";
            tickCol.style.position = "absolute";
            tickCol.style.top = "0";
            tickCol.style.bottom = "0";
            tickCol.style.left = `${(ratio * 100).toFixed(4)}%`;

            const mark = document.createElement("span");
            mark.className = "tick-mark";
            tickCol.appendChild(mark);

            if (compressedSet.has(value)) {
                const label = document.createElement("span");
                label.className = "tick-label";
                label.textContent = labelText;
                tickCol.appendChild(label);
            }

            axisElement.appendChild(tickCol);
        }
    }

    setRange(axisName, min, max) {
        const axis = this.axis[axisName];
        if (!axis) {
            return;
        }

        axis.min = toFiniteNumber(min, 0);
        axis.max = toFiniteNumber(max, axis.min + 1);
    }
}

customElements.define(ChartGridComponent.tag, ChartGridComponent);
export default ChartGridComponent;
