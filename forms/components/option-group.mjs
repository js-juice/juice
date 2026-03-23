

/**
 * AUTODOC:START
 * Component: <option-group>
 * Class: OptionGroup
 * Overview: Declarative option-group wrapper that turns child `<option>` nodes into generated radio or checkbox controls.
 *
 * Features:
 * - Supports `radio` and `checkbox` generation modes.
 * - Keeps generated control state synchronized back to source options.
 * - Observes child option mutations and re-renders automatically.
 * - Optional visible group label with host styling hooks.
 *
 * Example:
 * `<option-group mode="radio" name="size" label="Size"><option value="s">Small</option></option-group>`
 *
 * Attribute Reference:
 * - `mode`: `radio` or `checkbox` control generation mode.
 * - `name`: Group name applied to generated controls.
 * - `disabled`: Disables all generated controls.
 * - `label`: Group caption shown above options.
 *
 * Property Reference:
 * - `styles`: Internal style map used to build shadow styles.
 *
 * CSS Variables:
 * - `--form-label-weight`, `--form-label-color`: Group label typography and color.
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

import { makeCSSString } from "./component-util.mjs";

class OptionGroup extends HTMLElement {
    // TODO(refactor): Unify generated-option synchronization and observer wiring in a small controller helper.
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return ["mode", "name", "disabled", "label"];
    }

    /**
        * Returns the style map used to build component CSS.
     * @returns {*} Style definition map.
     */
    get styles() {
        return {
            ":host": {
                display: "block",
                marginBottom: "1rem"
            },
            ".option-group-label": {
                display: "block",
                fontWeight: "bold",
                marginBottom: "0.5rem",
                fontFamily: "system-ui,Segoe UI,Roboto,Arial,sans-serif",
                fontSize: "0.7rem",
                marginBottom: "1rem",
                textTransform: "uppercase",
                fontWeight: "var(--form-label-weight, bold)",
                color: "var(--form-label-color, #48484A)"
            },
            ".option-group-generated": {
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
            }
        };
    }

    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({});
        this._dom = {
            generated: null
        };
        this._optionObserver = null;

        this._shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = makeCSSString(this.styles);

        const optionWrapper = document.createElement("div");
        optionWrapper.className = "option-group";

        this._dom.optionsWrapper = optionWrapper;

        const slot = document.createElement("slot");
        this._shadow.appendChild(style);
        this._shadow.appendChild(optionWrapper);
        this._dom.optionsWrapper.appendChild(slot);
    }

    /**
      * Ensures label exists and is ready for use.
     * @returns {*} void.
     */
    _ensureLabel() {
        const label = this.getAttribute("label");
        if (label) {
            if (!this._dom.label) {
                const labelEl = document.createElement("label");
                labelEl.className = "option-group-label";
                labelEl.textContent = label;
                labelEl.setAttribute("part", "label");
                this._shadow.insertBefore(labelEl, this._dom.optionsWrapper);
                this._dom.label = labelEl;
            } else {
                this._dom.label.textContent = label;
            }
        } else {
            if (this._dom.label) {
                this._dom.label.remove();
                this._dom.label = null;
            }
        }
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        this._ensureGeneratedContainer();
        this._hideOptionPlaceholders();
        this._renderGeneratedControls();
        this._startObserver();
        this._ensureLabel();
    }

    /**
     * Cleans up listeners and observers when the element is disconnected.
     * @returns {*} void.
     */
    disconnectedCallback() {
        if (this._optionObserver) this._optionObserver.disconnect();
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
        if (name === "label") {
            this._ensureLabel();
        }
        if (name === "mode" || name === "name" || name === "disabled") {
            this._renderGeneratedControls();
        }
    }

    /**
      * Starts mutation observers needed for runtime slot/child updates.
     * @returns {*} void.
     */
    _startObserver() {
        if (this._optionObserver) this._optionObserver.disconnect();
        this._optionObserver = new MutationObserver(() => {
            this._hideOptionPlaceholders();
            this._renderGeneratedControls();
        });
        this._optionObserver.observe(this, { childList: true, subtree: false, attributes: true });
    }

    /**
      * Ensures generated container exists and is ready for use.
     * @returns {*} void.
     */
    _ensureGeneratedContainer() {
        if (this._dom.generated && this._dom.generated.parentNode === this) return;
        const container = document.createElement("div");
        container.className = "option-group-generated";
        this.appendChild(container);
        this._dom.generated = container;

        container.addEventListener("change", () => {
            this._syncOptionsFromGenerated();
            this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        });

        container.addEventListener("input", () => {
            this._syncOptionsFromGenerated();
            this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        });
    }

    /**
       * Hides placeholder options from rendered custom option lists.
     * @returns {*} Derived internal value or completion status.
     */
    _hideOptionPlaceholders() {
        const options = this._getSourceOptions();
        for (let i = 0; i < options.length; i += 1) {
            options[i].hidden = true;
            options[i].setAttribute("aria-hidden", "true");
        }
    }

    /**
      * Returns derived source options state.
     * @returns {*} Derived value.
     */
    _getSourceOptions() {
        return Array.from(this.querySelectorAll(":scope > option"));
    }

    /**
      * Renders generated controls UI content.
     * @returns {*} void.
     */
    _renderGeneratedControls() {
        if (!this._dom.generated) return;
        const mode = this.getAttribute("mode") || "radio";
        const name = this.getAttribute("name") || "";
        const disabled = this.hasAttribute("disabled");
        const options = this._getSourceOptions();

        this._dom.generated.replaceChildren();
        if (mode !== "radio" && mode !== "checkbox") return;

        const tagName = mode === "radio" ? "input-radio" : "input-checkbox";
        for (let i = 0; i < options.length; i += 1) {
            const opt = options[i];
            const input = document.createElement(tagName);
            input.setAttribute("name", name);
            input.setAttribute("value", opt.value || opt.textContent.trim());
            input.setAttribute("label", opt.textContent.trim());
            if (opt.hasAttribute("selected")) input.setAttribute("checked", "");
            if (disabled) input.setAttribute("disabled", "");
            this._dom.generated.appendChild(input);
        }
    }

    /**
      * Synchronizes options from generated between state, attributes, and UI.
     * @returns {*} void.
     */
    _syncOptionsFromGenerated() {
        const mode = this.getAttribute("mode") || "radio";
        const options = this._getSourceOptions();
        const rendered = this._dom.generated ? Array.from(this._dom.generated.children) : [];

        for (let i = 0; i < options.length; i += 1) {
            const option = options[i];
            const control = rendered[i];
            if (!control) continue;

            if (mode === "radio") {
                if (control.checked) option.setAttribute("selected", "");
                else option.removeAttribute("selected");
            } else if (mode === "checkbox") {
                if (control.checked) option.setAttribute("selected", "");
                else option.removeAttribute("selected");
            }
        }
    }
}

customElements.define("option-group", OptionGroup);

export default OptionGroup;
