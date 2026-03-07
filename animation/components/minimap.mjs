/**
 * Mini-map component for viewer + stage scenes.
 * Renders stage bounds, current viewport rectangle, and tracked object dots.
 * @module Components/Animation/Minimap
 */

import Component from "../../ui/component.mjs";

/**
 * Executes clamp.
 * @param {*} value - Parameter value.
 * @param {*} min - Parameter value.
 * @param {*} max - Parameter value.
 * @returns {*} Result of clamp.
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Executes toNumber.
 * @param {*} value - Parameter value.
 * @param {*} fallback - Parameter value.
 * @returns {*} Result of toNumber.
 */
function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

const INTERNAL_IDS = new Set([
    "background",
    "parallax",
    "world",
    "html",
    "label",
    "map",
    "stage-box",
    "viewport-box",
    "dots",
    "anchor-point",
    "meta"
]);

/**
 * Represents the AnimationMinimap animation module class.
 */
class AnimationMinimap extends Component.HTMLElement {
    static tag = "animation-minimap";

    static config = {
        properties: {
            viewer: { default: "", type: "string", linked: true },
            stage: { default: "", type: "string", linked: true },
            padding: { default: 8, type: "number", linked: true },
            mapstyle: { default: "transparent", type: "string", set: ["transparent", "box"], linked: true },
            metadata: { default: true, type: "boolean", linked: true },
            width: { default: "", type: "string", linked: true },
            height: { default: "", type: "string", linked: true }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["viewer", "stage", "padding", "mapstyle", "metadata", "width", "height"]
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
                    display: "block",
                    position: "absolute",
                    right: "12px",
                    bottom: "12px",
                    zIndex: 30,
                    width: "260px",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                },
                "#html": {
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    minHeight: "0"
                },
                "#label": {
                    font: "600 12px/1.2 monospace",
                    color: "var(--map-font-color, #FFFFFF)",
                    margin: "0",
                    paddingLeft: "0"
                },
                "#map": {
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    flex: "1 1 auto",
                    minHeight: "0",
                    aspectRatio: "4 / 3",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #102038 0%, #0f1622 100%)",
                    border: "1px solid rgba(160,180,210,0.35)",
                    overflow: "hidden"
                },
                "#stage-box": {
                    position: "relative",
                    margin: "auto",
                    border: "1px solid rgba(130, 198, 255, 0.85)",
                    background: "rgba(53, 120, 182, 0.14)",
                    borderRadius: "3px",
                    boxSizing: "border-box",
                    overflow: "hidden"
                },
                "#viewport-box": {
                    position: "absolute",
                    border: "1px solid rgba(197, 255, 115, 0.95)",
                    background: "rgba(197, 255, 115, 0.14)",
                    borderRadius: "2px",
                    boxSizing: "border-box",
                    pointerEvents: "none",
                    zIndex: 4
                },
                "#dots": {
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 3
                },
                "#anchor-point": {
                    position: "absolute",
                    width: "12px",
                    height: "12px",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    zIndex: 5
                },
                ".anchor-line": {
                    position: "absolute",
                    background: "rgba(255, 170, 80, 0.95)",
                    boxShadow: "0 0 0 1px rgba(10,20,30,0.65)"
                },
                ".anchor-line.h": {
                    left: "0",
                    top: "50%",
                    width: "100%",
                    height: "1px",
                    transform: "translateY(-50%)"
                },
                ".anchor-line.v": {
                    left: "50%",
                    top: "0",
                    width: "1px",
                    height: "100%",
                    transform: "translateX(-50%)"
                },
                ".dot": {
                    position: "absolute",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#ffb74d",
                    boxShadow: "0 0 0 1px rgba(10,20,30,0.75)",
                    transform: "translate(-50%, -50%)"
                },
                "#meta": {
                    margin: "0",
                    font: "11px/1.2 monospace",
                    color: "#35506f",
                    whiteSpace: "pre-wrap"
                },
                ".mapstyle-box": {
                    background: "#f8fbff",
                    border: "1px solid rgba(130, 198, 255, 0.85)",
                    padding: "8px",
                    borderRadius: "10px",
                    border: "1px solid #d8e2f1",
                    boxShadow: "0 6px 20px rgba(8, 18, 30, 0.22)"
                },
                ".mapstyle-box #map": {},
                ".mapstyle-box #stage-box": {
                    borderColor: "rgba(130, 198, 255, 0.85)",
                    background: "rgba(53, 120, 182, 0.14)"
                },
                ".mapstyle-box #viewport-box": {
                    borderColor: "rgba(197, 255, 115, 0.95)",
                    background: "rgba(197, 255, 115, 0.14)"
                },
                ".mapstyle-transparent": {
                    background: "transparent",
                    border: "0",
                    boxShadow: "none",
                    color: "var(--map-font-color, #FFFFFF)"
                },
                ".mapstyle-transparent #map": {
                    background: "transparent",
                    border: "none",
                    boxShadow: "none"
                },
                ".mapstyle-transparent #stage-box": {
                    borderColor: "rgba(130, 198, 255, 0.85)",
                    background: "#f8fbff",
                    border: "1px solid var(--map-border, rgba(160,180,210,1))",
                    background: "transparent"
                },
                ".mapstyle-transparent #stage-box:before": {
                    content: "''",
                    position: "absolute",
                    inset: 0,
                    background: "rgba(53, 120, 182, 0.14)"
                },
                ".mapstyle-transparent #viewport-box": {
                    borderColor: "rgba(197, 255, 115, 0.95)",
                    background: "rgba(197, 255, 115, 0.14)"
                },
                ".mapstyle-box .anchor-line": {
                    background: "rgba(255, 170, 80, 0.95)"
                },
                ".mapstyle-transparent .anchor-line": {
                    background: "rgba(255, 170, 80, 0.95)"
                }
            }
        ];
    }

    /**
     * Executes html.
     * @returns {*} Result of html.
     */
    static html() {
        return `
        <div id="label">Mini Map</div>
        <div id="map">
            <div id="stage-box">
                <div id="dots"></div>
                <div id="viewport-box"></div>
                <div id="anchor-point" aria-hidden="true">
                    <div class="anchor-line h"></div>
                    <div class="anchor-line v"></div>
                </div>
            </div>
        </div>
        <div id="meta"></div>
        `;
    }

    /**
     * Executes beforeCreate.
     * @returns {*} Result of beforeCreate.
     */
    beforeCreate() {
        this._raf = 0;
        this._viewerEl = null;
        this._stageEl = null;
        this._stageSceneEl = null;
        this._onStageConnect = (event) => {
            const stage = event?.detail?.stage;
            if (stage) {
                this._stageEl = stage;
                this._stageSceneEl = this._getStageSceneRoot(stage);
            }
        };
    }

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        this.ref("html").classList.add(`mapstyle-${this.mapstyle}`);
        this._applyHostSize();
        this._applyMetadataVisibility();
        this._bindTargets();
        this._startLoop();
    }

    /**
     * Handles propertychanged events.
     * @param {*} property - Parameter value.
     * @returns {*} Result of onPropertyChanged.
     */
    onPropertyChanged(property) {
        if (property === "viewer" || property === "stage") {
            this._bindTargets();
        }
        if (property === "width" || property === "height") {
            this._applyHostSize();
        }
        if (property === "metadata") {
            this._applyMetadataVisibility();
        }
    }

    /**
     * Handles disconnect events.
     * @returns {*} Result of onDisconnect.
     */
    onDisconnect() {
        this._stopLoop();
        this._unbindViewerEvents();
    }

    /**
     * Implements internal _startLoop behavior.
     * @returns {*} Result of _startLoop.
     */
    _startLoop() {
        if (this._raf) return;
        const tick = () => {
            this._raf = globalThis.requestAnimationFrame(tick);
            this._bindTargets();
            this._renderPreview();
        };
        this._raf = globalThis.requestAnimationFrame(tick);
    }

    /**
     * Implements internal _stopLoop behavior.
     * @returns {*} Result of _stopLoop.
     */
    _stopLoop() {
        if (!this._raf) return;
        globalThis.cancelAnimationFrame(this._raf);
        this._raf = 0;
    }

    /**
     * Implements internal _unbindViewerEvents behavior.
     * @returns {*} Result of _unbindViewerEvents.
     */
    _unbindViewerEvents() {
        if (this._viewerEl) {
            this._viewerEl.removeEventListener("stageconnect", this._onStageConnect);
        }
    }

    /**
     * Implements internal _bindTargets behavior.
     * @returns {*} Result of _bindTargets.
     */
    _bindTargets() {
        const nextViewer = this._resolveViewer();
        if (nextViewer !== this._viewerEl) {
            this._unbindViewerEvents();
            this._viewerEl = nextViewer;
            if (this._viewerEl) {
                this._viewerEl.addEventListener("stageconnect", this._onStageConnect);
            }
        }

        const nextStage = this._resolveStage();
        if (nextStage && nextStage !== this._stageEl) {
            this._stageEl = nextStage;
            this._stageSceneEl = this._getStageSceneRoot(nextStage);
        }
    }

    /**
     * Implements internal _queryDeepInScope behavior.
     * @param {*} scope - Parameter value.
     * @param {*} predicate - Parameter value.
     * @returns {*} Result of _queryDeepInScope.
     */
    _queryDeepInScope(scope, predicate) {
        if (!scope) return null;

        const visited = new Set();
        const queue = [scope];
        while (queue.length) {
            const node = queue.shift();
            if (!node || visited.has(node)) continue;
            visited.add(node);

            if (predicate(node)) return node;

            if (
                node instanceof ShadowRoot ||
                node instanceof Document ||
                node instanceof DocumentFragment ||
                node.nodeType === 1
            ) {
                const children = node.children || node.childNodes;
                if (children) {
                    for (const child of children) {
                        if (!child || visited.has(child)) continue;
                        queue.push(child);
                        if (child.shadowRoot && !visited.has(child.shadowRoot)) {
                            queue.push(child.shadowRoot);
                        }
                    }
                }
            }

            if (node.shadowRoot && !visited.has(node.shadowRoot)) {
                queue.push(node.shadowRoot);
            }
        }
        return null;
    }

    /**
     * Implements internal _isValidSelector behavior.
     * @param {*} selector - Parameter value.
     * @returns {*} Result of _isValidSelector.
     */
    _isValidSelector(selector) {
        if (typeof selector !== "string") return false;
        const trimmed = selector.trim();
        if (!trimmed) return false;
        try {
            document.createDocumentFragment().querySelector(trimmed);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Implements internal _safeQuery behavior.
     * @param {*} scope - Parameter value.
     * @param {*} selector - Parameter value.
     * @returns {*} Result of _safeQuery.
     */
    _safeQuery(scope, selector) {
        if (!scope || !this._isValidSelector(selector)) return null;
        try {
            return scope.querySelector?.(selector) || null;
        } catch {
            return null;
        }
    }

    /**
     * Implements internal _safeMatches behavior.
     * @param {*} node - Parameter value.
     * @param {*} selector - Parameter value.
     * @returns {*} Result of _safeMatches.
     */
    _safeMatches(node, selector) {
        if (!node || typeof node.matches !== "function") return false;
        if (!this._isValidSelector(selector)) return false;
        try {
            return node.matches(selector);
        } catch {
            return false;
        }
    }

    /**
     * Implements internal _queryBySelectorDeep behavior.
     * @param {*} query - Parameter value.
     * @param {*} scopes - Parameter value.
     * @returns {*} Result of _queryBySelectorDeep.
     */
    _queryBySelectorDeep(query, scopes = []) {
        if (!this._isValidSelector(query)) return null;
        const predicate = (node) => this._safeMatches(node, query);
        for (const scope of scopes) {
            const found = this._queryDeepInScope(scope, predicate);
            if (found) return found;
        }
        return null;
    }

    /**
     * Implements internal _resolveViewer behavior.
     * @returns {*} Result of _resolveViewer.
     */
    _resolveViewer() {
        const explicitViewer = this._asElement(this.viewer, "animation-viewer");
        if (explicitViewer) return explicitViewer;

        const ref = this._asSelector(this.viewer);
        if (ref) {
            return this._queryTargetInScope(ref, "animation-viewer");
        }
        if (this.parentElement?.tagName?.toLowerCase() === "animation-viewer") {
            return this.parentElement;
        }
        const closest = this.closest("animation-viewer");
        if (closest) return closest;

        const root = typeof this.getRootNode === "function" ? this.getRootNode() : null;
        return (
            this._queryBySelectorDeep("animation-viewer", [root, document]) ||
            document.querySelector("animation-viewer")
        );
    }

    /**
     * Implements internal _resolveStage behavior.
     * @returns {*} Result of _resolveStage.
     */
    _resolveStage() {
        const explicitStage = this._asElement(this.stage, "animation-stage");
        if (explicitStage) return explicitStage;

        const ref = this._asSelector(this.stage);
        if (ref) {
            return this._queryTargetInScope(ref, "animation-stage");
        }
        if (this._viewerEl?.stage) return this._viewerEl.stage;
        if (this._viewerEl) {
            const direct = this._viewerEl.querySelector("animation-stage");
            if (direct) return direct;
            const deep = this._queryBySelectorDeep("animation-stage", [
                this._viewerEl,
                this._viewerEl.getRootNode?.(),
                document
            ]);
            if (deep) return deep;
        }

        const closest = this.closest("animation-stage");
        if (closest) return closest;
        return (
            this._queryBySelectorDeep("animation-stage", [this.getRootNode?.(), document]) ||
            document.querySelector("animation-stage")
        );
    }

    /**
     * Implements internal _asElement behavior.
     * @param {*} value - Parameter value.
     * @param {*} expectedTag - Parameter value.
     * @returns {*} Result of _asElement.
     */
    _asElement(value, expectedTag = "") {
        if (!value || typeof value !== "object") return null;
        if (value.nodeType !== 1) return null;
        if (!expectedTag) return value;
        const tagName = value.tagName?.toLowerCase?.() || "";
        return tagName === expectedTag ? value : null;
    }

    /**
     * Implements internal _asSelector behavior.
     * @param {*} value - Parameter value.
     * @returns {*} Result of _asSelector.
     */
    _asSelector(value) {
        if (typeof value !== "string") return "";
        const trimmed = value.trim();
        if (!trimmed.length) return "";

        const normalized = trimmed.toLowerCase();
        if (
            normalized.startsWith("[object") ||
            normalized.includes("htmlelement") ||
            normalized.includes("html element")
        ) {
            return "";
        }

        return trimmed;
    }

    /**
     * Implements internal _queryTargetInScope behavior.
     * @param {*} ref - Parameter value.
     * @param {*} fallbackTag - Parameter value.
     * @returns {*} Result of _queryTargetInScope.
     */
    _queryTargetInScope(ref, fallbackTag) {
        const direct = this._asElement(ref);
        if (direct) return direct;

        const selector = this._asSelector(ref);
        if (!selector) return null;

        const query =
            selector.startsWith("#") || selector.startsWith(".") || selector.includes("[") ? selector : `#${selector}`;
        const scopes = [];
        const root = typeof this.getRootNode === "function" ? this.getRootNode() : null;
        if (root && typeof root.querySelector === "function") scopes.push(root);
        if (this._viewerEl) {
            const viewerRoot = typeof this._viewerEl.getRootNode === "function" ? this._viewerEl.getRootNode() : null;
            if (viewerRoot && typeof viewerRoot.querySelector === "function" && !scopes.includes(viewerRoot)) {
                scopes.push(viewerRoot);
            }
            scopes.push(this._viewerEl);
        }
        scopes.push(document);

        if (!this._isValidSelector(query)) return null;

        const deep = this._queryBySelectorDeep(query, scopes);
        if (deep) return deep;

        for (const scope of scopes) {
            const found = this._safeQuery(scope, query);
            if (found) return found;
        }
        if (!fallbackTag) return null;

        const deepFallback = this._queryBySelectorDeep(fallbackTag, scopes);
        if (deepFallback) return deepFallback;

        for (const scope of scopes) {
            const fallback = this._safeQuery(scope, fallbackTag);
            if (fallback) return fallback;
        }
        return null;
    }

    /**
     * Implements internal _getStageSceneRoot behavior.
     * @param {*} stage - Parameter value.
     * @returns {*} Result of _getStageSceneRoot.
     */
    _getStageSceneRoot(stage) {
        if (!stage) return null;
        if (typeof stage.ref === "function") {
            const htmlRoot = stage.ref("html");
            if (htmlRoot) return htmlRoot;
        }
        return stage.shadowRoot?.getElementById?.("html") || stage;
    }

    /**
     * Implements internal _toCssSize behavior.
     * @param {*} value - Parameter value.
     * @returns {*} Result of _toCssSize.
     */
    _toCssSize(value) {
        if (value === null || value === undefined) return "";
        if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
        if (typeof value !== "string") return "";

        const trimmed = value.trim();
        if (!trimmed) return "";
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
        return trimmed;
    }

    /**
     * Implements internal _applyHostSize behavior.
     * @returns {*} Result of _applyHostSize.
     */
    _applyHostSize() {
        const width = this._toCssSize(this.width);
        const height = this._toCssSize(this.height);

        if (width) this.style.width = width;
        else this.style.removeProperty("width");

        if (height) this.style.height = height;
        else this.style.removeProperty("height");
    }

    /**
     * Implements internal _metadataEnabled behavior.
     * @returns {*} Result of _metadataEnabled.
     */
    _metadataEnabled() {
        return ![false, "false", 0, "0", null, undefined].includes(this.metadata);
    }

    /**
     * Implements internal _applyMetadataVisibility behavior.
     * @returns {*} Result of _applyMetadataVisibility.
     */
    _applyMetadataVisibility() {
        const meta = this.ref("meta");
        if (!meta) return;
        meta.style.display = this._metadataEnabled() ? "" : "none";
        if (!this._metadataEnabled()) meta.textContent = "";
    }

    /**
     * Implements internal _readViewRect behavior.
     * @param {*} viewer - Parameter value.
     * @param {*} stage - Parameter value.
     * @param {*} viewerWidth - Parameter value.
     * @param {*} viewerHeight - Parameter value.
     * @param {*} stageWidth - Parameter value.
     * @param {*} stageHeight - Parameter value.
     * @returns {*} Result of _readViewRect.
     */
    _readViewRect(viewer, stage, viewerWidth, viewerHeight, stageWidth, stageHeight) {
        const camera = viewer.camera;
        const width = Math.max(1, Math.min(stageWidth, toNumber(camera?.width, viewerWidth)));
        const height = Math.max(1, Math.min(stageHeight, toNumber(camera?.height, viewerHeight)));

        let x = toNumber(camera?.x, NaN);
        let y = toNumber(camera?.y, NaN);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            const anchorX = toNumber(stage.anchorPoint?.x, stageWidth * 0.5);
            const anchorY = toNumber(stage.anchorPoint?.y, stageHeight * 0.5);
            const stageX = toNumber(stage.position?.x, 0);
            const stageY = toNumber(stage.position?.y, 0);
            x = anchorX - viewerWidth * 0.5 - stageX;
            y = anchorY - viewerHeight * 0.5 - stageY;
        }

        const maxX = Math.max(0, stageWidth - width);
        const maxY = Math.max(0, stageHeight - height);
        return {
            x: clamp(x, 0, maxX),
            y: clamp(y, 0, maxY),
            width,
            height
        };
    }

    /**
     * Implements internal _isIgnoredTarget behavior.
     * @param {*} target - Parameter value.
     * @param {*} stage - Parameter value.
     * @returns {*} Result of _isIgnoredTarget.
     */
    _isIgnoredTarget(target, stage) {
        if (!target || target === stage || target === this || target === this._viewerEl || target === this._stageEl)
            return true;
        if (target.nodeType !== 1) {
            const hasPosition =
                typeof target.getStagePosition === "function" ||
                (!!target.position &&
                    Number.isFinite(Number(target.position.x)) &&
                    Number.isFinite(Number(target.position.y))) ||
                (Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y)));
            return !hasPosition;
        }
        if (target.hasAttribute?.("no-preview")) return true;
        if (target.classList?.contains("anchor")) return true;

        const tagName = target.tagName?.toLowerCase?.() || "";
        if (["style", "script", "slot", "animation-minimap", "animation-preview"].includes(tagName)) return true;
        const id = (target.id || "").toLowerCase();
        if (INTERNAL_IDS.has(id)) return true;
        return false;
    }

    /**
     * Implements internal _renderPreview behavior.
     * @returns {*} Result of _renderPreview.
     */
    _renderPreview() {
        const viewer = this._viewerEl;
        const stage = this._stageEl;
        const map = this.ref("map");
        if (!map) return;
        const padding = Math.max(0, toNumber(this.padding, 8));
        if (!viewer || !stage) {
            const stageBox = this.ref("stage-box");
            const viewportBox = this.ref("viewport-box");
            const anchorPoint = this.ref("anchor-point");
            const label = this.ref("label");
            if (stageBox) {
                const inset = Math.round(padding * 2);
                stageBox.style.width = `calc(100% - ${inset}px)`;
                stageBox.style.height = `calc(100% - ${inset}px)`;
            }
            if (label) {
                label.style.paddingLeft = `${Math.round(padding)}px`;
            }
            if (viewportBox) {
                viewportBox.style.left = "0";
                viewportBox.style.top = "0";
                viewportBox.style.width = "0";
                viewportBox.style.height = "0";
            }
            if (anchorPoint) {
                anchorPoint.style.display = "none";
            }
            const meta = this.ref("meta");
            if (meta && this._metadataEnabled()) {
                meta.textContent = `viewer: ${viewer ? "ok" : "missing"}\nstage: ${stage ? "ok" : "missing"}\n`;
            } else if (meta) {
                meta.textContent = "";
            }
            return;
        }

        const viewerWidth = Math.max(1, toNumber(viewer.width, viewer.getBoundingClientRect().width));
        const viewerHeight = Math.max(1, toNumber(viewer.height, viewer.getBoundingClientRect().height));
        const stageWidth = Math.max(1, toNumber(stage.width, stage.getBoundingClientRect().width));
        const stageHeight = Math.max(1, toNumber(stage.height, stage.getBoundingClientRect().height));

        const mapWidth = Math.max(1, map.clientWidth || this.clientWidth || 240);
        const mapHeight = Math.max(1, map.clientHeight || Math.round(mapWidth * (viewerHeight / viewerWidth)));
        const usableWidth = Math.max(1, mapWidth - padding * 2);
        const usableHeight = Math.max(1, mapHeight - padding * 2);
        const scale = Math.min(usableWidth / stageWidth, usableHeight / stageHeight);

        const stageBoxWidth = Math.max(1, stageWidth * scale);
        const stageBoxHeight = Math.max(1, stageHeight * scale);
        const stageInsetLeft = Math.max(0, (mapWidth - stageBoxWidth) * 0.5);

        const stageBox = this.ref("stage-box");
        stageBox.style.width = `${stageBoxWidth}px`;
        stageBox.style.height = `${stageBoxHeight}px`;
        const label = this.ref("label");
        if (label) {
            label.style.paddingLeft = `${Math.round(stageInsetLeft)}px`;
        }

        const viewRect = this._readViewRect(viewer, stage, viewerWidth, viewerHeight, stageWidth, stageHeight);

        const viewportBox = this.ref("viewport-box");
        viewportBox.style.left = `${viewRect.x * scale}px`;
        viewportBox.style.top = `${viewRect.y * scale}px`;
        viewportBox.style.width = `${Math.max(2, Math.min(stageBoxWidth, viewRect.width * scale))}px`;
        viewportBox.style.height = `${Math.max(2, Math.min(stageBoxHeight, viewRect.height * scale))}px`;

        const anchorX = clamp(toNumber(stage.anchorPoint?.x, stageWidth * 0.5), 0, stageWidth);
        const anchorY = clamp(toNumber(stage.anchorPoint?.y, stageHeight * 0.5), 0, stageHeight);
        const anchorPoint = this.ref("anchor-point");
        if (anchorPoint) {
            anchorPoint.style.display = "";
            anchorPoint.style.left = `${anchorX * scale}px`;
            anchorPoint.style.top = `${anchorY * scale}px`;
        }

        const dotsLayer = this.ref("dots");
        dotsLayer.innerHTML = "";
        const targets = this._collectTargets(stage);
        const sceneRoot = this._stageSceneEl || this._getStageSceneRoot(stage);
        for (const target of targets) {
            const world = this._getWorldPosition(target, sceneRoot);
            if (!world) continue;
            const dot = document.createElement("div");
            dot.className = "dot";
            dot.style.left = `${clamp(world.x, 0, stageWidth) * scale}px`;
            dot.style.top = `${clamp(world.y, 0, stageHeight) * scale}px`;
            dotsLayer.appendChild(dot);
        }

        const meta = this.ref("meta");
        if (meta && this._metadataEnabled()) {
            meta.textContent =
                `viewer: ${Math.round(viewerWidth)}x${Math.round(viewerHeight)}\n` +
                `stage: ${Math.round(stageWidth)}x${Math.round(stageHeight)}\n` +
                `targets: ${targets.length}`;
        } else if (meta) {
            meta.textContent = "";
        }
    }

    /**
     * Implements internal _collectTargets behavior.
     * @param {*} stage - Parameter value.
     * @returns {*} Result of _collectTargets.
     */
    _collectTargets(stage) {
        const seen = new Set();
        const result = [];
        const add = (target) => {
            if (!target || seen.has(target)) return;
            if (this._isIgnoredTarget(target, stage)) return;
            seen.add(target);
            result.push(target);
        };

        if (stage.animatorChildren instanceof Set) {
            stage.animatorChildren.forEach(add);
        }

        stage.querySelectorAll("*").forEach(add);
        const worldRoot = stage.ref?.("world") || stage.shadowRoot?.getElementById?.("world");
        if (worldRoot) worldRoot.querySelectorAll("*").forEach(add);
        const parallaxRoot = stage.ref?.("parallax") || stage.shadowRoot?.getElementById?.("parallax");
        if (parallaxRoot) parallaxRoot.querySelectorAll("*").forEach(add);
        return result;
    }

    /**
     * Implements internal _getWorldPosition behavior.
     * @param {*} target - Parameter value.
     * @param {*} stageSceneRoot - Parameter value.
     * @returns {*} Result of _getWorldPosition.
     */
    _getWorldPosition(target, stageSceneRoot) {
        if (!target) return null;

        if (typeof target.getStagePosition === "function") {
            const pos = target.getStagePosition();
            if (Number.isFinite(pos?.x) && Number.isFinite(pos?.y)) return pos;
        }

        if (target.position) {
            const x = toNumber(target.position.x, NaN);
            const y = toNumber(target.position.y, NaN);
            if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
        }

        const x = toNumber(target.x, NaN);
        const y = toNumber(target.y, NaN);
        if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };

        if (target.getBoundingClientRect && stageSceneRoot?.getBoundingClientRect) {
            const rect = target.getBoundingClientRect();
            const stageRect = stageSceneRoot.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return null;
            if (stageRect.width === 0 || stageRect.height === 0) return null;
            const cx = rect.left - stageRect.left + rect.width * 0.5;
            const cy = rect.top - stageRect.top + rect.height * 0.5;
            if (Number.isFinite(cx) && Number.isFinite(cy)) {
                return { x: cx, y: cy };
            }
        }

        return null;
    }
}

if (!customElements.get(AnimationMinimap.tag)) {
    customElements.define(AnimationMinimap.tag, AnimationMinimap);
}

/**
 * Represents the AnimationPreview animation module class.
 */
class AnimationPreview extends AnimationMinimap {
    static tag = "animation-preview";
}

if (!customElements.get(AnimationPreview.tag)) {
    customElements.define(AnimationPreview.tag, AnimationPreview);
}

export default AnimationMinimap;
export { AnimationMinimap, AnimationPreview };
