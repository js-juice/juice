import { parsePosition, toAnchorCSSPosition } from "../anchor.mjs";

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

    static setDimentions(component) {
        const width = component.width || component.ref("body").getBoundingClientRect().width;
        const height = component.height || component.ref("body").getBoundingClientRect().height;
        const widthValue = typeof width === "number" ? `${width}px` : width;
        const heightValue = typeof height === "number" ? `${height}px` : height;
        component.width = width;
        component.height = height;
        component.setStyleVars({
            "--width": widthValue,
            "--height": heightValue
        });
        component.style.setProperty("--width", widthValue);
        component.style.setProperty("--height", heightValue);
    }

    static setAnchor(component) {
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
        component.writeStyleVars(anchorVars);
        component.style.setProperty("--anchor-x", anchorVars["--anchor-x"]);
        component.style.setProperty("--anchor-y", anchorVars["--anchor-y"]);
        if (typeof component._refreshPlacement === "function") {
            component._refreshPlacement();
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
        component.writeStyleVars(originVars);
        component.style.setProperty("--origin-x", originVars["--origin-x"]);
        component.style.setProperty("--origin-y", originVars["--origin-y"]);
        if (typeof component._refreshPlacement === "function") {
            component._refreshPlacement();
        }
    }

    static initialize(component) {
        this.setAnchor(component);
        this.setOrigin(component);
    }
}

export default AnimationComponentUtil;
