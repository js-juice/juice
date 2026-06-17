/**
 * Scroll components module.
 * Contains both ScrollBar and ScrollView to keep scrolling behavior in one place.
 */

import Component from "../component.mjs";
import Observe from "../../core/Dom/Observe/Observe.mjs";
import { fixedClamp } from "../../core/Util/Math.mjs";
import AnimationValue from "../../animation/properties/Value.mjs";

class TrackedView extends Component.HTMLElement {
    static tag = "tracked-view";

    static config = {
        name: "tracked-view",
        properties: {
            top: { type: "int", default: 0, linked: true },
            left: { type: "int", default: 0, linked: true },
            width: { type: "int", default: 0, linked: true },
            height: { type: "int", default: 0, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["top", "left", "width", "height"]
        };
    }

    constructor() {
        super();
        this.updateBounds = this.updateBounds.bind(this);
        this._scheduleUpdate = this._scheduleUpdate.bind(this);
        this._wasInView = false;
        this._raf = 0;
    }

    updateBounds() {
        const rect = this.getBoundingClientRect();
        const scrollView = this.closest("scroll-view");
        const viewport = scrollView
            ? scrollView.getBoundingClientRect()
            : {
                  top: 0,
                  left: 0,
                  right: window.innerWidth,
                  bottom: window.innerHeight,
                  width: window.innerWidth,
                  height: window.innerHeight
              };

        this.top = rect.top;
        this.left = rect.left;
        this.width = rect.width;
        this.height = rect.height;

        const visibleTop = Math.max(rect.top, viewport.top);
        const visibleBottom = Math.min(rect.bottom, viewport.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const inView = visibleHeight > 0 && rect.bottom > viewport.top && rect.top < viewport.bottom;
        const travel = Math.max(1, viewport.height + rect.height);
        const progress = fixedClamp(0, 100)(((viewport.bottom - rect.top) / travel) * 100);
        const visiblePercent = rect.height > 0 ? fixedClamp(0, 100)((visibleHeight / rect.height) * 100) : 0;
        const detail = {
            percent: progress,
            progress,
            visiblePercent,
            visibleRatio: visiblePercent / 100,
            inView,
            rect,
            viewport
        };

        this.ref("html").style.setProperty("--view-progress", progress);

        if (inView && !this._wasInView) {
            this.dispatchEvent(new CustomEvent("enter", { detail, bubbles: true }));
        }

        if (inView) {
            this.dispatchEvent(new CustomEvent("progress", { detail, bubbles: true }));
        }

        if (!inView && this._wasInView) {
            this.dispatchEvent(new CustomEvent("leave", { detail, bubbles: true }));
        }

        this._wasInView = inView;
    }

    _scheduleUpdate() {
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this.updateBounds();
        });
    }

    onFirstConnect() {
        this.scrollView = this.closest("scroll-view");
        const source = this.scrollView || window;
        source.addEventListener("scroll-y", this._scheduleUpdate);
        source.addEventListener("scroll-x", this._scheduleUpdate);
        window.addEventListener("resize", this._scheduleUpdate);
        Observe.resize(this).change(this._scheduleUpdate);

        this._scheduleUpdate();
    }

    onDisconnect() {
        const source = this.scrollView || window;
        source.removeEventListener("scroll-y", this._scheduleUpdate);
        source.removeEventListener("scroll-x", this._scheduleUpdate);
        window.removeEventListener("resize", this._scheduleUpdate);
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = 0;
    }
}

class ScrollBar extends Component.HTMLElement {
    static tag = "scroll-bar";

    static config = {
        name: "scroll-bar",
        properties: {
            axis: { type: "string", default: "y", linked: true },
            hidden: { type: "exists", default: true, linked: true },
            width: { type: "int", default: 0, linked: true },
            height: { type: "int", default: 0, linked: true },
            color: { type: "string", default: "#000000", linked: true },
            bgcolor: { type: "string", default: "#ffffff", linked: true },
            align: { type: "string", default: "right", linked: true },
            value: { type: "number", default: 0, linked: true }
        }
    };

    offset = 0;
    scrollSpeed = 0.025;
    visible;

    scroll = {
        current: {
            percent: 0,
            value: 0
        },
        target: {
            percent: 0,
            value: 0
        }
    };

    constructor() {
        super();
        this.onHandleMove = this.onHandleMove.bind(this);
        this.onHandleDown = this.onHandleDown.bind(this);
        this.onHandleUp = this.onHandleUp.bind(this);
    }

    static get observed() {
        return {
            all: ["color", "bgcolor", "axis", "align", "width", "height", "hidden"]
        };
    }

    static html() {
        return `
            <div id="bar" part="bar">
                <div id="handle" part="handle" ></div>
            </div>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    position: "absolute",
                    display: "block",
                    zIndex: 10,
                    overflow: "hidden"
                },
                ":host([hidden])": {
                    display: "none"
                },
                ':host([axis="x"])': {
                    width: "100%",
                    position: "absolute",
                    height: "20px"
                },
                ':host([axis="y"])': {
                    height: "100%",
                    position: "absolute",
                    width: "20px"
                },

                ':host([align="right"])': {
                    top: 0,
                    right: 0
                },
                ':host([align="left"])': {
                    top: 0,
                    left: 0
                },
                ':host([align="top"])': {
                    top: 0,
                    left: 0
                },
                ':host([align="bottom"])': {
                    bottom: 0,
                    left: 0
                },
                "#html": {
                    position: "absolute",
                    display: "block",
                    width: "100%",
                    height: "100%"
                },
                "#handle": {
                    position: "absolute",
                    display: "block",
                    width: "25px",
                    height: "25px",
                    overflow: "hidden",
                    backgroundColor: "#666",
                    cursor: "grab"
                },
                "#bar": {
                    position: "relative",
                    display: "block",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    background: "var(--bgcolor, #FFFFFF)"
                },
                ':host([axis="y"]) #handle': {
                    width: "100%"
                },
                ':host([axis="x"]) #handle': {
                    height: "100%"
                }
            }
        ];
    }

    onFirstConnect() {
        this.content = this.resolveContent();

        if (!this.content) {
            return;
        }

        Observe.resize(this.content, this.onContentResize.bind(this));

        this.handle = this.ref("handle");
        this.bar = this.ref("bar");
        window.addEventListener("wheel", this.onWheel.bind(this), { passive: true });
        this.handle.addEventListener("pointerdown", this.onHandleDown, false);
        Observe.resize(this, this.onResize.bind(this));

        const syncSize = () => {
            const { width, height } = this.getBoundingClientRect();
            this.onResize(width, height);

            const { width: contentWidth, height: contentHeight } = this.content.getBoundingClientRect();
            this.onContentResize(contentWidth, contentHeight);
        };

        syncSize();
        requestAnimationFrame(syncSize);
    }

    resolveContent() {
        const contentSelector = this.getAttribute("content");
        const root = this.getRootNode();
        const hostView = this.closest("scroll-view");
        const from = (scope, selector) =>
            scope && typeof scope.querySelector === "function" ? scope.querySelector(selector) : null;

        if (hostView && typeof hostView.ref === "function") {
            const content = hostView.ref("content");
            if (content) return content;
        }

        if (contentSelector) {
            return (
                from(root, contentSelector) ||
                from(this.parentElement, contentSelector) ||
                document.querySelector(contentSelector)
            );
        }

        return from(root, "#content") || from(this.parentElement, "#content") || document.body;
    }

    refreshMeasurements() {
        if (!this.content) return;

        const { width, height } = this.getBoundingClientRect();
        this.onResize(width, height);

        const rect = this.content.getBoundingClientRect();
        const contentWidth = Math.max(rect.width, this.content.scrollWidth || 0);
        const contentHeight = Math.max(rect.height, this.content.scrollHeight || 0);
        this.onContentResize(contentWidth, contentHeight);
    }

    onWheel(event) {
        this.refreshMeasurements();
        const maxContentOffset = Math.max(0, this.maxContentOffset || 0);
        if (maxContentOffset <= 0) return;

        const delta =
            this.axis === "x"
                ? event.deltaX || event.wheelDeltaX || 0
                : event.deltaY || event.detail || event.wheelDelta || 0;
        if (!delta) return;

        const pixels = delta * this.scrollSpeed * 60;
        this.scroll.target.value = Math.max(0, Math.min(maxContentOffset, this.scroll.target.value + pixels));
        this.scroll.target.percent = this.scroll.target.value / maxContentOffset;
        if (!this.scrolling) this.smoothScroll();
    }

    onHandleDown(e) {
        this.refreshMeasurements();
        const clientProp = this.axis === "x" ? "clientX" : "clientY";
        const startOffset =
            this.axis === "x" ? parseFloat(this.handle.style.left) || 0 : parseFloat(this.handle.style.top) || 0;

        this.grabbed = {
            clientProp,
            startClient: e[clientProp],
            startOffset
        };

        this.handle.setPointerCapture(e.pointerId);
        window.addEventListener("pointermove", this.onHandleMove);
        window.addEventListener("pointerup", this.onHandleUp);
    }

    onHandleMove(e) {
        const { grabbed } = this;
        if (!grabbed) return;

        const currentClient = e[grabbed.clientProp];
        const difference = currentClient - grabbed.startClient;
        const draggedOffset = grabbed.startOffset + difference;
        const maxOffset = Math.max(0, this.maxOffset || 0);
        const maxContentOffset = Math.max(0, this.maxContentOffset || 0);
        const clampToRange = this.clamp || fixedClamp(0, maxOffset);

        this.scroll.target.percent = maxOffset > 0 ? clampToRange(draggedOffset) / maxOffset : 0;
        this.scroll.target.value = this.scroll.target.percent * maxContentOffset;
        if (!this.scrolling) this.smoothScroll();
    }

    onHandleUp(event) {
        if (this.handle.hasPointerCapture(event.pointerId)) {
            this.handle.releasePointerCapture(event.pointerId);
        }
        this.grabbed = null;
        window.removeEventListener("pointermove", this.onHandleMove);
        window.removeEventListener("pointerup", this.onHandleUp);
    }

    smoothScroll() {
        if (this.scrolling) return;
        this.scrolling = true;

        const scrollAnimation = () => {
            const { current, target } = this.scroll;
            const maxContentOffset = Math.max(0, this.maxContentOffset || 0);
            const maxOffset = Math.max(0, this.maxOffset || 0);
            const ease = Math.min(0.22, Math.max(0.1, this.scrollSpeed * 6));

            target.value = Math.max(0, Math.min(maxContentOffset, target.value || 0));
            const delta = target.value - (current.value || 0);

            if (Math.abs(delta) <= 0.25) {
                current.value = target.value;
            } else {
                current.value = current.value + delta * ease;
            }

            current.percent = maxContentOffset > 0 ? current.value / maxContentOffset : 0;
            target.percent = maxContentOffset > 0 ? target.value / maxContentOffset : 0;

            if (this.axis === "x") {
                this.content.style.transform = `translate3d(-${current.value}px, 0, 0)`;
            } else {
                this.content.style.transform = `translate3d(0, -${current.value}px, 0)`;
            }

            this.offset = current.percent * maxOffset;
            if (this.axis === "x") {
                this.handle.style.left = `${this.offset}px`;
            } else {
                this.handle.style.top = `${this.offset}px`;
            }

            if (this.hooks.length > 0) {
                for (let i = 0; i < this.hooks.length; i++) {
                    this.hooks[i](current);
                }
            }

            if (Math.abs(target.value - current.value) > 0.25) {
                requestAnimationFrame(scrollAnimation);
            } else {
                this.scrolling = false;
            }
        };

        requestAnimationFrame(scrollAnimation);
    }

    resizeHandle() {
        if (this.axis == "x") {
            this.handleSize = this.width * this.scale;
            this.styles.update("#handle", {
                width: this.handleSize + "px",
                height: "100%"
            });
            this.maxOffset = Math.max(0, this.width - this.handleSize);
        } else {
            this.handleSize = this.height * this.scale;
            this.styles.update("#handle", {
                width: "100%",
                height: this.handleSize + "px"
            });
            this.maxOffset = Math.max(0, this.height - this.handleSize);
        }
        this.clamp = fixedClamp(0, this.maxOffset);
    }

    onResize(w, h) {
        this.width = w;
        this.height = h;
        if (this.contentHeight) {
            if (this.axis == "x") {
                this.scale = this.width / this.contentWidth;
                this.ratio = 1 / this.scale;
            } else {
                this.scale = this.height / this.contentHeight;
                this.ratio = 1 / this.scale;
            }
            this.resizeHandle();
        }
    }

    onContentResize(w, h) {
        this.contentWidth = w;
        this.contentHeight = h;
        this.maxContentOffset =
            this.axis == "x"
                ? Math.max(0, this.contentWidth - this.width)
                : Math.max(0, this.contentHeight - this.height);

        if (this.height) {
            if (this.axis == "x") {
                this.scale = this.width / this.contentWidth;
                this.ratio = 1 / this.scale;
            } else {
                this.scale = this.height / this.contentHeight;
                this.ratio = 1 / this.scale;
            }
            this.resizeHandle();
        }
    }

    hooks = [];
    hook(fn) {
        this.hooks.push(fn);
    }

    show() {
        this.visible = true;
        this.hidden = false;
        this.removeAttribute("hidden");
        this.refreshMeasurements();
        this.dispatchEvent(new Event("show"));
    }

    hide() {
        this.visible = false;
        this.hidden = true;
        this.setAttribute("hidden", "");
        this.dispatchEvent(new Event("hide"));
    }

    build() {}

    onPropertyChanged(prop, previous, value) {
        switch (prop) {
            case "color":
            case "bgcolor":
            case "axis":
            case "align":
                break;
            case "hidden":
                if (value) {
                }
                break;
        }
    }
}

class ScrollView extends Component.HTMLElement {
    static tag = "scroll-view";

    static config = {
        name: "scroll-view",
        properties: {
            x: { type: "int", default: 0, linked: true },
            y: { type: "int", default: 0, linked: true },
            width: { type: "int", default: 0, linked: true },
            height: { type: "int", default: 0, linked: true },
            color: { type: "string", default: "#000000", linked: true },
            bgcolor: { type: "string", default: "#ffffff", linked: true },
            content: { type: "selector", default: "body > *", linked: true },
            lock: { type: "string", default: "" }
        }
    };

    static get observed() {
        return {
            all: ["color", "bgcolor", "x", "y", "width", "height"]
        };
    }

    static html() {
        return `
            <div id="content" part="content">
                <slot></slot>
            </div>
            <scroll-bar id="scroll-x" part="scroll-x" axis="x" align="bottom" value="0" content="#content" hidden></scroll-bar>
            <scroll-bar id="scroll-y" part="scroll-y" axis="y" align="right" value="0" content="#content" hidden></scroll-bar>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    position: "absolute",
                    display: "block",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden"
                },
                "#html": {
                    position: "absolute",
                    display: "block",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    zIndex: 1
                },
                "#content": {
                    position: "relative",
                    display: "block",
                    width: "calc(100% - 20px)",
                    height: "auto",
                    zIndex: 1
                },
                slot: {
                    position: "relative",
                    display: "block",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "auto",
                    zIndex: 1
                },
                "#bg": {
                    position: "absolute",
                    display: "block",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%"
                }
            }
        ];
    }

    target = {};

    constructor() {
        super();
        this.xValue = new AnimationValue(0);
        this.yValue = new AnimationValue(0);
    }

    stateData = {
        contentY: 0,
        contentX: 0,
        content: {},
        x: {
            axis: "x",
            size: 25,
            position: 0,
            max: 0,
            visible: false,
            rect: {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            }
        },
        y: {
            axis: "y",
            size: 25,
            position: 0,
            max: 0,
            visible: false,
            rect: {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            }
        },
        scrolling: false
    };

    activeAxis = [];

    activateAxis(axis) {
        console.log("Activating axis:", axis);
        if (this.activeAxis.includes(axis)) return;
        const bar = this.ref("scroll-" + axis);
        bar.show();
        this.activeAxis.push(axis);
    }

    deactivateAxis(axis) {
        if (!this.activeAxis.includes(axis)) return;
        const bar = this.ref("scroll-" + axis);
        bar.hide();
        this.activeAxis.splice(this.activeAxis.indexOf(axis), 1);
    }

    onFirstConnect() {
        this.content = this.ref("content");
        this.scrollX = this.ref("scroll-x");
        this.scrollY = this.ref("scroll-y");

        this.scrollX.hook(({ value, percent }) => {
            this.xValue.value = value;
            this.dispatchEvent(new CustomEvent("scroll-x", { detail: { value, percent } }));
            this.ref("html").style.setProperty("--scroll-x-progress", percent);
        });

        this.scrollY.hook(({ value, percent }) => {
            this.yValue.value = value;
            this.dispatchEvent(new CustomEvent("scroll-y", { detail: { value, percent } }));
            this.ref("html").style.setProperty("--scroll-y-progress", percent);
        });

        if (this.hasAttribute("lock")) {
            this.lock = this.getAttribute("lock");
            if (["x", "y"].includes(this.lock)) {
                this.deactivateAxis(this.lock);
            }
        }

        const syncViewportSize = () => {
            const { width, height } = this.getBoundingClientRect();
            this.width = width;
            this.height = height;
            this.updateActiveScrollbars();
        };

        syncViewportSize();
        requestAnimationFrame(syncViewportSize);

        Observe.resize(this).change((w, h) => {
            this.width = w;
            this.height = h;
            this.updateActiveScrollbars();
        });

        const { width: contentWidth, height: contentHeight } = this.content.getBoundingClientRect();
        this.contentSize = { width: contentWidth, height: contentHeight };

        this.updateActiveScrollbars();

        Observe.resize(this.content).change((w, h) => {
            this.contentSize = { width: w, height: h };
            this.content.setAttribute("width", w);
            this.content.setAttribute("height", h);
            this.updateActiveScrollbars();
        });
    }

    onPropertyChanged(prop, previous, value) {
        switch (prop) {
            case "x":
            case "y":
            case "width":
            case "height":
                break;
            case "barwidth":
                this.ref("html").style.setProperty("--scrollbar-width", value + "px");
                break;
        }
    }

    updateActiveScrollbars() {
        if (!this.content) return;
        if (!(this.width > 0 && this.height > 0)) return;

        const { x: xState, y: yState } = this.stateData;
        const contentWidth = Math.max(this.content.scrollWidth || 0, this.contentSize?.width || 0);
        const contentHeight = Math.max(this.content.scrollHeight || 0, this.contentSize?.height || 0);
        const viewportWidth = this.width || this.clientWidth || 0;
        const viewportHeight = this.height || this.clientHeight || 0;
        const overflowX = contentWidth - viewportWidth > 2;
        const overflowY = contentHeight - viewportHeight > 2;

        yState.scale = contentHeight > 0 ? this.height / contentHeight : 1;
        xState.scale = contentWidth > 0 ? this.width / contentWidth : 1;

        if (overflowY && this.lock !== "y") {
            this.activateAxis("y");
            yState.visible = true;
        } else {
            this.deactivateAxis("y");
            yState.visible = false;
        }

        if (overflowX && this.lock !== "x") {
            this.activateAxis("x");
            xState.visible = true;
        } else {
            this.deactivateAxis("x");
            xState.visible = false;
        }
    }

    onResize(w, h) {
        this.width = w;
        this.height = h;
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get("tracked-view")) {
        customElements.define("tracked-view", TrackedView);
    }
    if (!customElements.get("scroll-bar")) {
        customElements.define("scroll-bar", ScrollBar);
    }
    if (!customElements.get("scroll-view")) {
        customElements.define("scroll-view", ScrollView);
    }
}

export { ScrollBar, ScrollView, TrackedView };
export default ScrollView;
