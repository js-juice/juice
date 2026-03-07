/**
 * Animation canvas component for rendering animations.
 * Custom element providing canvas-based animation rendering.
 * @module Components/Animation/Canvas/AnimationCanvas
 */

import { type } from "../../../core/Util/Core.mjs";
import Component from "../../../ui/component.mjs";
import AnimationValue from "../../properties/Value.mjs";

/**
 * Canvas component for animation rendering.
 * @class AnimationCanvas
 * @extends Component.HTMLElement
 */
class AnimationCanvas extends Component.HTMLElement {
    static tag = "animation-canvas";

    static config = {
        name: "animation-canvas",
        tag: "animation-canvas",
        properties: {
            width: { type: "int", route: "w.value", default: 0, linked: true },
            height: { type: "int", route: "h.value", default: 0, linked: true },
            fps: { type: "int", default: 60, linked: true },
            debug: { type: "exists", default: false, linked: true },
        },
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["width", "height", "fps", "debug"],
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
                    position: "relative",
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
        return `<canvas id="native" part="canvas" width="${this.width}" height="${this.height}" ></canvas>`;
    }

    assets = [];
    filters = [];
    mode = "normal";

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        this.dispatchEvent(new CustomEvent("connected", { detail: this }));
    }

    /**
     * Executes add.
     * @param {*} asset - Parameter value.
     * @returns {*} Result of add.
     */
    add(asset) {
        this.assets.push(asset);
    }

    /**
     * Executes reset.
     * @returns {*} Result of reset.
     */
    reset() {
        this.ref("native").clearRect(0, 0, this.width, this.height);
    }

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of update.
     */
    update() {
        this.assets.forEach((asset) => {
            asset.update();
            if (asset.dirty) {
            }
        });
    }
}
