import InputComponent from "./input-component.js";

function parseOptionItem(option) {
    if (typeof option === "string") {
        if (option.includes(":")) {
            const [value, label] = option.split(":").map((s) => s.trim());
            return { value, label };
        }
        return { value: option, label: option };
    }
    if (option && typeof option === "object" && option.value !== undefined) {
        return { value: String(option.value), label: String(option.label ?? option.value) };
    }
    return null;
}

function parseSelectOptions(options) {
    if (typeof options === "string") {
        try {
            options = JSON.parse(options);
        } catch (_error) {
            if (!options.trim()) return [];
            if (options.includes(",")) {
                options = options
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
            } else if (options.includes(".")) {
                const pathParts = options.split(".");
                let resolved = window;
                for (let i = 0; i < pathParts.length; i += 1) {
                    resolved = resolved[pathParts[i]];
                    if (resolved === undefined) return [];
                }
                options = resolved;
            } else {
                options = [options];
            }
        }
    }

    if (Array.isArray(options)) {
        return options.map(parseOptionItem).filter(Boolean);
    }

    if (options && typeof options === "object") {
        return Object.entries(options).map(([value, label]) => ({ value, label: String(label) }));
    }

    return [];
}

class InputSelect extends InputComponent {
    static get observedAttributes() {
        return [...super.observedAttributes, "options", "force-native"];
    }

    constructor() {
        super({ _layout: "label:input:>:native:status:div.tab:<:validation" });
        this.inputType = "select";
        this._options = [];
        this.selected = { value: "", label: "" };
        this._optionList = null;
        this._optionObserver = null;
        this._customBoundNative = null;
        this._customBoundList = null;
    }

    get _styles() {
        return {
            ":host": {
                cursor: "pointer"
            },
            ".input-wrapper": {
                padding: 0
            },
            input: {
                userSelect: "none",
                cursor: "pointer"
            },
            ".tab": {
                position: "relative",
                flex: "0 0 auto",
                width: "var(--input-height)",
                height: "var(--input-height)",
                borderLeft: "1px solid #c8c8c8",
                background: "linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%)"
            },
            ".tab::after": {
                content: "''",
                display: "block",
                position: "absolute",
                "--s": "40%",
                width: "50%",
                aspectRatio: "5/3",
                clipPath: "polygon(0 0,0 var(--s),50% 100%,100% var(--s),100% 0,50% calc(100% - var(--s)))",
                background: "var(--form-accent-color, #0059ff)",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
            },
            ":host(.has-validation) .tab::after": {
                background: "var(--validation-color, var(--form-accent-color), #0059f)"
            },
            ".input-wrapper .status-wrapper": {
                position: "relative",
                right: "none",
                top: "none"
            },
            ".select-options": {
                listStyle: "none",
                margin: "0",
                padding: "0",
                border: "1px solid #c8c8c8",
                backgroundColor: "#ffffff",
                position: "absolute",
                width: "100%",
                zIndex: "10",
                maxHeight: "12rem",
                overflowY: "auto",
                boxSizing: "border-box",
                display: "none"
            },
            ".select-options.open": {
                display: "block"
            },
            ".select-options li": {
                padding: "0.3rem 0.45rem",
                cursor: "pointer",
                fontSize: "0.9rem",
                borderBottom: "1px solid #c8c8c8"
            },
            ".select-options li:hover": {
                backgroundColor: "#efefef"
            },
            ".select-options li.selected": {
                backgroundColor: "var(--selected-option-bg, var(--form-accent-color, #0059ff))",
                color: "var(--selected-option-color, #ffffff)"
            },
            "::slotted(option)": {
                display: "none"
            }
        };
    }

    _useNativeMode() {
        return this.hasAttribute("force-native");
    }

    _createNativeControl() {
        if (this._useNativeMode()) {
            return document.createElement("select");
        }

        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.setAttribute("readonly", "readonly");
        input.setAttribute("form", "none");
        input.classList.add("native");
        this._dom.labelValue = input;

        this._dom.native = input;
        return input;
    }

    connectedCallback() {
        super.connectedCallback();
        this._startOptionObserver();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._optionObserver) this._optionObserver.disconnect();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "force-native" && oldValue !== newValue) {
            this._replaceNativeControl(this._createNativeControl());
            this._renderTemplateOrDefault();
            this._refreshOptions();
            this._bindCustomDropdownEvents();
            return;
        }

        super.attributeChangedCallback(name, oldValue, newValue);

        if (name === "value" && oldValue !== newValue && !this._useNativeMode()) {
            const normalized = newValue == null ? "" : String(newValue);
            const option = this._options.find((o) => o.value === normalized) || null;
            this.selected = {
                value: normalized,
                label: option ? option.label : ""
            };
            if (this._dom.native) {
                this._dom.native.value = this.selected.label;
            }
            this._updateFormValue();
        }

        if (name === "options" && oldValue !== newValue) {
            this._refreshOptions();
        }
    }

    _afterConnected() {
        this._refreshOptions();
        this._bindCustomDropdownEvents();
    }

    _renderDefault() {
        if (this._optionList && this._optionList.parentNode) {
            this._optionList.parentNode.removeChild(this._optionList);
        }
        this._optionList = null;

        if (this._useNativeMode()) return;

        this._optionList = document.createElement("ul");
        this._optionList.className = "select-options";
        this._wireframe.root.appendChild(this._optionList);
    }

    _startOptionObserver() {
        if (this._optionObserver) this._optionObserver.disconnect();
        this._optionObserver = new MutationObserver(() => this._refreshOptions());
        this._optionObserver.observe(this, { childList: true, subtree: false });
    }

    _readOptionsFromChildren() {
        return Array.from(this.querySelectorAll(":scope > option")).map((option) => ({
            value: option.value || option.textContent.trim(),
            label: option.textContent.trim(),
            selected: option.hasAttribute("selected")
        }));
    }

    _readOptions() {
        const childOptions = this._readOptionsFromChildren();
        if (childOptions.length) return childOptions;

        if (this.hasAttribute("options")) {
            return parseSelectOptions(this.getAttribute("options")).map((item) => ({ ...item, selected: false }));
        }
        return [];
    }

    _refreshOptions() {
        let maxLen = 0;
        this._options = this._readOptions();
        if (!this._dom.native) return;
        let defaultValue;
        if (this.hasAttribute("default")) {
            defaultValue = this.getAttribute("default");
        }

        if (this._useNativeMode()) {
            this._dom.native.replaceChildren();
            for (let i = 0; i < this._options.length; i += 1) {
                const optionData = this._options[i];
                const option = document.createElement("option");
                option.value = optionData.value;
                option.textContent = optionData.label;
                if (optionData.selected) option.selected = true;
                this._dom.native.appendChild(option);
                maxLen = Math.max(maxLen, optionData.label.length);
            }
        } else if (this._optionList) {
            this._optionList.replaceChildren();
            this._options.unshift({
                label: defaultValue || "Select an option",
                value: "",
                selected: this.value === ""
            });
            for (let i = 0; i < this._options.length; i += 1) {
                const optionData = this._options[i];
                const li = document.createElement("li");
                li.dataset.value = optionData.value;
                li.textContent = optionData.label;
                if (optionData.selected) {
                    this.value = optionData.value;
                    li.classList.add("selected");
                    this._dom.labelValue.value = optionData.label;
                    this.selected = { value: optionData.value, label: optionData.label };
                }

                this._optionList.appendChild(li);

                maxLen = Math.max(maxLen, optionData.label.length);
            }

            this._selectOptionByValue(this.selected.value);
        }

        this._dom.native.style.width = `calc(${maxLen}ch + 1.5rem)`;

        const attrValue = this.getAttribute("value");
        if (attrValue !== null) {
            this.value = attrValue;
        } else {
            const selected = this._options.find((o) => o.selected);
            if (selected) this.value = selected.value;
        }
    }

    _selectOptionByValue(value) {
        const option = this._options.find((o) => o.value === value);
        if (!option) return;

        this.selected = { value: option.value, label: option.label };

        this.value = option.value;
        if (!this._useNativeMode()) {
            this._dom.native.value = option.label;
        }
        if (this._useNativeMode()) {
            const nativeOption = Array.from(this._dom.native.options).find((o) => o.value === option.value);
            if (nativeOption) nativeOption.selected = true;
        } else if (this._optionList) {
            const li = this._optionList.querySelector(`li[data-value="${option.value}"]`);
            if (li) {
                const currentlySelected = this._optionList.querySelector("li.selected");
                if (currentlySelected) currentlySelected.classList.remove("selected");
                li.classList.add("selected");
            }
        }
    }

    _bindCustomDropdownEvents() {
        if (this._useNativeMode() || !this._dom.native || !this._optionList) return;
        if (this._customBoundNative === this._dom.native && this._customBoundList === this._optionList) return;
        this._customBoundNative = this._dom.native;
        this._customBoundList = this._optionList;

        this._dom.native.addEventListener("focus", () => {
            if (this._optionList) this._optionList.classList.add("open");
        });

        this._dom.native.addEventListener("blur", () => {
            setTimeout(() => {
                if (this._optionList) this._optionList.classList.remove("open");
            }, 120);
        });

        this._optionList.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement) || target.tagName !== "LI") return;
            this._dom.native.blur();
            const value = target.dataset.value || "";
            this.value = value;
            this._selectOptionByValue(value);

            this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            this._optionList.classList.remove("open");
        });
    }

    _getFormValue() {
        if (this._useNativeMode()) {
            return super._getFormValue();
        }
        return this.selected && typeof this.selected.value === "string" ? this.selected.value : "";
    }

    get value() {
        if (this._useNativeMode()) {
            return super.value;
        }
        return this.selected && typeof this.selected.value === "string" ? this.selected.value : "";
    }

    set value(value) {
        if (this._useNativeMode()) {
            super.value = value;
            return;
        }

        const normalized = value == null ? "" : String(value);
        const option = this._options.find((o) => o.value === normalized) || null;
        this.selected = {
            value: normalized,
            label: option ? option.label : ""
        };

        if (this.getAttribute("value") !== normalized) {
            this.setAttribute("value", normalized);
        } else {
            this._updateFormValue();
            this._queueValidation();
        }

        if (this._dom.native) {
            this._dom.native.value = this.selected.label;
        }
    }
}

customElements.define("input-select", InputSelect);

export default InputSelect;
