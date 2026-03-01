import Component from "../../component.mjs";

export class UIContent extends Component.HTMLElement {
    static tag = "ui-content";

    static config = {
        name: "ui-content",
        properties: {
            name: { type: "string", default: "", linked: true },
            label: { type: "string", default: "", linked: true },
            disabled: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["name", "label", "disabled"]
        };
    }

    static html() {
        return `<div id="content" part="content"><slot></slot></div>`;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "none"
                },
                ":host([active])": {
                    display: "block"
                },
                ":host([hidden])": {
                    display: "none"
                }
            }
        ];
    }
}

export class UITabs extends Component.HTMLElement {
    static tag = "ui-tabs";

    static config = {
        name: "ui-tabs",
        properties: {
            active: { type: "string", default: "", linked: true }
        }
    };

    static get observed() {
        return {
            all: ["active"]
        };
    }

    static html() {
        return `
            <div id="card" part="card">
                <header id="header" part="header">
                    <nav id="nav" part="nav"></nav>
                </header>
                <main id="main" part="main">
                    <slot id="slot"></slot>
                </main>
            </div>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    border: "1px solid #d5dcea",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#fff"
                },
                "#nav": {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0",
                    borderBottom: "1px solid #d5dcea",
                    background: "#f6f8fc"
                },
                ".tab-btn": {
                    border: "0",
                    background: "transparent",
                    color: "#26354f",
                    padding: "0.65rem 0.9rem",
                    cursor: "pointer",
                    borderRight: "1px solid #dde4ef",
                    fontWeight: "600"
                },
                ".tab-btn:last-child": {
                    borderRight: "0"
                },
                ".tab-btn.active": {
                    background: "#fff",
                    color: "#2457db"
                },
                ".tab-btn.disabled": {
                    opacity: "0.5",
                    cursor: "not-allowed"
                },
                "#main": {
                    padding: "0.85rem"
                },
                "::slotted(ui-content)": {
                    display: "none"
                },
                "::slotted(ui-content[active])": {
                    display: "block"
                }
            }
        ];
    }

    constructor() {
        super();
        this.list = [];
        this.disabledTabs = [];
        this.activeEntry = null;
        this._syncingActive = false;
    }

    onFirstConnect() {
        // Clear stale host disabled attr from previous buggy versions.
        if (this.hasAttribute("disabled")) this.removeAttribute("disabled");

        this.slotEl = this.ref("slot");
        this.navEl = this.ref("nav");

        this.slotEl.addEventListener("slotchange", () => this.refreshTabs());

        this.childObserver = new MutationObserver(() => this.refreshTabs());
        this.childObserver.observe(this, { childList: true, subtree: false });

        this.refreshTabs();
    }

    onDisconnect() {
        if (this.childObserver) {
            this.childObserver.disconnect();
            this.childObserver = null;
        }
    }

    onPropertyChanged(prop, previous, value) {
        if (prop === "active" && value !== previous) {
            if (this._syncingActive) return;
            this.select(value);
        }
    }

    getPanels() {
        return Array.from(this.children).filter((child) => child.tagName.toLowerCase() === "ui-content");
    }

    ensurePanelName(panel, index) {
        const current = panel.getAttribute("name");
        if (current && current.trim()) return current.trim();
        const generated = `tab-${index + 1}`;
        panel.setAttribute("name", generated);
        return generated;
    }

    buildNavButton(name, label, panel) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "tab-btn";
        button.dataset.name = name;
        button.textContent = label || name;

        if (panel.hasAttribute("disabled")) {
            button.classList.add("disabled");
        }

        button.addEventListener("click", () => this.select(name));
        return button;
    }

    refreshTabs() {
        const panels = this.getPanels();
        this.navEl.innerHTML = "";
        this.list = [];
        this.disabledTabs = [];

        panels.forEach((panel, index) => {
            panel.removeAttribute("active");
            panel.setAttribute("hidden", "");
            const name = this.ensurePanelName(panel, index);
            const label = panel.getAttribute("label") || name;
            this.list.push(name);
            if (panel.hasAttribute("disabled")) this.disabledTabs.push(name);

            const button = this.buildNavButton(name, label, panel);
            this.navEl.appendChild(button);
        });

        if (this.list.length === 0) {
            this.activeEntry = null;
            return;
        }

        const requested = this.active || this.getAttribute("active");
        const firstEnabled = this.list.find((name) => !this.isDisabled(name)) || this.list[0];
        const nextActive =
            requested && this.list.includes(requested) && !this.isDisabled(requested) ? requested : firstEnabled;
        // Nav buttons are rebuilt on refresh, so re-apply active state to the current DOM.
        this.activeEntry = null;
        this.select(nextActive);
    }

    tab(tabName) {
        return this.navEl.querySelector(`.tab-btn[data-name="${tabName}"]`);
    }

    isDisabled(tabName) {
        return this.disabledTabs.includes(tabName);
    }

    disable(tabName) {
        const panel = this.querySelector(`ui-content[name="${tabName}"]`);
        if (!panel) return;
        panel.setAttribute("disabled", "");
        if (!this.disabledTabs.includes(tabName)) this.disabledTabs.push(tabName);
        const button = this.tab(tabName);
        if (button) button.classList.add("disabled");
    }

    enable(tabName) {
        const panel = this.querySelector(`ui-content[name="${tabName}"]`);
        if (!panel) return;
        panel.removeAttribute("disabled");
        this.disabledTabs = this.disabledTabs.filter((entry) => entry !== tabName);
        const button = this.tab(tabName);
        if (button) button.classList.remove("disabled");
    }

    select(tabName) {
        const name = (tabName || "").replace("#", "");
        if (!name) return;

        if (this.isDisabled(name)) {
            this.dispatchEvent(new CustomEvent("tab-change-fail", { detail: { name }, bubbles: true }));
            return;
        }

        const panel = this.querySelector(`ui-content[name="${name}"]`);
        const button = this.tab(name);
        if (!panel || !button) return;

        const isAlreadyActive =
            this.activeEntry &&
            this.activeEntry.name === name &&
            panel.hasAttribute("active") &&
            button.classList.contains("active");
        if (isAlreadyActive) {
            return;
        }

        const allPanels = this.getPanels();
        allPanels.forEach((entry) => {
            entry.removeAttribute("active");
            entry.setAttribute("hidden", "");
        });
        const allButtons = Array.from(this.navEl.querySelectorAll(".tab-btn"));
        allButtons.forEach((entry) => entry.classList.remove("active"));

        panel.setAttribute("active", "");
        panel.removeAttribute("hidden");
        button.classList.add("active");
        this._syncingActive = true;
        this.active = name;
        this._syncingActive = false;
        this.activeEntry = { name, panel, button };

        this.dispatchEvent(
            new CustomEvent("tab-change", {
                detail: { name, tab: button, content: panel },
                bubbles: true
            })
        );
    }

    next() {
        if (!this.activeEntry) return;
        const currentIndex = this.list.indexOf(this.activeEntry.name);
        if (currentIndex < 0) return;
        for (let i = currentIndex + 1; i < this.list.length; i += 1) {
            if (!this.isDisabled(this.list[i])) {
                this.select(this.list[i]);
                break;
            }
        }
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get(UIContent.tag)) customElements.define(UIContent.tag, UIContent);
    if (!customElements.get(UITabs.tag)) customElements.define(UITabs.tag, UITabs);
}
