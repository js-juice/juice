import { Vector3D } from "../../Animation/Properties/Vector.mjs";
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
                transform: scale(var(--scale, 1)) rotate(var(--rotation, 0deg));
                transform-origin: var(--anchor-x, 0%) var(--anchor-y, 0%);
            }
            slot{
                display: block;
                position:relative;
            }
            .anchor {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                border: 1px solid yellow;
                border-radius: 50%;
                width: 10px;
                height: 10px;
                z-index: 1
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
        
            #debug-size:after {
                content: var(--width) "x" var(--height);
            }
            #debug-position:after {
                content: var(--x) "," var(--y);
            }
            #debug-rotation-x:after {
                content: var(--rotation) " " var(--rotation-x, 0) "," var(--rotation-y, 0) "," var(--rotation-z, 0);
            }
            #debug-scale:after {
                content: var(--scale)
            }
            .stat[data-value]:after {
                content: attr(data-value);
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
                <div id="debug-size" class="stat" data-value="0,0">(w,h): <span id="debug-width"></span>x<span id="debug-height"></span></div>
                <div id="debug-position" class="stat" data-value="0,0">(x,y): </div>
                <div id="debug-rotation-x" class="stat" data-value="0,0">(Rotation): </div>
                <div id="debug-scale" class="stat" data-value="1">(Scale): </div>
            </div>
        </div>
        <div id="target">
            <slot></slot>
        </div>
        </div>
        `;
    }

    setDebugValue(name, value) {
        name = name.replace("--", "");
        console.log(`Setting debug value ${name} to ${value}`);
        if (!this._debug[name]) this._debug[name] = this._shadow.querySelector(`#debug-${name}`);
        if (this._debug[name]) this._debug[name].setAttribute("data-value", value);
    }

    attributeChangedCallback(name, oldValue, value) {
        console.log(`Attribute ${name} changed from ${oldValue} to ${value}`);
        if (name === "position") {
            this.position = value;
            const { x, y } = parsePosition(this.position);
        }
    }
}

customElements.define(Anchor.tag, Anchor);

export default Anchor;
