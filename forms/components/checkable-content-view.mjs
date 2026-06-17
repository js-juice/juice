export const checkableContentViewStyles = {
    ":host(.has-content-view)": {
        width: "auto"
    },
    ":host(.has-content-view) label": {
        display: "block"
    },
    ":host(.has-content-view) .input-wrapper": {
        display: "block",
        width: "auto",
        height: "auto",
        border: 0,
        borderRadius: 0,
        overflow: "visible",
        background: "transparent",
        boxShadow: "none"
    },
    ":host(.has-content-view) .input-wrapper::before": {
        display: "none"
    },
    ".checkable-content-view": {
        display: "contents"
    },
    "::slotted(*)": {
        cursor: "pointer"
    }
};

export default class CheckableContentView {
    constructor(host) {
        this.host = host;
        this.observer = null;
    }

    connect() {
        if (!this.observer) {
            this.observer = new MutationObserver(() => this.host._renderDefault());
        }
        this.observer.observe(this.host, { childList: true });
    }

    disconnect() {
        this.observer?.disconnect();
    }

    hasChildren() {
        return this.host.children.length > 0;
    }

    createSlot() {
        const slot = document.createElement("slot");
        slot.className = "checkable-content-view";
        slot.addEventListener("slotchange", () => this.sync());
        return slot;
    }

    sync() {
        const checked = this.host.checked;
        const children = Array.from(this.host.children);

        this.host.classList.toggle("has-content-view", children.length > 0);
        children.forEach((child) => child.classList.toggle("checked", checked));
    }
}
