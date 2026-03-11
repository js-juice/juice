/**
 * Base animation component for animated UI elements.
 * Provides position, rotation, scale, and velocity properties for animations.
 * @module Components/Animation/AnimationComponent
 */
import Anchor from "./anchor.mjs";
import { parseAnchor } from "../anchor.mjs";
import { type } from "../../core/Util/Core.mjs";
import Component from "../../ui/component.mjs";
import AnimationValue from "../properties/Value.mjs";
import { Rotation3D } from "../properties/Rotation.mjs";
import { Vector3D, Vector2D } from "../properties/Vector.mjs";

/**
 * Base component class for animated elements with 3D transformation properties.
 * @class AnimationComponent
 * @extends Component.HTMLElement
 * @example
 * class MyAnimatedElement extends AnimationComponent {
 *   // Custom animation logic
 * }
 */
export class AnimationComponent extends Component.HTMLElement {
    static tag = "animation-body";
    animate = true;

    static config = {
        name: "animation-component",
        tag: "animation-component",
        properties: {
            width: { type: "int", route: "w.value", default: 0, linked: true },
            height: { type: "int", route: "h.value", default: 0, linked: true },
            x: { type: "number", route: "position.x", default: 0, linked: true },
            y: { type: "number", route: "position.y", default: 0, linked: true },
            z: { type: "number", route: "position.z", default: 0, linked: true },
            vx: { type: "number", route: "velocity.x", default: 0, linked: true },
            vy: { type: "number", route: "velocity.y", default: 0, linked: true },
            vz: { type: "number", route: "velocity.z", default: 0, linked: true },
            offset: { type: "string", default: 0 },
            r: { type: "number", default: 0, linked: true },
            rx: { type: "number", route: "rotation.x", default: 0, linked: true },
            ry: { type: "number", route: "rotation.y", default: 0, linked: true },
            rz: { type: "number", route: "rotation.z", default: 0, linked: true },
            scale: { type: "number", route: "s.value", default: 1, linked: true },
            anchor: { type: "string", default: "center", linked: true },
            debug: { type: "exists", default: false, linked: true }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["anchor", "x", "y", "z", "r", "rx", "ry", "rz", "scale", "vx", "vy", "width", "height", "debug"],
            attributes: ["offset", "position", "", "rx", "ry", "rz"],
            properties: []
        };
    }

    static html(data = {}) {
        return `
            <animation-anchor>
            <div id="contents">
            <slot></slot>
            </div>  
            </animation-anchor>
        `;
    }

    static get styles() {
        return `
            :host { 
                position: absolute; 
                pointer-events: none; 
                width: 0px;
                height: 0px;
            }
            #contents {
                position: absolute;
                top: var(--anchor-y, 0px);
                left: var(--anchor-x, 0px);
                width: var(--width);
                height: var(--height);
            }
            #contents slot{
                position: relative;
                display: block;
                width: 100%;
                height: 100%;
            }
        `;
    }

    /**
     * Executes beforeCreate.
     * @returns {*} Result of beforeCreate.
     */
    beforeCreate() {
        this.animationBody = true;
        this.visible = true;

        this.rotation = new Rotation3D(-90, 0, 0);
        this.rotation.OFFSET.x = 90;
        this.position = new Vector3D(0, 0, 0);
        this.viewerPosition = new Vector3D(0, 0, 0);
        this.velocity = new Vector3D(0, 0, 0);

        this.s = new AnimationValue(1, {
            min: 0
        });
        this.w = new AnimationValue(0, {
            min: 0
        });
        this.h = new AnimationValue(0, {
            min: 0
        });

        Object.defineProperty(this, "offset", {
            get: () => {
                return {
                    x: this._offset.x * this.parent.width,
                    y: this._offset.y * this.parent.height
                };
            }
        });

        if (this.hasAttribute("anchor")) {
            this.setAnchor(this.getAttribute("anchor"));
        }

        if (this.hasAttribute("noanimate")) {
            this.animate = false;
        }
    }

    update() {
        if (!this.animate) return null;

        if (this.velocity.hasValue) {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.position.z += this.velocity.z;
        }

        if (!this.froozen) {
            this.viewerPosition.x += this.velocity.x;
            this.viewerPosition.y += this.velocity.y;
            this.viewerPosition.z += this.velocity.z;
        }
    }

    render() {
        if (!this.visible) return;

        const updates = {};
        const debugUpdates = {};

        if (this.beforeRender) this.beforeRender(time);

        if (this.w.dirty) {
            updates["--width"] = this.w.value + "px";
            this.w.save();
        }

        if (this.h.dirty) {
            updates["--height"] = this.h.value + "px";
            this.h.save();
        }

        if (this.position.dirty) {
            updates["--x"] = this.position.x + "px";
            updates["--y"] = this.position.y + "px";
            updates["--z"] = this.position.z + "px";
            this.position.clean();
        }

        if (this.rotation.dirty) {
            updates["--rotation"] = `${this.rotation.x}deg`;
            updates["--rotationY"] = `${this.rotation.y}deg`;
            updates["--rotationZ"] = `${this.rotation.z}deg`;
            this.rotation.clean();
        }

        if (Object.keys(updates).length) {
            this.writeStyleVars(updates);
        }
    }
}
