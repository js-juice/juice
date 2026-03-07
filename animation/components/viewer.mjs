/**
 * Animation viewer component with timeline and camera controls.
 * Main container for animated scenes with stage, camera, and debug features.
 * @module Components/Animation/Viewer
 */

import Component from "../../ui/component.mjs";
import Timeline from "../timeline.mjs";
import AnimationStage from "./stage.mjs";
import AnimationBody from "./body.mjs";
import AnimationSprite from "./sprite.mjs";
import AnimationStats from "./stats.mjs";
import Camera from "./camera.mjs";
import "./stats.mjs";

/**
 * Viewer component for displaying and controlling animations.
 * @class AnimationViewer
 * @extends Component.HTMLElement
 */
export class AnimationViewer extends Component.HTMLElement {
    static tag = "animation-viewer";

    static allowedStates = ["initial", "actve", "inactve", "complete"];

    animationComponent = true;
    animationViewer = true;

    static config = {
        properties: {
            width: { default: 100, type: "number", unit: "percent" },
            height: { default: 100, type: "number", unit: "percent" },
            fps: { default: 60, type: "number", unit: "frames per second", linked: true },
            state: { default: "initial", type: "string", allowed: AnimationViewer.allowedStates },
            follow: { default: false, type: "string" },
            debug: { default: false, type: "exists", linked: true }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["width", "height", "fps", "state", "follow", "debug", "stats"]
        };
    }

    /**
     * Returns the current style value.
     * @returns {*} Current style value.
     */
    static get style() {
        return [
            {
                ":host": {
                    position: "relative",
                    display: "block",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden"
                },
                slot: {
                    display: "block",
                    position: "absolute",
                    width: "100%",
                    height: "100%"
                },
                "#background": {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    top: 0,
                    left: 0,
                    zIndex: -1
                },
                "#parallax": {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                    overflow: "hidden"
                },
                "#world": {
                    position: "absolute",
                    width: "var(--width, 100% )",
                    height: "var( --height, 100% )"
                }
            }
        ];
    }

    /**
     * Executes html.
     * @param {*} data - Parameter value.
     * @returns {*} Result of html.
     */
    static html(data = {}) {
        return `
        ${this.stats ? `<animation-stats></animation-stats>` : ""}
        <div id="background">
            <div id="parallax"></div>
            <div id="world"></div>
        </div>
        <slot></slot>`;
    }

    stage;
    layers = [];
    index = [];
    animatedAssets = [];

    /**
     * Initializes class state and runtime dependencies.
     * @returns {*} Result of constructor.
     */
    constructor() {
        super();
        this.camera = new Camera(this);
        if (!this.timeline) {
            this.timeline = new Timeline(this, { defer: true, fps: this.fps });

            this.timeline.update = this.update.bind(this);

            this.timeline.afterUpdate((time) => {
                this.updateCamera(time);
            });

            this.timeline.render = this.render.bind(this);

            this.timeline.complete = () => {};
        }
    }

    /**
     * Returns the current center value.
     * @returns {*} Current center value.
     */
    get center() {
        return { x: this.width / 2, y: this.height / 2 };
    }

    /**
     * Handles resize events.
     * @param {*} w - Parameter value.
     * @param {*} h - Parameter value.
     * @returns {*} Result of onResize.
     */
    onResize(w, h) {
        this.width = w;
        this.height = h;
        this.dispatchEvent(new CustomEvent("resize", { detail: { width: w, height: h } }));
    }

    changes = {};

    /**
     * Handles stageconnect events.
     * @param {*} stage - Parameter value.
     * @returns {*} Result of onStageConnect.
     */
    onStageConnect(stage) {
        this.stage = stage;

        const stageRect = stage.ref?.("html")?.getBoundingClientRect?.() || stage.getBoundingClientRect();
        const widthAttr = stage.getAttribute?.("width") || "";
        const heightAttr = stage.getAttribute?.("height") || "";
        const stageWidth = widthAttr.includes("%") ? stageRect.width : Number(stage.width) || stageRect.width;
        const stageHeight = heightAttr.includes("%") ? stageRect.height : Number(stage.height) || stageRect.height;

        this.max = {
            x: stageWidth - this.width,
            y: stageHeight - this.height
        };
        this.min = {
            x: 0,
            y: 0
        };

        stage.onViewerConnect(this);

        // Add stage to timeline so its update/render methods are called
        this.onAssetAdded(stage);
        console.log("Stage Added");

        this.dispatchEvent(new CustomEvent("stageconnect", { detail: { stage } }));
    }

    /**
     * Implements internal _tryAttachStageCandidate behavior.
     * @param {*} stageCandidate - Parameter value.
     * @returns {*} Result of _tryAttachStageCandidate.
     */
    _tryAttachStageCandidate(stageCandidate) {
        if (!stageCandidate) return;
        if (this.stage === stageCandidate) return;

        const connectStage = () => {
            if (!stageCandidate.isConnected) return;
            if (this.stage && this.stage !== stageCandidate) return;
            if (typeof stageCandidate.onViewerConnect === "function") {
                this.onStageConnect(stageCandidate);
            }
        };

        if (typeof stageCandidate.onViewerConnect === "function") {
            connectStage();
            return;
        }

        if (typeof stageCandidate.addEventListener === "function") {
            stageCandidate.addEventListener("ready", connectStage, { once: true });
        }

        if (globalThis.customElements?.whenDefined) {
            globalThis.customElements.whenDefined("animation-stage").then(() => connectStage());
        }
    }

    /**
     * Handles targetconnect events.
     * @param {*} target - Parameter value.
     * @returns {*} Result of onTargetConnect.
     */
    onTargetConnect(target) {
        this.target = target;
    }

    /**
     * Handles children events.
     * @param {*} children - Parameter value.
     * @returns {*} Result of onChildren.
     */
    onChildren(children) {
        if (children) {
            children.forEach((asset) => {
                if (asset?.tagName?.toLowerCase() === "animation-stage") {
                    this._tryAttachStageCandidate(asset);
                }
                if (asset.animate) {
                    this.onAssetAdded(asset);
                }
            });
        }
    }

    /**
     * Handles customchildready events.
     * @param {*} child - Parameter value.
     * @returns {*} Result of onCustomChildReady.
     */
    onCustomChildReady(child) {
        if (child.animate) {
        }
    }

    cache = { stage_rect: "" };

    /**
     * Updates internal state from incoming values.
     * @param {*} time - Parameter value.
     * @returns {*} Result of update.
     */
    update(time) {
        if (!this.debug) return;

        const shouldSample = typeof this._debug.shouldSample === "function" ? this._debug.shouldSample(time) : true;

        if (shouldSample) {
            if (this.stage) {
                const stageRect = this.stage.getBoundingClientRect();
                const stageRectValue =
                    `T: ${stageRect.top.toFixed(1)}, ` +
                    `L: ${stageRect.left.toFixed(1)}, ` +
                    `W: ${stageRect.width.toFixed(1)}, ` +
                    `H: ${stageRect.height.toFixed(1)}`;
                if (typeof this._debug.setStat === "function") {
                    this._debug.setStat("stage_rect", stageRectValue);
                } else {
                    this._debug.stage_rect = stageRectValue;
                }
            }

            const viewSizeValue = `W: ${Math.round(this.width)}, H: ${Math.round(this.height)}`;
            if (typeof this._debug.setStat === "function") {
                this._debug.setStat("view_size", viewSizeValue);
            } else {
                this._debug.view_size = viewSizeValue;
            }
        }
    }

    /**
     * Renders output from current module state.
     * @returns {*} Result of render.
     */
    render() {
        this.camera.render();
    }

    /**
     * Handles customchildconnect events.
     * @param {*} child - Parameter value.
     * @returns {*} Result of onCustomChildConnect.
     */
    onCustomChildConnect(child) {
        if (child.hasAttribute("noanimate")) {
            return false;
        }
        if (child instanceof AnimationStage) {
            this.onStageConnect(child);
        } else if (child?.tagName?.toLowerCase() === "animation-stage") {
            this._tryAttachStageCandidate(child);
        } else if (child instanceof AnimationBody) {
            this.onAssetAdded(child);
        } else if (child instanceof AnimationSprite) {
            this.onAssetAdded(child);
        } else if (["animation-stage", "animation-body", "animation-sprite"].includes(child.tagName.toLowerCase())) {
            this.onAssetAdded(child);
        } else if (child.animationComponent) {
            this.onAssetAdded(child);
        }
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} time - Parameter value.
     * @returns {*} Result of updateCamera.
     */
    updateCamera(time) {
        this.camera.update(time);
    }

    /**
     * Executes follow.
     * @param {*} target - Parameter value.
     * @returns {*} Result of follow.
     */
    follow(target) {
        this.following = target;
        this.camera.follow(target);
    }

    animations = [];
    /**
     * Handles assetadded events.
     * @param {*} asset - Parameter value.
     * @returns {*} Result of onAssetAdded.
     */
    onAssetAdded(asset) {
        if (!asset || this.animatedAssets.includes(asset)) return asset;

        this.index.push(asset.id);
        this.animatedAssets.push(asset);
        asset.viewer = this;

        if (!this.stage && (asset instanceof AnimationStage || asset?.tagName?.toLowerCase() === "animation-stage")) {
            this._tryAttachStageCandidate(asset);
            return asset;
        }

        if (asset.animate) this.timeline.addAnimator(asset);

        if (asset.onAnimationConnect) asset.onAnimationConnect(this);

        if (asset.tagName) {
            asset.dispatchEvent(new CustomEvent("animationconnect"));
        }

        return asset;
    }

    /**
     * Handles propertychanged events.
     * @param {*} property - Parameter value.
     * @param {*} previous - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of onPropertyChanged.
     */
    onPropertyChanged(property, previous, value) {
        if (property === "fps" && this.timeline) {
            this.timeline.fps = value;
        }
    }

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        const { width, height } = this.getBoundingClientRect();
        this.width = width;
        this.height = height;

        if (!this.stage) {
            const stageChild = Array.from(this.children).find(
                (child) => child?.tagName?.toLowerCase() === "animation-stage"
            );
            this._tryAttachStageCandidate(stageChild);
        }

        if (this.hasAttribute("debug")) {
            const debug = document.createElement("animation-stats");
            debug.inline = true;
            this.ref("html").appendChild(debug);

            debug.addEventListener("ready", () => {
                // debug.addStat("stage_rect", "");
                // debug.addStat("view_size", "");
            });
            this._debug = debug;
            // debug.scope = this;
            this.onAssetAdded(debug);
        }

        this.onTimelineReady(this.timeline);
        this.timelineReady = true;
    }

    /**
     * Handles disconnect events.
     * @returns {*} Result of onDisconnect.
     */
    onDisconnect() {
        if (this.stage && this.stage.onViewerDisconnect) {
            this.stage.onViewerDisconnect(this);
        }
        this.stage = null;
        if (this.timeline) {
            this.timeline.pause();
        }
    }

    /**
     * Handles timelineready events.
     * @returns {*} Result of onTimelineReady.
     */
    onTimelineReady() {
        return true;
    }

    /***
     * ANIMATION LAYERS
     */

    namedLayers = {};
    /**
     * Executes addLayer.
     * @param {*} name - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of addLayer.
     */
    addLayer(name, options = {}) {
        const layers = this.layers;
        const index = options.index ?? layers.length;
        const layer = document.createElement("animation-layer");
        if (options.type) layer.setAttribute("type", options.type);
        if (name) layer.setAttribute("name", name);
        layer.setAttribute("index", index);
        if (options.width) layer.setAttribute("width", options.width);
        if (options.height) layer.setAttribute("height", options.height);
        this.insertBefore(layer, this.layers[index] || null);
        this.layers.splice(index, 0, layer);
        if (name) {
            this.namedLayers[name] = layer;
        }

        return layer;
    }

    /**
     * Executes appendLayer.
     * @param {*} name - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of appendLayer.
     */
    appendLayer(name, options = {}) {
        options.index = this.layers.length;
        return this.addLayer(name, options);
    }

    /**
     * Executes prependLayer.
     * @param {*} name - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of prependLayer.
     */
    prependLayer(name, options = {}) {
        options.index = 0;
        return this.addLayer(name, options);
    }

    /**
     * Executes layer.
     * @param {*} indexOrName - Parameter value.
     * @returns {*} Result of layer.
     */
    layer(indexOrName = 0) {
        if (typeof indexOrName == "string") {
            return this.namedLayers[indexOrName];
        }
        return this.layers[indexOrName];
    }
}

customElements.define(AnimationViewer.tag, AnimationViewer);
export default AnimationViewer;
