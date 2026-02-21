import { isPlainObject, looksLikeStyleMap, mergeStyleMaps, toKebabCase, makeCSSString } from "./component-util.js";

class InputFieldset extends HTMLElement {
    static get observedAttributes() {
        return ["disabled", "label"];
    }

    constructor() {
        super({});
        this._shadowRoot = this._shadowRoot || this.attachShadow({ mode: "open" });
        this._dom = {};
    }

    connectedCallback() {
        this._renderWireframe();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "disabled" || name === "label") {
            this._renderWireframe();
        }
    }

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
        }
        fieldset{
        border: var(--input-border, 1px solid #c8c8c8);
        border-radius: 0.2rem;
        padding: 1rem;
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
