/**
 * Lightweight base for animation custom elements.
 *
 * Animation components write their DOM once, then update properties/styles
 * during the timeline.
 */
import { compileStaticStyles, StyleSheet } from "../../core/Style/Styles.mjs";
import { parseDotPath } from "../../core/Util/DotNotation.mjs";
import { merge } from "../../core/Util/Object.mjs";
import Tween, { resolveEasing } from "../tween.mjs";
import AnimationValue from "../properties/Value.mjs";
import { Rotation3D } from "../properties/Rotation.mjs";
import { Vector3D } from "../properties/Vector.mjs";
import { parseAnchor } from "../anchor.mjs";
import AnimationComponentUtil from "./util.mjs";
import "./anchor.mjs";

const HEADING_OFFSET_DEGREES = -90;

const DEFAULT_STYLE = `
    * { box-sizing: border-box; }
    :host { position: relative; display: block; }
    .component--styles { display: none; }
    .component--html { display: block; position: relative; min-height: 100%; width: 100%; }
`;

function renderStaticHTML(instance) {
    const Constructor = instance.constructor;
    const parts = [];

    for (const key of ["beforeHTML", "html", "afterHTML"]) {
        if (typeof Constructor[key] === "function") {
            parts.push(Constructor[key].call(instance, instance));
        }
    }

    return parts.filter(Boolean).join("\n");
}

function normalizeObserved(observed = {}) {
    return {
        all: observed.all || [],
        attributes: observed.attributes || observed.attributres || [],
        properties: observed.properties || []
    };
}

function resolveRoute(instance, route) {
    if (!route) return [];

    const routes = Array.isArray(route) ? route : [route];

    return routes.map((path) => {
        const routePath = String(path);
        if (!routePath.includes(".")) return { parent: instance, key: routePath };

        const { parent, property } = parseDotPath(routePath, instance);
        return { parent: parent || instance, key: property };
    });
}

function hasOwnStatic(Constructor, property) {
    return Object.prototype.hasOwnProperty.call(Constructor, property);
}

function ComponentCompiler(name, BaseHTMLElement) {
    return {
        [name]: class extends BaseHTMLElement {
            static tag = name;
            static index = 0;
            static initialized = false;
            static instances = [];
            static observableDefinitions = [];
            static defaultTemplateData = {};

            static renderProxy = {
                get(target, property) {
                    return target[property] ?? "";
                }
            };

            static config = {
                name,
                debug: false,
                shadow: true,
                closed: false,
                properties: {
                    width: { type: "number", route: "w.value", default: 0, linked: true, unit: "size", axis: "x" },
                    height: { type: "number", route: "h.value", default: 0, linked: true, unit: "size", axis: "y" },
                    scale: { type: "number", route: "s.value", default: 1, linked: true },
                    x: { type: "number", route: "position.x", default: 0, linked: true, unit: "position", axis: "x" },
                    y: { type: "number", route: "position.y", default: 0, linked: true, unit: "position", axis: "y" },
                    z: { type: "number", route: "position.z", default: 0, linked: true, unit: "position", axis: "z" },
                    vx: { type: "number", route: "velocity.x", default: 0, linked: true },
                    vy: { type: "number", route: "velocity.y", default: 0, linked: true },
                    vz: { type: "number", route: "velocity.z", default: 0, linked: true },
                    r: { type: "number", alias: "rx", linked: true },
                    rx: { type: "number", route: "rotation.x", default: 0, linked: true },
                    ry: { type: "number", route: "rotation.y", default: 0, linked: true },
                    rz: { type: "number", route: "rotation.z", default: 0, linked: true },
                    offset: { type: "string", default: 0 },
                    anchor: { default: { x: 0.5, y: 0.5 }, attrtype: "string", type: "object" },
                    origin: { default: { x: 0.5, y: 0.5 }, attrtype: "string", type: "object" },
                    debug: { type: "exists", default: false, linked: true }
                }
            };

            static html() {
                return `
                    <animation-anchor id="anchor">
                        <div id="body" part="body" class="animation-body">
                            ${this.bodyHTML !== undefined && typeof this.bodyHTML == "function" ? this.bodyHTML() : ""}
                            <slot></slot>
                        </div>
                    </animation-anchor>
                `;
            }

            static get baseStyle() {
                return `
                    :host {
                        position: absolute;
                        pointer-events: none;
                        width: 0px;
                        height: 0px;
                        left: 0px;
                        top: 0px;
                    }
                    animation-anchor {
                        transform: translate3d(var(--x, 0px), var(--y, 0px), var(--z, 0px));
                    }
                    #body {
                        position: absolute;
                        width: var(--width);
                        height: var(--height);
                    }
                    #body slot {
                        position: relative;
                        display: block;
                        width: 100%;
                        height: 100%;
                    }
                    :host([debug]) #body {
                        outline: 1px solid lime;
                    }
                `;
            }

            static get style() {
                return [];
            }

            static get observed() {
                return {
                    all: ["x", "y", "z", "r", "rx", "ry", "rz", "scale", "vx", "vy", "width", "height", "debug"],
                    attributes: ["anchor", "origin", "offset", "position"],
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

            static initialize() {
                const parentConfig = Object.getPrototypeOf(this)?.config || {};
                const componentConfig = hasOwnStatic(this, "config") ? this.config : {};
                const baseConfig = this.baseConfig || {};
                this.config = merge(parentConfig, baseConfig, componentConfig);
                this.styleText = compileStaticStyles(this, DEFAULT_STYLE);

                this.observableDefinitions = this.observedProperties.map((property) => {
                    const config = this.config.properties[property] || {};
                    const alias = config.alias || config.aliasFor || null;
                    const route = config.route || null;

                    return { property, config, alias, route };
                });

                this.initialized = true;
            }

            _ = { styleVars: {} };
            _defined = {};
            _index = null;
            config = null;
            rendered = 0;
            ready = false;
            customChildren = [];
            refs = {};
            slots = {};
            styleSheets = {};

            constructor(contents = null) {
                super();

                this.constructor.index++;
                this._index = this.constructor.index;

                if (!hasOwnStatic(this.constructor, "initialized") || !this.constructor.initialized) {
                    this.constructor.initialize();
                }
                this.config = Object.freeze(this.constructor.config);

                if (this.config.shadow) {
                    this.shadowDom = this.attachShadow({ mode: this.config.closed ? "closed" : "open" });
                }

                this.initializeAnimationProperties();
                if (this.beforeCreate) this.beforeCreate();
                this.initializeObservableProperties();
                this.renderStaticDOM();

                if (contents) this.appendChild(contents);

                this.constructor.instances.push(this);
                if (this.onCreate) this.onCreate();
            }

            initializeAnimationProperties() {
                this.animationBody = true;
                this.animate = true;
                this.visible = true;
                this._tweens = new Map();

                this.rotation = new Rotation3D(-90, 0, 0);
                this.rotation.OFFSET.x = 90;
                this.position = new Vector3D(0, 0, 0, { trackDirty: true });
                this.viewerPosition = new Vector3D(0, 0, 0, { trackDirty: true });
                this.velocity = new Vector3D(0, 0, 0);
                this.worldPosition = new Vector3D(0, 0, 0);
                this.pendingPositionValues = {};
                this.pendingSizeValues = {};
                this.pendingMethodValues = {};
                this._stopWatchingAnimationMethods = null;

                this.s = new AnimationValue(1, { min: 0 });
                this.w = new AnimationValue(0, { min: 0 });
                this.h = new AnimationValue(0, { min: 0 });

                Object.defineProperty(this, "offset", {
                    get: () => ({
                        x: this._offset?.x * this.parent?.width,
                        y: this._offset?.y * this.parent?.height
                    })
                });
            }

            get root() {
                return this._root || this.shadowDom || this;
            }

            get static() {
                return this.constructor;
            }

            get disabled() {
                return this.hasAttribute("disabled");
            }

            set disabled(value) {
                if (value) {
                    this.setAttribute("disabled", "");
                } else {
                    this.removeAttribute("disabled");
                }
            }

            freezeAt(x, y, z) {
                this.freeze = new Vector3D(x, y, z);
                this.position.set(x, y, z);
            }

            moveTo(x, y) {
                this.x = x;
                this.y = y;
            }

            move(x, y) {
                this.x += x;
                this.y += y;
            }

            setSize(width, height = width) {
                if (width !== undefined && width !== null) this.width = width;
                if (height !== undefined && height !== null) this.height = height;
            }

            setScale(value) {
                this.scale = value;
            }

            setRotation(x = this.rotation.x, y = this.rotation.y, z = this.rotation.z) {
                this.rx = x;
                this.ry = y;
                this.rz = z;
            }

            tween(property, value, options = {}) {
                if (property && typeof property === "object" && !Array.isArray(property)) {
                    return this.tweenProperties(property, value || {});
                }

                return this.tweenProperty(property, value, options);
            }

            tweenProperties(properties, options = {}) {
                const tweens = {};

                for (const [property, value] of Object.entries(properties || {})) {
                    tweens[property] = this.tweenProperty(property, value, options);
                }

                return tweens;
            }

            tweenProperty(property, value, options = {}) {
                const propertyName = this.resolveTweenPropertyName(property);
                if (!propertyName) return null;

                const tweenOptions = this.normalizeTweenOptions(options);
                const startValue = this.getTweenPropertyValue(propertyName);
                const endValue = Number(value);

                if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
                    throw new TypeError(`Cannot tween non-numeric animation property "${propertyName}".`);
                }

                this.stopTween(propertyName);

                const tween = new Tween(startValue, endValue, tweenOptions.duration, tweenOptions.easing)
                    .update((nextValue, progress) => {
                        this.setTweenPropertyValue(propertyName, nextValue);
                        if (typeof tweenOptions.update === "function") {
                            tweenOptions.update.call(this, nextValue, progress, propertyName, tween);
                        }
                    })
                    .complete(() => {
                        this._tweens.delete(propertyName);
                        this.dispatchEvent(
                            new CustomEvent("tweencomplete", {
                                detail: { property: propertyName, value: endValue, tween }
                            })
                        );
                        if (typeof tweenOptions.complete === "function") {
                            tweenOptions.complete.call(this, propertyName, tween);
                        }
                    });

                this._tweens.set(propertyName, tween);
                this.dispatchEvent(
                    new CustomEvent("tweenstart", {
                        detail: { property: propertyName, from: startValue, to: endValue, tween }
                    })
                );

                return tween.start();
            }

            normalizeTweenOptions(options = {}) {
                if (typeof options === "number") {
                    return { duration: options, easing: resolveEasing() };
                }

                const duration = Math.max(0, Number(options.duration ?? 0) || 0);
                return {
                    ...options,
                    duration,
                    easing: resolveEasing(options.easing)
                };
            }

            getTweenPropertyValue(property) {
                if (property.includes(".")) {
                    const { parent, property: key } = parseDotPath(property, this);
                    return Number(parent?.[key]);
                }

                return Number(this[property]);
            }

            setTweenPropertyValue(property, value) {
                if (property.includes(".")) {
                    const { parent, property: key } = parseDotPath(property, this);
                    if (parent && key) parent[key] = value;
                    return;
                }

                this[property] = value;
            }

            resolveTweenPropertyName(property) {
                const propertyName = String(property || "").trim();
                if (!propertyName.includes(".")) return propertyName;

                const properties = this.config?.properties || {};
                for (const [name, config] of Object.entries(properties)) {
                    const routes = Array.isArray(config.route) ? config.route : [config.route];
                    if (routes.includes(propertyName)) return name;
                }

                return propertyName;
            }

            stopTween(property) {
                const propertyName = this.resolveTweenPropertyName(property);
                const tween = this._tweens?.get(propertyName);
                if (!tween) return false;

                tween.stop();
                this._tweens.delete(propertyName);
                this.dispatchEvent(new CustomEvent("tweenstop", { detail: { property: propertyName, tween } }));
                return true;
            }

            stopTweens() {
                if (!this._tweens) return;

                for (const property of Array.from(this._tweens.keys())) {
                    this.stopTween(property);
                }
            }

            get direction() {
                return (this.rotation.getAxis("x").value + HEADING_OFFSET_DEGREES) * (Math.PI / 180);
            }

            beforeCreate() {}

            onFirstConnect() {}

            onPropertyChanged() {}

            onAttributeChanged() {}

            initializeObservableProperties() {
                for (const definition of this.constructor.observableDefinitions) {
                    this.defineObservableProperty(definition);
                }
            }

            defineObservableProperty(definition) {
                const { property, config, alias, route } = definition;

                if (alias) {
                    Object.defineProperty(this, property, {
                        get: () => this[alias],
                        set: (value) => {
                            this[alias] = value;
                        }
                    });

                    if (config.linked && this.hasAttribute(property)) {
                        this[alias] = this.parseAttributeValue(
                            this.getAttribute(property),
                            config.attrtype || config.type || "string"
                        );
                    }
                    return;
                }

                if (!route) {
                    let value;
                    if (config.linked && this.hasAttribute(property)) {
                        value = this.parseConfiguredValue(
                            property,
                            this.getAttribute(property),
                            config,
                            config.default ?? null
                        );
                    } else if (Object.prototype.hasOwnProperty.call(this, property)) {
                        value = this[property];
                    } else {
                        value = config.default ?? null;
                    }

                    Object.defineProperty(this, property, {
                        get: () => value,
                        set: (newValue) => {
                            if (config.type === "exists") {
                                newValue = ![false, "false", 0, "0", null, undefined].includes(newValue);
                            } else {
                                newValue = this.parseConfiguredValue(property, newValue, config, value);
                            }

                            const oldValue = value;
                            if (oldValue === newValue) return;

                            value = newValue;
                            if (config.linked) this.syncLinkedAttribute(property, newValue, config);
                            if (this._defined.connected) this.onObservableChanged(property, oldValue, newValue, config);
                        }
                    });
                    return;
                }

                const targets = resolveRoute(this, route);
                if (!targets.length || !targets[0].key) return;

                let value;
                if (config.linked && this.hasAttribute(property)) {
                    value = this.parseConfiguredValue(
                        property,
                        this.getAttribute(property),
                        config,
                        config.default ?? null
                    );
                } else if (targets[0].parent[targets[0].key] !== undefined) {
                    value = targets[0].parent[targets[0].key];
                } else {
                    value = config.default ?? null;
                }

                for (const target of targets) {
                    target.parent[target.key] = value;
                }

                Object.defineProperty(this, property, {
                    get: () => targets[0].parent[targets[0].key],
                    set: (newValue) => {
                        if (config.type === "exists") {
                            newValue = ![false, "false", 0, "0", null, undefined].includes(newValue);
                        } else {
                            newValue = this.parseConfiguredValue(
                                property,
                                newValue,
                                config,
                                targets[0].parent[targets[0].key]
                            );
                        }

                        const oldValue = targets[0].parent[targets[0].key];
                        if (oldValue === newValue) return;

                        for (const target of targets) {
                            target.parent[target.key] = newValue;
                        }
                        if (config.linked) this.syncLinkedAttribute(property, newValue, config);
                        if (this._defined.connected) this.onObservableChanged(property, oldValue, newValue, config);
                    }
                });
            }

            syncLinkedAttribute(property, value, config) {
                if (Object.prototype.hasOwnProperty.call(this.pendingMethodValues, property)) {
                    return;
                }

                if (
                    config.unit === "position" &&
                    Object.prototype.hasOwnProperty.call(this.pendingPositionValues, property)
                ) {
                    return;
                }

                if (config.type === "exists") {
                    if (value && !this.hasAttribute(property)) this.setAttribute(property, "");
                    if (!value && this.hasAttribute(property)) this.removeAttribute(property);
                    return;
                }

                if (value !== null && value !== undefined && this.getAttribute(property) !== String(value)) {
                    this.setAttribute(property, value);
                }
            }

            onObservableChanged(property, oldValue, newValue, config = {}) {
                this.applyAnimationPropertyChange(property, oldValue, newValue);
                if (this.onPropertyChanged) this.onPropertyChanged(property, oldValue, newValue, config);
                this.dispatchEvent(new CustomEvent("propertychange", { detail: { property, oldValue, newValue } }));
                if (config.after) {
                    const after = typeof config.after === "string" ? this[config.after] : config.after;
                    if (typeof after === "function") after.call(this);
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
                this.rendered = 1;
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

            slot(name = "default") {
                return this.slots[name] || null;
            }

            setDefined(property, value) {
                this._defined[property] = value;
            }

            setStyleVar(key, value) {
                this.ref("anchor")?.style.setProperty(key, value);
            }

            setStyleVars(vars) {
                Object.assign(this._.styleVars, vars);
            }

            writeStyleVars(vars, target = null) {
                const root = target || this.ref("anchor") || this.ref("html") || this.root || this;

                if (!root?.style || !vars) return;

                Object.assign(this._.styleVars, vars);

                for (const [key, value] of Object.entries(vars)) {
                    root.style.setProperty(key, value);
                    if (root !== this && this.style?.getPropertyValue(key)) this.style.removeProperty(key);
                    if (root !== this.ref("html") && this.ref("html")?.style?.getPropertyValue(key)) {
                        this.ref("html").style.removeProperty(key);
                    }
                }
            }

            get styles() {
                const self = this;

                function getStyleSheet(sheetName = "default") {
                    if (!self.styleSheets[sheetName]) {
                        const styleSheet = new StyleSheet(`style--${sheetName}`);
                        const styleNode = styleSheet.create();
                        (sheetName === "global" ? document.head : self.root).appendChild(styleNode);
                        self.styleSheets[sheetName] = styleSheet;
                    }
                    return self.styleSheets[sheetName];
                }

                return {
                    clear(sheetName = "default") {
                        getStyleSheet(sheetName).clear();
                    },
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
                if (this.onBeforeConnect) this.onBeforeConnect();
                if (this.onConnect) this.onConnect();
                this.dispatchEvent(new CustomEvent("connect"));

                if (this.parentNode?._onCustomChildConnect) {
                    this.parentNode._onCustomChildConnect(this);
                }

                if (!this.ready) {
                    this.initializeAnimationDOM();
                    this.resolvePendingPositionValues();
                    this.resolvePendingSizeValues();
                    if (this.onFirstConnect) this.onFirstConnect();
                    this.ready = true;
                    if (this.onReady) this.onReady();
                    this.dispatchEvent(new Event("ready"));
                    this.ref("html")?.classList.add("connected");

                    if (this.parentElement?.onCustomChildReady) {
                        this.parentElement.onCustomChildReady(this);
                    } else if (this.getRootNode()?.host?.onCustomChildReady) {
                        this.getRootNode().host.onCustomChildReady(this);
                    }

                    if (this.onChildren) this.onChildren(Array.from(this.children));
                }
            }

            _onCustomChildConnect(child) {
                this.customChildren.push(child);
                if (this.onCustomChildConnect) this.onCustomChildConnect(child);
            }

            disconnectedCallback() {
                this.stopTweens();
                this._defined.connected = false;
                this.dispatchEvent(new Event("disconnect"));
                if (this.onDisconnect) this.onDisconnect();
            }

            adoptedCallback() {
                this.dispatchEvent(new Event("adopted"));
                if (this.onAdopted) this.onAdopted();
            }

            compileData() {
                return this;
            }

            initializeAnimationDOM() {
                if (this._defined.animationInitialized) return;
                this._defined.animationInitialized = true;

                AnimationComponentUtil.initialize(this);
                AnimationComponentUtil.setDimentions(this);
                this.resolvePendingPositionValues();

                const vars = {
                    "--x": `${this.position.x}px`,
                    "--y": `${this.position.y}px`,
                    "--z": `${this.position.z}px`,
                    "--width": `${this.w.value}px`,
                    "--height": `${this.h.value}px`,
                    "--scale": this.s.value,
                    "--rotation": `${this.rotation.x}deg`,
                    "--rotation-x": `${this.rotation.x}deg`,
                    "--rotation-y": `${this.rotation.y}deg`,
                    "--rotation-z": `${this.rotation.z}deg`
                };

                this.writeStyleVars(vars, this.ref("anchor"));
                this.worldPosition.set(this.position);
                this.updateAnchorDebugValues();
            }

            update() {
                if (!this.animate) return null;

                if (this.velocity.hasValue()) {
                    this.position.x += this.velocity.x;
                    this.position.y += this.velocity.y;
                    this.position.z += this.velocity.z;
                    this.worldPosition.set(this.position);
                }

                if (!this.frozen) {
                    this.viewerPosition.x = this.position.x;
                    this.viewerPosition.y = this.position.y;
                    this.viewerPosition.z = this.position.z;
                }
            }

            render(time) {
                if (!this.visible) return;

                const updates = {};

                if (this.beforeRender) this.beforeRender(time);

                if (this.w.dirty) {
                    updates["--width"] = `${this.w.value}px`;
                    this.w.save();
                }

                if (this.h.dirty) {
                    updates["--height"] = `${this.h.value}px`;
                    this.h.save();
                }

                if (this.s.dirty) {
                    updates["--scale"] = this.s.value;
                    this.s.save();
                }

                if (this.position.dirty) {
                    updates["--x"] = `${this.position.x}px`;
                    updates["--y"] = `${this.position.y}px`;
                    updates["--z"] = `${this.position.z}px`;
                    this.position.clean();
                }

                if (this.rotation.dirty) {
                    updates["--rotation"] = `${this.rotation.x}deg`;
                    updates["--rotation-x"] = `${this.rotation.x}deg`;
                    updates["--rotation-y"] = `${this.rotation.y}deg`;
                    updates["--rotation-z"] = `${this.rotation.z}deg`;
                    this.rotation.clean();
                }

                if (!Object.keys(updates).length) return;

                this.writeStyleVars(updates);
                this.updateAnchorDebugValues(updates);
            }

            updateAnchorDebugValues(values = null) {
                if (!this.debug && !this.hasAttribute("debug")) return;
                const anchor = this.ref("anchor");
                if (!anchor?.setDebugValue) return;

                const debugValues = values || {
                    "--width": `${this.w.value}px`,
                    "--height": `${this.h.value}px`,
                    "--scale": this.s.value,
                    "--x": `${this.position.x}px`,
                    "--y": `${this.position.y}px`,
                    "--z": `${this.position.z}px`,
                    "--rotation": `${this.rotation.x}deg`,
                    "--rotation-x": `${this.rotation.x}deg`,
                    "--rotation-y": `${this.rotation.y}deg`,
                    "--rotation-z": `${this.rotation.z}deg`
                };

                Object.entries(debugValues).forEach(([key, value]) => anchor.setDebugValue(key, value));
            }

            get innerContentBox() {
                const anchorValue =
                    typeof this.anchor === "string" ? parseAnchor(this.anchor) : this.anchor || { x: 0.5, y: 0.5 };
                const width = this.width * this.scale;
                const height = this.height * this.scale;
                const anchor = {
                    x: anchorValue.x * width,
                    y: anchorValue.y * height
                };

                return {
                    width,
                    height,
                    top: anchor.y,
                    left: anchor.x,
                    right: width - anchor.x,
                    bottom: height - anchor.y
                };
            }

            isInViewport() {
                if (!this.animation?.viewer) return true;
                const rect = this.getBoundingClientRect();
                const viewerRect = this.animation.viewer.getBoundingClientRect();

                return !(
                    rect.bottom < viewerRect.top ||
                    rect.top > viewerRect.bottom ||
                    rect.right < viewerRect.left ||
                    rect.left > viewerRect.right
                );
            }

            clampToBounds(bounds = null) {
                bounds = bounds || this.bounds;
                if (!bounds) return;

                if (this.position.x < bounds.min.x) this.position.x = bounds.min.x;
                if (this.position.y < bounds.min.y) this.position.y = bounds.min.y;
                if (this.position.z < bounds.min.z) this.position.z = bounds.min.z;

                if (this.position.x > bounds.max.x) this.position.x = bounds.max.x;
                if (this.position.y > bounds.max.y) this.position.y = bounds.max.y;
                if (this.position.z > bounds.max.z) this.position.z = bounds.max.z;
            }

            applyAnimationPropertyChange(property) {
                if (["r", "rx", "ry", "rz"].includes(property)) {
                    const updates = {
                        "--rotation": `${this.rotation.x}deg`,
                        "--rotation-x": `${this.rotation.x}deg`,
                        "--rotation-y": `${this.rotation.y}deg`,
                        "--rotation-z": `${this.rotation.z}deg`
                    };
                    this.writeStyleVars(updates);
                    this.updateAnchorDebugValues(updates);
                } else if (property === "width") {
                    const width = `${this.w.value}px`;
                    this.writeStyleVars({ "--width": width });
                    this.updateAnchorDebugValues({ "--width": width });
                } else if (property === "height") {
                    const height = `${this.h.value}px`;
                    this.writeStyleVars({ "--height": height });
                    this.updateAnchorDebugValues({ "--height": height });
                } else if (property === "scale") {
                    this.writeStyleVars({ "--scale": this.s.value });
                    this.updateAnchorDebugValues({ "--scale": this.s.value });
                } else if (["x", "y", "z"].includes(property)) {
                    const updates = {
                        "--x": `${this.position.x}px`,
                        "--y": `${this.position.y}px`,
                        "--z": `${this.position.z}px`
                    };
                    this.writeStyleVars(updates);
                    this.updateAnchorDebugValues(updates);
                } else if (property === "debug") {
                    AnimationComponentUtil.setDebug(this);
                }
            }

            _bindEvent(eventName, element, handlerName) {
                const methodName = String(handlerName).split("(")[0].trim();
                if (!methodName || typeof this[methodName] !== "function") return;
                element.addEventListener(eventName, (event) => this[methodName](event, element), false);
                element.classList.add("events-set");
            }

            onAnimationConnect(viewer) {
                this.parent = this.parentNode;
                let el = this;
                const stack = [this];

                while (el.parentNode && !["ANIMATION-VIEWER", "BODY"].includes(el.parentNode.tagName)) {
                    el = el.parentNode;
                    if (el.animationComponent && !el.animationViewer) {
                        stack.push(el);
                    }
                }

                this.stack = stack;
                this.watchPendingMethodValues();
                this.resolvePendingMethodValues();
                this.resolvePendingPositionValues();
                this.resolvePendingSizeValues();
            }

            onDisconnect() {
                if (typeof this._stopWatchingAnimationMethods === "function") {
                    this._stopWatchingAnimationMethods();
                }
                this._stopWatchingAnimationMethods = null;
            }

            attributeChangedCallback(property, oldValue, newValue) {
                if (oldValue === newValue) return;

                const config = this.config?.properties?.[property] || {};
                const value = this.parseConfiguredValue(property, newValue, config, this[property]);

                const action = newValue === null ? "Deleted" : oldValue === null ? "Added" : "Changed";

                if (config.linked) this[property] = value;
                if (this._defined.connected && this[`onAttribute${action}`]) {
                    this[`onAttribute${action}`](property);
                }
                if (this._defined.connected) {
                    this.applyAnimationAttributeChange(property, oldValue, value);
                }
                if (this._defined.connected && this.onAttributeChanged) {
                    this.onAttributeChanged(property, oldValue, value);
                }
            }

            applyAnimationAttributeChange(property, previous, value) {
                if (property === "anchor") {
                    AnimationComponentUtil.setAnchor(this);
                } else if (property === "origin") {
                    AnimationComponentUtil.setOrigin(this);
                } else if (property === "position") {
                    const [xValue, yValue, zValue = this.z] = String(value || "")
                        .split(/[,\s]+/)
                        .filter(Boolean);
                    const x = this.parsePositionValue("x", xValue, this.config.properties.x, this.x);
                    const y = this.parsePositionValue("y", yValue, this.config.properties.y, this.y);
                    const z = this.parsePositionValue("z", zValue, this.config.properties.z, this.z);

                    if (!Object.prototype.hasOwnProperty.call(this.pendingPositionValues, "x")) this.x = x;
                    if (!Object.prototype.hasOwnProperty.call(this.pendingPositionValues, "y")) this.y = y;
                    if (!Object.prototype.hasOwnProperty.call(this.pendingPositionValues, "z")) this.z = z;
                }
            }

            normalizeAttributeUnit(value, config = {}) {
                if (value === null || typeof value !== "string") return value;

                if (["percent", "%"].includes(config.unit) && value.includes("%")) {
                    return parseFloat(value) / 100;
                }

                if (config.unit === "px" && value.includes("px")) {
                    return parseFloat(value);
                }

                return value;
            }

            parseConfiguredValue(property, value, config = {}, fallback = null) {
                const methodValue = this.resolveConfiguredMethodValue(property, value, config);
                if (methodValue.resolved) {
                    value = methodValue.value;
                } else if (methodValue.pending) {
                    return fallback;
                }

                if (config.unit === "position") {
                    return this.parsePositionValue(property, value, config, fallback);
                }

                if (config.unit === "size") {
                    return this.parseSizeValue(property, value, config, fallback);
                }

                return this.parseAttributeValue(
                    this.normalizeAttributeUnit(value, config),
                    config.attrtype || config.type || "string"
                );
            }

            isMethodAttributeValue(value, config = {}) {
                if (typeof value !== "string") return false;
                const supportsMethodValue =
                    config.unit === "position" || ["int", "float", "number"].includes(config.attrtype || config.type);
                if (!supportsMethodValue) return false;

                const text = value.trim();
                if (!text || /\d/.test(text)) return false;
                return /^[A-Za-z_$][A-Za-z_$.-]*$/.test(text);
            }

            resolveConfiguredMethodValue(property, value, config = {}) {
                if (!this.isMethodAttributeValue(value, config)) {
                    if (this.pendingMethodValues) delete this.pendingMethodValues[property];
                    return { resolved: false, pending: false, value };
                }

                const methodName = value.trim();
                const method =
                    this.animation?.getMethod?.(methodName) || this.animation?._methods?.[methodName] || null;
                if (typeof method !== "function") {
                    this.pendingMethodValues[property] = methodName;
                    this.watchPendingMethodValues();
                    return { resolved: false, pending: true, value };
                }

                delete this.pendingMethodValues[property];
                this.unwatchPendingMethodValuesIfResolved();
                return {
                    resolved: true,
                    pending: false,
                    value: method.call(this.animation, {
                        component: this,
                        property,
                        config,
                        value: methodName
                    })
                };
            }

            parsePositionValue(property, value, config = {}, fallback = 0) {
                if (value === null || value === undefined || value === "") return fallback;

                if (typeof value === "string") {
                    const text = value.trim();

                    if (text.endsWith("%")) {
                        const pixels = AnimationComponentUtil.toPixels(text, {
                            axis: config.axis || property,
                            axisSize: this.getPositionAxisSize(config.axis || property),
                            context: this.parentElement || this.viewer || this
                        });
                        if (pixels !== null) {
                            delete this.pendingPositionValues[property];
                            return pixels;
                        }

                        this.pendingPositionValues[property] = text;
                        return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
                    }

                    const pixels = AnimationComponentUtil.toPixels(text, {
                        axis: config.axis || property,
                        axisSize: this.getPositionAxisSize(config.axis || property),
                        context: this.parentElement || this.viewer || this
                    });
                    if (pixels !== null) return pixels;
                }

                const number = Number(value);
                if (Number.isFinite(number)) {
                    delete this.pendingPositionValues[property];
                    return number;
                }

                return fallback;
            }

            parseSizeValue(property, value, config = {}, fallback = 0) {
                if (value === null || value === undefined || value === "") return fallback;

                if (typeof value === "string") {
                    const text = value.trim();
                    const pixels = AnimationComponentUtil.toPixels(text, {
                        axis: config.axis || (property === "height" ? "y" : "x"),
                        axisSize: this.getPositionAxisSize(config.axis || (property === "height" ? "y" : "x")),
                        context: this.parentElement || this.viewer || this
                    });
                    if (pixels !== null) {
                        delete this.pendingSizeValues[property];
                        return pixels;
                    }

                    if (text.endsWith("%")) {
                        this.pendingSizeValues[property] = text;
                        return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
                    }
                }

                const number = Number(value);
                if (Number.isFinite(number)) {
                    delete this.pendingSizeValues[property];
                    return number;
                }
                return fallback;
            }

            getPositionAxisSize(axis) {
                const property = axis === "y" ? "height" : "width";
                const candidates = [this.parent, this.parentElement, this.viewer, this.animation?.viewer];

                for (const candidate of candidates) {
                    if (!candidate) continue;

                    const dimentions = candidate.dimentions;
                    const dimentionValue = Number(dimentions?.[property]);
                    if (Number.isFinite(dimentionValue) && dimentionValue > 0) return dimentionValue;

                    const directValue = Number(candidate[property]);
                    if (Number.isFinite(directValue) && directValue > 0) return directValue;

                    const rect = candidate.getBoundingClientRect?.();
                    const rectValue = Number(rect?.[property]);
                    if (Number.isFinite(rectValue) && rectValue > 0) return rectValue;
                }

                return 0;
            }

            resolvePendingPositionValues() {
                const pending = { ...this.pendingPositionValues };
                for (const [property, value] of Object.entries(pending)) {
                    const config = this.config?.properties?.[property] || {};
                    const resolved = this.parsePositionValue(property, value, config, this[property]);
                    if (!Object.prototype.hasOwnProperty.call(this.pendingPositionValues, property)) {
                        this[property] = resolved;
                    }
                }
            }

            resolvePendingSizeValues() {
                const pending = { ...this.pendingSizeValues };
                for (const [property, value] of Object.entries(pending)) {
                    const config = this.config?.properties?.[property] || {};
                    const resolved = this.parseSizeValue(property, value, config, this[property]);
                    if (!Object.prototype.hasOwnProperty.call(this.pendingSizeValues, property)) {
                        this[property] = resolved;
                    }
                }
            }

            watchPendingMethodValues() {
                if (typeof this._stopWatchingAnimationMethods === "function") return;
                if (!this.animation?.onMethodDefined) return;
                if (!Object.keys(this.pendingMethodValues || {}).length) return;

                this._stopWatchingAnimationMethods = this.animation.onMethodDefined(({ name }) => {
                    const pending = this.pendingMethodValues || {};
                    if (!Object.values(pending).includes(name)) return;
                    this.resolvePendingMethodValues();
                    this.resolvePendingPositionValues();
                    this.resolvePendingSizeValues();
                });
            }

            unwatchPendingMethodValuesIfResolved() {
                if (Object.keys(this.pendingMethodValues || {}).length) return;
                if (typeof this._stopWatchingAnimationMethods === "function") {
                    this._stopWatchingAnimationMethods();
                }
                this._stopWatchingAnimationMethods = null;
            }

            resolvePendingMethodValues() {
                const pending = { ...this.pendingMethodValues };
                for (const [property, value] of Object.entries(pending)) {
                    const config = this.config?.properties?.[property] || {};
                    const resolved = this.parseConfiguredValue(property, value, config, this[property]);
                    if (!Object.prototype.hasOwnProperty.call(this.pendingMethodValues, property)) {
                        this[property] = resolved;
                    }
                }
                this.unwatchPendingMethodValuesIfResolved();
            }

            parseAttributeValue(value, valueType = "string") {
                if (valueType === "exists") return value !== null;
                if (value === null) return null;

                if (valueType.startsWith("array")) {
                    const itemType = valueType.match(/\[(\w+)\]/)?.[1] || "string";
                    if (Array.isArray(value)) return value;
                    return String(value)
                        .split(",")
                        .map((item) => this.parseAttributeValue(item.trim(), itemType));
                }

                switch (valueType) {
                    case "int":
                        return parseInt(value, 10);
                    case "float":
                    case "number":
                        return Number(value);
                    case "bool":
                    case "boolean":
                        return value === true || value === "true" || value === "1" || value === "";
                    case "json":
                    case "object":
                    case "array":
                        return typeof value === "string" ? JSON.parse(value) : value;
                    case "string":
                    default:
                        return String(value);
                }
            }
        }
    }[name];
}

export default class AnimationComponent extends ComponentCompiler("animation-component", HTMLElement) {}

if (!customElements.get(AnimationComponent.tag)) {
    customElements.define(AnimationComponent.tag, AnimationComponent);
}
