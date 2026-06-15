import { compileStaticStyles, StyleSheet } from "../../core/Style/Styles.mjs";

const DEFAULT_STYLE = `
    * { box-sizing: border-box; }
    :host {
        display: block;
        position: relative;
        width: auto;
        height: auto;
    }
    .component--styles { display: none; }
    .component--html {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
    }
`;

function normalizeObserved(observed = {}) {
    return {
        all: observed.all || [],
        attributes: observed.attributes || [],
        properties: observed.properties || []
    };
}

function renderStaticHTML(instance) {
    const Constructor = instance.constructor;
    if (typeof Constructor.html === "function") {
        return Constructor.html.call(instance, instance) || "";
    }
    return "";
}

class AnimationBlock extends HTMLElement {
    static tag = "animation-block";
    static initialized = false;
    static index = 0;
    static observableDefinitions = [];
    static instances = [];

    static config = {
        tag: "animation-block",
        properties: {
            width: { type: "int", default: 0, linked: true },
            height: { type: "int", default: 0, linked: true },
            scale: { type: "number", default: 1, linked: true },
            fps: { type: "int", default: 60, linked: true },
            debug: { type: "exists", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["width", "height", "scale", "fps", "debug"],
            attributes: [],
            properties: []
        };
    }

    static get observedAttributes() {
        const observed = normalizeObserved(this.observed);
        return [...observed.all, ...observed.attributes];
    }

    static get observedProperties() {
        const observed = normalizeObserved(this.observed);
        return [...observed.all, ...observed.properties];
    }

    static get style() {
        return [];
    }

    static html() {
        return `
            <div id="body">
                ${this.bodyHTML ? this.bodyHTML() : ""}
                <slot></slot>
            </div>
        `;
    }

    static initialize() {
        const config = this.config || {};
        this.config = {
            ...config,
            properties: {
                ...(AnimationBlock.config?.properties || {}),
                ...(config.properties || {})
            }
        };
        this.styleText = compileStaticStyles(this, DEFAULT_STYLE, ["style"]);
        this.observableDefinitions = this.observedProperties.map((property) => ({
            property,
            config: this.config.properties[property] || {}
        }));
        this.initialized = true;
        this.initialize = null;
    }

    refs = {};
    slots = {};
    styleSheets = {};
    _defined = {};
    _ = { styleVars: {} };
    ready = false;

    constructor(contents = null) {
        super();

        this.constructor.index++;
        this._index = this.constructor.index;
        if (this.constructor.initialize) this.constructor.initialize();
        this.config = Object.freeze(this.constructor.config);
        this.shadowDom = this.attachShadow({ mode: "open" });

        if (this.beforeCreate) this.beforeCreate();
        this.initializeObservableProperties();
        this.renderStaticDOM();

        if (contents) this.appendChild(contents);
        this.constructor.instances.push(this);
        if (this.onCreate) this.onCreate();
    }

    get root() {
        return this.shadowDom || this;
    }

    initializeObservableProperties() {
        for (const definition of this.constructor.observableDefinitions) {
            this.defineObservableProperty(definition);
        }
    }

    defineObservableProperty({ property, config }) {
        let value;
        if (config.linked && this.hasAttribute(property)) {
            value = this.parseAttributeValue(this.getAttribute(property), config.attrtype || config.type || "string");
        } else {
            value = config.default ?? null;
        }

        Object.defineProperty(this, property, {
            get: () => value,
            set: (newValue) => {
                if (config.type === "exists") {
                    newValue = ![false, "false", 0, "0", null, undefined].includes(newValue);
                }

                const oldValue = value;
                if (oldValue === newValue) return;

                value = newValue;
                if (config.linked) this.syncLinkedAttribute(property, newValue, config);
                if (this._defined.connected && this.onPropertyChanged) {
                    this.onPropertyChanged(property, oldValue, newValue, config);
                }
            }
        });
    }

    syncLinkedAttribute(property, value, config) {
        if (config.type === "exists") {
            if (value && !this.hasAttribute(property)) this.setAttribute(property, "");
            if (!value && this.hasAttribute(property)) this.removeAttribute(property);
            return;
        }

        if (value !== null && value !== undefined && this.getAttribute(property) !== String(value)) {
            this.setAttribute(property, value);
        }
    }

    renderStaticDOM() {
        const style = document.createElement("style");
        style.textContent = this.constructor.styleText;
        style.className = "component--styles";

        const html = document.createElement("div");
        html.id = "html";
        html.className = "component--html";
        html.innerHTML = renderStaticHTML(this);

        this.root.append(style, html);
        this.content = html;
        this.styleSheets.default = new StyleSheet("default", style);
        this.collectRefs();
    }

    collectRefs() {
        this.refs = {};
        this.slots = {};

        this.root.querySelectorAll("[id]").forEach((element) => {
            this.refs[element.id] = element;
        });

        this.root.querySelectorAll("slot").forEach((slot) => {
            this.slots[slot.name || "default"] = slot;
        });
    }

    ref(id) {
        return this.refs[id] || null;
    }

    writeStyleVars(vars, target = null) {
        const root = target || this.ref("html") || this.root || this;
        if (!root?.style || !vars) return;

        Object.assign(this._.styleVars, vars);
        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
    }

    get styles() {
        const self = this;

        function getStyleSheet(sheetName = "default") {
            if (!self.styleSheets[sheetName]) {
                const styleSheet = new StyleSheet(`style--${sheetName}`);
                const styleNode = styleSheet.create();
                self.root.appendChild(styleNode);
                self.styleSheets[sheetName] = styleSheet;
            }
            return self.styleSheets[sheetName];
        }

        return {
            add(styles, sheetName = "default") {
                getStyleSheet(sheetName).add(styles);
            },
            update(selector, properties, sheetName = "default") {
                getStyleSheet(sheetName).update(selector, properties);
            },
            replace(styles, sheetName = "default") {
                const sheet = getStyleSheet(sheetName);
                sheet.clear();
                sheet.add(styles);
            }
        };
    }

    connectedCallback() {
        if (this._defined.connected) return;
        this._defined.connected = true;

        if (this.parentNode?._onCustomChildConnect) {
            this.parentNode._onCustomChildConnect(this);
        }

        if (!this.ready) {
            if (this.onFirstConnect) this.onFirstConnect();
            this.ready = true;
            if (this.onReady) this.onReady();
            this.dispatchEvent(new Event("ready"));
            this.ref("html")?.classList.add("connected");
        }
    }

    disconnectedCallback() {
        this._defined.connected = false;
        if (this.onDisconnect) this.onDisconnect();
    }

    attributeChangedCallback(property, oldValue, newValue) {
        if (oldValue === newValue || !this.config) return;

        const config = this.config.properties[property] || {};
        const value = this.parseAttributeValue(newValue, config.attrtype || config.type || "string");
        if (config.linked) this[property] = value;
    }

    parseAttributeValue(value, valueType = "string") {
        if (valueType === "exists") return value !== null;
        if (value === null) return null;

        switch (valueType) {
            case "int":
                return parseInt(value, 10);
            case "float":
            case "number":
                return Number(value);
            case "bool":
            case "boolean":
                return value === true || value === "true" || value === "1" || value === "";
            case "string":
            default:
                return String(value);
        }
    }
}

customElements.define(AnimationBlock.tag, AnimationBlock);

export default AnimationBlock;
