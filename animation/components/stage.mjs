/**
 * Animation stage component providing a container for animated elements with physics properties.
 * @module Components/Animation/Stage
 */
import Component from "../../ui/component.mjs";
import Timeline from "../timeline.mjs";
import { Position } from "../properties/Position.mjs";
import AnimationComponentUtil from "./util.mjs";

import "./stats.mjs";

/**
 * Stage component for managing animated elements with configurable physics.
 * @class AnimationStage
 * @extends Component.HTMLElement
 */
class AnimationStage extends Component.HTMLElement {
    static tag = "animation-stage";

    animationComponent = true;
    animated = true;

    static allowedStates = ["initial", "actve", "inactve", "complete"];

    static config = {
        properties: {
            debug: { default: false, type: "exists", linked: true },
            width: { default: "100%", type: "string", linked: true },
            height: { default: "100%", type: "string", linked: true },
            background: { default: "transparent", type: "string", linked: true },
            x: { default: 0, route: "position.x", type: "number", unit: "percent" },
            y: { default: 0, route: "position.y", type: "number", unit: "percent" },
            frction: { default: 0.6, type: "number", unit: "coefficient" },
            gravity: { default: 9.81, type: "number", unit: "meters per second sq" },
            fps: { default: 60, type: "number", unit: "frames per second", linked: true },
            state: { default: "initial", type: "string", allowed: AnimationStage.allowedStates },
            anchor: { default: { x: 0.5, y: 0.5 }, type: "object" },
            origin: { default: { x: 0.5, y: 0.5 }, type: "object" }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["debug", "background", "width", "height", "friction", "gravity", "state", "fps", "x", "y"],
            attributres: ["anchor", "origin"]
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
                    top: 0,
                    left: 0,
                    width: "var( --viewer-width, --stage-width, 100% )",
                    height: "var( --viewer-height, --stage-height, 100% )",
                    zIndex: 0
                },
                ":host(.viewer-connected)": {
                    position: "absolute",
                    transform: "translate( calc( var(--origin-x) * -100% ), calc( var( --origin-y ) * -100%) )"
                },
                "#html": {
                    position: "absolute",
                    width: "var(--viewer-width, --stage-width, 100%)",
                    height: "var(--viewer-height, --stage-height, 100%)"
                },
                "#world": {
                    position: "absolute",
                    width: "var(--stage-width, 100% )",
                    height: "var(--stage-height, 100% )",
                    pointerEvents: "none",
                    zIndex: 1
                },
                ":host(.viewer-connected) #world": {
                    position: "relative"
                    // left: "var(--anchor-x, 0)",
                    // top: "var(--anchor-y, 0)",
                },
                'slot[name="paralax-background"]': {
                    pointerEvents: "auto",
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    display: "block",
                    top: 0,
                    left: 0,
                    zIndex: -1
                    //transform: "translate( calc( var(--origin-x, 0) * -100% ), calc( var(--origin-y, 0) * -100% ) )"
                },
                'slot[name="world-background"]': {
                    pointerEvents: "auto",
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    display: "block",
                    top: 0,
                    left: 0,
                    zIndex: -1
                },
                "slot:not([name])": {
                    position: "absolute",
                    display: "block",
                    left: "calc( var(--origin-x, 0) * 100% )",
                    top: "calc( var(--origin-y, 0) * 100% )"
                },
                "animation-anchor": {
                    zIndex: 1,
                    left: "calc( var( --origin-x, 0 ) * 100% )",
                    top: "calc( var( --origin-y, 0 ) * 100% )",
                    transform: "translate(var(--stage-x, 0), var(--stage-y, 0))"
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
        <slot name="paralax-background"></slot>
        <animation-anchor id="anchor">
            <div id="world">
                <slot name="world-background"></slot>
                <slot></slot>
            </div> 
        </animation-anchor>
        
        
        `;
    }

    /**
     * Executes beforeCreate.
     * @returns {*} Result of beforeCreate.
     */
    beforeCreate() {
        this.position = new Position(0, 0, { history: 3, trackDirty: true });
        this.anchorPoint = { x: 0, y: 0 };
        this.bounds = {
            max: { x: 0, y: 0 },
            min: { x: 0, y: 0 }
        };
    }

    /**
     * Returns the current dimentions value.
     * @returns {*} Current dimentions value.
     */
    get dimentions() {
        const { width, height } = this.ref("html").getBoundingClientRect();
        return { width, height };
    }

    index = { bodies: [] };
    bodies = [];
    animations = [];
    animatorChildren = new Set();
    localTimeline = null;
    viewer = null;

    /**
     * Returns the current timeline value.
     * @returns {*} Current timeline value.
     */
    get timeline() {
        return this.animation.timeline;
    }

    /**
     * Executes moveTo.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @returns {*} Result of moveTo.
     */
    moveTo(x, y) {
        this.position.set(x, y);
        this._clampPositionToBounds();
    }

    /**
     * Executes move.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @returns {*} Result of move.
     */
    move(x, y) {
        this.position.add(x, y);
        this._clampPositionToBounds();
    }

    /**
     * Handles attributechanged events.
     * @param {*} property - Parameter value.
     * @param {*} prevous - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of onAttributeChanged.
     */
    onAttributeChanged(property, prevous, value) {
        if (!this.root) return;

        switch (property) {
            case "width":
                this._setDimensionVar("width", value);
                break;
            case "height":
                this._setDimensionVar("height", value);
                break;
            case "x":
                this._refreshPlacement({ x: value });
                break;
            case "y":
                this._refreshPlacement({ y: value });
                break;
            case "background":
                this.ref("html").style.background = value;
                break;
        }
    }

    /**
     * Handles propertychanged events.
     * @param {*} property - Parameter value.
     * @param {*} prevous - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of onPropertyChanged.
     */
    onPropertyChanged(property, prevous, value) {
        switch (property) {
            case "fps":
                this.animation.timeline.fps = value;
                break;
            case "width":
                this._setDimensionVar("width", value);
                break;
            case "height":
                this._setDimensionVar("height", value);
                break;
            case "anchor":
                AnimationComponentUtil.setAnchor(this);
                break;
            case "background":
                this.ref("html").style.background = value;
                break;
        }
    }

    backgrounds = [];

    /**
     * Executes addBackground.
     * @param {*} element - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of addBackground.
     */
    addBackground(element, options = {}) {
        if (!element) return;
        const bg = {
            element: element,
            ...options
        };
        if (options.paralax || options.placement === "paralax") {
            bg.paralax;
            element.setAttribute("slot", "paralax-background");
        } else {
            element.setAttribute("slot", "world-background");
        }

        Object.assign(element.style, {
            position: element.style.position || "absolute",
            width: element.style.width || "100%",
            height: element.style.height || "100%",
            top: element.style.top || "0",
            left: element.style.left || "0"
        });

        if (!element.parentNode) {
            this.appendChild(element);
        }

        this.backgrounds.push(bg);
    }

    /**
     * Updates internal state from incoming values.
     * @param {*} time - Parameter value.
     * @returns {*} Result of update.
     */
    update(time) {
        this._clampPositionToBounds();

        if (this.backgrounds.length) {
            this.backgrounds.forEach((background) => {
                if (background.animate && background.update) {
                    background.update();
                }
            });
        }
    }

    /**
     * Renders output from current module state.
     * @param {*} data - Parameter value.
     * @returns {*} Result of render.
     */
    render(data) {
        this._clampPositionToBounds();
        if (this.position.dirty) {
            this._applyPositionToDOM();
            this.position.save();
        }

        if (this.backgrounds.length) {
            this.backgrounds.forEach((background) => {
                if (background.animate && background.render) {
                    background.render();
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
        if (!child || !child.animate) return;
        console.log("Child ready for animation stage", { child });
        this.animatorChildren.add(child);

        this.animation.tree.addAsset(child, this);
    }

    /**
     * Executes addAnimator.
     * @param {*} animator - Parameter value.
     * @returns {*} Result of addAnimator.
     */
    addAnimator(animator) {
        if (!animator) return;
        console.log("Adding animator to stage", { animator });
        const canAnimate =
            animator.animate === true || typeof animator.update === "function" || typeof animator.render === "function";
        if (!canAnimate) return;
        if (typeof animator.setStage === "function") {
            animator.setStage(this);
        } else if ("stage" in animator || animator.animationBody) {
            animator.stage = this;
        }
        if (animator.animate !== true) animator.animate = true;

        this.animation.timeline.addAnimator(animator);
    }

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        AnimationComponentUtil.initialize(this);

        if (this.hasAttribute("parallax")) {
            this.parallax = true;
        }
        const defer = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
        defer(() => {
            if (this.viewer) return;
            const hostViewer = this._findViewerHost();
            if (!hostViewer || typeof hostViewer.onStageConnect !== "function") return;
            hostViewer.onStageConnect(this);
        });
        if (this.debug) {
            this.stats = document.createElement("animation-stats");
            this.stats.inline = true;
            this.ref("html").appendChild(this.stats);
        }
    }

    /**
     * Handles viewerconnect events.
     * @param {*} viewer - Parameter value.
     * @returns {*} Result of onViewerConnect.
     */
    onViewerConnect(viewer) {
        if (this.viewer && this._viewerResizeHandler) {
            this.viewer.removeEventListener("resize", this._viewerResizeHandler);
        }
        this.viewer = viewer;
        if (!this._viewerResizeHandler) {
            this._viewerResizeHandler = () => {
                this._refreshPlacement();
            };
        }
        this.viewer.addEventListener("resize", this._viewerResizeHandler);
        this._refreshPlacement();
        this.classList.add("viewer-connected");
    }

    /**
     * Handles viewerdisconnect events.
     * @param {*} viewer - Parameter value.
     * @returns {*} Result of onViewerDisconnect.
     */
    onViewerDisconnect(viewer = null) {
        if (viewer && this.viewer !== viewer) return;
        if (this.viewer && this._viewerResizeHandler) {
            this.viewer.removeEventListener("resize", this._viewerResizeHandler);
        }
        this.viewer = null;
        this._syncBounds();
        this.style.transform = "";
        this.style.left = "0px";
        this.style.top = "0px";
    }

    /**
     * Handles disconnect events.
     * @returns {*} Result of onDisconnect.
     */
    onDisconnect() {
        if (this.viewer && this._viewerResizeHandler) {
            this.viewer.removeEventListener("resize", this._viewerResizeHandler);
        }
        this.viewer = null;
    }

    /**
     * Implements internal _setDimensionVar behavior.
     * @param {*} axis - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of _setDimensionVar.
     */
    _setDimensionVar(axis, value) {
        const attrValue = this.getAttribute(axis);
        const source = typeof attrValue === "string" && attrValue.trim().length ? attrValue : value;

        let cssValue = source;
        if (typeof cssValue === "number") {
            cssValue = `${cssValue}px`;
        } else if (typeof cssValue === "string") {
            const trimmed = cssValue.trim();
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                cssValue = `${trimmed}px`;
            } else {
                cssValue = trimmed;
            }
        }

        this.ref("html").style.setProperty(`--stage-${axis}`, cssValue || "0px");
        this.ref("html").style.setProperty(`--${axis}`, cssValue || "0px");
        this._refreshPlacement();
    }

    /**
     * Implements internal _viewerSize behavior.
     * @returns {*} Result of _viewerSize.
     */
    _viewerSize() {
        if (!this.viewer) return { width: 0, height: 0 };
        const rect = this.viewer.getBoundingClientRect();
        return {
            width: Number(this.viewer.width) || rect.width || 0,
            height: Number(this.viewer.height) || rect.height || 0
        };
    }

    /**
     * Implements internal _valueToSceneCoordinate behavior.
     * @param {*} value - Parameter value.
     * @param {*} axisSize - Parameter value.
     * @returns {*} Result of _valueToSceneCoordinate.
     */
    _valueToSceneCoordinate(value, axisSize) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return 0;
        if (numericValue >= 0 && numericValue <= 1) return numericValue * axisSize;
        return numericValue;
    }

    /**
     * Implements internal _getConfiguredAxisValue behavior.
     * @param {*} axis - Parameter value.
     * @returns {*} Result of _getConfiguredAxisValue.
     */
    _getConfiguredAxisValue(axis) {
        const raw = this.getAttribute(axis);
        if (raw === null) return null;
        const text = String(raw).trim();
        if (!text.length) return null;
        if (text.endsWith("%")) {
            const percentage = Number.parseFloat(text);
            return Number.isFinite(percentage) ? percentage / 100 : null;
        }
        const numeric = Number(text);
        return Number.isFinite(numeric) ? numeric : null;
    }

    /**
     * Implements internal _syncPositionFromViewer behavior.
     * @param {*} values - Parameter value.
     * @returns {*} Result of _syncPositionFromViewer.
     */
    _syncPositionFromViewer(values = {}) {
        if (!this.viewer) return;
        const { width: stageWidth, height: stageHeight } = this._stageSize();
        const xValue = values.x ?? this._getConfiguredAxisValue("x");
        const yValue = values.y ?? this._getConfiguredAxisValue("y");
        this.position.x = xValue === null ? 0 : this._valueToSceneCoordinate(xValue, stageWidth);
        this.position.y = yValue === null ? 0 : this._valueToSceneCoordinate(yValue, stageHeight);
    }

    /**
     * Implements internal _syncBounds behavior.
     * @returns {*} Result of _syncBounds.
     */
    _syncBounds() {
        const { width: stageWidth, height: stageHeight } = this._stageSize();
        const anchorX = this.anchorPoint?.x || 0;
        const anchorY = this.anchorPoint?.y || 0;
        let minX = -anchorX;
        let maxX = stageWidth - anchorX;
        let minY = -anchorY;
        let maxY = stageHeight - anchorY;

        if (this.viewer) {
            const { width: viewerWidth, height: viewerHeight } = this._viewerSize();
            const centerX = viewerWidth / 2;
            const centerY = viewerHeight / 2;
            minX = centerX + anchorX - stageWidth;
            maxX = anchorX - centerX;
            minY = centerY + anchorY - stageHeight;
            maxY = anchorY - centerY;
        }

        if (minX > maxX) {
            const xLock = (minX + maxX) * 0.5;
            minX = xLock;
            maxX = xLock;
        }

        if (minY > maxY) {
            const yLock = (minY + maxY) * 0.5;
            minY = yLock;
            maxY = yLock;
        }

        this.bounds = {
            max: { x: maxX, y: maxY },
            min: { x: minX, y: minY }
        };
        this._syncCameraBounds();
    }

    /**
     * Implements internal _stageSize behavior.
     * @returns {*} Result of _stageSize.
     */
    _stageSize() {
        const html = this.ref?.("html");
        if (html && typeof html.getBoundingClientRect === "function") {
            const rect = html.getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
                return { width: rect.width, height: rect.height };
            }
        }

        const resolve = (axis) => {
            const raw = this.getAttribute(axis);
            if (typeof raw === "string") {
                const text = raw.trim();
                if (text.endsWith("%")) {
                    const pct = Number.parseFloat(text);
                    if (Number.isFinite(pct)) {
                        const base = this.viewer
                            ? this._viewerSize()[axis]
                            : this.parentElement?.getBoundingClientRect?.()[axis] || 0;
                        return (pct / 100) * base;
                    }
                }
                if (text.endsWith("px")) {
                    const px = Number.parseFloat(text);
                    if (Number.isFinite(px)) return px;
                }
                const numeric = Number(text);
                if (Number.isFinite(numeric)) return numeric;
            }
            const propNumeric = Number(this[axis]);
            if (Number.isFinite(propNumeric)) return propNumeric;
            return 0;
        };

        return {
            width: resolve("width"),
            height: resolve("height")
        };
    }

    /**
     * Implements internal _clampPositionToBounds behavior.
     * @returns {*} Result of _clampPositionToBounds.
     */
    _clampPositionToBounds() {
        if (!this.bounds || !this.position) return;
        const min = this.bounds.min || {};
        const max = this.bounds.max || {};
        if (typeof min.x === "number" && this.position.x < min.x) this.position.x = min.x;
        if (typeof max.x === "number" && this.position.x > max.x) this.position.x = max.x;
        if (typeof min.y === "number" && this.position.y < min.y) this.position.y = min.y;
        if (typeof max.y === "number" && this.position.y > max.y) this.position.y = max.y;
    }

    /**
     * Implements internal _refreshPlacement behavior.
     * @param {*} values - Parameter value.
     * @returns {*} Result of _refreshPlacement.
     */
    _refreshPlacement(values = {}) {
        if (!this.viewer) return;
        this._syncBounds();
        this._syncPositionFromViewer(values);
        this._clampPositionToBounds();
        this._applyPositionToDOM();
    }

    /**
     * Implements internal _applyPositionToDOM behavior.
     * @returns {*} Result of _applyPositionToDOM.
     */
    _applyPositionToDOM() {
        if (!this.viewer) return;
        const { width: viewerWidth, height: viewerHeight } = this.viewer;
        //this.ref("world").style.left = `${viewerWidth / 2}px`;
        //this.ref("world").style.top = `${viewerHeight / 2}px`;
        if (this.parallax) {
            this.writeStyleVars({ "--stage-x": this.position.x, "--stage-y": this.position.y }, this.ref("html"));
        } else {
            //  this.ref("anchor").style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
        }
    }

    /**
     * Implements internal _syncCameraBounds behavior.
     * @returns {*} Result of _syncCameraBounds.
     */
    _syncCameraBounds() {
        if (!this.viewer || !this.viewer.camera || !this.bounds) return;
        const camera = this.viewer.camera;
        const { width: viewerWidth, height: viewerHeight } = this._viewerSize();
        const centerX = viewerWidth / 2;
        const centerY = viewerHeight / 2;
        const anchorX = this.anchorPoint?.x || 0;
        const anchorY = this.anchorPoint?.y || 0;
        const cameraOffsetX = anchorX - centerX;
        const cameraOffsetY = anchorY - centerY;
        camera.width = viewerWidth;
        camera.height = viewerHeight;
        camera.min.x = cameraOffsetX - this.bounds.max.x;
        camera.max.x = cameraOffsetX - this.bounds.min.x;
        camera.min.y = cameraOffsetY - this.bounds.max.y;
        camera.max.y = cameraOffsetY - this.bounds.min.y;
    }

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

export default AnimationStage;

customElements.define(AnimationStage.tag, AnimationStage);
