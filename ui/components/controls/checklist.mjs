import Component from "../../component.mjs";

const CHECKLIST_ITEM_TAGS = new Set(["ui-checklist-item"]);

export class ChecklistItem extends Component.HTMLElement {
    static tag = "ui-checklist-item";

    static config = {
        name: "ui-checklist-item",
        properties: {
            label: { type: "string", default: "", linked: true },
            checked: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["label", "checked"]
        };
    }

    static html() {
        return `
            <label id="row" part="row">
                <input id="checkbox" type="checkbox" />
                <span id="label" part="label">${this.label || ""}</span>
            </label>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    color: "#1f2e45"
                },
                "#row": {
                    display: "flex",
                    gap: "0.55rem",
                    alignItems: "center"
                },
                "#checkbox": {
                    width: "1rem",
                    height: "1rem"
                },
                ":host([checked]) #label": {
                    textDecoration: "line-through",
                    color: "#5f708b"
                }
            }
        ];
    }

    onFirstConnect() {
        this.ref("checkbox").addEventListener("change", () => {
            this.checked = this.ref("checkbox").checked;
            this.dispatchEvent(
                new CustomEvent("item-change", {
                    detail: { checked: this.checked },
                    bubbles: true
                })
            );
        });
        this.syncFromProps();
    }

    onPropertyChanged(prop) {
        if (prop === "label" || prop === "checked") {
            this.syncFromProps();
        }
    }

    syncFromProps() {
        if (this.ref("label")) this.ref("label").textContent = this.label || "";
        if (this.ref("checkbox")) this.ref("checkbox").checked = !!this.checked;
    }
}

export class Checklist extends Component.HTMLElement {
    static tag = "ui-checklist";

    static config = {
        name: "ui-checklist",
        properties: {
            title: { type: "string", default: "Checklist", linked: true },
            open: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["title", "open"]
        };
    }

    static html() {
        return `
            <div id="shell" part="shell">
                <button id="toggle" part="toggle" type="button">${this.title || "Checklist"}</button>
                <div id="panel" part="panel">
                    <div id="summary" part="summary">
                        <span id="count">0 / 0</span>
                        <div id="meter" part="meter"><div id="progress" part="progress"></div></div>
                    </div>
                    <ul id="list" part="list">
                        <slot id="slot"></slot>
                    </ul>
                </div>
            </div>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    width: "100%",
                    maxWidth: "420px",
                    border: "1px solid #d5dcea",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#fff"
                },
                "#toggle": {
                    width: "100%",
                    border: "0",
                    background: "#2d6cff",
                    color: "#fff",
                    padding: "0.7rem 0.8rem",
                    textAlign: "left",
                    fontWeight: "600",
                    cursor: "pointer"
                },
                "#panel": {
                    padding: "0.7rem 0.8rem",
                    display: "none"
                },
                ":host([open]) #panel": {
                    display: "block"
                },
                "#summary": {
                    display: "grid",
                    gap: "0.45rem",
                    marginBottom: "0.55rem",
                    color: "#445673",
                    fontFamily: "monospace"
                },
                "#meter": {
                    width: "100%",
                    height: "8px",
                    borderRadius: "999px",
                    background: "#e7edf7",
                    overflow: "hidden"
                },
                "#progress": {
                    width: "0%",
                    height: "100%",
                    background: "linear-gradient(90deg,#2d6cff,#54c0ff)",
                    transition: "width 0.2s ease"
                },
                "#list": {
                    margin: "0",
                    padding: "0",
                    listStyle: "none",
                    display: "grid",
                    gap: "0.5rem"
                },
                "::slotted(ui-checklist-item)": {
                    display: "block"
                },
                "::slotted([hidden])": {
                    display: "none"
                }
            }
        ];
    }

    constructor() {
        super();
        this.items = {};
        this.hiddenItems = {};
        this.boundItems = new Map();
    }

    onFirstConnect() {
        this.ref("toggle").addEventListener("click", () => this.toggle());
        this.slotEl = this.ref("slot");
        this.slotEl.addEventListener("slotchange", () => this.refreshItems());

        this.childObserver = new MutationObserver(() => this.refreshItems());
        this.childObserver.observe(this, { childList: true });

        this.refreshItems();
        this.syncHeader();
    }

    onDisconnect() {
        if (this.childObserver) {
            this.childObserver.disconnect();
            this.childObserver = null;
        }
        for (const [item, handler] of this.boundItems.entries()) {
            item.removeEventListener("item-change", handler);
        }
        this.boundItems.clear();
    }

    onPropertyChanged(prop) {
        if (prop === "title") this.syncHeader();
        if (prop === "open") this.syncHeader();
    }

    syncHeader() {
        if (this.ref("toggle")) this.ref("toggle").textContent = this.title || "Checklist";
    }

    getChecklistItems() {
        return Array.from(this.children).filter((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            return CHECKLIST_ITEM_TAGS.has(node.tagName.toLowerCase());
        });
    }

    ensureItemId(item, index) {
        return item.getAttribute("item-id") || item.id || `item-${index + 1}`;
    }

    bindItem(item) {
        if (this.boundItems.has(item)) return;
        const handler = () => this.update();
        item.addEventListener("item-change", handler);
        this.boundItems.set(item, handler);
    }

    refreshItems() {
        const items = this.getChecklistItems();
        const nextMap = {};

        items.forEach((item, index) => {
            const id = this.ensureItemId(item, index);
            if (!item.getAttribute("item-id")) item.setAttribute("item-id", id);
            this.bindItem(item);
            nextMap[id] = item;
        });

        for (const [item, handler] of this.boundItems.entries()) {
            if (!items.includes(item)) {
                item.removeEventListener("item-change", handler);
                this.boundItems.delete(item);
            }
        }

        this.items = nextMap;
        this.update();
    }

    add(id, label, checked = false) {
        const item = document.createElement("ui-checklist-item");
        item.setAttribute("item-id", id);
        item.label = label;
        item.checked = !!checked;
        this.appendChild(item);
        this.refreshItems();
    }

    remove(id) {
        const item = this.items[id] || this.hiddenItems[id];
        if (!item || !item.parentNode) return;
        item.parentNode.removeChild(item);
        delete this.items[id];
        delete this.hiddenItems[id];
        this.refreshItems();
    }

    hide(id) {
        const item = this.items[id];
        if (!item) return;
        item.setAttribute("hidden", "");
        this.hiddenItems[id] = item;
        delete this.items[id];
        this.update();
    }

    show(id) {
        const item = this.hiddenItems[id];
        if (!item) return;
        item.removeAttribute("hidden");
        this.items[id] = item;
        delete this.hiddenItems[id];
        this.update();
    }

    check(id) {
        if (!this.items[id]) return;
        this.items[id].checked = true;
        this.update();
    }

    uncheck(id) {
        if (!this.items[id]) return;
        this.items[id].checked = false;
        this.update();
    }

    toggle() {
        this.open = !this.open;
    }

    update() {
        const itemIds = Object.keys(this.items);
        const total = itemIds.length;
        const done = itemIds.filter((id) => !!this.items[id].checked).length;
        const percent = total === 0 ? 0 : (done / total) * 100;

        if (this.ref("count")) this.ref("count").textContent = `${done} / ${total}`;
        if (this.ref("progress")) this.ref("progress").style.width = `${percent}%`;

        if (total > 0 && done === total) {
            this.dispatchEvent(new CustomEvent("complete", { detail: { done, total }, bubbles: true }));
            this.setAttribute("complete", "");
        } else {
            this.dispatchEvent(new CustomEvent("incomplete", { detail: { done, total }, bubbles: true }));
            this.removeAttribute("complete");
        }
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get(ChecklistItem.tag)) customElements.define(ChecklistItem.tag, ChecklistItem);
    if (!customElements.get(Checklist.tag)) customElements.define(Checklist.tag, Checklist);
}
