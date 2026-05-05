import { Vector3D } from "../../Animation/Properties/Vector.mjs";
import { parseAnchor } from "../anchor.mjs";

class Anchor extends HTMLElement {
    static tag = "animation-anchor";

    observedAttributes = ["position", "offset"];

    constructor() {
        super();
        this.position = new Vector3D();
        this._shadow = this.attachShadow({ mode: "open" });
        this._shadow.innerHTML = this.constructor.html();
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
        `;
    }

    static html(data = {}) {
        return `
        <div class="anchor">
            <div class="vert-line"></div>
            <div class="horiz-line"></div>
        </div>
        <slot></slot>
        `;
    }
}

customElements.define(Anchor.tag, Anchor);

export default Anchor;
