import ShapeComponent from "./shape.mjs";
import { random, randomBetween, randomInt, pow, cos, sin } from "../../core/Util/Math.mjs";

class ShapeBlob extends Component.HTMLElement {
    static get config() {
        return {
            properties: {
                points: { type: "int", default: 5 },
                depth: { type: "int", default: 3 },
                radius: { type: "int", default: 50 },
                variance: { type: "int", default: 20 },
                color: { type: "string", default: "#000" }
            }
        };
    }

    static get observed() {
        return {
            all: ["points", "depth", "radius", "variance", "color"]
        };
    }

    shapeName = "shape";

    _defineShape() {
        const vectors = [];
        for (let i = 0; i < this.points; i++) {
            const angle = (i / this.points) * Math.PI * 2;
            const length = this.radius + randomBetween(-this.variance, this.variance);
            vectors.push({ angle, length });
        }

        this.clipPath = `${this.shapeName}(from ${vectors.map((v) => `${v.length} at ${v.angle}rad`).join(", ")} with depth ${this.depth})`;
        return this.clipPath;
    }
}

customElements.define("shape-blob", ShapeBlob);
