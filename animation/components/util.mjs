import { parsePosition } from "../anchor.mjs";

class AnimationComponentUtil {
    static setDimentions(component) {
        const width = component.width || component.ref("body").getBoundingClientRect().width;
        const height = component.height || component.ref("body").getBoundingClientRect().height;
        component.width = width;
        component.height = height;
        component.ref("html").style.setProperty("--width", width);
        component.ref("html").style.setProperty("--height", height);
    }

    static setAnchor(component) {
        if (component.hasAttribute("anchor")) {
            const { x: anchorX, y: anchorY } = parsePosition(component.getAttribute("anchor"));
            component.anchor = { x: anchorX, y: anchorY };
        } else if (typeof component.anchor == "string") {
            const { x: anchorX, y: anchorY } = parsePosition(component.anchor);
            component.anchor = { x: anchorX, y: anchorY };
        }

        component.ref("html").style.setProperty("--anchor-x", component.anchor.x);
        component.ref("html").style.setProperty("--anchor-y", component.anchor.y);
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

        component.ref("html").style.setProperty("--origin-x", component.origin.x);
        component.ref("html").style.setProperty("--origin-y", component.origin.y);
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
