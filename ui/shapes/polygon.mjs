import ShapeComponent from "./shape.mjs";
import { random, randomBetween, randomInt, pow, cos, sin } from "../../core/Util/Math.mjs";

class ShapePolygon extends ShapeComponent {
    static tag = "shape-polygon";

    shapeName = "polygon";

    static get config() {
        return {
            properties: Object.assign({}, ShapeComponent.config.properties, {
                points: {
                    type: "array[vector]",
                    default: [
                        { x: 50, y: 0 },
                        { x: 100, y: 100 },
                        { x: 0, y: 100 }
                    ]
                }
            })
        };
    }

    _defineShape() {
        const points = this.points.map((point) => `${point.x} ${point.y}`).join(", ");
        return `polygon(${points})`;
    }
}

customElements.define(ShapePolygon.tag, ShapePolygon);

export default ShapePolygon;
