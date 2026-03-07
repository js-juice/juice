/**
 * Animation statistics display component.
 * Shows FPS, time, and memory usage for animation viewer.
 * @module Components/Animation/Stats
 */

import Component from "../../ui/component.mjs";
import StringUtil from "../../core/Util/String.mjs";

/**
 * Statistics display for animation performance monitoring.
 * @class AnimationStats
 * @extends Component.HTMLElement
 */
class AnimationStats extends Component.HTMLElement {
    static tag = "animation-stats";

    static config = {
        name: "animation-stats",
        useVirtualDom: false, // Bypass VDom - we manage content manually
        properties: {
            fps: { default: 0, type: "integer", unit: "per Second" },
            time: { default: 0, type: "number", unit: "Seconds" },
            inline: { default: false, type: "exists", linked: true }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["fps", "time", "inline"],
            attributes: [],
            properties: []
        };
    }

    /**
     * Executes html.
     * @param {*} data - Parameter value.
     * @returns {*} Result of html.
     */
    static html(data = {}) {
        return `<ul id="list">
        <li>FPS: <span id="fps">0</span></li>
        <li>Time: <span id="time">0</span></li>
        <li>Memory: <span id="memory">0</span></li>
        </ul>`;
    }

    /**
     * Returns the current style value.
     * @returns {*} Current style value.
     */
    static get style() {
        return [
            {
                ":host": {
                    position: "absolute",
                    zIndex: 100000,
                    display: "block",
                    width: "auto",
                    height: "auto",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "white",
                    padding: "10px",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "10px"
                },
                ul: {
                    margin: 0,
                    padding: 0,
                    display: "block"
                },
                "ul li": {
                    display: "block",
                    margin: 0,
                    padding: 0
                },
                ":host([inline])": {
                    position: "absolute",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "#FFFFFF",
                    padding: 0,
                    width: "100%"
                },
                ":host([inline]) ul": {
                    display: "inline-flex",
                    gap: "1rem",
                    padding: "5px 1rem"
                },
                ":host([inline]) ul li": {
                    display: "inline-flex",
                    margin: 0,
                    padding: 0
                },
                ":host([inline]) ul li span": {
                    fontWeight: "bold",
                    marginLeft: "0.25rem"
                }
            }
        ];
    }

    /**
     * Returns the current styleUrls value.
     * @returns {*} Current styleUrls value.
     */
    static get styleUrls() {
        return [
            {
                href: "animation/components/stats.css",
                type: "text/css"
            }
        ];
    }

    /**
     * Executes beforeCreate.
     * @returns {*} Result of beforeCreate.
     */
    beforeCreate() {
        this._lastSampleSeconds = Number.NEGATIVE_INFINITY;
        this._lastMemorySampleSeconds = Number.NEGATIVE_INFINITY;
        this._values = Object.create(null);
        this._nodes = Object.create(null);
        this.refreshInterval = 0.25;
        this.memoryInterval = 1;
    }

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        this._list = this.ref("list");
        this._nodes.fps = this.ref("fps");
        this._nodes.time = this.ref("time");
        this._nodes.memory = this.ref("memory");
        this.setStat("fps", "0");
        this.setStat("time", "0");
        this.setStat("memory", "n/a");
    }

    /**
     * Executes shouldSample.
     * @param {*} time - Parameter value.
     * @returns {*} Result of shouldSample.
     */
    shouldSample(time) {
        const seconds = Number(time?.seconds);
        if (!Number.isFinite(seconds)) return false;
        return seconds - this._lastSampleSeconds >= this.refreshInterval;
    }

    /**
     * Sets stat values.
     * @param {*} key - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of setStat.
     */
    setStat(key, value) {
        const normalized = String(value);
        if (this._values[key] === normalized) return false;
        this._values[key] = normalized;
        const node = this._nodes[key];
        if (node) node.textContent = normalized;
        return true;
    }

    /**
     * Executes addStat.
     * @param {*} key - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of addStat.
     */
    addStat(key, value) {
        if (!key) return;
        if (this._nodes[key]) {
            this.setStat(key, value);
            return;
        }

        const item = document.createElement("li");

        const label = document.createElement("label");
        label.textContent = `${StringUtil.ucwords(key)}: `;

        const span = document.createElement("span");
        span.textContent = String(value ?? "");

        item.appendChild(label);
        item.appendChild(span);

        if (!this._list) this._list = this.ref("list");
        this._list.appendChild(item);
        this._nodes[key] = span;
        this.setStat(key, value ?? "");

        if (!(key in this)) {
            Object.defineProperty(this, key, {
                configurable: true,
                get: () => this._values[key],
                set: (next) => {
                    this.setStat(key, next);
                }
            });
        }
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} time - Parameter value.
     * @returns {*} Result of update.
     */
    update(time) {
        if (!this.shouldSample(time)) return false;

        const seconds = Number(time?.seconds);
        const fps = Number(time?.fps);
        this.setStat("fps", Number.isFinite(fps) ? fps.toFixed(1) : "0.0");
        this.setStat("time", Number.isFinite(seconds) ? seconds.toFixed(3) : "0.000");

        if (Number.isFinite(seconds) && seconds - this._lastMemorySampleSeconds >= this.memoryInterval) {
            const memory = globalThis.performance?.memory;
            const usedHeap = Number(memory?.usedJSHeapSize);
            const memoryLabel = Number.isFinite(usedHeap) ? `${(usedHeap / (1024 * 1024)).toFixed(1)} MB` : "n/a";
            this.setStat("memory", memoryLabel);
            this._lastMemorySampleSeconds = seconds;
        }

        this._lastSampleSeconds = seconds;
        return true;
    }
}

customElements.define(AnimationStats.tag, AnimationStats);

export default AnimationStats;
