/**
 * Shared Juice configuration module.
 * Single source of truth for all packages (core/ui/forms/data).
 * @module config/juice-config
 */

import DotNotation from "../core/Util/DotNotation.mjs";
import DEFAULT_CONFIG from "./defaults.mjs";

const root = typeof globalThis !== "undefined" ? globalThis : {};
const juiceRootDir = import.meta.resolve("../");
const manifestFilePath = import.meta.resolve("./manifest.json");
console.log(juiceRootDir);
console.log(manifestFilePath);
function loadJSON(path) {
    try {
        return JSON.parse(root.fetch(path).then((res) => res.text()));
    } catch (e) {
        return {};
    }
}

const manifestJSON = loadJSON(manifestFilePath);

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

if (isPlainObject(root.JUICE_CONFIG)) {
    deepMerge(DEFAULT_CONFIG, root.JUICE_CONFIG);
}

function normalizePath(path) {
    if (path.startsWith("/")) path = path.slice(1);
    if (path.endsWith("/")) path = path.slice(0, -1);
    if (path.startsWith("juice/")) path = path.slice(6);
    return path.replace(/^\/+|\/+$/g, "");
}

class JuiceManifest {
    constructor(manifest) {
        this.injest(manifest);
    }

    get(path) {
        if (!path) return deepClone(this.source.files);
        if (path.startsWith("/")) path = path.slice(1);
        const files = [];
        for (let i = 0; i < this.source.files.length; i += 1) {
            if (this.source.files[i].startsWith(path)) {
                files.push(this.source.files[i]);
            }
        }
        return files;
    }

    files(path = "") {
        if (path === "") return this.source?.files || [];
        return this.source?.files || [];
    }

    get folders() {
        return this.source?.folders || [];
    }

    injest(json) {
        this.source = json;
    }
}

class JuiceConfiguration extends DotNotation {
    constructor(initialConfig = {}) {
        super(deepClone(initialConfig));
        this.manifest = new JuiceManifest(manifestJSON);
        this.defaults = deepClone(initialConfig);
        this.listeners = new Map();
    }

    on(type, listener) {
        if (typeof listener !== "function") {
            throw new TypeError(`Config listener for "${type}" must be a function.`);
        }
        const listeners = this.listeners.get(type) || new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
        return () => this.off(type, listener);
    }

    off(type, listener) {
        const listeners = this.listeners.get(type);
        if (!listeners) return false;
        const removed = listeners.delete(listener);
        if (listeners.size === 0) this.listeners.delete(type);
        return removed;
    }

    emit(type, detail) {
        for (const listener of this.listeners.get(type) || []) {
            listener(detail);
        }
    }

    emitChange(source = "config", mutation = {}) {
        root.JUICE_CONFIG = JUICE_CONFIG;
        const detail = {
            source,
            ...mutation,
            config: this.snapshot()
        };
        this.emit("change", detail);
        if (typeof document === "undefined" || typeof CustomEvent !== "function") return;
        document.dispatchEvent(
            new CustomEvent("juice:configchange", {
                detail
            })
        );
    }

    emitMutation(type, path, source, value, previousValue) {
        const mutation = { type, path, value: deepClone(value), previousValue: deepClone(previousValue) };
        this.emit(type, mutation);
        this.emitChange(source, mutation);
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
        for (const key of Reflect.ownKeys(this.root)) {
            delete this.root[key];
        }
        deepMerge(this.root, this.defaults);
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
const ARRAY_MUTATORS = new Set(["copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"]);

function makeConfigProxy(path = "") {
    const target = getAtPath(path);
    const proxyTarget = target != null && typeof target === "object" ? target : {};
    const cached = PROXY_CACHE.get(path);
    if (cached?.target === proxyTarget) return cached.proxy;

    const proxy = new Proxy(proxyTarget, {
        get(current, prop) {
            if (prop === "then") return undefined;
            if (prop === Symbol.toStringTag) return "JuiceConfigProxy";

            if (prop === "$path") return path;
            if (prop === "$raw") return current;
            if (prop === "toJSON" || prop === "toJson") {
                return () => deepClone(current);
            }
            if (prop === "valueOf") return () => current;
            if (prop === "on") return config.on.bind(config);
            if (prop === "off") return config.off.bind(config);

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
                    const previousValue = config.snapshot(targetPath);
                    config.set(targetPath, value);
                    config.emitMutation("set", targetPath, `juice:set:${targetPath}`, value, previousValue);
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
                    const previousValue = config.snapshot(targetPath);
                    config.set(targetPath, value);
                    config.emitMutation("set", targetPath, `juice:set:${targetPath}`, value, previousValue);
                    return true;
                };
            }
            if (prop === "delete") {
                return (subPath) => {
                    const targetPath = subPath ? (path ? `${path}.${subPath}` : subPath) : path;
                    if (!targetPath) return false;
                    const previousValue = config.snapshot(targetPath);
                    config.delete(targetPath);
                    config.emitMutation("delete", targetPath, `juice:delete:${targetPath}`, undefined, previousValue);
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

            if (current == null) return undefined;

            const value = current[prop];
            if (value == null) return value;

            if (Array.isArray(current) && typeof value === "function") {
                const methodName = String(prop);
                if (ARRAY_MUTATORS.has(methodName)) {
                    return (...args) => {
                        const previousValue = deepClone(current);
                        const result = value.apply(current, args);
                        config.emitMutation("set", path, `juice:set:${path || "root"}`, current, previousValue);
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
            const previousValue = config.snapshot(targetPath);
            config.set(targetPath, value);
            config.emitMutation("set", targetPath, `juice:set:${targetPath}`, value, previousValue);
            return true;
        },

        deleteProperty(_target, prop) {
            const targetPath = joinPath(path, prop);
            const previousValue = config.snapshot(targetPath);
            config.delete(targetPath);
            config.emitMutation("delete", targetPath, `juice:delete:${targetPath}`, undefined, previousValue);
            return true;
        },

        ownKeys(current) {
            return Reflect.ownKeys(current);
        },

        has(current, prop) {
            return Reflect.has(current, prop);
        },

        getOwnPropertyDescriptor(current, prop) {
            return Reflect.getOwnPropertyDescriptor(current, prop);
        }
    });

    PROXY_CACHE.set(path, { target: proxyTarget, proxy });
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
