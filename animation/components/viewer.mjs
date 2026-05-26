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
import Animation from "../animation.mjs";

import { parsePosition, toAnchorCSSPosition } from "../anchor.mjs";

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
            debug: { default: false, type: "exists", linked: true },
            frame: { default: false, type: "exists", linked: true },
            origin: { default: "center", type: "string" }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["width", "height", "fps", "state", "follow", "debug", "stats", "frame", "origin"]
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
                    width: "0px",
                    height: "0px",
                    left: 0,
                    top: 0
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
                },
                "#frame": {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1000
                },
                "#frame .viewable": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    border: "1px solid red",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box"
                },
                "#frame .center": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "80px",
                    height: "80px",
                    background: "red",
                    borderRadius: "50%"
                },
                "#frame .cross": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "2px",
                    height: "2px",
                    background: "red"
                },
                ".safe-zone": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "calc(100% - 80px)",
                    height: "calc(100% - 80px)"
                },
                ".safe-zone .corner": {
                    position: "absolute",
                    width: "200px",
                    height: "200px"
                },
                ".safe-zone .corner.left-top": {
                    top: 0,
                    left: 0,
                    borderTop: "4px solid #FFFFFF",
                    borderLeft: "4px solid #FFFFFF"
                },
                ".safe-zone .corner.right-top": {
                    top: 0,
                    right: 0,
                    borderTop: "4px solid #FFFFFF",
                    borderRight: "4px solid #FFFFFF"
                },
                ".safe-zone .corner.left-bottom": {
                    bottom: 0,
                    left: 0,
                    borderBottom: "4px solid #FFFFFF",
                    borderLeft: "4px solid #FFFFFF"
                },
                ".safe-zone .corner.right-bottom": {
                    bottom: 0,
                    right: 0,
                    borderBottom: "4px solid #FFFFFF",
                    borderRight: "4px solid #FFFFFF"
                },
                ".debug-overlay": {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1000,
                    opacity: 0.4
                },
                ".debug-overlay .center-rect": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "20%",
                    height: "20%",
                    border: "1px solid #FFFFFF"
                },
                ".debug-overlay .center-cross": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "2px",
                    height: "2px",
                    background: "#FFFFFF"
                },
                ".debug-overlay .center-cross::before": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "40px",
                    height: "2px",
                    background: "#FFFFFF"
                },
                ".debug-overlay .center-cross::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "2px",
                    height: "40px",
                    background: "#FFFFFF"
                }
            }
        ];
    }

    debugHTML() {
        return `
        <div class="debug-overlay">
            <div class="center-rect">
            <div class="center-cross"></div>
            </div>
            <div class="safe-zone">
                <div class="corner left-top"></div>
                <div class="corner right-top"></div>
                <div class="corner left-bottom"></div>
                <div class="corner right-bottom"></div>
            </div>
        </div>
        `;
    }

    /**
     * Executes html.
     * @param {*} data - Parameter value.
     * @returns {*} Result of html.
     */
    static html(data = {}) {
        return `
        ${this.frame ? `<div id="frame"><div class="viewable"><div class="center"><div class="cross"></div></div></div></div>` : ""}
        ${this.debug ? this.debugHTML() + `` : ""}
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
        if (!this.animation) {
            this.animation = new Animation({ viewer: this, fps: this.fps || 60 });

            this.timeline = this.animation.timeline;
            this.timeline.addAnimator(this);
            //this.timeline.update = this.update.bind(this);

            this.timeline.afterUpdate((time) => {
                this.updateCamera(time);
            });

            //this.timeline.render = this.render.bind(this);

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

        const viewrect = this.getBoundingClientRect();

        this.ref("html").style.setProperty("--viewer-width", `${viewrect.width}px`);
        this.ref("html").style.setProperty("--viewer-height", `${viewrect.height}px`);

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

        this.animation.tree.addAsset(asset, this);

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
        } else if (property === "debug") {
            if (value) {
                if (!this._debug) {
                    const debug = document.createElement("animation-stats");
                    debug.inline = true;
                    this.ref("html").appendChild(debug);
                    this._debug = debug;
                }
            } else {
                if (this._debug) {
                    this._debug.remove();
                    this._debug = null;
                }
            }
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

        this.animation.setRootElement(this);

        if (this.hasAttribute("origin")) {
            const { x: originX, y: originY } = parsePosition(this.getAttribute("origin"));
            this.origin = { x: originX, y: originY };
        }

        this.ref("html").style.setProperty("--origin-x", toAnchorCSSPosition(this.origin.x));
        this.ref("html").style.setProperty("--origin-y", toAnchorCSSPosition(this.origin.y));

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
}

customElements.define(AnimationViewer.tag, AnimationViewer);
export default AnimationViewer;
