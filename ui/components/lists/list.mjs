import Component from "../../component.mjs";

class Gallery extends Component.HTMLElement {
    static tag = "ui-list";

    static get config() {
        return {
            tag: "ui-list",
            properties: {
                layout: { type: "string", default: "column", linked: true },
                items: { type: "array", default: [] }
            }
        };
    }

    constructor() {
        super();
    }

    onBeforeCreate() {
        this.layout = (this.hasAttribute("layout") && this.getAttribute("layout")) || "column";
        if (this.layout == "row") this.rows = (this.hasAttribute("rows") && this.getAttribute("rows")) || 1;
        if (this.layout == "column") this.columns = (this.hasAttribute("columns") && this.getAttribute("columns")) || 1;
        this.visible = (this.hasAttribute("visible") && this.getAttribute("visible")) || "auto";

        this.items = (this.hasAttribute("items") && this.getAttribute("items")) || [];

        if (typeof this.items == "string") {
            if (this.items.startsWith("https://") || this.items.startsWith("http://")) {
                this.sourceType = "url";
            }
        }
    }
}
