/**
 * AUTODOC:START
 * Component: <input-fieldset>
 * Class: InputFieldset
 * Overview: Lightweight grouping container that wraps slotted form controls in a native `fieldset`/`legend` shell.
 *
 * Features:
 * - Applies consistent bordered group styling to related inputs.
 * - Supports optional legend and description text through attributes.
 * - Mirrors disabled state to underlying `<fieldset>` behavior.
 *
 * Example:
 * `<input-fieldset label="Address"><input-text name="city"></input-text></input-fieldset>`
 *
 * Attribute Reference:
 * - `label`: Text rendered in the legend.
 * - `description`: Supporting text rendered below the legend.
 * - `disabled`: Disables the grouped controls by disabling the fieldset.
 * - `layout-span`: Number of parent grid columns to occupy, or `full`.
 *
 * Property Reference:
 * - Uses attribute-driven API only; no custom public properties.
 *
 * CSS Variables:
 * - `--input-label-fontsize`, `--input-label-fontweight`: Legend typography.
 * - `--input-border`: Fieldset border style.
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

import { getJuiceConfig } from "../../config/juice-config.mjs";
import DEFAULT_FORMS_CONFIG from "../config.mjs";

const LAYOUT_DEFAULTS = { ...DEFAULT_FORMS_CONFIG.layout };

function toPositiveInteger(value, fallback) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeSpan(value) {
    const span = String(value || "").trim().toLowerCase();
    if (span === "full") return "full";
    return toPositiveInteger(span, null);
}

class InputFieldset extends HTMLElement {
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return ["disabled", "label", "description", "layout-columns"];
    }

    /**
     * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({});
        this._shadowRoot = this._shadowRoot || this.attachShadow({ mode: "open" });
        this._dom = {};
        this._resizeObserver = null;
        this._mutationObserver = null;
        this._onWindowResize = null;
        this._onConfigChange = null;
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        this._renderWireframe();
        this._startLayout();
    }

    disconnectedCallback() {
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._mutationObserver) this._mutationObserver.disconnect();
        if (this._onWindowResize) window.removeEventListener("resize", this._onWindowResize);
        if (this._onConfigChange) document.removeEventListener("juice:configchange", this._onConfigChange);
    }

    /**
     * Responds to observed attribute changes and synchronizes state.
     * @param {*} name - Attribute or field name.
     * @param {*} oldValue - Previous value.
     * @param {*} newValue - Next value.
     * @returns {*} void.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "disabled" || name === "label" || name === "description") {
            this._renderWireframe();
        }
        if (name === "layout-columns") this._applyLayout();
    }

    /**
     * Renders wireframe UI content.
     * @returns {*} void.
     */
    _renderWireframe() {
        const label = this.getAttribute("label") || "";
        const description = this.getAttribute("description") || "";
        const disabled = this.hasAttribute("disabled");

        if (this._dom.wireframe) {
            this._dom.wireframe.toggleAttribute("disabled", disabled);
            this._dom.legend.textContent = label;
            this._dom.description.textContent = description;
            this._dom.description.hidden = description === "";
            return;
        }

        const styles = document.createElement("style");

        styles.textContent = `
        
        :host {
        display: block;
        font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif;
        box-sizing: border-box;
        margin-bottom: 1rem;
        }
        legend{
        font-family: inherit;
        font-size: var(--input-label-fontsize, 0.8rem);
        font-weight: var(--input-label-fontweight, 400);
        text-transform: uppercase;
        margin-left:-1em;
        }
        fieldset{
        border: var(--input-border, 1px solid #c8c8c8);
        border-radius: 0.2rem;
        padding: 2rem;
        }

        .fieldset-description {
        margin: 0 0 var(--juice-forms-gap, 2rem);
        color: var(--input-fieldset-description-color, #666);
        font-size: var(--input-fieldset-description-fontsize, 0.9rem);
        line-height: 1.5;
        }

        .fields {
        --layout-columns: 1;
        display: grid;
        grid-template-columns: repeat(var(--layout-columns), minmax(0, 1fr));
        gap: var(--juice-forms-gap, 2rem);
        align-items: start;
        container-type: inline-size;
        }

        slot {
        display: contents;
        }

        ::slotted(*) {
            min-width: 0;
            grid-column: var(--layout-column, span 1);
            margin-bottom: 0rem;
        }
        
        `;

        const fieldset = document.createElement("fieldset");
        if (disabled) fieldset.setAttribute("disabled", "");
        this._dom.wireframe = fieldset;

        this._dom.wireframe.replaceChildren();
        const legend = document.createElement("legend");
        legend.textContent = label;
        if (disabled) legend.setAttribute("disabled", "");
        this._dom.wireframe.appendChild(legend);
        this._dom.legend = legend;

        const descriptionElement = document.createElement("p");
        descriptionElement.className = "fieldset-description";
        descriptionElement.textContent = description;
        descriptionElement.hidden = description === "";
        this._dom.wireframe.appendChild(descriptionElement);
        this._dom.description = descriptionElement;

        const fields = document.createElement("div");
        fields.className = "fields";
        const slot = document.createElement("slot");
        fields.appendChild(slot);
        this._dom.wireframe.appendChild(fields);
        this._dom.fields = fields;
        this._dom.slot = slot;

        this._shadowRoot.append(styles, this._dom.wireframe);
    }

    _startLayout() {
        if (!this._dom.fields) return;

        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (typeof ResizeObserver === "function") {
            this._resizeObserver = new ResizeObserver(() => this._applyLayout());
            this._resizeObserver.observe(this._dom.fields);
        } else {
            this._onWindowResize = this._onWindowResize || (() => this._applyLayout());
            window.addEventListener("resize", this._onWindowResize);
        }

        if (this._mutationObserver) this._mutationObserver.disconnect();
        this._mutationObserver = new MutationObserver(() => this._applyLayout());
        this._mutationObserver.observe(this, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["layout-span", "stacked"]
        });

        this._onConfigChange = this._onConfigChange || (() => this._applyLayout());
        document.addEventListener("juice:configchange", this._onConfigChange);
        this._dom.slot.addEventListener("slotchange", () => this._applyLayout(), { once: true });
        this._applyLayout();
    }

    _getLayoutConfig() {
        const formsConfig = getJuiceConfig("forms") || {};
        const layout = formsConfig.layout || {};
        return {
            gap: layout.gap || LAYOUT_DEFAULTS.gap,
            minColumnWidth: layout.minColumnWidth || layout.minWidth || LAYOUT_DEFAULTS.minColumnWidth,
            collapseAt: layout.collapseAt || LAYOUT_DEFAULTS.collapseAt,
            maxColumns: toPositiveInteger(
                this.getAttribute("layout-columns"),
                toPositiveInteger(layout.maxColumns, LAYOUT_DEFAULTS.maxColumns)
            )
        };
    }

    _measureLength(value, fallbackPx) {
        const cssValue = String(value || "").trim();
        if (!cssValue) return fallbackPx;

        const probe = document.createElement("div");
        probe.style.position = "fixed";
        probe.style.visibility = "hidden";
        probe.style.width = cssValue;
        document.body.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return Number.isFinite(width) && width > 0 ? width : fallbackPx;
    }

    _getBaseSpan(field) {
        if (field.hasAttribute("stacked")) return "full";

        const explicit = normalizeSpan(field.getAttribute("layout-span"));
        if (explicit) return explicit;

        const tag = field.tagName.toLowerCase();
        if (["input-textarea", "input-wysiwyg", "textarea", "option-group"].includes(tag)) {
            return "full";
        }
        return 1;
    }

    _applyLayout() {
        if (!this._dom.fields || !this.isConnected) return;

        const layout = this._getLayoutConfig();
        const width = this._dom.fields.getBoundingClientRect().width;
        if (!Number.isFinite(width) || width <= 0) return;

        const gapPx = this._measureLength(layout.gap, 16);
        const minColumnPx = this._measureLength(layout.minColumnWidth, 256);
        const collapseAtPx = this._measureLength(layout.collapseAt, 672);
        let columns = 1;

        if (width > collapseAtPx) {
            const available = Math.floor((width + gapPx) / (Math.max(1, minColumnPx) + gapPx));
            columns = Math.max(1, Math.min(layout.maxColumns, available || 1));
        }

        this._dom.fields.style.setProperty("--layout-columns", String(columns));
        this.setAttribute("layout-active-columns", String(columns));

        const fields = this._dom.slot.assignedElements({ flatten: true });
        fields.forEach((field) => {
            const base = this._getBaseSpan(field);
            if (base === "full") {
                field.style.setProperty("--layout-column", "1 / -1");
                return;
            }

            const span = Math.min(base, columns);
            field.style.setProperty("--layout-column", `span ${span}`);
        });
    }
}

customElements.define("input-fieldset", InputFieldset);
