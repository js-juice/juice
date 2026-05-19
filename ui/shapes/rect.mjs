import ShapeComponent from "./shape.mjs";
import { random, randomBetween, randomInt, pow, cos, sin } from "../../core/Util/Math.mjs";

class ShapeRect extends Component.HTMLElement {
    shapeName = "rect";

    _defineShape() {
        this.clipPath = `${this.shapeName}(from 0 0 to ${this.width} ${this.height})`;
        return this.clipPath;
    }
}

customElements.define("shape-rect", ShapeRect);
