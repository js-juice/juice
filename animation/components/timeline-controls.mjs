/**
 * Timeline controls component for animation timelines.
 * Binds to viewer/stage/timeline references and exposes playback actions.
 * @module Components/Animation/TimelineControls
 */

import Component from "../../ui/component.mjs";

function nowMS() {
    return globalThis.performance && typeof globalThis.performance.now === "function"
        ? globalThis.performance.now()
        : Date.now();
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

class AnimationTimelineControls extends Component.HTMLElement {
    static tag = "animation-timeline-controls";

    static config = {
        properties: {
            timeline: { default: "", type: "string" },
            viewer: { default: "", type: "string" },
            stage: { default: "", type: "string" },
            speed: { default: 1, type: "number", linked: true },
            minspeed: { default: 0.1, type: "number", linked: true },
            maxspeed: { default: 4, type: "number", linked: true },
            stepspeed: { default: 0.1, type: "number", linked: true }
        }
    };

    static get observed() {
        return {
            all: ["timeline", "viewer", "stage", "speed", "minspeed", "maxspeed", "stepspeed"]
        };
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    boxSizing: "border-box",
                    width: "100%",
                    fontFamily: "monospace",
                    color: "#e6edf3"
                },
                "#html": {
                    display: "block",
                    width: "100%"
                },
                "#panel": {
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    width: "100%",
                    padding: "8px",
                    background: "rgba(7, 16, 28, 0.75)",
                    border: "1px solid rgba(76, 104, 138, 0.7)",
                    borderBottomLeftRadius: "8px",
                    borderBottomRightRadius: "8px",
                    boxSizing: "border-box"
                },
                ".btn": {
                    appearance: "none",
                    border: "1px solid rgba(106, 141, 182, 0.75)",
                    background: "rgba(20, 34, 50, 0.95)",
                    color: "#d8e7ff",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    font: "600 12px/1.1 monospace"
                },
                ".btn:hover": {
                    background: "rgba(30, 50, 75, 0.95)"
                },
                ".btn:active": {
                    transform: "translateY(1px)"
                },
                "#speed-wrap": {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginLeft: "4px"
                },
                "#speed": {
                    width: "130px"
                },
                "#speed-value": {
                    minWidth: "42px",
                    textAlign: "right",
                    color: "#9dc0ec",
                    font: "600 12px/1 monospace"
                },
                "#reverse-wrap": {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    font: "600 12px/1 monospace"
                },
                "#status": {
                    marginLeft: "auto",
                    color: "#9dc0ec",
                    font: "12px/1 monospace",
                    whiteSpace: "nowrap"
                }
            }
        ];
    }

    static html() {
        return `
            <div id="panel">
                <button id="play" class="btn" event="click::onPlay">Play</button>
                <button id="pause" class="btn" event="click::onPause">Pause</button>
                <button id="step-back" class="btn" event="click::onStepBack">Step -</button>
                <button id="step" class="btn" event="click::onStepForward">Step +</button>
                <button id="reset" class="btn" event="click::onReset">Reset</button>

                <div id="speed-wrap">
                    <label for="speed">Speed</label>
                    <input id="speed" type="range" min="0.1" max="4" step="0.1" value="1" event="input::onSpeedInput(this)">
                    <span id="speed-value">1.00x</span>
                </div>

                <label id="reverse-wrap">
                    <input id="reverse" type="checkbox" event="change::onReverseChange(this)">
                    Reverse
                </label>

                <div id="status">timeline: none</div>
            </div>
        `;
    }

    beforeCreate() {
        this._timeline = null;
        this._watchTO = 0;
        this._watchMS = 120;
    }

    onFirstConnect() {
        this._applySpeedRange();
        this._bindTimeline();
        this._syncSpeedUI();
        this._renderStatus();
        this._startWatcher();
    }

    onDisconnect() {
        this._stopWatcher();
    }

    onPropertyChanged(property) {
        if (property === "timeline" || property === "viewer" || property === "stage") {
            this._bindTimeline(true);
        }
        if (property === "speed" || property === "minspeed" || property === "maxspeed" || property === "stepspeed") {
            this._applySpeedRange();
            this._applySpeed(toNumber(this.speed, 1), true);
        }
    }

    _startWatcher() {
        if (this._watchTO) return;
        this._watchTO = setInterval(() => {
            if (!this._timeline) this._bindTimeline();
            this._syncSpeedUI();
            this._renderStatus();
        }, this._watchMS);
    }

    _stopWatcher() {
        if (!this._watchTO) return;
        clearInterval(this._watchTO);
        this._watchTO = 0;
    }

    _asElement(value, tag = "") {
        if (!value || typeof value !== "object" || value.nodeType !== 1) return null;
        if (!tag) return value;
        return value.tagName?.toLowerCase?.() === tag ? value : null;
    }

    _resolveSelector(value) {
        if (typeof value !== "string") return "";
        const text = value.trim();
        if (!text.length) return "";
        return text;
    }

    _query(selector) {
        if (!selector) return null;
        const root = typeof this.getRootNode === "function" ? this.getRootNode() : null;
        if (root && typeof root.querySelector === "function") {
            const local = root.querySelector(selector);
            if (local) return local;
        }
        return document.querySelector(selector);
    }

    _queryFromRef(value) {
        const selector = this._resolveSelector(value);
        if (!selector) return null;
        if (
            selector.startsWith("#") ||
            selector.startsWith(".") ||
            selector.startsWith("[") ||
            selector.includes(" ") ||
            selector.includes(":")
        ) {
            return this._query(selector);
        }
        return this._query(selector) || this._query(`#${selector}`);
    }

    _resolveViewer() {
        const direct = this._asElement(this.viewer, "animation-viewer");
        if (direct) return direct;
        const bySelector = this._queryFromRef(this.viewer);
        if (bySelector?.tagName?.toLowerCase?.() === "animation-viewer") return bySelector;
        return this.closest("animation-viewer") || document.querySelector("animation-viewer");
    }

    _resolveStage() {
        const direct = this._asElement(this.stage, "animation-stage");
        if (direct) return direct;
        const bySelector = this._queryFromRef(this.stage);
        if (bySelector?.tagName?.toLowerCase?.() === "animation-stage") return bySelector;

        const viewer = this._resolveViewer();
        if (viewer?.stage) return viewer.stage;
        if (viewer) return viewer.querySelector("animation-stage");
        return this.closest("animation-stage") || document.querySelector("animation-stage");
    }

    _resolveTimeline() {
        const directTimeline = this.timeline;
        if (directTimeline && typeof directTimeline === "object" && typeof directTimeline.play === "function") {
            return directTimeline;
        }

        const node = this._queryFromRef(this.timeline);
        if (node?.timeline && typeof node.timeline.play === "function") {
            return node.timeline;
        }

        const viewer = this._resolveViewer();
        if (viewer?.timeline && typeof viewer.timeline.play === "function") return viewer.timeline;

        const stage = this._resolveStage();
        if (stage?.timeline && typeof stage.timeline.play === "function") return stage.timeline;
        return null;
    }

    _bindTimeline(force = false) {
        const next = this._resolveTimeline();
        if (!force && next === this._timeline) return this._timeline;
        this._timeline = next || null;
        this._syncSpeedUI();
        this._renderStatus();
        return this._timeline;
    }

    _speedInput() {
        return this.ref("speed");
    }

    _reverseInput() {
        return this.ref("reverse");
    }

    _currentSpeed() {
        const input = this._speedInput();
        const fromInput = toNumber(input?.value, NaN);
        if (Number.isFinite(fromInput) && fromInput > 0) return fromInput;
        const fromProp = toNumber(this.speed, NaN);
        if (Number.isFinite(fromProp) && fromProp > 0) return fromProp;
        return 1;
    }

    _applySpeedRange() {
        const input = this._speedInput();
        if (!input) return;
        const min = clamp(toNumber(this.minspeed, 0.1), 0.001, 1000);
        const max = Math.max(min, toNumber(this.maxspeed, 4));
        const step = Math.max(0.001, toNumber(this.stepspeed, 0.1));
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
    }

    _applySpeed(absSpeed, updateInput = false) {
        const timeline = this._timeline || this._bindTimeline();
        if (!timeline) return;

        const min = clamp(toNumber(this.minspeed, 0.1), 0.001, 1000);
        const max = Math.max(min, toNumber(this.maxspeed, 4));
        const clamped = clamp(toNumber(absSpeed, 1), min, max);
        const reverse = !!this._reverseInput()?.checked;
        const signed = reverse ? -clamped : clamped;

        if (typeof timeline.setTimeScale === "function") {
            timeline.setTimeScale(signed);
        } else {
            timeline.timeScale = signed;
        }

        if (updateInput) {
            const input = this._speedInput();
            if (input) input.value = String(clamped);
        }
        this.speed = clamped;
        this._syncSpeedUI();
        this._renderStatus();
    }

    _syncSpeedUI() {
        const timeline = this._timeline;
        const speedLabel = this.ref("speed-value");
        const speedInput = this._speedInput();
        const reverseInput = this._reverseInput();
        const activeScale = timeline ? toNumber(timeline.timeScale, 1) : toNumber(this.speed, 1);
        const abs = Math.abs(activeScale) || 1;
        if (speedInput) speedInput.value = String(abs);
        if (reverseInput) reverseInput.checked = activeScale < 0;
        if (speedLabel) speedLabel.textContent = `${abs.toFixed(2)}x`;
    }

    _frameDurationMS(timeline) {
        const fps = Number(timeline?.fps);
        if (Number.isFinite(fps) && fps > 0) return 1000 / fps;
        return 1000 / 60;
    }

    _step(direction = 1) {
        const timeline = this._timeline || this._bindTimeline();
        if (!timeline) return;

        const wasPaused = !!timeline.paused;
        const originalScale = toNumber(timeline.timeScale, 1);
        const absScale = Math.abs(originalScale) || 1;
        const signedScale = direction < 0 ? -absScale : absScale;
        const frameMS = this._frameDurationMS(timeline);
        const now = nowMS();

        if (typeof timeline.setTimeScale === "function") timeline.setTimeScale(signedScale);
        else timeline.timeScale = signedScale;

        timeline.paused = false;
        timeline.lastFrame = now - frameMS;
        timeline.tick(now);
        timeline.pause();

        if (typeof timeline.setTimeScale === "function") timeline.setTimeScale(originalScale);
        else timeline.timeScale = originalScale;

        if (!wasPaused) timeline.play();

        this._syncSpeedUI();
        this._renderStatus();
    }

    _emitAction(action) {
        this.dispatchEvent(
            new CustomEvent("timeline-action", {
                detail: {
                    action,
                    timeline: this._timeline
                }
            })
        );
    }

    _renderStatus() {
        const status = this.ref("status");
        if (!status) return;
        const timeline = this._timeline;
        if (!timeline) {
            status.textContent = "timeline: none";
            return;
        }

        const running = !timeline.paused;
        const reverse = toNumber(timeline.timeScale, 1) < 0 ? "reverse" : "forward";
        const seconds = toNumber(timeline.time?.seconds, 0);
        status.textContent = `${running ? "playing" : "paused"} | ${reverse} | t=${seconds.toFixed(3)}s`;
    }

    onPlay() {
        const timeline = this._timeline || this._bindTimeline();
        if (!timeline || typeof timeline.play !== "function") return;
        timeline.play();
        this._syncSpeedUI();
        this._renderStatus();
        this._emitAction("play");
    }

    onPause() {
        const timeline = this._timeline || this._bindTimeline();
        if (!timeline || typeof timeline.pause !== "function") return;
        timeline.pause();
        this._syncSpeedUI();
        this._renderStatus();
        this._emitAction("pause");
    }

    onReset() {
        const timeline = this._timeline || this._bindTimeline();
        if (!timeline || typeof timeline.reset !== "function") return;
        timeline.reset();
        this._renderStatus();
        this._emitAction("reset");
    }

    onStepForward() {
        this._step(1);
        this._emitAction("step-forward");
    }

    onStepBack() {
        this._step(-1);
        this._emitAction("step-back");
    }

    onSpeedInput(event, input) {
        const value = toNumber(input?.value ?? event?.target?.value, 1);
        this._applySpeed(value);
        this._emitAction("speed");
    }

    onReverseChange(event, input) {
        const reverse = !!(input?.checked ?? event?.target?.checked);
        const timeline = this._timeline || this._bindTimeline();
        if (!timeline) return;
        const speed = Math.abs(this._currentSpeed());
        if (typeof timeline.setReverse === "function") timeline.setReverse(reverse);
        if (typeof timeline.setTimeScale === "function") timeline.setTimeScale(reverse ? -speed : speed);
        else timeline.timeScale = reverse ? -speed : speed;
        this._syncSpeedUI();
        this._renderStatus();
        this._emitAction("reverse");
    }
}

if (!customElements.get(AnimationTimelineControls.tag)) {
    customElements.define(AnimationTimelineControls.tag, AnimationTimelineControls);
}

class TimelineControls extends AnimationTimelineControls {
    static tag = "timeline-controls";
}

if (!customElements.get(TimelineControls.tag)) {
    customElements.define(TimelineControls.tag, TimelineControls);
}

export default AnimationTimelineControls;
export { AnimationTimelineControls, TimelineControls };
