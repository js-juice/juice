import Shape2d from "./shape2d.mjs";

class CircleComponent extends Shape2d {
    static tag = "shape-circle";

    static get style() {
        return {
            ".circle": {
                borderRadius: "50%",
                backgroundColor: "var(--bg)"
            }
        };
    }

    static html() {
        return `<div class="circle width height rotation scale"></div>`;
    }
}

if (typeof customElements !== "undefined" && !customElements.get(CircleComponent.tag)) {
    customElements.define(CircleComponent.tag, CircleComponent);
}

export default CircleComponent;
