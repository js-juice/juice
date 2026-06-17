import { parsePosition, parsePositionFromLocation, toAnchorCSSPosition } from "../anchor.mjs";

class AnimationComponentUtil {
    static domReady() {
        if (document.readyState !== "loading") return Promise.resolve();
        return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }

    static elementDefined(tag) {
        if (!globalThis.customElements?.whenDefined) return Promise.resolve();
        return customElements.whenDefined(tag);
    }

    static waitForStageConnect(viewer) {
        if (viewer?.stage && viewer.stage?.animation) return Promise.resolve();
        return new Promise((resolve) => {
            viewer.addEventListener("stageconnect", resolve, { once: true });
        });
    }

    static waitForParticleViewer(worldElement) {
        if (worldElement?.getViewer?.()) return Promise.resolve(worldElement.getViewer());
        return new Promise((resolve) => {
            worldElement.addEventListener("viewer-ready", (event) => resolve(event.detail.viewer), { once: true });
        });
    }

    static getElementSize(el) {
        const { width, height } = el.getBoundingClientRect();
        return { width, height };
    }

    static hasUnits(value) {
        const match = value.match(/(\d+)(px|%|deg|em|vw|vh)/);
        return match && match[2];
    }

    static fitContent(container, element, options = {}) {
        const fit = { x: 0, y: 0, height: null, width: null };

        const { width: containerWidth, height: containerHeight } =
            container instanceof HTMLElement ? this.getElementSize(container) : container;
        const { width: elementWidth, height: elementHeight } =
            element instanceof HTMLElement ? this.getElementSize(element) : element;

        const containerAspect = containerWidth / containerHeight;
        const elementAspect = elementWidth / elementHeight;

        let maxWidth = containerWidth;
        let maxHeight = containerHeight;

        if (options.maxWidth) {
            maxWidth = this.hasUnits(options.maxWidth)
                ? this.toPixels(options.maxWidth, { axisSize: containerWidth })
                : options.maxWidth;
        }

        if (options.maxHeight) {
            maxHeight = this.hasUnits(options.maxHeight)
                ? this.toPixels(options.maxHeight, { axisSize: containerHeight })
                : options.maxHeight;
        }

        if (elementAspect > containerAspect) {
            fit.width = maxWidth;
            fit.height = fit.width / elementAspect;
        } else {
            fit.height = maxHeight;
            fit.width = fit.height * elementAspect;
        }

        if (options.align) {
            fit.x = options.align === "center" ? (containerWidth - fit.width) / 2 : 0;
            fit.y = options.align === "center" ? (containerHeight - fit.height) / 2 : 0;
        }

        return fit;
    }

    static toPixels(value, options = {}) {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value === "string" && value.includes(" ")) value = value.split(/[,\s]/);
        if (Array.isArray(value)) return value.map((item) => this.toPixels(item, options));

        const text = String(value).trim();
        if (!text.length) return null;

        const numeric = Number(text);
        if (Number.isFinite(numeric)) return numeric;

        if (text.endsWith("%")) {
            const fraction = parsePositionFromLocation(text);
            const axisSize = Number(options.axisSize);
            return Number.isFinite(fraction) && axisSize > 0 ? fraction * axisSize : null;
        }

        if (text.endsWith("px")) {
            const pixels = parseFloat(text);
            return Number.isFinite(pixels) ? pixels : null;
        }

        if (text.endsWith("vw")) {
            const value = parseFloat(text);
            return Number.isFinite(value) && typeof window !== "undefined" ? (window.innerWidth * value) / 100 : null;
        }

        if (text.endsWith("vh")) {
            const value = parseFloat(text);
            return Number.isFinite(value) && typeof window !== "undefined" ? (window.innerHeight * value) / 100 : null;
        }

        if (!options.context?.appendChild || typeof document === "undefined") return null;

        const probe = document.createElement("div");
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.style.pointerEvents = "none";
        probe.style[options.axis === "y" ? "height" : "width"] = text;
        options.context.appendChild(probe);
        const rect = probe.getBoundingClientRect();
        probe.remove();

        const pixels = options.axis === "y" ? rect.height : rect.width;
        return Number.isFinite(pixels) && pixels > 0 ? pixels : null;
    }

    static setDimentions(component) {
        const width = component.width || component.ref("body").getBoundingClientRect().width;
        const height = component.height || component.ref("body").getBoundingClientRect().height;
        const widthValue = typeof width === "number" ? `${width}px` : width;
        const heightValue = typeof height === "number" ? `${height}px` : height;
        component.width = width;
        component.height = height;
        component.setStyleVars(
            {
                "--width": widthValue,
                "--height": heightValue
            },
            component.ref("html")
        );
    }

    static setAnchor(component) {
        if (!component.anchor) component.anchor = { x: 0.5, y: 0.5 };
        if (component.hasAttribute("anchor")) {
            const { x: anchorX, y: anchorY } = parsePosition(component.getAttribute("anchor"));
            component.anchor = { x: anchorX, y: anchorY };
        } else if (typeof component.anchor == "string") {
            const { x: anchorX, y: anchorY } = parsePosition(component.anchor);
            component.anchor = { x: anchorX, y: anchorY };
        }

        const anchorVars = {
            "--anchor-x": toAnchorCSSPosition(component.anchor.x),
            "--anchor-y": toAnchorCSSPosition(component.anchor.y)
        };
        component.writeStyleVars(anchorVars, component.ref("anchor"));
        if ((component.debug || component.hasAttribute?.("debug")) && component.ref("anchor")?.setDebugValue) {
            component.ref("anchor").setDebugValue("--anchor-x", anchorVars["--anchor-x"]);
            component.ref("anchor").setDebugValue("--anchor-y", anchorVars["--anchor-y"]);
        }
        //component.style.setProperty("--anchor-x", anchorVars["--anchor-x"]);
        //component.style.setProperty("--anchor-y", anchorVars["--anchor-y"]);
        if (typeof component._refreshPlacement === "function") {
            component._refreshPlacement();
        }
        this.setDebug(component);
    }

    static setDebug(component) {
        const anchor = component.ref?.("anchor");
        if (!anchor) return;
        if (component.debug || component.hasAttribute?.("debug")) {
            anchor.setAttribute("debug", "");
        } else {
            anchor.removeAttribute("debug");
        }
    }

    static setOrigin(component) {
        if (component.hasAttribute("origin")) {
            const { x: originX, y: originY } = parsePosition(component.getAttribute("origin"));
            component.origin = { x: originX, y: originY };
        } else if (typeof component.origin == "string") {
            const { x: originX, y: originY } = parsePosition(component.origin);
            component.origin = { x: originX, y: originY };
        } else {
            component.origin = { x: 0.5, y: 0.5 };
        }

        const originVars = {
            "--origin-x": toAnchorCSSPosition(component.origin.x),
            "--origin-y": toAnchorCSSPosition(component.origin.y)
        };
        component.writeStyleVars(originVars, component.ref("anchor"));
        // component.style.setProperty("--origin-x", originVars["--origin-x"]);
        // component.style.setProperty("--origin-y", originVars["--origin-y"]);
        if (typeof component._refreshPlacement === "function") {
            component._refreshPlacement();
        }
    }

    static initialize(component) {
        this.setAnchor(component);
        this.setOrigin(component);
        this.setDebug(component);

        if (component.hasAttribute("noanimate")) {
            component.animate = false;
        }
    }
}

export default AnimationComponentUtil;
