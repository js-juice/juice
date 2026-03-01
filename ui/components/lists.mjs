import Component from "../component.mjs";

function isBranch(value) {
    return value !== null && typeof value === "object";
}

function parseData(raw) {
    if (!raw) return undefined;
    try {
        return JSON.parse(raw);
    } catch (error) {
        return { __parseError: error.message };
    }
}

export class SortableList extends Component.HTMLElement {
    static tag = "sortable-list";

    static config = {
        name: "sortable-list",
        properties: {
            itemtag: { type: "string", default: "li", linked: true },
            disabled: { type: "exists", default: false, linked: true },
            horizontal: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["itemtag", "disabled", "horizontal"]
        };
    }

    static html() {
        return `<slot id="slot"></slot>`;
    }

    static get style() {
        return [
            {
                ":host": {
                    position: "relative",
                    display: "block"
                },
                "::slotted(*)": {
                    cursor: "grab"
                },
                "::slotted(.is-dragging)": {
                    opacity: 0.65
                }
            }
        ];
    }

    constructor() {
        super();
        this.boundItems = new Map();
        this.onDragOver = this.onDragOver.bind(this);
        this.onDrop = this.onDrop.bind(this);
    }

    onFirstConnect() {
        this.addEventListener("dragover", this.onDragOver);
        this.addEventListener("drop", this.onDrop);
        this.refreshItems();

        this.itemObserver = new MutationObserver(() => this.refreshItems());
        this.itemObserver.observe(this, { childList: true });
    }

    onDisconnect() {
        this.removeEventListener("dragover", this.onDragOver);
        this.removeEventListener("drop", this.onDrop);
        if (this.itemObserver) {
            this.itemObserver.disconnect();
            this.itemObserver = null;
        }
        this.clearItemBindings();
    }

    onPropertyChanged(prop) {
        if (prop === "itemtag") {
            this.refreshItems();
        }
    }

    clearItemBindings() {
        for (const [item, handlers] of this.boundItems.entries()) {
            item.removeEventListener("dragstart", handlers.onStart);
            item.removeEventListener("dragend", handlers.onEnd);
            item.removeAttribute("draggable");
        }
        this.boundItems.clear();
    }

    getItems() {
        const children = Array.from(this.children).filter((node) => node.nodeType === Node.ELEMENT_NODE);
        const tag = (this.itemtag || "").toLowerCase();
        if (!tag || tag === "*") return children;
        return children.filter((child) => child.tagName.toLowerCase() === tag);
    }

    refreshItems() {
        const items = this.getItems();
        const itemSet = new Set(items);

        for (const [item, handlers] of this.boundItems.entries()) {
            if (!itemSet.has(item)) {
                item.removeEventListener("dragstart", handlers.onStart);
                item.removeEventListener("dragend", handlers.onEnd);
                item.removeAttribute("draggable");
                this.boundItems.delete(item);
            }
        }

        for (const item of items) {
            if (this.boundItems.has(item)) continue;
            const onStart = this.onDragStart.bind(this, item);
            const onEnd = this.onDragEnd.bind(this, item);
            item.setAttribute("draggable", "true");
            item.addEventListener("dragstart", onStart);
            item.addEventListener("dragend", onEnd);
            this.boundItems.set(item, { onStart, onEnd });
        }
    }

    onDragStart(item, event) {
        if (this.disabled) {
            event.preventDefault();
            return;
        }

        this.draggingItem = item;
        this.startOrder = this.getItems();
        item.classList.add("is-dragging");

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.id || item.textContent || "");
        }
    }

    onDragEnd(item) {
        item.classList.remove("is-dragging");
        if (!this.draggingItem) return;

        const changed = this.hasOrderChanged();
        this.draggingItem = null;
        this.startOrder = null;
        if (!changed) return;

        this.dispatchEvent(
            new CustomEvent("sorted", {
                detail: {
                    order: this.serializeOrder()
                },
                bubbles: true
            })
        );
    }

    onDrop(event) {
        if (!this.draggingItem) return;
        event.preventDefault();
    }

    onDragOver(event) {
        if (!this.draggingItem || this.disabled) return;
        event.preventDefault();

        const afterItem = this.getAfterItem(event.clientX, event.clientY);
        if (!afterItem) {
            this.appendChild(this.draggingItem);
        } else if (afterItem !== this.draggingItem) {
            this.insertBefore(this.draggingItem, afterItem);
        }
    }

    getAfterItem(pointerX, pointerY) {
        const axis = this.horizontal ? "x" : "y";
        const candidates = this.getItems().filter((item) => item !== this.draggingItem);

        let closest = { offset: Number.NEGATIVE_INFINITY, item: null };
        for (const item of candidates) {
            const box = item.getBoundingClientRect();
            const center = axis === "x" ? box.left + box.width / 2 : box.top + box.height / 2;
            const offset = (axis === "x" ? pointerX : pointerY) - center;
            if (offset < 0 && offset > closest.offset) {
                closest = { offset, item };
            }
        }
        return closest.item;
    }

    hasOrderChanged() {
        const start = this.startOrder || [];
        const current = this.getItems();
        if (start.length !== current.length) return true;
        for (let i = 0; i < current.length; i += 1) {
            if (start[i] !== current[i]) return true;
        }
        return false;
    }

    serializeOrder() {
        return this.getItems().map((item, index) => {
            return (
                item.getAttribute("value") ||
                item.dataset.value ||
                item.id ||
                String(index)
            );
        });
    }
}

export class ExpandableList extends Component.HTMLElement {
    static tag = "expandable-list";

    static config = {
        name: "expandable-list",
        properties: {
            data: { type: "string", default: "", linked: true },
            expanded: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["data", "expanded"]
        };
    }

    static html() {
        return `<div id="tree" part="tree"></div>`;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    position: "relative",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    lineHeight: "1.45"
                },
                "#tree ul": {
                    listStyle: "none",
                    margin: "0",
                    padding: "0 0 0 1rem"
                },
                "#tree li": {
                    margin: "0.2rem 0"
                },
                ".node": {
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                },
                ".toggle": {
                    width: "1.4rem",
                    height: "1.4rem",
                    border: "1px solid #ccd4e0",
                    borderRadius: "4px",
                    background: "#fff",
                    color: "#263244",
                    cursor: "pointer",
                    padding: "0"
                },
                ".key": {
                    fontWeight: 600,
                    color: "#1e2d45"
                },
                ".value": {
                    color: "#46556d"
                },
                ".error": {
                    color: "#8f1f1f"
                },
                ".empty": {
                    color: "#66758e"
                }
            }
        ];
    }

    onFirstConnect() {
        this.renderTree();
    }

    onPropertyChanged(prop) {
        if (prop === "data" || prop === "expanded") {
            this.renderTree();
        }
    }

    setData(data) {
        this._data = data;
        this.renderTree();
    }

    getData() {
        if (this._data !== undefined) return this._data;
        return parseData(this.data);
    }

    renderTree() {
        const tree = this.ref("tree");
        if (!tree) return;
        tree.innerHTML = "";

        const data = this.getData();
        if (data === undefined) {
            const empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = "No data";
            tree.appendChild(empty);
            return;
        }

        if (data && data.__parseError) {
            const error = document.createElement("div");
            error.className = "error";
            error.textContent = `Invalid JSON: ${data.__parseError}`;
            tree.appendChild(error);
            return;
        }

        if (!isBranch(data)) {
            const value = document.createElement("div");
            value.className = "value";
            value.textContent = String(data);
            tree.appendChild(value);
            return;
        }

        tree.appendChild(this.buildBranch(data, "root"));
    }

    buildBranch(value, path) {
        const list = document.createElement("ul");
        const entries = Array.isArray(value)
            ? value.map((item, index) => [index, item])
            : Object.entries(value);

        for (const [key, current] of entries) {
            const item = document.createElement("li");
            const row = document.createElement("div");
            row.className = "node";

            const label = document.createElement("span");
            label.className = "key";
            label.textContent = Array.isArray(value) ? `[${key}]` : String(key);

            if (isBranch(current)) {
                const toggle = document.createElement("button");
                toggle.className = "toggle";
                toggle.type = "button";
                toggle.textContent = this.expanded ? "-" : "+";
                toggle.setAttribute("aria-expanded", this.expanded ? "true" : "false");

                const childPath = `${path}.${String(key)}`;
                const child = this.buildBranch(current, childPath);
                if (!this.expanded) child.hidden = true;

                toggle.addEventListener("click", () => {
                    child.hidden = !child.hidden;
                    const expanded = !child.hidden;
                    toggle.textContent = expanded ? "-" : "+";
                    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
                });

                row.appendChild(toggle);
                row.appendChild(label);
                item.appendChild(row);
                item.appendChild(child);
            } else {
                const valueNode = document.createElement("span");
                valueNode.className = "value";
                valueNode.textContent = String(current);

                row.appendChild(label);
                row.appendChild(valueNode);
                item.appendChild(row);
            }

            list.appendChild(item);
        }

        return list;
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get(SortableList.tag)) {
        customElements.define(SortableList.tag, SortableList);
    }
    if (!customElements.get(ExpandableList.tag)) {
        customElements.define(ExpandableList.tag, ExpandableList);
    }
}
