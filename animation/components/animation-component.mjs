/**
 * Base animation component for animated UI elements.
 * Provides position, rotation, scale, and velocity properties for animations.
 * @module Components/Animation/AnimationComponent
 */
import { type } from "../../core/Util/Core.mjs";
import Component from "../../ui/component.mjs";
import AnimationValue from "../properties/Value.mjs";
import { Rotation3D } from "../properties/Rotation.mjs";
import { Vector3D, Vector2D } from "../properties/Vector.mjs";
import AnimationComponentUtil from "./util.mjs";
import "./anchor.mjs";
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
    static tag = "animation-component";
    animate = true;
    visible = true;

    static config = {
        name: "animation-component",
        properties: {
            width: { type: "int", route: "w.value", default: 0, linked: true },
            height: { type: "int", route: "h.value", default: 0, linked: true },
            scale: { type: "number", route: "s.value", default: 1, linked: true },
            x: { type: "number", route: "position.x", default: 0, linked: true },
            y: { type: "number", route: "position.y", default: 0, linked: true },
            z: { type: "number", route: "position.z", default: 0, linked: true },
            vx: { type: "number", route: "velocity.x", default: 0, linked: true },
            vy: { type: "number", route: "velocity.y", default: 0, linked: true },
            vz: { type: "number", route: "velocity.z", default: 0, linked: true },
            r: { type: "number", aliasFor: "rx", linked: true },
            rx: { type: "number", route: "rotation.x", default: 0, linked: true },
            ry: { type: "number", route: "rotation.y", default: 0, linked: true },
            rz: { type: "number", route: "rotation.z", default: 0, linked: true },
            offset: { type: "string", default: 0 },
            anchor: { default: { x: 0.5, y: 0.5 }, attrtype: "string", type: "object" },
            origin: { default: { x: 0.5, y: 0.5 }, attrtype: "string", type: "object" },
            debug: { type: "exists", default: false, linked: true }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: ["x", "y", "z", "r", "rx", "ry", "rz", "scale", "vx", "vy", "width", "height", "debug"],
            attributes: ["anchor", "origin", "offset", "position"],
            properties: []
        };
    }

    static html(data = {}) {
        return `
            <animation-anchor id="anchor">
                <div id="body">
                    <slot></slot>
                </div>
            </animation-anchor>  
        `;
    }

    static get style() {
        return [
            `
            :host { 
                position: absolute; 
                pointer-events: none; 
                width: 0px;
                height: 0px;
                left: 0px;
                top: 0px;
                transform: translate3d(var(--x, 0px), var(--y, 0px), var(--z, 0px));
            }
            #body {
                position: absolute;
  
            }
            #body slot{
                position: relative;
                display: block;
                width: 100%;
                height: 100%;
            }
            :host([debug]) #body {
                outline: 1px solid lime;
            }
        `
        ];
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

        if (this.hasAttribute("noanimate")) {
            this.animate = false;
        }
    }

    /**
     * Executes freezeAt.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} z - Parameter value.
     * @returns {*} Result of freezeAt.
     */
    freezeAt(x, y, z) {
        this.freeze = new Vector3D(x, y, z);
        this.position.set(x, y, z);
    }

    /**
     * Executes moveTo.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @returns {*} Result of moveTo.
     */
    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    move(x, y) {
        this.x += x;
        this.y += y;
    }

    onFirstConnect() {
        AnimationComponentUtil.initialize(this);
        AnimationComponentUtil.setDimentions(this);
        const vars = {
            "--x": `${this.position.x}px`,
            "--y": `${this.position.y}px`,
            "--z": `${this.position.z}px`,
            "--width": `${this.w.value}px`,
            "--height": `${this.h.value}px`,
            "--scale": this.s.value,
            "--rotation": `${this.rotation.x}deg`,
            "--rotation-x": `${this.rotation.x}deg`,
            "--rotation-y": `${this.rotation.y}deg`,
            "--rotation-z": `${this.rotation.z}deg`
        };
        this.writeStyleVars(vars);
        Object.entries(vars).forEach(([key, value]) => this.style.setProperty(key, value));
    }

    isInViewport() {
        if (!this.animation.viewer) return true;
        const rect = this.getBoundingClientRect();
        const viewerRect = this.animation.viewer.getBoundingClientRect();

        return !(
            rect.bottom < viewerRect.top ||
            rect.top > viewerRect.bottom ||
            rect.right < viewerRect.left ||
            rect.left > viewerRect.right
        );
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

    render(time) {
        if (!this.visible) return;
        const updates = {};
        const debugUpdates = {};

        if (this.beforeRender) this.beforeRender(time);

        if (this.w.dirty) {
            updates["--width"] = `${this.w.value}px`;
            this.w.save();
        }

        if (this.h.dirty) {
            updates["--height"] = `${this.h.value}px`;
            this.h.save();
        }

        if (this.s.dirty) {
            updates["--scale"] = this.s.value;
            this.s.save();
        }

        if (this.position.dirty) {
            updates["--x"] = `${this.position.x}px`;
            updates["--y"] = `${this.position.y}px`;
            updates["--z"] = `${this.position.z}px`;
            this.position.clean();
        }

        if (this.rotation.dirty) {
            updates["--rotation"] = `${this.rotation.x}deg`;
            updates["--rotation-x"] = `${this.rotation.x}deg`;
            updates["--rotation-y"] = `${this.rotation.y}deg`;
            updates["--rotation-z"] = `${this.rotation.z}deg`;
            this.rotation.clean();
        }

        if (Object.keys(updates).length) {
            this.writeStyleVars(updates);
            Object.entries(updates).forEach(([key, value]) => this.style.setProperty(key, value));
            if (this.debug) {
                for (const [key, value] of Object.entries(updates)) {
                    this.ref("anchor").setDebugValue(key, value);
                }
            }
        }
    }

    get innerContentBox() {
        const anchorValue =
            typeof this.anchor === "string" ? parseAnchor(this.anchor) : this.anchor || { x: 0.5, y: 0.5 };

        const width = this.width * this.scale;
        const height = this.height * this.scale;

        const anchor = {
            x: anchorValue.x * width,
            y: anchorValue.y * height
        };

        return {
            width,
            height,
            top: anchor.y,
            left: anchor.x,
            right: width - anchor.x,
            bottom: height - anchor.y
        };
    }

    onPropertyChanged(property, previous, value) {
        if (this.debug) console.log(`onPropertyChanged[${this.constructor.name}] ${property}=${value}`);
        if (["r", "rx", "ry", "rz"].includes(property)) {
            const updates = {
                "--rotation": `${this.rotation.x}deg`,
                "--rotation-x": `${this.rotation.x}deg`,
                "--rotation-y": `${this.rotation.y}deg`,
                "--rotation-z": `${this.rotation.z}deg`
            };
            this.writeStyleVars(updates);
            Object.entries(updates).forEach(([key, value]) => this.style.setProperty(key, value));
            if (this.debug && this.ref("anchor")) {
                Object.entries(updates).forEach(([key, value]) => this.ref("anchor").setDebugValue(key, value));
            }
        }
    }

    onAttributeChanged(property, previous, value) {
        if (this.debug) console.log(`onAttributeChanged[${this.constructor.name}] ${property}=${value}`);
    }

    clampToBounds(bounds = null) {
        bounds = bounds || this.bounds;
        if (this.position.x < bounds.min.x) this.position.x = bounds.min.x;
        if (this.position.y < bounds.min.y) this.position.y = bounds.min.y;
        if (this.position.z < bounds.min.z) this.position.z = bounds.min.z;

        if (this.position.x > bounds.max.x) this.position.x = bounds.max.x;
        if (this.position.y > bounds.max.y) this.position.y = bounds.max.y;
        if (this.position.z > bounds.max.z) this.position.z = bounds.max.z;
    }

    /**
     * Handles animationconnect events.
     * @returns {*} Result of onAnimationConnect.
     */
    onAnimationConnect(viewer) {
        this.parent = this.parentNode;
        let el = this;
        const stack = [this];

        while (el.parentNode && !["ANIMATION-VIEWER", "BODY"].includes(el.parentNode.tagName)) {
            el = el.parentNode;
            if (el.animationComponent && !el.animationViewer) {
                stack.push(el);
            }
        }
        this.stack = stack;
        if (this.debug) console.log("stack", this.stack);
    }
}

customElements.define(AnimationComponent.tag, AnimationComponent);

export default AnimationComponent;
