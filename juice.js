/**
 * Juice Core Module
 * Main entry point for the Juice JavaScript framework.
 * Provides core functionality including module loading, event handling, and configuration.
 * @module Core
 */

import "./config/juice-config.mjs";
import "./core/Dev/Log.mjs";
import { blendClasses } from "./core/Util/Class.mjs";
import _config from "./config/juice-config.mjs";
import path from "./core/Util/Path.mjs";

export const root = typeof globalThis !== "undefined" ? globalThis : {};
const nodeProcess = root.process?.versions?.node && typeof root.process.cwd === "function" ? root.process : null;

import JuiceStorage from "./core/inc/Storage.mjs";
import JuiceQueues from "./core/inc/Queues.mjs";

/**
 * Parses a file path into its component parts.
 * @param {string} path - The file path to parse
 * @returns {{name: string, path: string, dir: string, ext: string}} Object containing path components
 * @private
 */
function parseFilePath(path) {
    return {
        name: path.split("/").pop(),
        path,
        dir: path.substr(0, path.lastIndexOf("/")),
        ext: path.split(".").pop()
    };
}

function getRuntimeRoot() {
    if (nodeProcess) return nodeProcess.cwd();

    const browserLocation = root.location;
    if (browserLocation?.pathname) {
        return path.directory(browserLocation.pathname) || "/";
    }

    return "/";
}

function getDefaultPaths() {
    const cwd = getRuntimeRoot();
    const vendor = path.resolve(cwd, "vendor");
    const state = path.resolve(cwd, ".juice");
    const data = path.resolve(cwd, "data");
    return {
        cwd,
        root: cwd,
        app: cwd,
        src: cwd,
        vendor,
        juice: path.resolve(vendor, "juice"),
        electronToolkit: path.resolve(vendor, "electron-toolkit"),
        nodeModules: path.resolve(cwd, "node_modules"),
        data,
        models: path.resolve(data, "models"),
        db: path.resolve(data, "db"),
        config: path.resolve(cwd, "config"),
        tmp: path.resolve(cwd, "tmp"),
        logs: path.resolve(cwd, "logs"),
        state,
        storage: state,
        cache: path.resolve(state, "cache")
    };
}

/**
 * Gets the current file information from import.meta.
 * @param {Object} meta - The import.meta object
 * @returns {{name: string, path: string, dir: string, ext: string}} Parsed file information
 * @example
 * const file = currentFile(import.meta);
 */
export function currentFile(meta) {
    const _url = meta.url;
    return parseFilePath(_url);
}

root.currentFile = currentFile;

/**
 * Juice class provides the core framework functionality.
 * Handles event management, storage, queues, and dynamic module loading.
 * @class Juice
 */
class Juice {
    static isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
    static isNode = Boolean(nodeProcess);
    /**
     * Creates a blended class from multiple mixin classes.
     * The resulting class will have properties and methods from all mixins.
     * @param {...Function} mixins - Mixin classes to blend together
     * @returns {Function} A new class that combines all mixins
     * @static
     * @example
     * const Blended = Juice.blend(MixinA, MixinB);
     * const instance = new Blended();
     */
    static blend(...mixins) {
        return blendClasses(...mixins);
    }

    /**
     * Semantic alias for blend when creating "flavors" of Juice classes.
     * @param {...Function} mixins - Mixin classes to blend together
     * @returns {Function} A new blended class
     * @static
     */
    static flavor(...mixins) {
        return Juice.blend(...mixins);
    }

    /**
     * Creates a new Juice instance.
     * Initializes storage, queues, and event registry.
     */
    constructor() {
        this.root = root;
        this.resolve = import.meta.resolve;
        this.currentFile = currentFile;
        this.queues = new JuiceQueues();
        this.storage = new JuiceStorage();
        this.eventRegistry = {};
        this.config = JUICE_CONFIG;
        this._cache = {};
        this.callStack = [];
        this.config.merge(
            {
                appName: path.basename(getRuntimeRoot()),
                paths: getDefaultPaths()
            },
            "juice:defaults"
        );
    }

    dev() {
        this.import("./core/Dev/Log.mjs");
    }

    async db(type, name, models) {
        const dbConfig = this.config.db || {};
        const dataPath = this.config.get("paths.data");
        type = type || dbConfig.type;
        name = name || dbConfig.name;
        models = models || dbConfig.models;

        const databaseName = typeof name === "string" ? name.trim() : name;
        const databasePath =
            typeof databaseName === "string" && databaseName
                ? path.isAbsolute(databaseName)
                    ? databaseName
                    : typeof dataPath === "string" && dataPath.trim()
                      ? path.resolve(dataPath, databaseName)
                      : path.resolve(getRuntimeRoot(), databaseName)
                : databaseName;

        return this.import("data", "db/SQLite/Database.mjs").then(async (module) => {
            const SQLiteDatabase = module.default || module.SQLiteDatabase;
            this.dbInstance = await SQLiteDatabase.create(databasePath, { type, models });

            if (typeof models === "string" && models.trim()) {
                const modelDirectory = path.isAbsolute(models) ? models : path.resolve(getRuntimeRoot(), models);
                await this.dbInstance.loadModelDirectory(modelDirectory);
            }

            return this.dbInstance;
        });
    }

    /**
     * Instance method to blend multiple mixin classes.
     * @param {...Function} mixins - Mixin classes to blend
     * @returns {Function} A new blended class
     */
    blend(...mixins) {
        return Juice.blend(...mixins);
    }

    /**
     * Instance alias for blend to support flavor-based composition semantics.
     * @param {...Function} mixins - Mixin classes to blend
     * @returns {Function} A new blended class
     */
    flavor(...mixins) {
        return this.blend(...mixins);
    }

    path(scope, relative) {
        const configuredPath = this.config.get(`paths.${scope}`);
        if (!relative) {
            return configuredPath;
        }
        if (typeof configuredPath === "string" && configuredPath.trim()) {
            return path.resolve(configuredPath, relative);
        }
        return relative;
    }

    /**
     * Wraps a function to track its calls in the call stack.
     * @param {Function} fn - The function to track
     * @returns {Function} A wrapped version of the function that tracks calls
     */
    track(fn) {
        const stack = this.callStack;
        return function trackedCall(...args) {
            const originalCallStackLength = stack.length;
            stack.push(fn);
            try {
                return fn.apply(this, args);
            } finally {
                stack.splice(originalCallStackLength, 1);
            }
        };
    }

    /**
     * Gets the calling function from the call stack.
     * @returns {Function|null} The calling function, or null if not available
     */
    caller() {
        if (this.callStack.length < 2) {
            return null;
        }
        return this.callStack[this.callStack.length - 1];
    }

    /**
     * Registers an event handler for a named event.
     * @param {string} name - The event name
     * @param {Function} fn - The handler function
     * @param {Array} [args=[]] - Optional arguments for the handler
     * @returns {string} A string that can be used to dispatch the event
     * @example
     * juice.registerEvent('click', handleClick);
     */
    registerEvent(name, fn, args = []) {
        if (!this.eventRegistry[name]) {
            this.eventRegistry[name] = [];
        }
        this.eventRegistry[name].push(fn);
        return `juice.dispatchEvent(this,'${name}')`;
    }

    /**
     * Dispatches an event to all registered handlers.
     * @param {Object} target - The target object for the event
     * @param {string} eventName - The name of the event to dispatch
     * @param {...*} args - Additional arguments to pass to handlers
     * @example
     * juice.dispatchEvent(element, 'customEvent', data);
     */
    dispatchEvent(target, eventName, ...args) {
        const eventHandlers = this.eventRegistry[eventName];
        if (!eventHandlers) return;
        eventHandlers.forEach((handler) => handler(target, ...args));
    }

    /**
     * Exposes the juice instance globally (window.juice or global.juice).
     */
    expose() {
        const globalScope = typeof window !== "undefined" ? window : global;
        globalScope.juice = this;
    }

    async import(section, path, properties = []) {
        const modulePath = `./${section}${path ? `/${path}` : ""}.mjs`;
        if (this._cache[modulePath]) {
            return properties.length
                ? properties.reduce((acc, property) => (acc[property] = this._cache[modulePath][property]), {})
                : this._cache[modulePath];
        }
        const module = await import(modulePath);
        let m = {};
        if (Array.isArray(properties) && properties.length > 0) {
            m = {};
            for (let i = 0; i < properties.length; i++) {
                const property = properties[i];
                if (module[property]) {
                    m[property] = module[property];
                }
            }
        } else {
            m = module;
        }

        this._cache[modulePath] = m;
        return m;
    }

    /**
     * Loads a file from the given URL and appends it to the document body.
     *
     * @param {string} url URL of the file to load
     * @param {Object} [options={}] Optional parameters
     * @param {boolean} [options.cache=false] Whether to cache the loaded content in local storage
     * @returns {Promise<void>}
     */
    async load(url, { cache = false } = {}) {
        const { ext } = parseFilePath(url);
        let cachedContent = cache ? localStorage.getItem(`juice:cache:${url}`) : null;

        /**
         * Fetches the content of the given URL.
         *
         * @returns {Promise<string>}
         */
        const fetchContent = async () => {
            const response = await fetch(url);
            return response.text();
        };

        let content = cachedContent;
        if (!cachedContent) {
            content = await fetchContent();
            if (cache) {
                localStorage.setItem(`juice:cache:${url}`, content);
            }
        }

        /**
         * Appends an element of the given tag name and content to the document body.
         *
         * @param {string} tagName Tag name of the element to append
         * @param {string} content Content of the element
         */
        const appendElement = (tagName, content) => {
            const element = document.createElement(tagName);
            if (tagName === "style" || tagName === "script") {
                element.textContent = content;
            } else {
                element.innerHTML = content;
            }
            document.body.appendChild(element);
        };

        switch (ext) {
            case "css":
                appendElement("style", content);
                break;
            case "js":
                appendElement("script", content);
                break;
            case "html":
                appendElement("div", content);
                break;
            default:
                console.warn(`Unknown file extension: ${ext}`);
                break;
        }
    }
}

/**
 * Global Juice instance.
 * @type {Juice}
 */
export const juice = new Juice();
juice.expose();
/**
 * Global configuration object.
 * @type {DotNotation}
 */
export const config = _config;

export default juice;
