import { Vector3D } from "../properties/Vector.mjs";
import { parseAnchor, parseAnchorForContent, parsePosition } from "../anchor.mjs";

class Anchor extends HTMLElement {
    static tag = "animation-anchor";

    static get observedAttributes() {
        return ["position", "offset", "origin"];
    }

    constructor() {
        super();
        this._debug = {};
        this.position = new Vector3D();
        this._shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = this.constructor.styles;
        this._shadow.appendChild(style);
        const temp = document.createElement("template");
        temp.innerHTML = this.constructor.html();

        this._shadow.appendChild(temp.content.cloneNode(true));
        this.contents = this._shadow.querySelector("#html");
        this.target = this._shadow.querySelector("#target");
    }

    static get styles() {
        return `
            :host { 
                position: absolute; 
                pointer-events: none; 
                width: 0px;
                height: 0px;
                left: var(--origin-x, 0%);
                top: var(--origin-y, 0%);
            }
            #html{
                position: absolute;
                width: var(--width, auto);
                height: var(--height, auto);
                
                transform: translate(calc(var(--anchor-x, 0%) * -1), calc(var(--anchor-y, 0%) * -1));
            }
            #target {
                position: absolute;
                width: 100%;
                height: 100%;
                scale: var(--scale, --scale-x, 1) var(--scale, --scale-y, 1);
                transform: rotate(var(--rotation, 0deg));
                transform-origin: var(--anchor-x, 0%) var(--anchor-y, 0%);
            }
            slot{
 
                --scale-x: 1;
                --scale-y: 1;
                --scale: 1;
            }
            .anchor {
                display: none;
                position: absolute;
                top: var(--anchor-y, 0%);
                left: var(--anchor-x, 0%);
                transform: translate(-50%, -50%);
                border: 1px solid yellow;
                border-radius: 50%;
                width: 10px;
                height: 10px;
                z-index: 1
            }
            :host([debug]) .anchor {
                display: block;
            }
                
            .vert-line {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 1px;
                height: 300%;
                background: red;
            }
            .horiz-line {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 300%;
                height: 1px;
                background: red;
            }
            .debug-stats {
                position: absolute;
                top: 50%;
                left: 30px;
                transform: translateX(-50%);
                transform-origin: top center;
                font-size: 8px;
                color: white;
                padding: 5px;
                rotate: 0deg;
                white-space: nowrap;
                background: rgba(0, 0, 0, 0.5);
            }
        
            .stat .value {
                color: #fff;
            }
        `;
    }

    static html(data = {}) {
        return `
        <div id="html">
        <div class="anchor">
            <div class="vert-line"></div>
            <div class="horiz-line"></div>
            <div id="debug-stats" class="debug-stats">
                <div class="bg"></div>
                <div id="debug-size" class="stat">(w,h): <span id="debug-size-value" class="value">0px x 0px</span></div>
                <div id="debug-position" class="stat">(x,y,z): <span id="debug-position-value" class="value">0px, 0px, 0px</span></div>
                <div id="debug-rotation" class="stat">(Rotation): <span id="debug-rotation-value" class="value">0deg, 0deg, 0deg</span></div>
                <div id="debug-scale" class="stat">(Scale): <span id="debug-scale-value" class="value">1</span></div>
                <div id="debug-anchor" class="stat">(Anchor): <span id="debug-anchor-value" class="value">0%, 0%</span></div>
            </div>
        </div>
        <div id="target">
            <slot></slot>
        </div>
        </div>
        `;
    }

    setDebugValue(name, value) {
        if (!this.hasAttribute("debug")) return;
        const key = name.replace("--", "");
        this._debug.values ||= {};
        this._debug.values[key] = value;
        this.renderDebugValues();
    }

    renderDebugValues() {
        const values = this._debug.values || {};
        this.setDebugText("size", `${values.width || "0px"} x ${values.height || "0px"}`);
        this.setDebugText("position", `${values.x || "0px"}, ${values.y || "0px"}, ${values.z || "0px"}`);
        this.setDebugText(
            "rotation",
            `${values["rotation-x"] || values.rotation || "0deg"}, ${values["rotation-y"] || "0deg"}, ${
                values["rotation-z"] || "0deg"
            }`
        );
        this.setDebugText("scale", values.scale ?? "1");
        this.setDebugText("anchor", `${values["anchor-x"] || "0%"}, ${values["anchor-y"] || "0%"}`);
    }

    setDebugText(name, value) {
        const id = `${name}-value`;
        if (!this._debug[id]) this._debug[id] = this._shadow.querySelector(`#debug-${id}`);
        if (this._debug[id]) this._debug[id].textContent = value;
    }

    attributeChangedCallback(name, oldValue, value) {
        if (name === "position") {
            this.position = value;
            const { x, y } = parsePosition(this.position);
        }
    }
}

customElements.define(Anchor.tag, Anchor);

export default Anchor;
