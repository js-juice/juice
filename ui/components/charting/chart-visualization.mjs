import Component from "../../component.mjs";

function toFiniteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

class ChartVisualizationComponent extends Component.HTMLElement {
    static tag = "chart-visualization";

    static config = {
        name: "chart-visualization",
        properties: {
            stroke: { type: "string", default: "#2d6cff", linked: true },
            strokewidth: { type: "number", default: 2, linked: true },
            pointsize: { type: "number", default: 3, linked: true },
            showpoints: { type: "exists", default: true, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["stroke", "strokewidth", "pointsize", "showpoints"]
        };
    }

    static html() {
        return `
            <div id="layer">
                <svg id="svg" preserveAspectRatio="none" aria-hidden="true"></svg>
            </div>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    position: "absolute",
                    inset: "0",
                    display: "block",
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: "3"
                },
                "#layer": {
                    position: "absolute",
                    inset: "0"
                },
                "#svg": {
                    width: "100%",
                    height: "100%",
                    overflow: "visible"
                }
            }
        ];
    }

    onFirstConnect() {
        this.svg = this.ref("svg");
        if (!this.payload || typeof this.payload !== "object") {
            this.payload = {
                datasets: [],
                axis: { y: { range: [0, 1] } }
            };
        }
        this.renderFrame = null;

        if (Array.isArray(this.payload?.datasets) && this.payload.datasets.length) {
            this.scheduleRender();
            requestAnimationFrame(() => this.scheduleRender());
        }
    }

    onResize() {
        this.scheduleRender();
    }

    ingest(payload) {
        this.payload = this.normalizePayload(payload);
        this.scheduleRender();
    }

    scheduleRender() {
        if (this.renderFrame != null) {
            return;
        }

        this.renderFrame = requestAnimationFrame(() => {
            this.renderFrame = null;
            this.render();
        });
    }

    normalizePayload(payload) {
        if (payload && typeof payload.toChartPayload === "function") {
            return payload.toChartPayload();
        }

        if (payload && typeof payload === "object" && payload.axis && payload.datasets) {
            return payload;
        }

        return {
            datasets: [],
            axis: { y: { range: [0, 1] } }
        };
    }

    clear() {
        if (this.svg) {
            this.svg.innerHTML = "";
        }
    }

    render() {
        if (!this.svg) {
            return;
        }

        const rect = typeof this.getBoundingClientRect === "function" ? this.getBoundingClientRect() : null;
        const parentRect =
            this.parentElement && typeof this.parentElement.getBoundingClientRect === "function"
                ? this.parentElement.getBoundingClientRect()
                : null;

        const measuredWidth =
            this.offsetWidth ||
            this.clientWidth ||
            toFiniteNumber(rect?.width, 0) ||
            this.parentElement?.clientWidth ||
            toFiniteNumber(parentRect?.width, 0) ||
            0;
        const measuredHeight =
            this.offsetHeight ||
            this.clientHeight ||
            toFiniteNumber(rect?.height, 0) ||
            this.parentElement?.clientHeight ||
            toFiniteNumber(parentRect?.height, 0) ||
            0;

        const width = Math.max(1, measuredWidth);
        const height = Math.max(1, measuredHeight);

        if (measuredWidth <= 1 || measuredHeight <= 1) {
            this.scheduleRender();
            return;
        }

        this.clear();

        this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        const datasets = Array.isArray(this.payload?.datasets) ? this.payload.datasets : [];
        const yRangeRaw = this.payload?.axis?.y?.range;
        const minY = toFiniteNumber(Array.isArray(yRangeRaw) ? yRangeRaw[0] : 0, 0);
        const maxY = toFiniteNumber(Array.isArray(yRangeRaw) ? yRangeRaw[1] : 1, 1);
        const ySpan = maxY > minY ? maxY - minY : 1;
        const zeroRatio = clamp((0 - minY) / ySpan, 0, 1);
        const zeroY = height - zeroRatio * height;

        datasets.forEach((dataset, datasetIndex) => {
            const sourceValues = Array.isArray(dataset?.points)
                ? dataset.points.map((p) => toFiniteNumber(p?.y, Number.NaN))
                : Array.isArray(dataset?.data)
                  ? dataset.data.map((v) => toFiniteNumber(v, Number.NaN))
                  : [];

            const maxSamples = 280;
            const step = sourceValues.length > maxSamples ? Math.ceil(sourceValues.length / maxSamples) : 1;
            const sampledValues = [];
            for (let i = 0; i < sourceValues.length; i += step) {
                sampledValues.push(sourceValues[i]);
            }

            const hasFiniteValues = sampledValues.some((v) => Number.isFinite(v));
            if (!hasFiniteValues) {
                return;
            }

            const datasetType = String(dataset?.type || "line").toLowerCase();
            const strokeColor = dataset?.color || this.stroke || "#2d6cff";

            if (datasetType === "bar") {
                this.renderBarDataset(sampledValues, {
                    width,
                    height,
                    minY,
                    ySpan,
                    zeroY,
                    color: strokeColor
                });
                return;
            }

            const count = sampledValues.length;
            const path = [];
            const points = [];
            for (let i = 0; i < count; i += 1) {
                const val = toFiniteNumber(sampledValues[i], Number.NaN);
                if (!Number.isFinite(val)) {
                    continue;
                }

                const xRatio = count <= 1 ? 0 : i / (count - 1);
                const yRatio = clamp((val - minY) / ySpan, 0, 1);
                const x = xRatio * width;
                const y = height - yRatio * height;

                path.push(`${path.length ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
                points.push({ x, y });
            }

            if (!path.length) {
                return;
            }

            const strokeWidth = Math.max(1, toFiniteNumber(this.strokewidth, 2));

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "path");
            polyline.setAttribute("d", path.join(" "));
            polyline.setAttribute("fill", "none");
            polyline.setAttribute("stroke", strokeColor);
            polyline.setAttribute("stroke-width", String(strokeWidth));
            polyline.setAttribute("stroke-linejoin", "round");
            polyline.setAttribute("stroke-linecap", "round");
            polyline.setAttribute("data-series-index", String(datasetIndex));
            this.svg.appendChild(polyline);

            const showPoints = this.showpoints !== false && String(this.showpoints) !== "false";
            const drawPoints = showPoints && count <= 180;
            if (!drawPoints) {
                return;
            }

            const radius = Math.max(1, toFiniteNumber(this.pointsize, 3));
            points.forEach((point) => {
                const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                dot.setAttribute("cx", point.x.toFixed(2));
                dot.setAttribute("cy", point.y.toFixed(2));
                dot.setAttribute("r", String(radius));
                dot.setAttribute("fill", strokeColor);
                dot.setAttribute("opacity", "0.95");
                this.svg.appendChild(dot);
            });
        });
    }

    renderBarDataset(values = [], context = {}) {
        const safeValues = Array.isArray(values) ? values : [];
        const count = safeValues.length;
        if (!count) {
            return;
        }

        const width = Math.max(1, toFiniteNumber(context.width, 1));
        const minY = toFiniteNumber(context.minY, 0);
        const ySpan = Math.max(1e-9, toFiniteNumber(context.ySpan, 1));
        const zeroY = toFiniteNumber(context.zeroY, 0);
        const color = context.color || "#2d6cff";

        const gap = 2;
        const slotWidth = width / count;
        const barWidth = Math.max(1, slotWidth - gap);

        for (let i = 0; i < count; i += 1) {
            const value = toFiniteNumber(safeValues[i], Number.NaN);
            if (!Number.isFinite(value)) {
                continue;
            }

            const ratio = clamp((value - minY) / ySpan, 0, 1);
            const y = context.height - ratio * context.height;
            const rectTop = Math.min(y, zeroY);
            const rawHeight = Math.abs(zeroY - y);
            const isEffectivelyZero = Math.abs(value) < 1e-9;
            const rectHeight = isEffectivelyZero ? 0 : Math.max(3, rawHeight);
            const x = i * slotWidth + (slotWidth - barWidth) / 2;

            if (rectHeight <= 0) {
                continue;
            }

            const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bar.setAttribute("x", x.toFixed(2));
            bar.setAttribute("y", rectTop.toFixed(2));
            bar.setAttribute("width", barWidth.toFixed(2));
            bar.setAttribute("height", rectHeight.toFixed(2));
            bar.setAttribute("fill", color);
            bar.setAttribute("opacity", "0.92");
            this.svg.appendChild(bar);
        }
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get(ChartVisualizationComponent.tag)) {
        customElements.define(ChartVisualizationComponent.tag, ChartVisualizationComponent);
    }
}

export default ChartVisualizationComponent;
