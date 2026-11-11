import Component from "../../component.mjs";

// Shared progress bar, including the compact loader used by notifications.
export class UIProgress extends Component.HTMLElement {
    static tag = "ui-progress";
    static config = { properties: {
        value: { type: "number", default: 0, linked: true },
        min: { type: "number", default: 0, linked: true },
        max: { type: "number", default: 100, linked: true },
        progress: { type: "number", default: 0, linked: true },
        height: { type: "int", default: 14, linked: true },
        barcolor: { type: "string", default: "var(--color-link, #2d6cff)", linked: true },
        bgcolor: { type: "string", default: "var(--color-divider, #d9e2f2)", linked: true },
        label: { type: "string", default: "", linked: true },
    } };
    static get observed() { return { all: ["progress", "value", "min", "max", "height", "barcolor", "bgcolor", "label"], attributes: ["indeterminate"] }; }
    static html() { return `<div id="label" part="label"></div><div id="bar" part="bar" role="progressbar"><div id="progress" part="progress"></div></div><div id="display" part="display"></div>`; }
    static get style() { return `
        :host { display: grid; gap: .35rem; color: var(--color-text-primary, #2a3a54); }
        #label { font-weight: 600; } #label:empty { display: none; }
        #bar { width: 100%; height: var(--height, 14px); border-radius: 999px; overflow: hidden; background: var(--bg-color, #d9e2f2); }
        #progress { width: calc(var(--progress, 0) * 1%); height: 100%; background: var(--bar-color, #2d6cff); transition: width .2s ease; }
        #display { font: 12px monospace; color: var(--color-text-secondary, #4d5f7d); }
        :host([compact]) #display, :host([compact]) #label { display: none; }
        :host([compact]) { gap: 0; } :host([compact]) #bar { border-radius: 0; }
        :host([indeterminate]) #progress { width: 35%; animation: progress-slide 1.4s linear infinite; }
        @keyframes progress-slide { from { transform: translateX(-100%); } to { transform: translateX(286%); } }
        @media (prefers-reduced-motion: reduce) { #progress { transition: none; animation: none !important; } }
    `; }
    onFirstConnect() {
        // The component base initializes observed properties before refs exist.
        this.update();
    }
    onPropertyChanged(property) { this.update(property); }
    attributeChangedCallback(name, oldValue, value) {
        if (name === "indeterminate") this.update();
        else super.attributeChangedCallback(name, oldValue, value);
    }
    update(property) {
        const bar = this.ref("bar");
        if (!bar || this.updating) return;
        this.updating = true;
        const min = Number(this.min) || 0;
        const max = Math.max(min + 1, Number(this.max) || 100);
        if (property === "progress") this.value = min + Math.min(100, Math.max(0, Number(this.progress) || 0)) / 100 * (max - min);
        const value = Math.min(max, Math.max(min, Number(this.value) || 0));
        this.progress = (value - min) / (max - min) * 100;
        this.complete = value === max;
        this.style.setProperty("--progress", this.progress);
        this.style.setProperty("--height", `${Math.max(1, Number(this.height) || 14)}px`);
        this.style.setProperty("--bg-color", this.bgcolor);
        this.style.setProperty("--bar-color", this.barcolor);
        bar.setAttribute("aria-label", this.getAttribute("aria-label") || this.label || "Progress");
        bar.setAttribute("aria-valuemin", min); bar.setAttribute("aria-valuemax", max);
        if (this.hasAttribute("indeterminate")) bar.removeAttribute("aria-valuenow"); else bar.setAttribute("aria-valuenow", value);
        this.ref("label").textContent = this.label || "";
        this.ref("display").textContent = this.updateDisplay();
        this.updating = false;
    }
    updateDisplay() {
        const format = this.getAttribute("display-format");
        return format ? format.replace(/\b(value|min|max|progress|label)\b/g, key => this[key] ?? "") : `${Math.round(this.progress)}% (${this.value}/${this.max})`;
    }
}
if (!customElements.get(UIProgress.tag)) customElements.define(UIProgress.tag, UIProgress);
export default UIProgress;
