

/**
 * AUTODOC:START
 * Component: <juice-forms>
 * Class: JuiceFormsElement
 * Overview: Form host component that owns a real `<form>` element and applies preset-driven responsive layout metadata.
 *
 * Features:
 * - Auto-wraps children in an internal form while mirroring host attributes.
 * - Computes field spans/groups from config presets and field constraints.
 * - Applies responsive column count based on container width.
 * - Exposes native form methods/properties for integration.
 *
 * Example:
 * `<juice-forms method="post"><input-text name="email"></input-text><input-textarea name="bio"></input-textarea></juice-forms>`
 *
 * Attribute Reference:
 * - Host form attributes (for example `method`, `action`, `novalidate`) are forwarded to the internal form.
 * - Field-level attributes such as `span`, `group`, and `preset` participate in layout resolution.
 *
 * Property Reference:
 * - `form`: Internal native `<form>` element.
 * - `elements`: Internal form controls collection.
 * - `length`: Internal form controls length.
 *
 * CSS Variables:
 * - `--juice-forms-gap`: Grid gap between fields.
 * - `--juice-forms-columns`: Active responsive column count.
 * - `--juice-field-span`: Per-field resolved column span.
 * - `--juice-group-start-gap`: Vertical spacing before a new field group.
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

import { getJuiceConfig } from "../../config/juice-config.mjs";
import DEFAULT_FORMS_CONFIG from "../config.mjs";

const INTERNAL_STYLE_ATTR = "data-juice-forms-style";
const INTERNAL_FORM_CLASS = "juice-forms-root";

const BLOCKED_HOST_ATTRS = new Set(["id", "class", "style"]);

const FIELD_TAGS = new Set([
    "input-text",
    "input-textarea",
    "input-select",
    "input-button",
    "input-checkbox",
    "input-radio",
    "option-group",
    "input",
    "textarea",
    "select",
    "button"
]);

const LAYOUT_DEFAULTS = { ...DEFAULT_FORMS_CONFIG.layout };

function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function toPositiveInteger(value, fallback) {
    const number = parseInt(value, 10);
    if (!Number.isFinite(number) || number <= 0) return fallback;
    return number;
}

function normalizeFieldName(name = "") {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[\[\].\s-]+/g, "");
}

function normalizeSpan(span) {
    if (span == null) return null;
    const raw = String(span).trim().toLowerCase();
    if (!raw) return null;
    if (raw === "full") return "full";

    const number = parseInt(raw, 10);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number;
}

function parseValidationMax(field) {
    if (!field || typeof field.getAttribute !== "function") return null;
    const validationText = (
        field.getAttribute("validation") || field.getAttribute("validate") || ""
    ).trim();
    if (!validationText) return null;

    const tokens = validationText
        .split("|")
        .map((token) => String(token).trim())
        .filter(Boolean);

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (!token.toLowerCase().startsWith("max:")) continue;
        const maxText = token.slice(4).trim();
        const maxValue = parseInt(maxText, 10);
        if (Number.isFinite(maxValue) && maxValue > 0) return maxValue;
    }
    return null;
}

function getFieldMaxChars(field) {
    if (!field || typeof field.getAttribute !== "function") return null;
    const maxLengthValue = parseInt(field.getAttribute("maxlength"), 10);
    if (Number.isFinite(maxLengthValue) && maxLengthValue > 0) {
        return maxLengthValue;
    }
    return parseValidationMax(field);
}

function normalizeMatchList(match) {
    if (match == null) return [];
    if (Array.isArray(match)) return match;
    return [match];
}

function patternMatchesField(pattern, fieldName, field) {
    if (pattern == null) return false;
    if (typeof pattern === "function") {
        try {
            return !!pattern(fieldName, field);
        } catch (_error) {
            return false;
        }
    }
    if (pattern instanceof RegExp) {
        return pattern.test(fieldName);
    }

    const needle = normalizeFieldName(pattern);
    if (!needle) return false;
    return fieldName.includes(needle);
}

function isFieldLikeElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    const tag = element.tagName.toLowerCase();
    if (FIELD_TAGS.has(tag)) return true;
    return element.hasAttribute("name");
}

function findPresetByKey(presets, key) {
    const normalizedKey = normalizeFieldName(key);
    if (!normalizedKey) return null;

    const names = Object.keys(presets || {});
    for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        if (normalizeFieldName(name) !== normalizedKey) continue;
        const preset = presets[name];
        if (!isPlainObject(preset)) return null;
        return { name, ...preset };
    }
    return null;
}

class JuiceFormsElement extends HTMLElement {
    // TODO(refactor): Split observer wiring, layout resolution, and responsive sizing into separate collaborators.
    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
    constructor() {
        super();
        this._form = null;
        this._style = null;
        this._hostObserver = null;
        this._formObserver = null;
        this._resizeObserver = null;
        this._onWindowResize = null;
        this._onJuiceConfigChange = null;
        this._isApplyingLayout = false;
        this._layoutConfig = { ...LAYOUT_DEFAULTS };
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        this._ensureStyleNode();
        this._ensureFormNode();
        this._moveUnmanagedChildrenIntoForm();
        this._syncFormAttributes();
        this._bindFormEvents();
        this._bindConfigEvents();
        this._startObserver();
        this._startResizeObserver();
        this._applyLayoutMetadata();
    }

    /**
     * Cleans up listeners and observers when the element is disconnected.
     * @returns {*} void.
     */
    disconnectedCallback() {
        if (this._hostObserver) this._hostObserver.disconnect();
        if (this._formObserver) this._formObserver.disconnect();
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._onWindowResize) {
            window.removeEventListener("resize", this._onWindowResize);
        }
        if (this._onJuiceConfigChange) {
            document.removeEventListener("juice:configchange", this._onJuiceConfigChange);
        }
    }

    /**
       * Wires config-change handlers that keep form layout synchronized.
     * @returns {*} void.
     */
    _bindConfigEvents() {
        if (this._onJuiceConfigChange) return;
        this._onJuiceConfigChange = () => {
            this._applyLayoutMetadata();
        };
        document.addEventListener("juice:configchange", this._onJuiceConfigChange);
    }

    /**
      * Creates or returns the style element used by the form wrapper.
     * @returns {*} void.
     */
    _ensureStyleNode() {
        if (this._style && this._style.isConnected) return;

        const existing = this.querySelector(`style[${INTERNAL_STYLE_ATTR}]`);
        if (existing) {
            this._style = existing;
            return;
        }

        const style = document.createElement("style");
        style.setAttribute(INTERNAL_STYLE_ATTR, "");
        style.textContent = `
juice-forms {
    display: block;
}

juice-forms > form.${INTERNAL_FORM_CLASS} {
    --juice-forms-gap: 1rem;
    --juice-forms-columns: 1;
    display: grid;
    grid-template-columns: repeat(var(--juice-forms-columns), minmax(0, 1fr));
    gap: var(--juice-forms-gap);
    align-items: start;
    container-type: inline-size;
    container-name: juice-forms;
}

juice-forms > form.${INTERNAL_FORM_CLASS} > * {
    min-width: 0;
    grid-column: span var(--juice-field-span, 1);
}

juice-forms > form.${INTERNAL_FORM_CLASS} > [data-juice-span="full"] {
    grid-column: 1 / -1;
}

juice-forms > form.${INTERNAL_FORM_CLASS} > [data-juice-group-start] {
    margin-top: var(--juice-group-start-gap, 0);
}
`;
        this.prepend(style);
        this._style = style;
    }

    /**
      * Creates or returns the internal form node used by the wrapper.
     * @returns {*} void.
     */
    _ensureFormNode() {
        if (this._form && this._form.isConnected) return;

        const existingForm = Array.from(this.children).find(
            (child) => child instanceof HTMLFormElement
        );

        if (existingForm) {
            this._form = existingForm;
        } else {
            this._form = document.createElement("form");
            this.appendChild(this._form);
        }

        this._form.classList.add(INTERNAL_FORM_CLASS);
    }

    /**
      * Moves unassigned light-DOM children into the managed form container.
     * @returns {*} Derived internal value or completion status.
     */
    _moveUnmanagedChildrenIntoForm() {
        if (!this._form) return;

        const children = Array.from(this.childNodes);
        for (let i = 0; i < children.length; i += 1) {
            const node = children[i];
            if (node === this._form || node === this._style) continue;
            this._form.appendChild(node);
        }
    }

    /**
      * Synchronizes form attributes between state, attributes, and UI.
     * @returns {*} void.
     */
    _syncFormAttributes() {
        if (!this._form) return;

        const hostAttrs = new Map();
        for (let i = 0; i < this.attributes.length; i += 1) {
            const attr = this.attributes[i];
            if (BLOCKED_HOST_ATTRS.has(attr.name)) continue;
            if (attr.name === INTERNAL_STYLE_ATTR) continue;
            hostAttrs.set(attr.name, attr.value);
        }

        const formAttrs = Array.from(this._form.attributes);
        for (let i = 0; i < formAttrs.length; i += 1) {
            const attr = formAttrs[i];
            if (attr.name === "class") continue;
            if (!hostAttrs.has(attr.name)) {
                this._form.removeAttribute(attr.name);
            }
        }

        hostAttrs.forEach((value, name) => {
            this._form.setAttribute(name, value);
        });
    }

    /**
       * Wires native form events and re-emits component-level events.
     * @returns {*} void.
     */
    _bindFormEvents() {
        if (!this._form || this._form.__juiceFormsBound) return;

        this._form.addEventListener("submit", (event) => {
            const submitEvent = new Event("submit", {
                bubbles: true,
                cancelable: true,
                composed: true
            });
            const allowed = this.dispatchEvent(submitEvent);
            if (!allowed) {
                event.preventDefault();
            }
        });

        this._form.__juiceFormsBound = true;
    }

    /**
      * Starts the resize observer that keeps responsive layout values in sync.
     * @returns {*} void.
     */
    _startResizeObserver() {
        if (!this._form) return;
        if (this._resizeObserver) this._resizeObserver.disconnect();

        if (typeof ResizeObserver === "function") {
            this._resizeObserver = new ResizeObserver(() => {
                this._applyResponsiveColumns();
            });
            this._resizeObserver.observe(this._form);
            return;
        }

        if (!this._onWindowResize) {
            this._onWindowResize = () => this._applyResponsiveColumns();
        }
        window.addEventListener("resize", this._onWindowResize);
    }

    /**
      * Starts mutation observers needed for runtime slot/child updates.
     * @returns {*} void.
     */
    _startObserver() {
        if (this._hostObserver) this._hostObserver.disconnect();
        if (this._formObserver) this._formObserver.disconnect();

        this._hostObserver = new MutationObserver((mutations) => {
            if (this._isApplyingLayout) return;
            let needsAttributeSync = false;
            let needsChildSync = false;

            for (let i = 0; i < mutations.length; i += 1) {
                const mutation = mutations[i];
                if (mutation.type === "attributes" && mutation.target === this) {
                    needsAttributeSync = true;
                }
                if (mutation.type === "childList" && mutation.target === this) {
                    needsChildSync = true;
                }
            }

            if (needsChildSync) {
                this._moveUnmanagedChildrenIntoForm();
            }
            if (needsAttributeSync) {
                this._syncFormAttributes();
            }
            if (needsAttributeSync || needsChildSync) {
                this._applyLayoutMetadata();
            }
        });

        this._hostObserver.observe(this, {
            attributes: true,
            childList: true
        });

        if (!this._form) return;

        this._formObserver = new MutationObserver((mutations) => {
            if (this._isApplyingLayout) return;
            let shouldRecompute = false;
            for (let i = 0; i < mutations.length; i += 1) {
                const mutation = mutations[i];
                if (mutation.type === "childList") {
                    shouldRecompute = true;
                    break;
                }
                if (mutation.type === "attributes") {
                    shouldRecompute = true;
                    break;
                }
            }
            if (shouldRecompute) this._applyLayoutMetadata();
        });

        this._formObserver.observe(this._form, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "name",
                "span",
                "data-span",
                "group",
                "preset",
                "maxlength",
                "validation",
                "validate",
                "stacked",
                "required",
                "format"
            ]
        });
    }

    /**
      * Returns derived forms config state.
     * @returns {*} Derived value.
     */
    _getFormsConfig() {
        const formsConfig = getJuiceConfig("forms");
        return isPlainObject(formsConfig) ? formsConfig : {};
    }

    _buildLayoutConfig(formsConfig = this._getFormsConfig()) {
        const raw = isPlainObject(formsConfig.layout) ? formsConfig.layout : {};
        return {
            gap: raw.gap || LAYOUT_DEFAULTS.gap,
            minColumnWidth: raw.minColumnWidth || raw.minWidth || LAYOUT_DEFAULTS.minColumnWidth,
            collapseAt: raw.collapseAt || LAYOUT_DEFAULTS.collapseAt,
            maxColumns: toPositiveInteger(raw.maxColumns, LAYOUT_DEFAULTS.maxColumns),
            columnChars: toPositiveInteger(raw.columnChars, LAYOUT_DEFAULTS.columnChars),
            spanPaddingChars: toPositiveInteger(raw.spanPaddingChars, LAYOUT_DEFAULTS.spanPaddingChars),
            groupGap: raw.groupGap || LAYOUT_DEFAULTS.groupGap
        };
    }

    /**
      * Collects layout items from configured sources.
     * @returns {*} Derived internal value or completion status.
     */
    _collectLayoutItems() {
        if (!this._form) return [];
        return Array.from(this._form.children).filter((child) => child instanceof HTMLElement);
    }

    /**
      * Returns derived merged presets state.
     * @param {*} formsConfig - Input value for forms config.
     * @returns {*} Derived value.
     */
    _getMergedPresets(formsConfig) {
        const configured = isPlainObject(formsConfig.presets) ? formsConfig.presets : {};
        return { ...(DEFAULT_FORMS_CONFIG.presets || {}), ...configured };
    }

    /**
      * Resolves effective preset configuration.
     * @param {*} field - Field element being processed.
     * @param {*} presets - Input value for presets.
     * @returns {*} Derived value.
     */
    _resolvePreset(field, presets) {
        const fieldName = normalizeFieldName(field.getAttribute("name"));
        const explicitPreset = normalizeFieldName(field.getAttribute("preset"));
        if (explicitPreset) {
            const byExplicitKey = findPresetByKey(presets, explicitPreset);
            if (byExplicitKey) return byExplicitKey;
        }

        if (fieldName) {
            const byFieldName = findPresetByKey(presets, fieldName);
            if (byFieldName) return byFieldName;
        }

        const presetNames = Object.keys(presets);
        for (let i = 0; i < presetNames.length; i += 1) {
            const name = presetNames[i];
            const preset = presets[name];
            if (!isPlainObject(preset)) continue;

            const patterns = preset.match == null ? [name] : normalizeMatchList(preset.match);
            const matched = patterns.some((pattern) => patternMatchesField(pattern, fieldName, field));
            if (!matched) continue;

            return { name, ...preset };
        }
        return null;
    }

    /**
      * Derives a grid span estimate from configured character length.
     * @param {*} maxChars - Input value for max chars.
     * @param {*} layoutConfig - Input value for layout config.
     * @returns {*} Derived internal value or completion status.
     */
    _deriveSpanFromChars(maxChars, layoutConfig) {
        if (!Number.isFinite(maxChars) || maxChars <= 0) return null;
        const padded = maxChars + layoutConfig.spanPaddingChars;
        const span = Math.ceil(padded / layoutConfig.columnChars);
        return Math.max(1, Math.min(layoutConfig.maxColumns, span));
    }

    /**
      * Returns derived desired span state.
     * @param {*} field - Field element being processed.
     * @param {*} preset - Input value for preset.
     * @param {*} layoutConfig - Input value for layout config.
     * @returns {*} Derived value.
     */
    _getDesiredSpan(field, preset, layoutConfig) {
        const tag = field.tagName.toLowerCase();
        if (field.hasAttribute("stacked")) return "full";
        if (tag === "option-group") return "full";
        if (tag === "button" && ["submit", "reset"].includes(String(field.type || "").toLowerCase())) {
            return "full";
        }
        if (!isFieldLikeElement(field)) return "full";

        const explicitSpan = normalizeSpan(field.getAttribute("span") || field.getAttribute("data-span"));
        if (explicitSpan) return explicitSpan;

        const presetSpan = normalizeSpan(preset && preset.span);
        if (presetSpan) return presetSpan;

        const maxChars = getFieldMaxChars(field);
        const spanFromChars = this._deriveSpanFromChars(maxChars, layoutConfig);
        if (spanFromChars) return spanFromChars;

        if (tag === "input-textarea" || tag === "textarea") return "full";
        return 1;
    }

    /**
     * Updates internal component state and applies side effects.
     * @param {*} items - Input value for items.
     * @param {*} groupsConfig - Input value for groups config.
     * @param {*} layoutConfig - Input value for layout config.
     * @returns {*} Derived internal value or completion status.
     */
    _setGroupMetadata(items, groupsConfig, layoutConfig) {
        let previousGroup = "";
        for (let i = 0; i < items.length; i += 1) {
            const field = items[i];
            const group = String(field.getAttribute("data-juice-group") || "");
            field.removeAttribute("data-juice-group-start");
            field.style.removeProperty("--juice-group-start-gap");

            if (!group) {
                previousGroup = "";
                continue;
            }

            if (previousGroup && previousGroup !== group) {
                const groupConfig = isPlainObject(groupsConfig[group]) ? groupsConfig[group] : {};
                const gap = groupConfig.gapBefore || layoutConfig.groupGap;
                field.setAttribute("data-juice-group-start", "");
                field.style.setProperty("--juice-group-start-gap", gap);
            }

            previousGroup = group;
        }
    }

    /**
      * Applies layout metadata to rendered output.
     * @returns {*} void.
     */
    _applyLayoutMetadata() {
        if (!this._form || this._isApplyingLayout) return;
        this._isApplyingLayout = true;

        try {
            const formsConfig = this._getFormsConfig();
            const layoutConfig = this._buildLayoutConfig(formsConfig);
            const presets = this._getMergedPresets(formsConfig);
            const groupsConfig = {
                ...(DEFAULT_FORMS_CONFIG.groups || {}),
                ...(isPlainObject(formsConfig.groups) ? formsConfig.groups : {})
            };
            const items = this._collectLayoutItems();

            this._layoutConfig = layoutConfig;
            this._form.style.setProperty("--juice-forms-gap", layoutConfig.gap);

            for (let i = 0; i < items.length; i += 1) {
                const field = items[i];
                const preset = this._resolvePreset(field, presets);

                if (preset && preset.name) {
                    field.setAttribute("data-juice-preset", preset.name);
                } else {
                    field.removeAttribute("data-juice-preset");
                }

                const explicitGroup = String(field.getAttribute("group") || "").trim();
                const group = explicitGroup || String((preset && preset.group) || "").trim();
                if (group) {
                    field.setAttribute("data-juice-group", group);
                } else {
                    field.removeAttribute("data-juice-group");
                }

                if (preset && preset.format && !field.hasAttribute("format")) {
                    field.setAttribute("format", preset.format);
                }

                const desiredSpan = this._getDesiredSpan(field, preset, layoutConfig);
                const baseSpan = desiredSpan === "full" ? "full" : String(desiredSpan || 1);
                field.setAttribute("data-juice-span-base", baseSpan);
            }

            this._setGroupMetadata(items, groupsConfig, layoutConfig);
            this._applyResponsiveColumns();
        } finally {
            this._isApplyingLayout = false;
        }
    }

    /**
      * Measures rendered text length for auto-size/layout calculations.
     * @param {*} value - Raw value being normalized or assigned.
     * @param {*} fallbackPx - Input value for fallback px.
     * @returns {*} Derived internal value or completion status.
     */
    _measureLength(value, fallbackPx = 0) {
        if (!this._form) return fallbackPx;
        if (typeof value === "number") return value;
        const cssValue = String(value || "").trim();
        if (!cssValue) return fallbackPx;

        const probe = document.createElement("div");
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.style.height = "0";
        probe.style.overflow = "hidden";
        probe.style.width = cssValue;
        this._form.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();

        if (Number.isFinite(width) && width > 0) return width;
        const numeric = parseFloat(cssValue);
        return Number.isFinite(numeric) ? numeric : fallbackPx;
    }

    /**
      * Applies responsive columns to rendered output.
     * @returns {*} void.
     */
    _applyResponsiveColumns() {
        if (!this._form) return;
        const layout = this._layoutConfig || LAYOUT_DEFAULTS;

        const formWidth = this._form.getBoundingClientRect().width;
        if (!Number.isFinite(formWidth) || formWidth <= 0) return;

        const gapPx = this._measureLength(layout.gap, 16);
        const minColumnPx = this._measureLength(layout.minColumnWidth, 240);
        const collapseAtPx = this._measureLength(layout.collapseAt, 672);

        let columns = 1;
        if (formWidth > collapseAtPx) {
            const candidate = Math.floor((formWidth + gapPx) / (Math.max(1, minColumnPx) + gapPx));
            columns = Math.max(1, Math.min(layout.maxColumns, candidate || 1));
        }

        this._form.style.setProperty("--juice-forms-columns", String(columns));
        this._form.setAttribute("data-juice-columns", String(columns));

        const items = this._collectLayoutItems();
        for (let i = 0; i < items.length; i += 1) {
            const field = items[i];
            const base = field.getAttribute("data-juice-span-base") || "1";

            if (base === "full") {
                field.setAttribute("data-juice-span", "full");
                field.style.removeProperty("--juice-field-span");
                continue;
            }

            const desired = Math.max(1, toPositiveInteger(base, 1));
            const resolved = Math.min(desired, columns);
            field.setAttribute("data-juice-span", String(resolved));
            field.style.setProperty("--juice-field-span", String(resolved));
        }
    }

    /**
      * Submits the underlying form.
     * @returns {*} void.
     */
    submit() {
        if (this._form) this._form.submit();
    }

    /**
      * Requests a form submit, optionally with a submitter element.
     * @param {*} submitter - Submit button/control used for requestSubmit.
     * @returns {*} void.
     */
    requestSubmit(submitter) {
        if (this._form && this._form.requestSubmit) {
            this._form.requestSubmit(submitter);
        }
    }

    /**
      * Resets the underlying form state.
     * @returns {*} void.
     */
    reset() {
        if (this._form) this._form.reset();
    }

    /**
      * Checks the current validity state.
     * @returns {*} Boolean validity result.
     */
    checkValidity() {
        return this._form ? this._form.checkValidity() : true;
    }

    /**
      * Reports validity and returns whether the state is valid.
     * @returns {*} Boolean validity result.
     */
    reportValidity() {
        return this._form ? this._form.reportValidity() : true;
    }

    /**
        * Returns the associated native form element.
     * @returns {*} Associated form element or null.
     */
    get form() {
        return this._form;
    }

    /**
        * Returns the form control collection.
     * @returns {*} Form controls collection.
     */
    get elements() {
        return this._form ? this._form.elements : null;
    }

    /**
        * Returns the number of form controls.
     * @returns {*} Number of form controls.
     */
    get length() {
        return this._form ? this._form.length : 0;
    }
}

if (!customElements.get("juice-forms")) {
    customElements.define("juice-forms", JuiceFormsElement);
}

export default JuiceFormsElement;
