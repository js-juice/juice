import Component from "../component.mjs";
import { random, randomBetween, randomInt, pow, cos, sin } from "../../core/Util/Math.mjs";

class ShapeComponent extends Component.HTMLElement {
    static get config() {
        return {
            properties: {
                width: { type: "int", default: 100 },
                height: { type: "int", default: 100 },
                color: { type: "string", default: "#000" }
            }
        };
    }

    static get observed() {
        return {
            all: ["width", "height", "color"]
        };
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    width: "100%",
                    height: "100%"
                },
                ".shape": {
                    clipPath: `${this.shapeName}(${this._defineShape()})`,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "var(--color)"
                }
            }
        ];
    }

    static html() {
        return `<div class="shape"></div>`;
    }

    shapeName = "shape";

    _defineShape() {
        console.warn("ShapeComponent _defineShape should be implemented by subclass");
        return false;
    }
    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        this.clipPath = `${this.shapeName}(${this._defineShape()})`;
    }
}

customElements.define("shape-blob", ShapeBlob);
