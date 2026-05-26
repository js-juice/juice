/**
 * AUTODOC:START
 * Component: <input-select>
 * Class: InputSelect
 * Overview: Select/dropdown component that supports both native `<select>` mode and custom listbox mode.
 *
 * Features:
 * - Reads options from child `<option>` nodes or an `options` attribute payload.
 * - Switches between native and custom rendering with `force-native`.
 * - Maintains form value synchronization and emits native-like input/change events.
 * - Automatically observes option-list mutations and re-renders.
 *
 * Example:
 * `<input-select label="Country" options="US:United States,CA:Canada"></input-select>`
 *
 * Attribute Reference:
 * - `options`: JSON, object path, or CSV/colon syntax describing available options.
 * - `force-native`: Forces native `<select>` rendering instead of custom dropdown UI.
 * - `value`: Selected option value.
 * - `default`: Placeholder text used by custom dropdown mode.
 *
 * Property Reference:
 * - `value`: Getter/setter for selected value across native/custom modes.
 *
 * CSS Variables:
 * - `--form-accent-color`: Shared accent color fallback for selected and arrow states.
 * - `--select-arrow-color`: Arrow color for custom dropdown tab.
 * - `--selected-option-bg`, `--selected-option-color`: Selected option colors in custom list mode.
 * - `--input-border-radius`, `--input-height`: Control radius and dropdown vertical alignment.
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `input-wrapper` (inherited from InputComponent).
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";

/**
 * Style Vars
 * --form-accent-color: Accent color for the form, used for dropdown arrow and selected option background.
 * --selected-option-bg: Background color for the selected option in custom dropdown mode.
 * --selected-option-color: Text color for the selected option in custom dropdown mode.
 */

function parseOptionItem(option) {
    if (typeof option === "string") {
        if (option.includes(":")) {
            const parts = option.split(":").map((s) => s.trim());
            const value = parts[0] || "";
            const label = parts[1] || value;
            const description = parts.length > 2 ? parts.slice(2).join(":").trim() : "";
            return { value, label, description };
        }
        return { value: option, label: option, description: "" };
    }
    if (option && typeof option === "object" && option.value !== undefined) {
        return {
            value: String(option.value),
            label: String(option.label ?? option.value),
            description: String(option.description ?? "")
        };
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
        return Object.entries(options).map(([value, label]) => ({ value, label: String(label), description: "" }));
    }

    return [];
}

class InputSelect extends InputComponent {
    // TODO(refactor): Consolidate option-source parsing and dropdown interaction state into dedicated helpers.
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return [...super.observedAttributes, "options", "force-native", "editable"];
    }

    /**
     * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super({ _layout: "label:input:>:native:status:div.edit-tab:div.tab:<:validation" });
        this.inputType = "select";
        this.syncCharWidth = false;
        this._options = [];
        this.selected = { value: "", label: "", description: "" };
        this._optionList = null;
        this._optionObserver = null;
        this._customBoundNative = null;
        this._customBoundList = null;
        this._nativeChangeHandler = null;
        this._descriptionEl = null;
        this._viewportListener = null;
        this._scrollParents = [];
        this._openIntent = false;
        this._editingCustomValue = false;
    }

    /**
     * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    get _styles() {
        return {
            ":host": {
                cursor: "pointer",
                position: "relative"
            },
            label: {
                marginBottom: "0.25rem"
            },
            ".input-wrapper": {
                padding: 0,
                background: "#FFFFFF",
                borderRadius: "var(--input-border-radius, 5px)",
                userSelect: "none",
                cursor: "pointer"
            },
            ":host(.open-below) .input-wrapper": {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0
            },
            ":host(.open-above) .input-wrapper": {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0
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
                background: "var(--select-arrow-color, var(--form-accent-color, #0059ff))",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
            },
            ".edit-tab": {
                display: "none",
                position: "relative",
                flex: "0 0 auto",
                width: "var(--input-height)",
                height: "var(--input-height)",
                borderLeft: "1px solid #c8c8c8",
                background: "linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%)"
            },
            ":host([editable]) .edit-tab": {
                display: "block"
            },
            ":host(.editing-custom-value) .edit-tab": {
                background: "var(--form-accent-color, #0059ff)"
            },
            ".select-edit": {
                display: "grid",
                placeItems: "center",
                width: "100%",
                height: "100%",
                padding: 0,
                border: 0,
                background: "transparent",
                color: "var(--form-accent-color, #0059ff)",
                cursor: "text"
            },
            ":host(.editing-custom-value) .select-edit": {
                color: "#ffffff"
            },
            ".select-edit svg": {
                display: "block",
                width: "16px",
                height: "16px"
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
                borderRadius: "var(--input-border-radius, 5px)",
                backgroundColor: "#ffffff",
                position: "absolute",
                width: "auto",
                zIndex: "10000",
                maxHeight: "300px",
                overflowY: "auto",
                boxSizing: "border-box",
                display: "none"
            },
            ":host(.open-below) .select-options": {
                borderRadius: "0 0 var(--input-border-radius, 5px) var(--input-border-radius, 5px)"
            },
            ":host(.open-above) .select-options": {
                borderRadius: "var(--input-border-radius, 5px) var(--input-border-radius, 5px) 0 0"
            },
            ".select-options.open": {
                display: "block"
            },
            ".select-options li": {
                color: "#333333",
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
            ".select-description": {
                marginTop: "0.35rem",
                fontSize: "0.82rem",
                lineHeight: "1.35",
                color: "var(--input-help-color, #64748b)",
                minHeight: "1.1em"
            },
            ".select-description:empty": {
                display: "none"
            },
            "::slotted(option)": {
                display: "none"
            }
        };
    }

    /**
     * Returns whether the select should delegate to native rendering mode.
     * @returns {*} Boolean state value.
     */
    _useNativeMode() {
        return this.hasAttribute("force-native");
    }

    /**
     * Creates the hidden native input used for form integration.
     * @returns {*} Configured native input element.
     */
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

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        super.connectedCallback();
        this._startOptionObserver();
    }

    /**
     * Cleans up listeners and observers when the element is disconnected.
     * @returns {*} void.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._optionObserver) this._optionObserver.disconnect();
        this._stopViewportListeners();
        this._closeOptionList();
    }

    _startViewportListeners() {
        if (this._viewportListener) return;
        this._viewportListener = () => {
            this._positionOptionList();
        };
        window.addEventListener("scroll", this._viewportListener, true);
        window.addEventListener("resize", this._viewportListener);

        this._scrollParents = this._getScrollAncestors();
        for (let i = 0; i < this._scrollParents.length; i += 1) {
            this._scrollParents[i].addEventListener("scroll", this._viewportListener);
        }
    }

    _stopViewportListeners() {
        if (!this._viewportListener) return;
        window.removeEventListener("scroll", this._viewportListener, true);
        window.removeEventListener("resize", this._viewportListener);
        for (let i = 0; i < this._scrollParents.length; i += 1) {
            this._scrollParents[i].removeEventListener("scroll", this._viewportListener);
        }
        this._scrollParents = [];
        this._viewportListener = null;
    }

    _walkAncestors(visitor) {
        const inputEl = this._wireframe?.input;
        if (!inputEl || typeof visitor !== "function") return;

        const getNextAncestor = (current) => {
            if (!current) return null;
            if (current.parentElement) return current.parentElement;
            const root = current.getRootNode?.();
            if (root && root.host) return root.host;
            return null;
        };

        let node = getNextAncestor(inputEl);
        while (node && node !== document.body && node !== document.documentElement) {
            visitor(node);
            node = getNextAncestor(node);
        }
    }

    _getScrollAncestors() {
        const ancestors = [];
        this._walkAncestors((node) => {
            const style = window.getComputedStyle(node);
            const overflowY = style?.overflowY || "visible";
            const overflowX = style?.overflowX || "visible";
            const isScrollableY = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
            const isScrollableX = overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay";
            if (isScrollableY || isScrollableX) {
                ancestors.push(node);
            }
        });

        return ancestors;
    }

    _getScrollClipRect() {
        const viewportRect = {
            top: 0,
            left: 0,
            right: window.innerWidth || document.documentElement.clientWidth,
            bottom: window.innerHeight || document.documentElement.clientHeight
        };

        let clipRect = { ...viewportRect };
        this._walkAncestors((node) => {
            const style = window.getComputedStyle(node);
            const overflowY = style?.overflowY || "visible";
            const overflowX = style?.overflowX || "visible";
            const isScrollableY = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
            const isScrollableX = overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay";
            const isClippedY = overflowY === "hidden" || overflowY === "clip";
            const isClippedX = overflowX === "hidden" || overflowX === "clip";

            if (isScrollableY || isScrollableX || isClippedY || isClippedX) {
                const rect = node.getBoundingClientRect();
                clipRect.top = Math.max(clipRect.top, rect.top);
                clipRect.left = Math.max(clipRect.left, rect.left);
                clipRect.right = Math.min(clipRect.right, rect.right);
                clipRect.bottom = Math.min(clipRect.bottom, rect.bottom);
            }
        });

        if (clipRect.right < clipRect.left) {
            clipRect.right = clipRect.left;
        }
        if (clipRect.bottom < clipRect.top) {
            clipRect.bottom = clipRect.top;
        }

        return clipRect;
    }

    _closeOptionList(options = {}) {
        const { keepViewportListeners = false, preserveIntent = false } = options;
        if (this._optionList) {
            this._optionList.classList.remove("open");
        }
        this.style.zIndex = "";
        this.classList.remove("open-below", "open-above");
        this.expanded = false;
        if (!preserveIntent) {
            this._openIntent = false;
        }
        if (!keepViewportListeners) {
            this._stopViewportListeners();
        }
    }

    _positionOptionList() {
        if (!this._optionList) return;

        if (!this.expanded) {
            const inputRect = this._wireframe?.input?.getBoundingClientRect?.() || this.getBoundingClientRect();
            const clipRect = this._getScrollClipRect();
            const isVisible = inputRect.bottom > clipRect.top && inputRect.top < clipRect.bottom;
            if (this._openIntent && isVisible) {
                this.style.zIndex = "100000";
                this._optionList.classList.add("open");
                this.expanded = true;
            } else {
                return;
            }
        }

        const hostRect = this.getBoundingClientRect();
        const inputRect = this._wireframe?.input?.getBoundingClientRect?.() || hostRect;
        const clipRect = this._getScrollClipRect();

        // Close once the trigger leaves its effective visible scroll area.
        if (inputRect.bottom <= clipRect.top || inputRect.top >= clipRect.bottom) {
            this._closeOptionList({ keepViewportListeners: true, preserveIntent: true });
            return;
        }

        const bottomSpace = clipRect.bottom - inputRect.bottom;
        const topSpace = inputRect.top - clipRect.top;
        const listHeight = Math.max(0, this._optionList.scrollHeight || 0);

        this.classList.remove("open-below", "open-above");

        const useAbove = topSpace > bottomSpace && listHeight > bottomSpace;

        // Use fixed positioning with viewport coordinates so the list escapes
        // any overflow:hidden/auto scroll container that would clip it.

        this._optionList.style.minWidth = `${inputRect.width}px`;

        if (useAbove) {
            const maxH = Math.max(60, topSpace - 4);
            this._optionList.style.maxHeight = `${maxH}px`;
            this._optionList.style.bottom = `100%`;
            this._optionList.style.top = "";
            this.classList.add("open-above");
        } else {
            const maxH = Math.max(60, bottomSpace - 4);
            this._optionList.style.maxHeight = `${maxH}px`;
            this._optionList.style.top = `100%`;
            this._optionList.style.bottom = "";
            this.classList.add("open-below");
        }
    }

    /**
     * Responds to observed attribute changes and synchronizes state.
     * @param {*} name - Attribute or field name.
     * @param {*} oldValue - Previous value.
     * @param {*} newValue - Next value.
     * @returns {*} void.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "force-native" && oldValue !== newValue) {
            this._replaceNativeControl(this._createNativeControl());
            this._renderTemplateOrDefault();
            this._afterConnected();
            return;
        }

        super.attributeChangedCallback(name, oldValue, newValue);

        if (name === "value" && oldValue !== newValue) {
            const normalized = newValue == null ? "" : String(newValue);
            this._setSelectedByValue(normalized);
            if (this._dom.native && !this._useNativeMode()) {
                this._dom.native.value = this.selected.label;
            }
            this._updateFormValue();
            this._syncSelectedDescription();
        }

        if (name === "options" && oldValue !== newValue) {
            this._refreshOptions();
        }
    }

    /**
     * Performs post-connect setup after the component has its default DOM nodes.
     * @returns {*} void.
     */
    _afterConnected() {
        if (!this._descriptionEl) {
            this._descriptionEl = document.createElement("div");
            this._descriptionEl.className = "select-description";
            this._descriptionEl.setAttribute("aria-live", "polite");
        }
        if (this._descriptionEl.parentNode !== this._wireframe.root) {
            this._wireframe.root.appendChild(this._descriptionEl);
        }
        this._refreshOptions();
        this._bindCustomDropdownEvents();
    }

    /**
     * Builds the custom dropdown list container for non-native mode.
     * @returns {*} void.
     */
    _renderDefault() {
        if (this._optionList && this._optionList.parentNode) {
            this._optionList.parentNode.removeChild(this._optionList);
        }
        this._optionList = null;

        if (!this._descriptionEl) {
            this._descriptionEl = document.createElement("div");
            this._descriptionEl.className = "select-description";
            this._descriptionEl.setAttribute("aria-live", "polite");
        }
        if (this._descriptionEl.parentNode !== this._wireframe.root) {
            this._wireframe.root.appendChild(this._descriptionEl);
        }

        if (this._useNativeMode()) return;

        this._optionList = document.createElement("ul");
        this._optionList.className = "select-options";
        this._wireframe.root.appendChild(this._optionList);

        const editTab = this._wireframe.root.querySelector(".edit-tab");
        if (editTab && !editTab.querySelector(".select-edit")) {
            const edit = document.createElement("button");
            edit.type = "button";
            edit.className = "select-edit";
            edit.setAttribute("aria-label", "Edit value");
            edit.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.8 1.6 14.4 4.2 5.6 13H3v-2.6l8.8-8.8Zm-.9 2.3L4 10.8V12h1.2l6.9-6.9-1.2-1.2Z"/></svg>`;
            editTab.appendChild(edit);
            this._editButton = edit;
        }
    }

    _setSelectedByValue(value) {
        const normalized = value == null ? "" : String(value);
        const option = this._options.find((o) => o.value === normalized) || null;
        this.selected = {
            value: normalized,
            label: option ? option.label : this.hasAttribute("editable") ? normalized : "",
            description: option ? option.description || "" : ""
        };
    }

    /**
     * Starts option observers so option list changes are reflected immediately.
     * @returns {*} void.
     */
    _startOptionObserver() {
        if (this._optionObserver) this._optionObserver.disconnect();
        this._optionObserver = new MutationObserver(() => this._refreshOptions());
        this._optionObserver.observe(this, { childList: true, subtree: false });
    }

    /**
     * Builds normalized option data from configured sources.
     * @returns {*} Derived value.
     */
    _readOptions() {
        const childOptions = Array.from(this.querySelectorAll(":scope > option")).map((option) => ({
            value: option.value || option.textContent.trim(),
            label: option.textContent.trim(),
            description: option.getAttribute("description") || option.dataset.description || "",
            selected: option.hasAttribute("selected")
        }));
        if (childOptions.length) return childOptions;

        if (this.hasAttribute("options")) {
            return parseSelectOptions(this.getAttribute("options")).map((item) => ({ ...item, selected: false }));
        }
        return [];
    }

    /**
     * Rebuilds option UI and selection state from current option data.
     * @returns {*} void.
     */
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
                description: "",
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
                    this.selected = {
                        value: optionData.value,
                        label: optionData.label,
                        description: optionData.description || ""
                    };
                }

                this._optionList.appendChild(li);

                maxLen = Math.max(maxLen, optionData.label.length);
            }

            this._selectOptionByValue(this.selected.value);
        }

        // this._dom.native.style.width = `calc(${maxLen}ch + 1.5rem)`;

        const attrValue = this.getAttribute("value");
        if (attrValue !== null) {
            this.value = attrValue;
        } else {
            const selected = this._options.find((o) => o.selected);
            if (selected) this.value = selected.value;
        }

        if (this._useNativeMode() && this._dom.native) {
            this._setSelectedByValue(this._dom.native.value);
        }

        this._syncSelectedDescription();
    }

    /**
     * Selects and activates the option matching a value.
     * @param {*} value - Raw value being normalized or assigned.
     * @returns {*} void.
     */
    _selectOptionByValue(value) {
        const normalized = value == null ? "" : String(value);
        const option = this._options.find((o) => o.value === normalized);
        if (!option) return;

        this._setSelectedByValue(option.value);

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

        this._syncSelectedDescription();
    }

    _syncSelectedDescription() {
        if (!this._descriptionEl) {
            this._descriptionEl = document.createElement("div");
            this._descriptionEl.className = "select-description";
            this._descriptionEl.setAttribute("aria-live", "polite");
        }
        if (this._descriptionEl.parentNode !== this._wireframe.root) {
            this._wireframe.root.appendChild(this._descriptionEl);
        }
        this._descriptionEl.textContent = this.selected.description || this.getAttribute("description") || "";
    }

    _onNativeInputEvent() {
        if (!this._editingCustomValue) return;
        this.selected = { value: this._dom.native.value, label: this._dom.native.value, description: "" };
    }

    /**
     * Opens or closes the custom option list UI.
     * @returns {*} void.
     */
    _expandOptionList() {
        if (!this._optionList) return;
        if (this.expanded) {
            this._closeOptionList();
            return;
        }
        this.style.zIndex = "2147483647";
        this._openIntent = true;
        this._optionList.classList.add("open");
        this.expanded = true;
        this._startViewportListeners();
        this._positionOptionList();
    }

    /**
     * Wires dropdown open/close, option click, and keyboard interactions.
     * @returns {*} void.
     */
    _bindCustomDropdownEvents() {
        if (this._dom.native) {
            if (this._nativeChangeHandler) {
                this._dom.native.removeEventListener("change", this._nativeChangeHandler);
            }
            this._nativeChangeHandler = () => {
                if (this._useNativeMode()) {
                    this._setSelectedByValue(this._dom.native?.value ?? "");
                    this._syncSelectedDescription();
                }
            };
            this._dom.native.addEventListener("change", this._nativeChangeHandler);
        }

        if (this._useNativeMode() || !this._dom.native || !this._optionList) return;
        if (this._customBoundNative === this._dom.native && this._customBoundList === this._optionList) return;
        this._customBoundNative = this._dom.native;
        this._customBoundList = this._optionList;
        this._dom.native.readOnly = true;

        this._wireframe.input.addEventListener("click", () => {
            if (this._editingCustomValue) return;
            this._expandOptionList();
        });

        this._dom.native.addEventListener("focus", () => {
            if (this._editingCustomValue) return;
            this._expandOptionList();
        });

        this._dom.native.addEventListener("input", () => {
            if (!this._editingCustomValue) return;
            this.selected = { value: this._dom.native.value, label: this._dom.native.value, description: "" };
        });

        this._dom.native.addEventListener("blur", () => {
            setTimeout(() => {
                if (this._editingCustomValue) {
                    this.selected = { value: this._dom.native.value, label: this._dom.native.value, description: "" };
                    this._editingCustomValue = false;
                    this.classList.remove("editing-custom-value");
                    this._dom.native.readOnly = true;
                    this._syncHostFromNative();
                    this._updateFormValue();
                    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                }
                this._closeOptionList();
            }, 120);
        });

        this._editButton?.addEventListener("click", (event) => {
            if (!this.hasAttribute("editable")) return;
            event.preventDefault();
            event.stopPropagation();
            this._closeOptionList();
            this._editingCustomValue = true;
            this.classList.add("editing-custom-value");
            this._dom.native.readOnly = false;
            this._dom.native.value = this.selected.value || this._dom.native.value || "";
            this._dom.native.focus();
            this._dom.native.select();
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
            this._closeOptionList();
            this._syncSelectedDescription();
        });
    }

    /**
     * Returns derived form value state.
     * @returns {*} Derived value.
     */
    _getFormValue() {
        if (this._useNativeMode()) {
            return super._getFormValue();
        }
        return this.selected && typeof this.selected.value === "string" ? this.selected.value : "";
    }

    /**
     * Returns the current component value.
     * @returns {*} Current value.
     */
    get value() {
        if (this._useNativeMode()) {
            return super.value;
        }
        return this.selected && typeof this.selected.value === "string" ? this.selected.value : "";
    }

    /**
     * Updates the `value` value.
     * @param {*} value - Assigned value.
     * @returns {*} void
     */
    set value(value) {
        if (this._useNativeMode()) {
            super.value = value;
            return;
        }

        const normalized = value == null ? "" : String(value);
        this._setSelectedByValue(normalized);

        if (this.getAttribute("value") !== normalized) {
            this.setAttribute("value", normalized);
        } else {
            this._updateFormValue();
            this._queueValidation();
        }

        if (this._dom.native) {
            this._dom.native.value = this.selected.label;
        }

        this._syncSelectedDescription();
    }
}

customElements.define("input-select", InputSelect);

export default InputSelect;
