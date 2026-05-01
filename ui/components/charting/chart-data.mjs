import { merge } from "../../../core/Util/Object.mjs";
import NumberUtil from "../../../core/Util/Number.mjs";

/**
 * Default chart-data configuration used for auto-inferred datasets.
 * User config is deep-merged over this object.
 * @type {Object}
 */
const DEFAULT_CONFIG = {
    type: "line",
    title: "",
    xKey: null,
    yKey: null,
    yKeys: null,
    labels: null,
    series: null,
    sortByX: false,
    ticks: 5,
    yTicks: null,
    rangePadding: 0.05,
    axis: {
        x: {
            label: "X",
            key: null,
            labels: null,
            ticks: null
        },
        y: {
            label: "Y",
            key: null,
            range: null,
            ticks: null
        }
    }
};

/**
 * Safely casts a value to a finite number.
 * @param {*} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function toNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Builds a numeric range from values with optional edge padding.
 * @param {Array<*>} [values=[]]
 * @param {number} [paddingRatio=0.05]
 * @returns {[number, number]}
 */
function buildRange(values = [], paddingRatio = 0.05) {
    const nums = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    if (!nums.length) {
        return [0, 1];
    }

    let min = Math.min(...nums);
    let max = Math.max(...nums);

    if (min === max) {
        const center = min;
        const pad = Math.max(Math.abs(center * 0.1), 1);
        return [center - pad, center + pad];
    }

    const span = max - min;
    const pad = span * Math.max(0, Number(paddingRatio) || 0);
    min -= pad;
    max += pad;
    return [min, max];
}

/**
 * Builds evenly spaced numeric tick marks for a range.
 * @param {[number, number]} [range=[0, 1]]
 * @param {number} [tickCount=5]
 * @returns {number[]}
 */
function buildTicks(range = [0, 1], tickCount = 5) {
    const min = toNumber(Array.isArray(range) ? range[0] : 0, 0);
    const max = toNumber(Array.isArray(range) ? range[1] : 1, 1);
    const count = Math.max(2, Math.floor(toNumber(tickCount, 5)));

    if (max <= min) {
        return [min, min + 1];
    }

    const step = (max - min) / (count - 1);
    const ticks = [];
    for (let i = 0; i < count; i += 1) {
        ticks.push(min + step * i);
    }
    return ticks;
}

/**
 * Infers a likely X key from an object row.
 * @param {Object} [row={}]
 * @returns {string|null}
 */
function inferXKeyFromObject(row = {}) {
    const candidateKeys = ["x", "label", "name", "category", "time", "date", "timestamp"];
    for (const key of candidateKeys) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            return key;
        }
    }
    return null;
}

/**
 * Normalizes arbitrary chart input data into labels, axis, and series payloads.
 */
class ChartData {
    /**
     * @param {Array<*>} [dataset=[]] Input rows: number[], tuple[], or object[].
     * @param {Object} [config={}] Optional chart configuration overrides.
     */
    constructor(dataset = [], config = {}) {
        this.map = {};
        this.axis = {};
        this.raw = Array.isArray(dataset) ? dataset : [];
        this.data = [];
        this.labels = [];
        this.series = [];
        this.points = [];
        this.config = merge(DEFAULT_CONFIG, config || {});
        this.initialized = false;
    }

    /**
     * Configures an axis payload by key.
     * @param {string} key Axis key (for example "x" or "y").
     * @param {Object} [params={}] Axis properties to merge.
     * @returns {void}
     */

    configureAxis(key, params = {}) {
        const axisKey = typeof key === "string" ? key.trim().toLowerCase() : "";
        if (!axisKey) {
            return;
        }

        const existing = this.axis[axisKey] && typeof this.axis[axisKey] === "object" ? this.axis[axisKey] : {};
        this.axis[axisKey] = {
            ...existing,
            ...(params && typeof params === "object" ? params : {})
        };
    }

    /**
     * Adds or updates an axis entry.
     * @param {string} label Axis key label.
     * @param {Object} [params={}]
     * @returns {Object|null}
     */
    addAxis(label, params = {}) {
        const axisKey = typeof label === "string" ? label.trim().toLowerCase() : "";
        if (!axisKey) {
            return null;
        }

        this.configureAxis(axisKey, params);
        return this.axis[axisKey];
    }

    /**
     * Replaces raw dataset.
     * @param {Array<*>} [dataset=[]]
     * @returns {ChartData}
     */
    setData(dataset = []) {
        this.raw = Array.isArray(dataset) ? dataset : [];
        this.initialized = false;
        return this;
    }

    /**
     * Updates chart configuration.
     * @param {Object} [config={}]
     * @param {Object} [options={}]
     * @param {boolean} [options.merge=true] Merge into existing config when true.
     * @returns {ChartData}
     */
    setConfig(config = {}, { merge = true } = {}) {
        if (merge) {
            this.config = merge(this.config || DEFAULT_CONFIG, config || {});
        } else {
            this.config = merge(DEFAULT_CONFIG, config || {});
        }
        this.initialized = false;
        return this;
    }

    /**
     * Infers source shape and selected x/y keys for normalization.
     * @returns {{ mode: string, xKey: string|number|null, yKeys: Array<string|number> }}
     */
    inferStructure() {
        const rows = Array.isArray(this.raw) ? this.raw : [];
        const firstRow = rows[0];

        if (typeof firstRow === "number") {
            return {
                mode: "number[]",
                xKey: null,
                yKeys: ["value"]
            };
        }

        if (Array.isArray(firstRow)) {
            return {
                mode: "tuple[]",
                xKey: 0,
                yKeys: [1]
            };
        }

        if (firstRow && typeof firstRow === "object") {
            // Prefer explicit user config, otherwise infer a likely x-axis key.
            const configuredXKey =
                this.config?.xKey || this.config?.axis?.x?.key || this.config?.x || this.config?.labelsKey || null;
            const xKey = configuredXKey || inferXKeyFromObject(firstRow);

            let yKeys = Array.isArray(this.config?.yKeys) ? this.config.yKeys.slice() : null;
            if (!yKeys || !yKeys.length) {
                const configuredYKey = this.config?.yKey || this.config?.axis?.y?.key || null;
                if (configuredYKey) {
                    yKeys = [configuredYKey];
                }
            }

            if (!yKeys || !yKeys.length) {
                // Derive y keys from numeric-ish object fields when none are configured.
                yKeys = Object.keys(firstRow).filter((key) => {
                    if (xKey !== null && key === xKey) {
                        return false;
                    }

                    return rows.some((row) => row && typeof row === "object" && NumberUtil.isNum(row[key]));
                });
            }

            if (!yKeys.length) {
                yKeys = ["value"];
            }

            return {
                mode: "object[]",
                xKey,
                yKeys
            };
        }

        return {
            mode: "empty",
            xKey: null,
            yKeys: []
        };
    }

    /**
     * Converts raw rows into a normalized internal row format.
     * @returns {{ rows: Array<Object>, structure: { mode: string, xKey: string|number|null, yKeys: Array<string|number> } }}
     */
    normalizeRows() {
        const rows = Array.isArray(this.raw) ? this.raw : [];
        const structure = this.inferStructure();
        const normalized = [];

        rows.forEach((row, index) => {
            if (structure.mode === "number[]") {
                normalized.push({
                    index,
                    x: index,
                    label: String(index + 1),
                    value: toNumber(row, 0)
                });
                return;
            }

            if (structure.mode === "tuple[]") {
                const tuple = Array.isArray(row) ? row : [];
                const xValue = tuple[0] ?? index;
                normalized.push({
                    index,
                    x: xValue,
                    label: String(xValue),
                    value: toNumber(tuple[1], 0)
                });
                return;
            }

            if (structure.mode === "object[]") {
                const source = row && typeof row === "object" ? row : {};
                const xValue = structure.xKey !== null ? source[structure.xKey] : index;
                const next = {
                    index,
                    x: xValue,
                    label: String(xValue ?? index)
                };

                structure.yKeys.forEach((yKey) => {
                    next[yKey] = toNumber(source?.[yKey], 0);
                });

                normalized.push(next);
            }
        });

        if (this.config?.sortByX) {
            // Stable ordering for renderers that assume increasing x values.
            normalized.sort((left, right) => {
                const lx = left?.x;
                const rx = right?.x;

                if (NumberUtil.isNum(lx) && NumberUtil.isNum(rx)) {
                    return Number(lx) - Number(rx);
                }

                return String(lx).localeCompare(String(rx));
            });
        }

        return {
            rows: normalized,
            structure
        };
    }

    /**
     * Builds normalized series payloads from rows.
     * @param {Array<Object>} [rows=[]]
     * @param {{ yKeys?: Array<string|number> }} [structure={ yKeys: [] }]
     * @returns {Array<Object>}
     */
    buildSeries(rows = [], structure = { yKeys: [] }) {
        const yKeys = Array.isArray(structure?.yKeys) ? structure.yKeys : [];
        const configuredSeries =
            this.config?.series && typeof this.config.series === "object" ? this.config.series : {};

        if (!yKeys.length) {
            return [];
        }

        return yKeys.map((key, index) => {
            const seriesConfig =
                configuredSeries[key] && typeof configuredSeries[key] === "object" ? configuredSeries[key] : {};
            const values = rows.map((row) => toNumber(row?.[key], 0));
            const points = rows.map((row) => ({ x: row?.x, y: toNumber(row?.[key], 0), label: row?.label }));

            return {
                key,
                name: seriesConfig.name || key,
                type: seriesConfig.type || this.config?.type || "line",
                color: seriesConfig.color || null,
                values,
                points,
                range: buildRange(values, this.config?.rangePadding)
            };
        });
    }

    /**
     * Computes all derived payloads (labels, series, axis, map) from current raw data.
     * @returns {ChartData}
     */
    initialize() {
        const { rows, structure } = this.normalizeRows();
        this.data = rows;

        if (!rows.length) {
            this.labels = [];
            this.series = [];
            this.points = [];
            this.map = {};
            this.axis = {
                x: { ...this.config.axis.x, labels: [], ticks: [] },
                y: { ...this.config.axis.y, range: [0, 1], ticks: [0, 1] }
            };
            this.initialized = true;
            return this;
        }

        this.labels = Array.isArray(this.config?.labels) ? this.config.labels.slice() : rows.map((row) => row.label);

        this.series = this.buildSeries(rows, structure);
        this.points = this.series.map((serie) => ({ key: serie.key, points: serie.points }));

        const allYValues = this.series.flatMap((serie) => serie.values);
        const yRange =
            Array.isArray(this.config?.axis?.y?.range) && this.config.axis.y.range.length >= 2
                ? [toNumber(this.config.axis.y.range[0], 0), toNumber(this.config.axis.y.range[1], 1)]
                : buildRange(allYValues, this.config?.rangePadding);

        const xTicks = Array.isArray(this.config?.axis?.x?.ticks)
            ? this.config.axis.x.ticks.slice()
            : this.labels.slice();
        const yTicks = Array.isArray(this.config?.axis?.y?.ticks)
            ? this.config.axis.y.ticks.slice()
            : buildTicks(yRange, this.config?.yTicks || this.config?.ticks);

        this.axis = {
            x: {
                ...this.config.axis.x,
                key: structure.xKey,
                labels: this.labels,
                ticks: xTicks,
                first: this.labels[0],
                last: this.labels[this.labels.length - 1]
            },
            y: {
                ...this.config.axis.y,
                key:
                    Array.isArray(structure.yKeys) && structure.yKeys.length === 1
                        ? structure.yKeys[0]
                        : structure.yKeys,
                range: yRange,
                ticks: yTicks,
                min: yRange[0],
                max: yRange[1]
            }
        };

        this.map = {};
        // Keep both numeric index and human label lookups for consumers.
        rows.forEach((row, index) => {
            this.map[index] = row;
            if (row?.label !== undefined) {
                this.map[row.label] = row;
            }
        });

        this.initialized = true;
        return this;
    }

    /**
     * Returns full normalized chart-data state.
     * @returns {{ config: Object, axis: Object, labels: string[], series: Array<Object>, points: Array<Object>, data: Array<Object>, map: Object }}
     */
    toJSON() {
        if (!this.initialized) {
            this.initialize();
        }

        return {
            config: this.config,
            axis: this.axis,
            labels: this.labels,
            series: this.series,
            points: this.points,
            data: this.data,
            map: this.map
        };
    }

    /**
     * Returns compact payload intended for chart renderers.
     * @returns {{ labels: string[], datasets: Array<Object>, axis: Object, map: Object }}
     */
    toChartPayload() {
        const json = this.toJSON();
        return {
            labels: json.labels,
            datasets: json.series.map((serie) => ({
                key: serie.key,
                label: serie.name,
                type: serie.type,
                color: serie.color,
                data: serie.values,
                points: serie.points
            })),
            axis: json.axis,
            map: json.map
        };
    }
}

export { ChartData, DEFAULT_CONFIG };
export default ChartData;
