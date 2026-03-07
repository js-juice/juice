

/**
 * AUTODOC:START
 * Component: <input-fieldset>
 * Class: InputFieldset
 * Overview: Lightweight grouping container that wraps slotted form controls in a native `fieldset`/`legend` shell.
 *
 * Features:
 * - Applies consistent bordered group styling to related inputs.
 * - Supports optional legend text through a `label` attribute.
 * - Mirrors disabled state to underlying `<fieldset>` behavior.
 *
 * Example:
 * `<input-fieldset label="Address"><input-text name="city"></input-text></input-fieldset>`
 *
 * Attribute Reference:
 * - `label`: Text rendered in the legend.
 * - `disabled`: Disables the grouped controls by disabling the fieldset.
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

import { isPlainObject, looksLikeStyleMap, mergeStyleMaps, toKebabCase, makeCSSString } from "./component-util.js";

class InputFieldset extends HTMLElement {
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return ["disabled", "label"];
    }

    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({});
        this._shadowRoot = this._shadowRoot || this.attachShadow({ mode: "open" });
        this._dom = {};
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        this._renderWireframe();
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
        if (name === "disabled" || name === "label") {
            this._renderWireframe();
        }
    }

    /**
      * Renders wireframe UI content.
     * @returns {*} void.
     */
    _renderWireframe() {
        if (this._dom.wireframe) return;
        const label = this.getAttribute("label") || "";
        const disabled = this.hasAttribute("disabled");

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
        padding: 1rem;
        padding-top: 0.5rem;
        }

        ::slotted(*) {
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

        const slot = document.createElement("slot");
        this._dom.wireframe.appendChild(slot);

        this._shadowRoot.append(styles, this._dom.wireframe);
    }
}

customElements.define("input-fieldset", InputFieldset);
