import { Vector3D } from "../../Animation/Properties/Vector.mjs";
import { parseAnchor, parseAnchorForContent, parsePosition } from "../anchor.mjs";

class Anchor extends HTMLElement {
    static tag = "animation-anchor";

    static get observedAttributes() {
        return ["position", "offset", "origin"];
    }

    constructor() {
        super();
        this.position = new Vector3D();
        this._shadow = this.attachShadow({ mode: "open" });
        this._shadow.innerHTML = this.constructor.html();
        this.contents = this._shadow.querySelector("#html");
        this.target = this._shadow.querySelector("#target");
        const style = document.createElement("style");
        style.textContent = this.constructor.styles;
        this._shadow.appendChild(style);
    }

    static get styles() {
        return `
            :host { 
                position: absolute; 
                pointer-events: none; 
                width: 0px;
                height: 0px;
                
            }
            #html{
                position: absolute;
                width: 0px;
                height: 0px;
            }
            #target {
                position: absolute;
                width: calc( var( --width, auto) * 1px );
                height: calc( var( --height, auto) * 1px );
                transform: translate(calc(var(--anchor-x, 0) * -100%), calc(var(--anchor-y, 0) * -100%));
                transform-origin: calc(var(--anchor-x, 0) * 100%) calc(var(--anchor-y, 0) * 100%);
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
                position: "absolute",
                top: "50%",
                left: "30px",
                transform: "translateX(-50%)",
                transformOrigin: "top left",
                fontSize: "8px",
                color: "white",
                padding: "5px",
                rotate: "-90deg",
                whiteSpace: "nowrap"
            }
            .debug-stats .bg {
                position: "absolute",
                top: "0px",
                left: "0px",
                width: "100%",
                height: "100%",
                background: "#000",
                opacity: 0.6,
                zIndex: -1,
                borderRadius: "5px"
            }
            .debug-stats .bg:before {
                display: "block",
                width: "12px",
                height: "12px",
                content: '""',
                position: "absolute",
                top: "-6px",
                left: "calc(50% - 6px)",
                rotate: "45deg",
                background: "#000"
            },
            .debug-stats .stat:after {
                content: "attr(data-value)"
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
                <div id="debug-size" class="stat" data-value="0,0">(w,h): </div>
                <div id="debug-position" class="stat" data-value="0,0">(x,y): </div>
                <div id="debug-rotation" class="stat" data-value="0,0">(Rotation): </div>
                <div id="debug-scale" class="stat" data-value="1">(Scale): </div>
            </div>
        </div>
        <div id="target">
            <slot></slot>
        </div>
        </div>
        `;
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
