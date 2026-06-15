/**
 * Animation container component for grouping animated elements.
 * Custom element that acts as a container with 3D transform properties.
 * @module Components/Animation/Container
 */

import { type } from "../../core/Util/Core.mjs";
import Component from "../../ui/component.mjs";
import { Rotation, Vector3D, AnimationValue } from "../properties/Core.mjs";
import { parseAnchor } from "../anchor.mjs";
import { radians } from "../../core/Util/Geometry.mjs";

/**
 * Container for grouping and transforming multiple animation bodies.
 * @class AnimationContainer
 * @extends Component.HTMLElement
 */
class AnimationContainer extends Component.HTMLElement {
    static tag = "animation-container";

    animationComponent = true;
    animated = true;

    static config = {
        name: "animation-container",
        tag: "animation-container",
        template: "minimal",
        vdom: false,
        properties: {
            width: { type: "number", default: 0, unit: "mixed", linked: true },
            height: { type: "int", default: 0, unit: "mixed", linked: true },
            x: { type: "number", default: 0, linked: true },
            y: { type: "number", default: 0, linked: true },
            z: { type: "number", default: 0, linked: true },
            anchor: { type: "string", default: "center", linked: true },
        },
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["width", "height", "x", "y", "z", "anchor"],
            attributes: [],
            properties: [],
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
                    width: "100vw",
                    height: "100vh",
                },
                slot: {
                    display: "block",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                },
            },
        ];
    }

    /**
     * Executes html.
     * @param {*} data - Parameter value.
     * @returns {*} Result of html.
     */
    static html(data = {}) {
        return `<slot></slot>`;
    }

    /**
     * Sets anchor values.
     * @param {*} value - Parameter value.
     * @returns {*} Result of setAnchor.
     */
    setAnchor(value) {
        const parsed = parseAnchor(value);
        this._anchor = parsed;
        this.ref("html").style.setProperty("--anchor-x", `${parsed.x * 100}%`);
        this.ref("html").style.setProperty("--anchor-y", `${parsed.y * 100}%`);
    }

    /**
     * Executes beforeCreate.
     * @returns {*} Result of beforeCreate.
     */
    beforeCreate() {
        this.animationBody = true;
        this.rotation = new Rotation(0);
        this.position = new Vector3D(0, 0, 0);
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
            case "width":
                this.styles.update(":host", { width: value + "px" }, "size");
                break;

            case "height":
                this.styles.update(":host", { height: value + "px" }, "size");
                break;
            case "anchor":
                this.setAnchor(value);
                break;
        }
    }

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of update.
     */
    update() {}

    /**
     * Renders output from current module state.
     * @returns {*} Result of render.
     */
    render() {}

    /**
     * Handles customchildready events.
     * @param {*} child - Parameter value.
     * @returns {*} Result of onCustomChildReady.
     */
    onCustomChildReady(child) {
        /// if (!child) return;
        if (this._timeline) {
            this._timeline.addAnimator(child);
        }
    }
}

customElements.define(AnimationContainer.tag, AnimationContainer);
