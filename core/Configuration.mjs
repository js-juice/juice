/**
 * Configuration module for Juice framework.
 * Provides a centralized configuration system with deep merge/extend support.
 * @module Configuration
 */

import DotNotation from "./Util/DotNotation.mjs";

const root = typeof globalThis !== "undefined" ? globalThis : {};

function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item));
    }
    if (isPlainObject(value)) {
        const clone = {};
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            clone[key] = deepClone(value[key]);
        }
        return clone;
    }
    return value;
}

function deepMerge(target, source) {
    if (!isPlainObject(source)) return target;
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const sourceValue = source[key];
        if (isPlainObject(sourceValue)) {
            if (!isPlainObject(target[key])) {
                target[key] = {};
            }
            deepMerge(target[key], sourceValue);
        } else if (Array.isArray(sourceValue)) {
            target[key] = sourceValue.map((item) => deepClone(item));
        } else {
            target[key] = sourceValue;
        }
    }
    return target;
}

/**
 * Default root configuration for Juice.
 * Package modules can extend this at runtime (forms/data/etc).
 * @type {Object}
 */
const DEFAULT_CONFIG = {
    version: "1.0.0",
    description: "",
    repository: {},
    homepage: "",
    license: "ISC",
    dependencies: {},
    paths: {},
    forms: {},
    data: {},
    ui: {},
    formatting: {},
    validation: {}
};

if (isPlainObject(root.JUICE_CONFIG)) {
    deepMerge(DEFAULT_CONFIG, root.JUICE_CONFIG);
}

class JuiceConfiguration extends DotNotation {
    constructor(initialConfig = {}) {
        super(deepClone(initialConfig));
        this.defaults = deepClone(initialConfig);
    }

    emitChange(source = "core") {
        if (typeof document === "undefined" || typeof CustomEvent !== "function") return;
        document.dispatchEvent(
            new CustomEvent("juice:configchange", {
                detail: {
                    source,
                    config: this.snapshot()
                }
            })
        );
    }

    merge(nextConfig = {}, source = "core.merge") {
        if (!isPlainObject(nextConfig)) return this.snapshot();
        deepMerge(this.root, nextConfig);
        this.emitChange(source);
        return this.snapshot();
    }

    extend(path, extension = {}, source = "core.extend") {
        if (!path || typeof path !== "string") {
            return this.merge(extension, source);
        }

        const current = this.get(path);
        const target = isPlainObject(current) ? deepClone(current) : {};
        deepMerge(target, extension);
        this.set(path, target);
        this.emitChange(source);
        return this.snapshot(path);
    }

    snapshot(path) {
        if (!path) return deepClone(this.root);
        const value = this.get(path);
        return value === undefined ? undefined : deepClone(value);
    }

    reset(source = "core.reset") {
        this.root = deepClone(this.defaults);
        this.emitChange(source);
        return this.snapshot();
    }
}

const config = new JuiceConfiguration(DEFAULT_CONFIG);

export function configureJuice(nextConfig = {}) {
    return config.merge(nextConfig, "configureJuice");
}

export function extendJuiceConfig(path, extension = {}) {
    return config.extend(path, extension, `extendJuiceConfig:${path || "root"}`);
}

export function getJuiceConfig(path) {
    return config.snapshot(path);
}

export function resetJuiceConfig() {
    return config.reset("resetJuiceConfig");
}

export default config;
