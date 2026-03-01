/**
 * Shared Juice configuration module.
 * Single source of truth for all packages (core/ui/forms/data).
 * @module config/juice-config
 */

import DotNotation from "../core/Util/DotNotation.mjs";

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

    emitChange(source = "config") {
        root.JUICE_CONFIG = JUICE_CONFIG;
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

    merge(nextConfig = {}, source = "config.merge") {
        if (!isPlainObject(nextConfig)) return this.snapshot();
        deepMerge(this.root, nextConfig);
        this.emitChange(source);
        return this.snapshot();
    }

    extend(path, extension = {}, source = "config.extend") {
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

    reset(source = "config.reset") {
        this.root = deepClone(this.defaults);
        this.emitChange(source);
        return this.snapshot();
    }
}

const config = new JuiceConfiguration(DEFAULT_CONFIG);

function joinPath(basePath, nextPart) {
    const next = String(nextPart);
    return basePath ? `${basePath}.${next}` : next;
}

function getAtPath(path = "") {
    return path ? config.get(path) : config.root;
}

const PROXY_CACHE = new Map();
const ARRAY_MUTATORS = new Set([
    "copyWithin",
    "fill",
    "pop",
    "push",
    "reverse",
    "shift",
    "sort",
    "splice",
    "unshift"
]);

function makeConfigProxy(path = "") {
    if (PROXY_CACHE.has(path)) return PROXY_CACHE.get(path);

    const proxy = new Proxy(
        {},
        {
            get(_target, prop) {
                if (prop === "then") return undefined;
                if (prop === Symbol.toStringTag) return "JuiceConfigProxy";

                if (prop === "$path") return path;
                if (prop === "$raw") return getAtPath(path);
                if (prop === "toJSON") return () => config.snapshot(path || undefined);
                if (prop === "valueOf") return () => getAtPath(path);

                if (prop === "get") {
                    return (subPath) => config.get(path ? `${path}.${subPath}` : subPath);
                }
                if (prop === "getPath") {
                    return (subPath) => config.get(path ? `${path}.${subPath}` : subPath);
                }
                if (prop === "set") {
                    return (...args) => {
                        let targetPath;
                        let value;
                        if (args.length === 1) {
                            if (!path) return false;
                            targetPath = path;
                            value = args[0];
                        } else {
                            targetPath = path ? `${path}.${args[0]}` : args[0];
                            value = args[1];
                        }
                        config.set(targetPath, value);
                        config.emitChange(`proxy:set:${targetPath}`);
                        return true;
                    };
                }
                if (prop === "setPath") {
                    return (...args) => {
                        let targetPath;
                        let value;
                        if (args.length === 1) {
                            if (!path) return false;
                            targetPath = path;
                            value = args[0];
                        } else {
                            targetPath = path ? `${path}.${args[0]}` : args[0];
                            value = args[1];
                        }
                        config.set(targetPath, value);
                        config.emitChange(`proxy:set:${targetPath}`);
                        return true;
                    };
                }
                if (prop === "delete") {
                    return (subPath) => {
                        const targetPath = subPath ? (path ? `${path}.${subPath}` : subPath) : path;
                        if (!targetPath) return false;
                        config.delete(targetPath);
                        config.emitChange(`proxy:delete:${targetPath}`);
                        return true;
                    };
                }
                if (prop === "snapshot") {
                    return (subPath) => config.snapshot(subPath ? joinPath(path, subPath) : path || undefined);
                }
                if (prop === "merge") {
                    return (nextConfig = {}, source = "proxy.merge") => {
                        const target = getAtPath(path);
                        if (!isPlainObject(nextConfig)) return config.snapshot(path || undefined);
                        if (path) {
                            const base = isPlainObject(target) ? deepClone(target) : {};
                            deepMerge(base, nextConfig);
                            config.set(path, base);
                            config.emitChange(source);
                            return config.snapshot(path);
                        }
                        return config.merge(nextConfig, source);
                    };
                }
                if (prop === "extend") {
                    return (subPath, extension = {}, source = "proxy.extend") => {
                        if (!path) return config.extend(subPath, extension, source);
                        return config.extend(joinPath(path, subPath), extension, source);
                    };
                }
                if (prop === "reset") {
                    return (source = "proxy.reset") => {
                        if (path) {
                            config.set(path, {});
                            config.emitChange(source);
                            return config.snapshot(path);
                        }
                        return config.reset(source);
                    };
                }

                const current = getAtPath(path);
                if (current == null) return undefined;

                const value = current[prop];
                if (value == null) return value;

                if (Array.isArray(current) && typeof value === "function") {
                    const methodName = String(prop);
                    if (ARRAY_MUTATORS.has(methodName)) {
                        return (...args) => {
                            const result = value.apply(current, args);
                            config.emitChange(`proxy:array:${path || "root"}`);
                            return result;
                        };
                    }
                    return value.bind(current);
                }

                if (isPlainObject(value) || Array.isArray(value)) {
                    return makeConfigProxy(joinPath(path, prop));
                }
                return value;
            },

            set(_target, prop, value) {
                const targetPath = joinPath(path, prop);
                config.set(targetPath, value);
                config.emitChange(`proxy:set:${targetPath}`);
                return true;
            },

            deleteProperty(_target, prop) {
                const targetPath = joinPath(path, prop);
                config.delete(targetPath);
                config.emitChange(`proxy:delete:${targetPath}`);
                return true;
            },

            ownKeys() {
                const current = getAtPath(path);
                return current ? Reflect.ownKeys(current) : [];
            },

            has(_target, prop) {
                const current = getAtPath(path);
                return current != null && Reflect.has(current, prop);
            },

            getOwnPropertyDescriptor(_target, prop) {
                const current = getAtPath(path);
                if (!current || !Reflect.has(current, prop)) return undefined;
                return {
                    enumerable: true,
                    configurable: true
                };
            }
        }
    );

    PROXY_CACHE.set(path, proxy);
    return proxy;
}

export const JUICE_CONFIG = makeConfigProxy();
root.JUICE_CONFIG = JUICE_CONFIG;

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

export { config };
export default JUICE_CONFIG;
