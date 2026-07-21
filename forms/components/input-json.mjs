import InputComponent from "./input-component.mjs";

function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonValue(value, fallback = {}) {
    if (value == null || value === "") return fallback;
    if (typeof value === "object") return value;

    try {
        const parsed = JSON.parse(String(value));
        return parsed == null ? fallback : parsed;
    } catch (_error) {
        return fallback;
    }
}

function stringifyJsonValue(value, pretty = false) {
    try {
        return JSON.stringify(value ?? {}, null, pretty ? 2 : 0);
    } catch (_error) {
        return "{}";
    }
}

function normalizeRoot(value) {
    return Array.isArray(value) || isPlainObject(value) ? value : {};
}

function coercePrimitive(value, type) {
    const text = String(value ?? "");
    if (type === "number") {
        const number = Number(text);
        return Number.isFinite(number) ? number : 0;
    }
    if (type === "boolean") {
        return text === "true" || text === "1" || text === "yes";
    }
    if (type === "null") {
        return null;
    }
    return text;
}

function typeOfValue(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value === "object" ? "object" : typeof value;
}

function defaultValueForType(type) {
    if (type === "object") return {};
    if (type === "array") return [];
    if (type === "number") return 0;
    if (type === "boolean") return false;
    if (type === "null") return null;
    return "";
}

function createOption(value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

export default class InputJsonComponent extends InputComponent {
    static tag = "input-json";

    static get config() {
        return {
            native: {
                tag: "input",
                attrs: { type: "hidden" }
            },
            validation: false,
            value: {
                type: "json",
                default: {}
            }
        };
    }

    static get styles() {
        return {
            ":host": {
                display: "block"
            },
            ".input-wrapper": {
                overflow: "visible"
            },
            "#code": {
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--input-border-radius, 5px)",
                backgroundColor: "#212121",
                color: "#f5f5f5",
                fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                fontSize: "0.875rem",
                lineHeight: 1.45,
                boxSizing: "border-box"
            },
            "#code[hidden], #raw-json[hidden]": {
                display: "none !important"
            },
            "#raw-json": {
                width: "100%",
                minHeight: "14rem",
                padding: "0.75rem",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "var(--input-border-radius, 5px)",
                backgroundColor: "#212121",
                color: "#f5f5f5",
                fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                fontSize: "0.875rem",
                lineHeight: 1.45,
                boxSizing: "border-box",
                resize: "vertical"
            },
            "#code header, #code footer": {
                color: "#ffffff",
                display: "block"
            },
            "main.properties": {
                display: "block",
                paddingLeft: "30px"
            },
            ".properties": {
                display: "block",
                paddingLeft: "30px"
            },
            ".property": {
                display: "block"
            },
            ".row": {
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                alignItems: "center",
                gap: "0.35rem",
                minWidth: 0,
                width: "100%"
            },
            ".name-cell": {
                display: "inline-flex",
                alignItems: "center",
                minWidth: 0,
                color: "#ff4c4c",
                fontWeight: "bold"
            },
            ".name-cell::before": {
                content: "'\"'",
                color: "#ff4c4c"
            },
            ".name-cell::after": {
                content: "'\":'",
                color: "#ff4c4c"
            },
            ".name": {
                minWidth: "3rem",
                width: "10rem",
                border: 0,
                outline: 0,
                background: "transparent",
                color: "#ff4c4c",
                font: "inherit",
                fontWeight: "bold",
                padding: 0,
                boxSizing: "border-box"
            },
            ".name:disabled": {
                opacity: 1
            },
            ".value": {
                minWidth: "4rem",
                width: "min(100%, 16rem)",
                border: 0,
                outline: 0,
                background: "transparent",
                color: "#2686d4",
                font: "inherit",
                padding: 0,
                boxSizing: "border-box"
            },
            ".type": {
                width: "6.75rem",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "4px",
                background: "#2b2b2b",
                color: "#e7c767",
                font: "inherit",
                padding: "0.1rem 0.25rem"
            },
            ".punctuation": {
                color: "#ffffff",
                opacity: 0.8
            },
            '.property[data-type="string"] > .row .value': {
                color: "#2686d4"
            },
            '.property[data-type="number"] > .row .value': {
                color: "#d49a26"
            },
            '.property[data-type="boolean"] > .row .value': {
                color: "#c526d4"
            },
            '.property[data-type="null"] > .row .value': {
                color: "#777777"
            },
            '.property[data-type="array"] > .row .value, .property[data-type="object"] > .row .value': {
                color: "#c526d4"
            },
            ".children": {
                display: "block",
                paddingLeft: "30px"
            },
            ".child-actions": {
                paddingLeft: "30px",
                margin: "0.2rem 0"
            },
            ".input-json-actions": {
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.5rem"
            },
            ".raw-error": {
                color: "#ff9b9b",
                fontSize: "0.8rem"
            },
            "button": {
                border: "1px solid transparent",
                borderRadius: "4px",
                padding: "0.2rem 0.45rem",
                color: "var(--input-button-color, #ffffff)",
                background: "var(--input-button-bgcolor, #2f5ea6)",
                cursor: "pointer",
                font: "inherit",
                fontSize: "0.8rem"
            },
            "button.remove": {
                background: "#6f2630"
            },
            "button:disabled, input:disabled, select:disabled": {
                cursor: "not-allowed",
                opacity: 0.55
            },
            "input.native": {
                display: "none !important"
            }
        };
    }

    constructor() {
        super({ _layout: "label:input:>:default:status:<:validation" });
        this.inputType = "json";
        this._data = {};
        this._main = null;
        this._addPropertyButton = null;
        this._toggleRawButton = null;
        this._rawEditor = null;
        this._rawError = null;
        this._rawMode = false;
        this._renderingJson = false;
    }

    static html() {
        return `
            <div id="code" part="json-editor">
                <header>{</header>
                <main class="properties"></main>
                <footer>}</footer>
            </div>
            <textarea id="raw-json" part="raw-json-editor" spellcheck="false" hidden></textarea>
            <native></native>
            <div class="input-json-actions">
                <button type="button" id="add-property">Add Property</button>
                <button type="button" id="toggle-raw">Raw JSON</button>
                <span class="raw-error" id="raw-error" hidden></span>
            </div>
        `;
    }

    _afterRender() {
        this._main = this._dom.default?.querySelector("main.properties") || null;
        this._addPropertyButton = this._dom.default?.querySelector("#add-property") || null;
        this._toggleRawButton = this._dom.default?.querySelector("#toggle-raw") || null;
        this._rawEditor = this._dom.default?.querySelector("#raw-json") || null;
        this._rawError = this._dom.default?.querySelector("#raw-error") || null;
        this._addPropertyButton?.addEventListener("click", () => this._addChild(this._data));
        this._toggleRawButton?.addEventListener("click", () => this._toggleRawMode());
        this._syncFromNativeValue();
        this._syncRawEditor();
        this._syncEditorMode();
        this._renderJson();
    }

    _afterSync() {
        if (this._dom.native) {
            this._dom.native.hidden = true;
            this._dom.native.tabIndex = -1;
        }
        this._syncFromNativeValue();
        this._syncRawEditor();
        this._renderJson();
    }

    _syncSingleAttribute(name) {
        super._syncSingleAttribute(name);
        if (name === "value") {
            this._syncFromNativeValue();
            this._syncRawEditor();
            this._renderJson();
        }
    }

    _syncFromNativeValue() {
        if (!this._dom.native || this._renderingJson) return;
        const parsed = parseJsonValue(this._dom.native.value || this.getAttribute("value"), {});
        this._data = normalizeRoot(parsed);
    }

    _toggleRawMode() {
        if (this._rawMode) {
            this._applyRawJson();
            return;
        }

        this._rawMode = true;
        this._syncRawEditor(true);
        this._setRawError("");
        this._syncEditorMode();
    }

    _applyRawJson() {
        const source = this._rawEditor?.value || "";

        try {
            this._data = normalizeRoot(JSON.parse(source || "{}"));
        } catch (error) {
            this._setRawError(error?.message || "Invalid JSON.");
            return;
        }

        this._rawMode = false;
        this._setRawError("");
        this._commitJson();
        this._syncEditorMode();
    }

    _syncRawEditor(force = false) {
        if (!this._rawEditor || (this._rawMode && !force)) return;
        this._rawEditor.value = stringifyJsonValue(this._data, true);
    }

    _setRawError(message) {
        if (!this._rawError) return;
        this._rawError.textContent = message;
        this._rawError.hidden = !message;
    }

    _syncEditorMode() {
        const code = this._dom.default?.querySelector("#code") || null;
        if (code) code.hidden = this._rawMode;
        if (this._rawEditor) {
            this._rawEditor.hidden = !this._rawMode;
            this._rawEditor.disabled = this.disabled;
        }
        if (this._addPropertyButton) this._addPropertyButton.hidden = this._rawMode;
        if (this._toggleRawButton) {
            this._toggleRawButton.textContent = this._rawMode ? "Apply JSON" : "Raw JSON";
            this._toggleRawButton.disabled = this.disabled;
        }
    }

    _renderJson() {
        if (!this._main) return;

        this._renderingJson = true;
        this._main.replaceChildren();

        const entries = Array.isArray(this._data) ? this._data.entries() : Object.entries(this._data);
        for (const [key, value] of entries) {
            this._main.appendChild(this._createPropertyRow(this._data, key, value));
        }

        this._syncRootChrome();
        this._syncRawEditor();
        this._syncEditorMode();
        this._renderingJson = false;
    }

    _syncRootChrome() {
        const isArray = Array.isArray(this._data);
        const header = this._dom.default?.querySelector("#code > header") || null;
        const footer = this._dom.default?.querySelector("#code > footer") || null;
        if (header) header.textContent = isArray ? "[" : "{";
        if (footer) footer.textContent = isArray ? "]" : "}";
    }

    _createPropertyRow(parent, key, value) {
        const type = typeOfValue(value);
        const property = document.createElement("div");
        property.className = "property";
        property.dataset.type = type;

        const row = document.createElement("div");
        row.className = "row";

        const nameCell = document.createElement("span");
        nameCell.className = "name-cell";

        const name = document.createElement("input");
        name.className = "name";
        name.value = String(key);
        name.disabled = Array.isArray(parent) || this.disabled;
        name.setAttribute("aria-label", "Property name");
        name.addEventListener("change", () => this._renameKey(parent, key, name.value));
        nameCell.appendChild(name);

        const valueField = this._createValueField(parent, key, value, type);
        const typeField = this._createTypeField(parent, key, type);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove";
        remove.textContent = "Remove";
        remove.disabled = this.disabled;
        remove.addEventListener("click", () => this._removeChild(parent, key));

        row.append(nameCell, valueField, typeField, remove);
        property.appendChild(row);

        if (type === "object" || type === "array") {
            const open = document.createElement("div");
            open.className = "punctuation";
            open.textContent = type === "array" ? "[" : "{";

            const children = document.createElement("div");
            children.className = "children";
            const childEntries = Array.isArray(value) ? value.entries() : Object.entries(value);
            for (const [childKey, childValue] of childEntries) {
                children.appendChild(this._createPropertyRow(value, childKey, childValue));
            }

            const childActions = document.createElement("div");
            childActions.className = "child-actions";
            const add = document.createElement("button");
            add.type = "button";
            add.textContent = "Add Child";
            add.disabled = this.disabled;
            add.addEventListener("click", () => this._addChild(value));
            childActions.appendChild(add);

            const close = document.createElement("div");
            close.className = "punctuation";
            close.textContent = type === "array" ? "]" : "}";

            property.append(open, children, childActions, close);
        }

        return property;
    }

    _createValueField(parent, key, value, type) {
        if (type === "object" || type === "array") {
            const field = document.createElement("span");
            field.className = "value punctuation";
            field.textContent = type;
            return field;
        }

        if (type === "boolean") {
            const field = document.createElement("select");
            field.className = "value";
            field.append(createOption("false"), createOption("true"));
            field.value = value ? "true" : "false";
            field.disabled = this.disabled;
            field.addEventListener("change", () => this._setChildValue(parent, key, field.value === "true"));
            return field;
        }

        const field = document.createElement("input");
        field.className = "value";
        field.value = value == null ? "" : String(value);
        field.disabled = this.disabled || type === "null";
        field.placeholder = type === "null" ? "null" : "";
        field.addEventListener("change", () => this._setChildValue(parent, key, coercePrimitive(field.value, type)));
        return field;
    }

    _createTypeField(parent, key, type) {
        const field = document.createElement("select");
        field.className = "type";
        field.disabled = this.disabled;
        ["string", "number", "boolean", "null", "object", "array"].forEach((option) => field.appendChild(createOption(option)));
        field.value = type;
        field.addEventListener("change", () => this._setChildValue(parent, key, defaultValueForType(field.value)));
        return field;
    }

    _renameKey(parent, oldKey, nextKey) {
        if (Array.isArray(parent)) return;
        const key = String(nextKey || "").trim();
        if (!key || key === oldKey) {
            this._renderJson();
            return;
        }

        const entries = Object.entries(parent);
        for (const existingKey of Object.keys(parent)) delete parent[existingKey];
        for (const [entryKey, entryValue] of entries) {
            if (entryKey === oldKey) parent[key] = entryValue;
            else parent[entryKey] = entryValue;
        }
        this._commitJson();
    }

    _setChildValue(parent, key, value) {
        parent[key] = value;
        this._commitJson();
    }

    _addChild(parent) {
        if (Array.isArray(parent)) {
            parent.push("");
        } else {
            let index = Object.keys(parent).length + 1;
            let key = `property_${index}`;
            while (Object.prototype.hasOwnProperty.call(parent, key)) {
                index += 1;
                key = `property_${index}`;
            }
            parent[key] = "";
        }
        this._commitJson();
    }

    _removeChild(parent, key) {
        if (Array.isArray(parent)) parent.splice(Number(key), 1);
        else delete parent[key];
        this._commitJson();
    }

    _commitJson() {
        const value = stringifyJsonValue(this._data);
        if (this._dom.native) this._dom.native.value = value;
        this._syncRawEditor();

        this._isSyncing = true;
        try {
            this.setAttribute("value", value);
        } finally {
            this._isSyncing = false;
        }

        this._updateFormValue();
        this._queueValidation();
        this._renderJson();
        this.dispatchEvent(new CustomEvent("input", { bubbles: true, composed: true, detail: { value: this._data } }));
        this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true, detail: { value: this._data } }));
    }

    _getFormValue() {
        return stringifyJsonValue(this._data);
    }

    get json() {
        return this._data;
    }

    set json(value) {
        this._data = normalizeRoot(parseJsonValue(value, {}));
        this._commitJson();
    }

    get value() {
        return stringifyJsonValue(this._data);
    }

    set value(value) {
        this._data = normalizeRoot(parseJsonValue(value, {}));
        const serialized = stringifyJsonValue(this._data);
        if (this._dom.native) this._dom.native.value = serialized;
        this.setAttribute("value", serialized);
        this._updateFormValue();
        this._queueValidation();
        this._renderJson();
    }
}

if (!customElements.get(InputJsonComponent.tag)) {
    customElements.define(InputJsonComponent.tag, InputJsonComponent);
}
