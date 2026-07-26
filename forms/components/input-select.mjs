/*
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
 * - `view-type="select-bar"`: Renders options as an always-visible single-line segmented select bar.
 * - `select-bar-direction="row|column"`: Controls select-bar option flow direction.
 * - `compact`: Shows icons and option info only, hiding option labels.
 * - `hide-icons`, `hide-labels`, `hide-info`: Hide specific rendered option parts.
 * - `option-parts="icon label info"`: Explicit list of option parts to render.
 * - `wrap`: Allows select-bar options to wrap onto multiple lines.
 * - `value`: Selected option value.
 * - `default`: Placeholder text used by custom dropdown mode.
 *
 * Property Reference:
 * - `value`: Getter/setter for selected value across native/custom modes.
 *
 * CSS Variables:
 * - `--form-accent-color`: Shared accent color fallback for selected and arrow states.
 * - `--form-select-wrapper-bg`, `--form-select-wrapper-radius`: Select wrapper surface.
 * - `--form-select-tab-bg`, `--form-select-tab-border`, `--form-select-tab-arrow`: Dropdown tab styling.
 * - `--form-select-edit-tab-bg`, `--form-select-edit-tab-active-bg`: Editable-value tab styling.
 * - `--form-select-options-bg`, `--form-select-options-border`, `--form-select-options-radius`: Options list shell.
 * - `--form-select-option-item-*`: Option item host color, spacing, borders, hover, and selected states.
 * - `--form-select-option-display`, `--form-select-option-gap`, `--form-select-option-label-display`: Option child layout hooks.
 * - `--form-select-option-icon-*`: Option icon size, spacing, image fit, and color hooks.
 * - `--form-select-bar-direction`: Select-bar flex direction (`row` or `column`).
 * - `--form-select-description-*`: Selected-option description text.
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
            description: String(option.description ?? ""),
            icon: option.icon ?? option.iconSrc ?? option.iconUrl ?? ""
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

function isOptionIconUrl(icon) {
    const value = String(icon || "").trim();
    if (!value) return false;
    if (/^(https?:|data:|blob:|file:)/i.test(value)) return true;
    if (/^(\/|\.\/|\.\.\/)/.test(value)) return true;
    return /\.(svg|png|jpe?g|gif|webp|avif)([?#].*)?$/i.test(value);
}

function resolveOptionIcon(icon, options = {}) {
    const value = String(icon || "").trim();
    if (!value) return null;
    const type = value.startsWith("#") ? "element" : options.forceUrl || isOptionIconUrl(value) ? "url" : "class";
    return { type, value };
}

function createOptionIconElement(icon, label = "", options = {}) {
    const resolved = resolveOptionIcon(icon, options);
    if (!resolved) return null;

    if (resolved.type === "url") {
        const image = new Image();
        image.src = resolved.value;
        image.alt = "";
        image.title = label;
        image.className = "option-icon option-icon-image";
        image.setAttribute("part", "option-icon-content option-icon-image");
        image.setAttribute("aria-hidden", "true");
        image.setAttribute("slot", "icon");
        return image;
    }

    if (resolved.type === "element") {
        const source = document.getElementById(resolved.value.slice(1));
        const element = source ? source.cloneNode(true) : document.createElement("div");
        if (source) {
            element.removeAttribute("id");
        } else {
            element.id = resolved.value.slice(1);
        }
        element.classList.add("option-icon", "option-icon-element");
        element.setAttribute("part", "option-icon-content option-icon-element");
        element.setAttribute("aria-hidden", "true");
        element.setAttribute("slot", "icon");
        return element;
    }

    const element = document.createElement("div");
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("slot", "icon");
    element.classList.add("option-icon", "option-icon-class", ...resolved.value.split(/\s+/).filter(Boolean));
    element.setAttribute("part", "option-icon-content option-icon-class");
    return element;
}

class SelectOption extends HTMLElement {
    static tag = "select-option";
    static get observedAttributes() {
        return ["value", "label", "description", "icon", "icon-src", "selected"];
    }

    static get styles() {
        return {
            ":host": {
                display: "block",
                boxSizing: "border-box"
            }
        };
    }

    constructor() {
        super();

        this._selected = false;
        this._value = this.getAttribute("value") || this.getAttribute("label") || this.innerText;
        this._label = this.getAttribute("label") || this.innerText;
        this._description = this.getAttribute("description") || "";
        this._icon = this.getAttribute("icon") || this.getAttribute("icon-src") || "";

        this._shadowRoot = this.attachShadow({ mode: "open" });
        this._shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }

            .option {
                display: var(--form-select-option-display, inline-flex);
                align-items: var(--form-select-option-align, center);
                justify-content: var(--form-select-option-justify, flex-start);
                gap: var(--form-select-option-gap, 0.35rem);
                width: var(--form-select-option-width, 100%);
                min-width: 0;
                box-sizing: border-box;
            }

            slot[name="icon"] {
                display: none;
                align-items: var(--form-select-option-icon-align, center);
                justify-content: var(--form-select-option-icon-justify, center);
                width: var(--form-select-option-icon-slot-width, var(--form-select-option-icon-width, 1.25em));
                height: var(--form-select-option-icon-slot-height, var(--form-select-option-icon-height, 1.25em));
                min-width: var(--form-select-option-icon-slot-width, var(--form-select-option-icon-width, 1.25em));
                line-height: 0;
            }

            :host([has-icon]) slot[name="icon"] {
                display: var(--form-select-option-icon-display, inline-flex);
            }

            slot:not([name]) {
                display: var(--form-select-option-label-display, inline);
                min-width: 0;
            }

            .option-icon,
            ::slotted(.option-icon) {
                display: var(--form-select-option-icon-content-display, block);
                width: var(--form-select-option-icon-width, 1.25em);
                height: var(--form-select-option-icon-height, 1.25em);
                min-width: var(--form-select-option-icon-width, 1.25em);
                box-sizing: border-box;
                color: var(--form-select-option-icon-color, var(--form-select-option-icon-bg, currentColor));
            }

            :host(.selected) .option-icon,
            :host(.selected) ::slotted(.option-icon) {
                color: var(--form-select-option-icon-selected-color, var(--form-select-option-icon-selected-bg, var(--form-select-option-icon-color, var(--form-select-option-icon-bg, currentColor))));
            }

            .option-icon-image,
            ::slotted(.option-icon-image) {
                object-fit: var(--form-select-option-icon-fit, contain);
            }

            .option-icon-class {
                background: var(--form-select-option-icon-bg, currentColor);
            }

            :host(.selected) .option-icon-class {
                background: var(--form-select-option-icon-selected-bg, var(--form-select-option-icon-bg, currentColor));
            }

            ::slotted(.option-icon-class) {
                display: var(--form-select-option-icon-content-display, block);
                width: var(--form-select-option-icon-width, 1.25em);
                height: var(--form-select-option-icon-height, 1.25em);
                min-width: var(--form-select-option-icon-width, 1.25em);
                background: var(--form-select-option-icon-bg, currentColor);
            }

            :host(.selected) ::slotted(.option-icon-class) {
                background: var(--form-select-option-icon-selected-bg, var(--form-select-option-icon-bg, currentColor));
            }

        </style>
        <div class="option" part="option">
            <slot name="icon" part="option-icon"></slot>
            <slot part="option-label"></slot>
        </div>`;

        this._dom = {
            icon: this._shadowRoot.querySelector(".option > :first-child"),
            label: this._shadowRoot.querySelector(".option > :last-child")
        };

        this._dom.icon.addEventListener("slotchange", () => this._syncHasIcon());
    }

    get value() {
        if (this.hasAttribute("value")) return this.getAttribute("value");
        return this.getAttribute("label") || this.innerText;
    }

    set value(value) {
        this.setAttribute("value", value == null ? "" : String(value));
    }

    get label() {
        return this.getAttribute("label") || this.innerText;
    }

    set label(value) {
        if (value == null) this.removeAttribute("label");
        else this.setAttribute("label", String(value));
    }

    get selected() {
        return this.hasAttribute("selected");
    }

    get description() {
        return this.getAttribute("description") || "";
    }

    set description(value) {
        if (value == null) this.removeAttribute("description");
        else this.setAttribute("description", String(value));
    }

    get icon() {
        return this.getAttribute("icon") || this.getAttribute("icon-src") || "";
    }

    set icon(value) {
        if (value == null) this.removeAttribute("icon");
        else this.setAttribute("icon", String(value));
    }

    set selected(value) {
        if (value) this.setAttribute("selected", "");
        else this.removeAttribute("selected");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        switch (name) {
            case "value":
                this._value = newValue;
                break;
            case "label":
                this._label = newValue;
                break;
            case "description":
                this._description = newValue;
                break;
            case "icon":
                this._icon = newValue;
                this._renderIcon();
                this._syncHasIcon();
                break;
            case "icon-src":
                this._icon = newValue || "";
                this._renderIcon();
                this._syncHasIcon();
                break;
            case "selected":
                this._selected = newValue !== null;
                break;
        }
    }

    connectedCallback() {
        this._renderIcon();
        this._syncHasIcon();
    }

    _renderIcon() {
        const iconSrc = this.getAttribute("icon-src") || "";
        const icon = iconSrc || this.getAttribute("icon") || "";
        const iconElement = createOptionIconElement(icon, this.label, { forceUrl: !!iconSrc });
        this._dom.icon.replaceChildren();
        if (iconElement) {
            iconElement.removeAttribute("slot");
            this._dom.icon.appendChild(iconElement);
        }
        this._syncHasIcon();
    }

    _syncHasIcon() {
        const hasIcon = this._dom.icon.assignedElements().length > 0 || this._dom.icon.children.length > 0;
        this.toggleAttribute("has-icon", hasIcon);
    }
}

customElements.define("select-option", SelectOption);

class InputSelect extends InputComponent {
    // TODO(refactor): Consolidate option-source parsing and dropdown interaction state into dedicated helpers.
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observed() {
        return [
            "options",
            "force-native",
            "editable",
            "view",
            "view-type",
            "select-bar-direction",
            "compact",
            "hide-icons",
            "hide-labels",
            "hide-info",
            "option-parts"
        ];
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
        this._activeOptionIndex = -1;
        this._customKeydownHandler = (event) => this._handleCustomSelectKeydown(event);
    }

    /**
     * Returns component-scoped style definitions used to generate CSS.
     * @returns {*} Style definition map used for generated component CSS.
     */
    static get styles() {
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
                background: "var(--form-select-wrapper-bg, #ffffff)",
                borderRadius: "var(--form-select-wrapper-radius, var(--input-border-radius, 5px))",
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
                width: "calc(var(--input-height) + var(--input-padding) + var(--input-padding))",
                height: "calc(var(--input-height) + var(--input-padding) + var(--input-padding))",
                borderLeft: "var(--form-select-tab-border, 1px solid #c8c8c8)",
                background:
                    "var(--form-select-tab-bg, linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%))"
            },
            ".tab::after": {
                content: "''",
                display: "block",
                position: "absolute",
                "--s": "var(--select-arrow-size, 6px)",
                width: "50%",
                maxWidth: "var(--select-arrow-max-width, 50%)",
                aspectRatio: "5/3.2",
                clipPath: "polygon(0 0,0 var(--s),50% 100%,100% var(--s),100% 0,50% calc(100% - var(--s)))",
                background:
                    "var(--form-select-tab-arrow, var(--select-arrow-color, var(--form-accent-color, #0059ff)))",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
            },
            ".edit-tab": {
                display: "none",
                position: "relative",
                flex: "0 0 auto",
                width: "calc(var(--input-height) + var(--input-padding) + var(--input-padding))",
                height: "calc(var(--input-height) + var(--input-padding) + var(--input-padding))",
                borderLeft: "var(--form-select-edit-tab-border, var(--form-select-tab-border, 1px solid #c8c8c8))",
                background:
                    "var(--form-select-edit-tab-bg, linear-gradient(0deg, rgba(204, 204, 204, 1) 0%, rgba(224, 224, 224, 1) 100%))"
            },
            ".select-edit:hover": {
                background: "#6e6e6e",
                color: "#ffffff"
            },
            ":host([editable]) .edit-tab": {
                display: "block"
            },
            ":host(.editing-custom-value) .edit-tab": {
                background: "var(--form-select-edit-tab-active-bg, var(--form-accent-color, #0059ff))"
            },
            ".select-edit": {
                display: "grid",
                placeItems: "center",
                width: "100%",
                height: "100%",
                padding: 0,
                border: 0,
                background: "transparent",
                color: "var(--form-select-edit-color, var(--form-accent-color, #0059ff))",
                cursor: "text"
            },
            ":host(.editing-custom-value) .select-edit": {
                color: "#ffffff"
            },
            ".select-edit svg": {
                display: "block",
                width: "clamp(12px, 50%, 30px)",
                aspectRatio: 1
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
                border: "var(--form-select-options-border, 1px solid #c8c8c8)",
                borderRadius: "var(--form-select-options-radius, var(--input-border-radius, 5px))",
                backgroundColor: "var(--form-select-options-bg, #ffffff)",
                position: "absolute",
                width: "var(--form-select-options-width, auto)",
                zIndex: "var(--form-select-options-z-index, 10000)",
                maxHeight: "var(--form-select-options-max-height, 300px)",
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
            ".select-options .select-option": {
                position: "relative",
                color: "var(--form-select-option-item-color, var(--form-select-option-color, #333333))",
                padding: "var(--form-select-option-item-padding, var(--form-select-option-padding, 0.3rem 0.45rem))",
                cursor: "pointer",
                fontSize: "var(--form-select-option-item-font-size, var(--form-select-option-font-size, 0.9rem))",
                borderBottom:
                    "var(--form-select-option-item-border-bottom, var(--form-select-option-border-bottom, 1px solid #c8c8c8))"
            },
            ".select-options .select-option .option": {
                display: "var(--form-select-option-display, inline-flex)",
                alignItems: "var(--form-select-option-align, center)",
                justifyContent: "var(--form-select-option-justify, flex-start)",
                gap: "var(--form-select-option-gap, 0.35rem)",
                width: "var(--form-select-option-width, 100%)"
            },
            ".select-options .select-option.active": {
                outline: "2px solid var(--form-accent-color, #0059ff)",
                outlineOffset: "-2px"
            },
            ".select-options .select-option .option-icon-wrap": {
                display: "var(--form-select-option-icon-display, inline-flex)",
                alignItems: "var(--form-select-option-icon-align, center)",
                justifyContent: "var(--form-select-option-icon-justify, center)",
                marginRight: "var(--form-select-option-icon-margin-right, 0)"
            },
            ".select-options .select-option .option-icon": {
                display: "var(--form-select-option-icon-content-display, block)",
                width: "var(--form-select-option-icon-width, 1.25em)",
                height: "var(--form-select-option-icon-height, 1.25em)",
                minWidth: "var(--form-select-option-icon-width, 1.25em)",
                boxSizing: "border-box",
                color: "var(--form-select-option-icon-color, var(--form-select-option-icon-bg, currentColor))"
            },
            ".select-options .select-option.selected .option-icon": {
                color: "var(--form-select-option-icon-selected-color, var(--form-select-option-icon-selected-bg, var(--form-select-option-icon-color, var(--form-select-option-icon-bg, currentColor))))"
            },
            ".select-options .select-option .option-icon-image": {
                objectFit: "var(--form-select-option-icon-fit, contain)"
            },
            ".select-options .select-option .option-icon-class": {
                background: "var(--form-select-option-icon-bg, currentColor)"
            },
            ".select-options .select-option.selected .option-icon-class": {
                background:
                    "var(--form-select-option-icon-selected-bg, var(--form-select-option-icon-bg, currentColor))"
            },
            ".select-options .select-option .option-label": {
                display: "var(--form-select-option-label-display, inline)"
            },
            ".select-options .select-option .option-info": {
                position: "absolute",
                right: "var(--form-select-option-info-right, 0.25rem)",
                bottom: "var(--form-select-option-info-bottom, 0.2rem)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "var(--form-select-option-info-size, 1rem)",
                height: "var(--form-select-option-info-size, 1rem)",
                padding: 0,
                border: "var(--form-select-option-info-border, 1px solid currentColor)",
                borderRadius: "var(--form-select-option-info-radius, 50%)",
                background: "var(--form-select-option-info-bg, transparent)",
                color: "var(--form-select-option-info-color, var(--form-select-option-item-color, var(--form-select-option-color, currentColor)))",
                fontSize: "var(--form-select-option-info-font-size, 0.68rem)",
                lineHeight: 1,
                opacity: "var(--form-select-option-info-opacity, 0.78)",
                cursor: "help"
            },
            ".select-options .select-option.selected .option-info": {
                color: "var(--form-select-option-info-selected-color, var(--form-select-option-item-selected-color, var(--form-select-option-selected-color, currentColor)))"
            },
            ".select-options .select-option:hover": {
                backgroundColor: "var(--form-select-option-item-hover-bg, var(--form-select-option-hover-bg, #efefef))",
                color: "var(--form-select-option-item-hover-color, var(--form-select-option-hover-color, var(--form-select-option-item-color, var(--form-select-option-color, #333333))))"
            },
            ".select-options .select-option.selected": {
                backgroundColor:
                    "var(--form-select-option-item-selected-bg, var(--form-select-option-selected-bg, var(--selected-option-bg, var(--form-accent-color, #0059ff))))",
                color: "var(--form-select-option-item-selected-color, var(--form-select-option-selected-color, var(--selected-option-color, #ffffff)))"
            },
            ":host([view='select-bar']) .input-wrapper, :host([view-type='select-bar']) .input-wrapper": {
                position: "absolute",
                width: "1px",
                height: "1px",
                minHeight: "0",
                overflow: "hidden",
                opacity: 0,
                pointerEvents: "none"
            },
            ":host([view='select-bar']) .select-description, :host([view-type='select-bar']) .select-description": {
                marginTop: "0.4rem"
            },
            ".select-options.select-bar-options": {
                position: "static",
                display: "flex",
                flexDirection: "var(--form-select-bar-direction, row)",
                flexWrap: "nowrap",
                width: "100%",
                maxHeight: "none",
                overflowX: "auto",
                overflowY: "hidden",
                borderRadius: "var(--form-select-options-radius, var(--input-border-radius, 5px))",
                boxSizing: "border-box"
            },
            ":host([wrap]) .select-options.select-bar-options": {
                flexWrap: "wrap",
                overflowX: "hidden"
            },
            ":host([select-bar-direction='column']) .select-options.select-bar-options, :host([select-bar-direction='vertical']) .select-options.select-bar-options":
                {
                    flexDirection: "column",
                    overflowX: "hidden",
                    overflowY: "auto"
                },
            ":host([select-bar-direction='row']) .select-options.select-bar-options, :host([select-bar-direction='horizontal']) .select-options.select-bar-options":
                {
                    flexDirection: "row"
                },
            ".select-options.select-bar-options .select-option": {
                flex: "1 0 auto",
                display: "grid",
                placeItems: "center",
                minHeight: "var(--input-height)",
                padding:
                    "var(--form-select-bar-option-item-padding, var(--form-select-bar-option-padding, var(--form-select-option-item-padding, var(--form-select-option-padding, 0.35rem 0.7rem))))",
                borderBottom: "0",
                borderRight: "var(--form-select-bar-option-border-right, 1px solid #c8c8c8)",
                textAlign: "center",
                whiteSpace: "nowrap"
            },
            ":host([compact]) .select-options.select-bar-options .select-option": {
                flex: "0 0 auto",
                width: "var(--form-select-bar-compact-option-size, var(--input-height))"
            },
            ".select-options.select-bar-options .select-option .option": {
                display: "var(--form-select-bar-option-display, inline-flex)",
                alignItems: "var(--form-select-bar-option-align, center)",
                justifyContent: "var(--form-select-bar-option-justify, center)",
                width: "100%",
                height: "100%"
            },
            ".select-options.select-bar-options .select-option .option-icon-wrap": {
                marginRight:
                    "var(--form-select-bar-option-icon-margin-right, var(--form-select-option-icon-margin-right, 1rem))"
            },
            ":host([select-bar-direction='column']) .select-options.select-bar-options .select-option[has-icon] .option, :host([select-bar-direction='vertical']) .select-options.select-bar-options .select-option[has-icon] .option":
                {
                    justifyContent: "var(--form-select-bar-option-icon-justify, flex-start)",
                    textAlign: "var(--form-select-bar-option-icon-text-align, left)"
                },
            ":host([compact]) .select-options.select-bar-options .select-option[has-icon] .option": {
                justifyContent: "var(--form-select-bar-compact-option-justify, center)"
            },
            ".select-options.select-bar-options .select-option:last-child": {
                borderRight: "0"
            },
            ":host([select-bar-direction='column']) .select-options.select-bar-options .select-option, :host([select-bar-direction='vertical']) .select-options.select-bar-options .select-option":
                {
                    width: "100%",
                    borderRight: "0",
                    borderBottom: "var(--form-select-bar-option-border-bottom, 1px solid #c8c8c8)"
                },
            ":host([select-bar-direction='column']) .select-options.select-bar-options .select-option:last-child, :host([select-bar-direction='vertical']) .select-options.select-bar-options .select-option:last-child":
                {
                    borderBottom: "0"
                },
            ".select-description": {
                marginTop: "var(--form-select-description-margin-top, 0.35rem)",
                fontSize: "var(--form-select-description-font-size, 0.82rem)",
                lineHeight: "var(--form-select-description-line-height, 1.35)",
                color: "var(--form-select-description-color, var(--input-help-color, #64748b))",
                minHeight: "var(--form-select-description-min-height, 1.1em)"
            },
            ".select-description:empty": {
                display: "none"
            },
            "::slotted(option)": {
                display: "none"
            },
            "::slotted(select-option)": {
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

    _getViewType() {
        return String(this.getAttribute("view-type") || this.getAttribute("view") || "")
            .trim()
            .toLowerCase();
    }

    _useSelectBarMode() {
        return !this._useNativeMode() && this._getViewType() === "select-bar";
    }

    _getVisibleOptionParts() {
        const attr = String(this.getAttribute("option-parts") || "")
            .toLowerCase()
            .split(/[,\s]+/)
            .filter(Boolean);
        const parts = new Set(attr.length ? attr : ["icon", "label", "info"]);

        if (this.hasAttribute("compact")) parts.delete("label");
        if (this.hasAttribute("hide-icons")) parts.delete("icon");
        if (this.hasAttribute("hide-labels")) parts.delete("label");
        if (this.hasAttribute("hide-info")) parts.delete("info");

        return parts;
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
        if (this._dom.native) {
            this._dom.native.setAttribute("aria-expanded", "false");
            this._dom.native.removeAttribute("aria-activedescendant");
        }
        this.style.zIndex = "";
        this.classList.remove("open-below", "open-above");
        this.expanded = false;
        this._queueFieldFeedbackPosition();
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
                this._dom.native.setAttribute("aria-expanded", "true");
            } else {
                return;
            }
        }

        const hostRect = this.getBoundingClientRect();
        const rootRect = this._wireframe?.root?.getBoundingClientRect?.() || hostRect;
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

        this._optionList.style.minWidth = `${inputRect.width}px`;
        this._optionList.style.left = `${inputRect.left - rootRect.left}px`;

        if (useAbove) {
            const maxH = Math.max(60, topSpace - 4);
            this._optionList.style.maxHeight = `${maxH}px`;
            this._optionList.style.bottom = `${rootRect.bottom - inputRect.top}px`;
            this._optionList.style.top = "";
            this.classList.add("open-above");
        } else {
            const maxH = Math.max(60, bottomSpace - 4);
            this._optionList.style.maxHeight = `${maxH}px`;
            this._optionList.style.top = `${inputRect.bottom - rootRect.top}px`;
            this._optionList.style.bottom = "";
            this.classList.add("open-below");
        }
        this._queueFieldFeedbackPosition();
    }

    _getFieldFeedbackPlacementPreference() {
        if (!this.expanded) return super._getFieldFeedbackPlacementPreference();
        if (this.classList.contains("open-below")) return "above";
        if (this.classList.contains("open-above")) return "below";
        return super._getFieldFeedbackPlacementPreference();
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

        if (
            (name === "view" ||
                name === "view-type" ||
                name === "select-bar-direction" ||
                name === "compact" ||
                name === "hide-icons" ||
                name === "hide-labels" ||
                name === "hide-info" ||
                name === "option-parts") &&
            oldValue !== newValue
        ) {
            this._renderTemplateOrDefault();
            this._afterConnected();
            return;
        }

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
        this._optionList.className = this._useSelectBarMode() ? "select-options select-bar-options" : "select-options";
        this._optionList.setAttribute("role", "listbox");
        this._optionList.id = `select-list-${Math.random().toString(36).slice(2, 10)}`;
        this._wireframe.root.appendChild(this._optionList);
        this._dom.native.setAttribute("role", "combobox");
        this._dom.native.setAttribute("aria-haspopup", "listbox");
        this._dom.native.setAttribute("aria-controls", this._optionList.id);
        this._dom.native.setAttribute("aria-expanded", "false");

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
        this._optionObserver = new MutationObserver((mutations) => {
            const optionsChanged = mutations.some(
                (mutation) => mutation.type !== "attributes" || mutation.target !== this
            );
            if (optionsChanged) this._refreshOptions();
        });
        this._optionObserver.observe(this, {
            attributes: true,
            attributeFilter: ["value", "label", "description", "icon", "icon-src", "selected"],
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    /**
     * Builds normalized option data from configured sources.
     * @returns {*} Derived value.
     */
    _readOptions() {
        const childOptions = Array.from(this.querySelectorAll(":scope > option, :scope > select-option")).map(
            (option) => {
                const label = option.label || option.getAttribute("label") || option.textContent.trim();
                const value = option.hasAttribute("value") ? option.getAttribute("value") : label;
                const iconSrc = option.getAttribute("icon-src") || "";
                const icon = iconSrc || option.icon || option.getAttribute("icon") || option.dataset.icon || "";
                return {
                    value,
                    label,
                    icon,
                    iconIsUrl: !!iconSrc,
                    description:
                        option.description || option.getAttribute("description") || option.dataset.description || "",
                    selected: option.selected || option.hasAttribute("selected")
                };
            }
        );
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
        const attrValue = this.getAttribute("value");
        let defaultValue;
        if (this.hasAttribute("default")) {
            defaultValue = this.getAttribute("default");
            this.defaultValue = defaultValue;
        }

        if (this._useNativeMode()) {
            this._dom.native.replaceChildren();
            for (let i = 0; i < this._options.length; i += 1) {
                const optionData = this._options[i];
                const option = document.createElement("option");
                option.value = optionData.value;
                if (optionData.value === "") this.defaultValue = optionData.value;
                option.textContent = optionData.label;
                if (optionData.selected) option.selected = true;
                this._dom.native.appendChild(option);
                maxLen = Math.max(maxLen, optionData.label.length);
            }
        } else if (this._optionList) {
            this._optionList.replaceChildren();
            const visibleParts = this._getVisibleOptionParts();
            if (!this._useSelectBarMode()) {
                this._options.unshift({
                    label: defaultValue || "Select an option",
                    value: "",
                    description: "",
                    selected: this.value === ""
                });
            }
            for (let i = 0; i < this._options.length; i += 1) {
                const optionData = this._options[i];
                const li = document.createElement("div");
                const option = document.createElement("div");
                const label = document.createElement("span");

                if (optionData.value === "") this.defaultValue = optionData.value;

                li.id = `${this._optionList.id}-option-${i}`;
                li.className = "select-option";
                li.dataset.value = optionData.value;
                li.setAttribute("part", "option-item");
                li.setAttribute("role", "option");
                li.setAttribute("aria-selected", "false");

                option.className = "option";
                option.setAttribute("part", "option");

                if (visibleParts.has("icon") && optionData.icon) {
                    const icon = createOptionIconElement(optionData.icon, optionData.label, {
                        forceUrl: optionData.iconIsUrl
                    });
                    if (icon) {
                        const iconWrap = document.createElement("span");
                        iconWrap.className = "option-icon-wrap";
                        iconWrap.setAttribute("part", "option-icon");
                        icon.removeAttribute("slot");
                        iconWrap.appendChild(icon);
                        option.appendChild(iconWrap);
                        li.setAttribute("has-icon", "");
                    }
                }

                if (visibleParts.has("label")) {
                    label.className = "option-label";
                    label.setAttribute("part", "option-label");
                    label.textContent = optionData.label;
                    option.appendChild(label);
                } else {
                    li.setAttribute("aria-label", optionData.label);
                }

                if (visibleParts.has("info") && optionData.description) {
                    const info = document.createElement("span");
                    info.className = "option-info";
                    info.setAttribute("part", "option-info");
                    info.setAttribute("title", optionData.description);
                    info.setAttribute("aria-label", optionData.description);
                    info.textContent = "i";
                    option.appendChild(info);
                }

                li.appendChild(option);

                if (optionData.selected) {
                    this.value = optionData.value;
                    li.classList.add("selected");
                    li.setAttribute("aria-selected", "true");
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
            const li = Array.from(this._optionList.querySelectorAll(".select-option")).find(
                (item) => item.dataset.value === option.value
            );
            if (li) {
                const currentlySelected = this._optionList.querySelector(".select-option.selected");
                if (currentlySelected) {
                    currentlySelected.classList.remove("selected");
                    currentlySelected.setAttribute("aria-selected", "false");
                }
                li.classList.add("selected");
                li.setAttribute("aria-selected", "true");
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
        this._descriptionEl.textContent = this.selected.description || "";
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
        if (this._useSelectBarMode()) return;
        if (!this._optionList) return;
        if (this.expanded) {
            this._closeOptionList();
            return;
        }
        this.style.zIndex = "2147483647";
        this._openIntent = true;
        this._optionList.classList.add("open");
        this.expanded = true;
        this._dom.native.setAttribute("aria-expanded", "true");
        this._activateSelectedOption();
        this._startViewportListeners();
        this._positionOptionList();
    }

    _getOptionElements() {
        return this._optionList ? Array.from(this._optionList.querySelectorAll(".select-option")) : [];
    }

    _setActiveOption(index) {
        const options = this._getOptionElements();
        if (!options.length) {
            this._activeOptionIndex = -1;
            this._dom.native.removeAttribute("aria-activedescendant");
            return;
        }

        const nextIndex = Math.max(0, Math.min(index, options.length - 1));
        options.forEach((option, optionIndex) => {
            option.classList.toggle("active", optionIndex === nextIndex);
        });
        this._activeOptionIndex = nextIndex;
        const active = options[nextIndex];
        this._dom.native.setAttribute("aria-activedescendant", active.id);
        active.scrollIntoView({ block: "nearest" });
    }

    _activateSelectedOption() {
        const options = this._getOptionElements();
        const selectedIndex = options.findIndex((option) => option.classList.contains("selected"));
        this._setActiveOption(selectedIndex >= 0 ? selectedIndex : 0);
    }

    _moveActiveOption(offset) {
        const options = this._getOptionElements();
        if (!options.length) return;
        const start = this._activeOptionIndex >= 0 ? this._activeOptionIndex : 0;
        this._setActiveOption((start + offset + options.length) % options.length);
    }

    _commitActiveOption() {
        const option = this._getOptionElements()[this._activeOptionIndex];
        if (!option) return;
        const value = option.dataset.value || "";
        this.value = value;
        this._selectOptionByValue(value);
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        this._closeOptionList();
        this._syncSelectedDescription();
    }

    _handleCustomSelectKeydown(event) {
        if (this._editingCustomValue) return;

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!this.expanded) this._expandOptionList();
            this._moveActiveOption(event.key === "ArrowDown" ? 1 : -1);
            return;
        }
        if (event.key === "Home" || event.key === "End") {
            if (!this.expanded) return;
            event.preventDefault();
            const options = this._getOptionElements();
            this._setActiveOption(event.key === "Home" ? 0 : options.length - 1);
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (this.expanded) this._commitActiveOption();
            else this._expandOptionList();
            return;
        }
        if (event.key === "Escape" && this.expanded) {
            event.preventDefault();
            this._closeOptionList();
            return;
        }
        if (event.key === "Tab") {
            this._closeOptionList();
        }
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
        this._dom.native.removeEventListener("keydown", this._customKeydownHandler);
        this._dom.native.addEventListener("keydown", this._customKeydownHandler);

        if (!this._useSelectBarMode()) {
            this._wireframe.input.addEventListener("click", () => {
                if (this._editingCustomValue) return;
                this._expandOptionList();
            });

            this._dom.native.addEventListener("focus", () => {
                if (this._editingCustomValue) return;
                this._expandOptionList();
            });
        }

        this._dom.native.addEventListener("input", () => {
            if (!this._editingCustomValue) return;
            this.selected = { value: this._dom.native.value, label: this._dom.native.value, description: "" };
            this._syncHostFromNative();
            this._updateFormValue();
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
            if (this._dom.native.value == this.defaultValue) this._dom.native.value = "";
            this._dom.native.focus();
            this._dom.native.select();
        });

        this._optionList.addEventListener("click", (event) => {
            const target = event.target instanceof HTMLElement ? event.target.closest(".select-option") : null;
            if (!target || !this._optionList.contains(target)) return;
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
