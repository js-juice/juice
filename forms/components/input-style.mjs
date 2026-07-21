import InputComponent from "./input-component.mjs";
import { CSS_PROPERTY_SECTIONS as SECTIONS } from "../../styles/property-list.mjs";

function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function fieldHtml([property, label, type, optionsOrPlaceholder = "", min = "", max = "", step = ""]) {
    const common = `data-style-property="${property}" aria-label="${escapeHtml(label)}"`;
    let control;
    if (type === "select") {
        control = `<select ${common}>${optionsOrPlaceholder.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option || "Default")}</option>`).join("")}</select>`;
    } else if (type === "color") {
        control = `<div class="color-control"><input type="color" data-color-picker="${property}" value="#000000" aria-label="${escapeHtml(label)} picker"><input type="text" ${common} placeholder="Color, variable, or gradient"></div>`;
    } else {
        control = `<input type="${type}" ${common} placeholder="${escapeHtml(optionsOrPlaceholder)}"${min ? ` min="${min}"` : ""}${max ? ` max="${max}"` : ""}${step ? ` step="${step}"` : ""}>`;
    }
    return `<label class="field"><span>${escapeHtml(label)}</span>${control}</label>`;
}

function sectionHtml(section, index) {
    return `<details class="section"${index === 0 ? " open" : ""}><summary>${section.label}</summary><div class="fields">${section.fields.map(fieldHtml).join("")}</div></details>`;
}

function normalizeStyleObject(value) {
    if (!value) return {};
    if (typeof value === "string") {
        try { value = JSON.parse(value); } catch (_) { return {}; }
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    const probe = document.createElement("div");
    const normalized = {};
    Object.entries(value).forEach(([property, rawValue]) => {
        const name = String(property).trim().replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        const styleValue = rawValue == null ? "" : String(rawValue).trim();
        if (!name || !styleValue || name.startsWith("--") || !CSS.supports(name, styleValue)) return;
        probe.style.setProperty(name, styleValue);
        if (probe.style.getPropertyValue(name)) normalized[name] = styleValue;
    });
    return normalized;
}

class InputStyleComponent extends InputComponent {
    static tag = "input-style";

    static get observed() {
        return ["selector", "apply-live", "object-only"];
    }

    static get config() {
        return {
            value: { type: "string", default: "" },
            native: { tag: "input", attrs: { type: "hidden" } },
            format: undefined,
            validation: undefined
        };
    }

    static get styles() {
        return {
            ":host": { display: "block", width: "100%" },
            ".native-wrapper": { display: "none" },
            ".input-wrapper": { border: 0, padding: 0, background: "transparent" },
            ".style-editor": { display: "grid", gap: "0.75rem" },
            ".toolbar": { display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" },
            ":host([object-only]) .toolbar": { display: "none" },
            ".toolbar button": { padding: "0.5rem 0.75rem", border: "1px solid var(--color-border, #ccc)", borderRadius: "4px", background: "var(--color-surface, #fff)", cursor: "pointer" },
            ".section": { border: "1px solid var(--color-border, #ccc)", borderRadius: "6px", background: "var(--color-surface, #fff)" },
            ".section summary": { padding: "0.75rem", fontWeight: "700", cursor: "pointer" },
            ".fields": { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.75rem", padding: "0 0.75rem 0.75rem" },
            ".field": { display: "grid", gap: "0.3rem", color: "var(--form-label-color, #333)", fontSize: "0.8rem" },
            ".field input, .field select": { boxSizing: "border-box", width: "100%", minHeight: "38px", padding: "0.45rem 0.55rem", border: "1px solid var(--color-border, #bbb)", borderRadius: "4px", color: "inherit", background: "var(--color-input-background, #fff)", font: "inherit" },
            ".color-control": { display: "grid", gridTemplateColumns: "42px 1fr", gap: "0.4rem" },
            ".color-control input[type='color']": { padding: "2px" },
            ".output": { width: "100%", minHeight: "90px", boxSizing: "border-box", padding: "0.65rem", border: "1px solid var(--color-border, #bbb)", borderRadius: "4px", fontFamily: "monospace", resize: "vertical" }
        };
    }

    static html() {
        return `<div class="style-editor"><div class="toolbar"><button type="button" data-action="read">Read target</button><button type="button" data-action="apply">Apply</button><button type="button" data-action="clear">Clear</button></div>${SECTIONS.map(sectionHtml).join("")}<label class="field"><span>Style object (JSON)</span><textarea class="output" spellcheck="false" aria-label="Style object JSON"></textarea></label></div>`;
    }

    constructor() {
        super({ _layout: "label:input:>:default:native:status:<:validation", ignoreHeight: true });
        this._targetElement = null;
        this._appliedProperties = new Set();
        this._syncing = false;
    }

    _afterRender() {
        this._editor = this._dom.default;
        this._output = this._editor?.querySelector(".output") || null;
        this._editor?.addEventListener("input", (event) => this._handleEditorInput(event));
        this._editor?.addEventListener("change", (event) => this._handleEditorInput(event));
        this._editor?.addEventListener("click", (event) => this._handleAction(event));
        this._syncControlsFromValue();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue === newValue || !this.isConnected) return;
        if (name === "selector") this._targetElement = null;
        if (name === "value") this._syncControlsFromValue();
        if (name === "apply-live" && this.hasAttribute("apply-live")) this.applyTo();
    }

    get selector() {
        return this.getAttribute("selector") || "";
    }

    set selector(value) {
        if (value) this.setAttribute("selector", value);
        else this.removeAttribute("selector");
    }

    get targetElement() {
        return this._targetElement || (this.selector ? document.querySelector(this.selector) : null);
    }

    set targetElement(element) {
        this._targetElement = element instanceof Element ? element : null;
    }

    get styleObject() {
        return normalizeStyleObject(this.value);
    }

    set styleObject(value) {
        this.value = JSON.stringify(normalizeStyleObject(value));
        this._syncControlsFromValue();
        if (this.hasAttribute("apply-live")) this.applyTo();
    }

    get cssText() {
        return Object.entries(this.styleObject).map(([property, value]) => `${property}: ${value};`).join(" ");
    }

    applyTo(target = this.targetElement) {
        if (typeof target === "string") target = document.querySelector(target);
        if (!(target instanceof Element)) return false;
        const styles = this.styleObject;
        this._appliedProperties.forEach((property) => {
            if (!(property in styles)) target.style.removeProperty(property);
        });
        Object.entries(styles).forEach(([property, value]) => target.style.setProperty(property, value));
        this._appliedProperties = new Set(Object.keys(styles));
        this._targetElement = target;
        return true;
    }

    readFrom(target = this.targetElement, computed = false) {
        if (typeof target === "string") target = document.querySelector(target);
        if (!(target instanceof Element)) return false;
        const source = computed ? getComputedStyle(target) : target.style;
        const styles = {};
        SECTIONS.flatMap(({ fields }) => fields.map(([property]) => property)).forEach((property) => {
            const value = source.getPropertyValue(property).trim();
            if (value) styles[property] = value;
        });
        this.styleObject = styles;
        this._targetElement = target;
        return true;
    }

    clear() {
        this.styleObject = {};
        if (this.targetElement) this.applyTo(this.targetElement);
    }

    _handleEditorInput(event) {
        if (this._syncing) return;
        const pickerProperty = event.target.dataset?.colorPicker;
        if (pickerProperty) {
            const text = this._editor.querySelector(`[data-style-property="${pickerProperty}"]`);
            if (text) text.value = event.target.value;
        }
        if (event.target === this._output) {
            try { this.styleObject = JSON.parse(this._output.value || "{}"); } catch (_) { return; }
            return;
        }
        if (!event.target.matches("[data-style-property], [data-color-picker]")) return;
        this._commitControls();
    }

    _handleAction(event) {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (action === "read") this.readFrom();
        if (action === "apply") this.applyTo();
        if (action === "clear") this.clear();
    }

    _commitControls() {
        const styles = {};
        this._editor.querySelectorAll("[data-style-property]").forEach((control) => {
            const value = control.value.trim();
            if (value) styles[control.dataset.styleProperty] = value;
        });
        const serialized = JSON.stringify(normalizeStyleObject(styles));
        this.value = serialized;
        this._output.value = JSON.stringify(this.styleObject, null, 2);
        if (this.hasAttribute("apply-live")) this.applyTo();
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    _syncControlsFromValue() {
        if (!this._editor) return;
        this._syncing = true;
        const styles = this.styleObject;
        this._editor.querySelectorAll("[data-style-property]").forEach((control) => {
            control.value = styles[control.dataset.styleProperty] || "";
        });
        this._editor.querySelectorAll("[data-color-picker]").forEach((picker) => {
            const value = styles[picker.dataset.colorPicker];
            if (/^#[\da-f]{6}$/i.test(value || "")) picker.value = value;
        });
        if (this._output) this._output.value = JSON.stringify(styles, null, 2);
        this._syncing = false;
    }
}

customElements.define(InputStyleComponent.tag, InputStyleComponent);

export { SECTIONS, normalizeStyleObject };
export default InputStyleComponent;
