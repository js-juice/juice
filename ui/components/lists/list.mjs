import Component from "../../component.mjs";

class ListComponent extends Component.HTMLElement {
    static tag = "ui-list";

    static get observed() {
        return {
            all: ["insertable", "layout", "items"]
        };
    }

    static get config() {
        return {
            tag: "ui-list",
            properties: {
                insertable: { type: "exists", default: false, linked: true },
                layout: { type: "string", default: "column", linked: true },
                items: { type: "array", default: [] }
            }
        };
    }

    constructor() {
        super();
    }

    setItems(items) {
        this.items = items;

        this.refreshItems();
    }

    renderItem(item) {
        const template = this._shadow.querySelector(`slot[name="item"]`).firstChild.cloneNode(true);
        for (const [key, value] of Object.entries(item)) {
            if (template.querySelector(`#${key}`)) {
                template.querySelector(`#${key}`).innerHTML = value;
            } else if (template.querySelector(`[data-key="${key}"]`)) {
                template.querySelector(`[data-key="${key}"]`).innerHTML = value;
            }
        }
        return template;
    }

    refreshItems() {
        this.innerHTML = "";

        for (const item of this.items) {
            const el = this.renderItem(item);
            this.appendChild(el);
        }

        if (this.insertable) this.appendChild(insertLink);
    }

    onCreate() {
        const template = this._shadow.querySelector(`slot[name="item"]`).firstChild.cloneNode(true);
        this.template = template;
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

customElements.define(ListComponent.tag, ListComponent);

export default ListComponent;
