/**
 * Animation loop component for repeating animations with from/to states.
 * @module Components/Animation/Loop
 */
import { type } from "../../core/Util/Core.mjs";
import Component from "../../ui/component.mjs";
import AnimationValue from "../properties/Value.mjs";

/**
 * Component for creating looped animations between two states.
 * @class AnimationLoop
 * @extends Component.HTMLElement
 */
class AnimationLoop extends Component.HTMLElement {
    static tag = "animation-loop";

    /**
     * Returns the current config value.
     * @returns {*} Current config value.
     */
    static get config() {
        return {
            properties: {
                asset: { type: "url", default: null, linked: true },
                from: { type: "object", default: {}, linked: true },
                to: { type: "object", default: {}, linked: true },
                duration: { type: "number", default: 1000, linked: true },
            },
        };
    }

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["asset", "from", "to", "duration"],
            attributes: [],
            properties: [],
        };
    }
}

customElements.define(AnimationLoop.tag, AnimationLoop);
