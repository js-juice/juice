import Shape2d from "./shape2d.mjs";

class SquareComponent extends Shape2d {
    static tag = "shape-square";

    static get style() {
        return {
            ".square": {}
        };
    }

    static html() {
        return `<div class="bg square width height rotation scale"></div>`;
    }
}

if (typeof customElements !== "undefined" && !customElements.get(SquareComponent.tag)) {
    customElements.define(SquareComponent.tag, SquareComponent);
}

export default SquareComponent;
