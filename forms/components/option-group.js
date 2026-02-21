class OptionGroup extends HTMLElement {
    static get observedAttributes() {
        return ["mode", "name", "disabled"];
    }

    constructor() {
        super({});
        this._dom = {
            generated: null
        };
        this._optionObserver = null;
    }

    connectedCallback() {
        this._ensureGeneratedContainer();
        this._hideOptionPlaceholders();
        this._renderGeneratedControls();
        this._startObserver();
    }

    disconnectedCallback() {
        if (this._optionObserver) this._optionObserver.disconnect();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "mode" || name === "name" || name === "disabled") {
            this._renderGeneratedControls();
        }
    }

    _startObserver() {
        if (this._optionObserver) this._optionObserver.disconnect();
        this._optionObserver = new MutationObserver(() => {
            this._hideOptionPlaceholders();
            this._renderGeneratedControls();
        });
        this._optionObserver.observe(this, { childList: true, subtree: false, attributes: true });
    }

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

    _hideOptionPlaceholders() {
        const options = this._getSourceOptions();
        for (let i = 0; i < options.length; i += 1) {
            options[i].hidden = true;
            options[i].setAttribute("aria-hidden", "true");
        }
    }

    _getSourceOptions() {
        return Array.from(this.querySelectorAll(":scope > option"));
    }

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
