/**
 * Animation layer component for layered rendering with camera support.
 * Custom element that provides a canvas or DOM-based rendering layer.
 * @module Components/Animation/Layer
 */

import Component from "../../ui/component.mjs";
import Timeline from "../timeline.mjs";
import { Vector3D, Vector2D } from "../properties/Vector.mjs";
import AnimationStage from "./stage.mjs";
import AnimationSprite from "./sprite.mjs";
import Camera from "./camera.mjs";
import "./canvas/animation-canvas.mjs";

/**
 * Layer for rendering animated content with camera and stage management.
 * @class AnimationLayer
 * @extends Component.HTMLElement
 */
export class AnimationLayer extends Component.HTMLElement {
    static tag = "animation-layer";

    static config = {
        name: "animation-layer",
        tag: "animation-layer",
        properties: {
            width: { default: 100, type: "number", unit: "percent" },
            height: { default: 100, type: "number", unit: "percent" },
            type: { default: "canvas", type: "string" },
            debug: { default: false, type: "exists", linked: true },
        },
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["width", "height", "debug"],
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
                    width: "100%",
                    height: "100%",
                },
            },
        ];
    }

    /**
     * Executes html.
     * @returns {*} Result of html.
     */
    static html() {
        return `<slot></slot>`;
    }

    viewer;

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        this.viewer = this.parentNode;
        this.type = "dom";
        if (this.hasAttribute("type")) {
            this.type = this.getAttribute("type");
        }
        switch (this.type) {
            case "canvas": {
                this.canvas = document.createElement("animation-canvas");
                break;
            }
            case "dom": {
                this.viewer = this;
                break;
            }
        }
        this.setup();
    }

    /**
     * Handles children events.
     * @param {*} children - Parameter value.
     * @returns {*} Result of onChildren.
     */
    onChildren(children) {
        children.forEach((child) => {
            if (child.animate) {
                this.viewer.addAnimation(child);
            }
        });
    }

    /**
     * Sets up values.
     * @returns {*} Result of setup.
     */
    setup() {}

    /**
     * Updates internal state from incoming values.
     * @param {*} time - Parameter value.
     * @returns {*} Result of update.
     */
    update(time) {}

    /**
     * Renders output from current module state.
     * @param {*} time - Parameter value.
     * @returns {*} Result of render.
     */
    render(time) {}
}

customElements.define(AnimationLayer.tag, AnimationLayer);
export default AnimationLayer;
