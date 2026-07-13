/**
 * Juice Core Module
 * Main entry point for the Juice JavaScript framework.
 * Provides core functionality including module loading, event handling, and configuration.
 * @module Core
 */

import "./core/Dev/Log.mjs";
import { blendClasses } from "./core/Util/Class.mjs";
import _config from "./config/juice-config.mjs";
import path from "./core/Util/Path.mjs";
import { createStyleManager } from "./core/Style/Styles.mjs";

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
    const cwd = parseFilePath(import.meta.url).dir;
    const vendor = path.resolve(cwd, "vendor");
    const state = path.resolve(cwd, ".juice");
    const data = path.resolve(cwd, "data");
    return {
        cwd,
        root: cwd,
        app: cwd,
        src: cwd,
        nodeModules: path.resolve(cwd, "node_modules"),
        data,
        config: path.resolve(cwd, "config")
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
    static #instance = false;

    static isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
    static isNode = Boolean(nodeProcess);
    static rootSections = ["animation", "core", "data", "forms", "style", "ui"];
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
     * Creates a new Juice instance.
     * Initializes storage, queues, and event registry.
     */
    constructor(configuration = {}) {
        // Singleton pattern: return existing instance if already created
        if (Juice.#instance) return Juice.#instance;
        // Set the singleton instance to this
        Juice.#instance = this;

        this.creator = new Error().stack.split("\n")[1].trim();
        this.root = root;
        this.resolve = import.meta.resolve;
        this.currentFile = currentFile;
        this.queues = new JuiceQueues();
        this.storage = new JuiceStorage();
        this.eventRegistry = {};
        this.config = _config;
        this._cache = {};
        this._styleSheets = new WeakMap();
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
        this.import("core", "Dev/Log.mjs");
    }

    static dbDrivers = {
        sqlite: "db/SQL/SQLite/Database.mjs",
        mysql: "db/SQL/MySQL/Database.mjs"
    };

    async db(type, name, models) {
        const dbConfig = this.config.db || {};
        const dataPath = this.config.get("paths.data");
        type = type || dbConfig.type || "sqlite";
        name = name ?? dbConfig.name;
        models = models ?? dbConfig.models;

        const driverPath = Juice.dbDrivers[type];
        if (!driverPath) {
            throw new Error(`Unknown database driver "${type}". Known: ${Object.keys(Juice.dbDrivers).join(", ")}`);
        }

        return this.import("data", driverPath).then(async (module) => {
            const Driver = module.default;

            let source = name;

            if (type === "sqlite") {
                const databaseName = typeof name === "string" ? name.trim() : name;
                source =
                    typeof databaseName === "string" && databaseName
                        ? path.isAbsolute(databaseName)
                            ? databaseName
                            : typeof dataPath === "string" && dataPath.trim()
                              ? path.resolve(dataPath, databaseName)
                              : path.resolve(getRuntimeRoot(), databaseName)
                        : databaseName;
            } else if (type === "mysql") {
                source = name || dbConfig.baseUrl || "/api/model";
            }

            this.dbInstance = await Driver.create(source, { type, models });

            if (
                typeof models === "string" &&
                models.trim() &&
                typeof this.dbInstance.loadModelDirectory === "function"
            ) {
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

    styles(options = {}) {
        const normalizedOptions =
            typeof options === "string" ||
            options === document ||
            options === document?.head ||
            options instanceof Element ||
            options instanceof ShadowRoot
                ? { scope: options }
                : options || {};

        return createStyleManager(this._styleSheets, normalizedOptions);
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

    get importSections() {
        return {
            animation: {
                index: "index.mjs"
            },
            core: {
                index: "index.mjs"
            },
            data: {
                index: "index.mjs"
            },
            forms: {
                index: "index.mjs"
            },
            styles: {
                index: "index.mjs"
            },
            ui: {
                index: "index.mjs"
            }
        };
    }

    /**
     * Imports a registered Juice library or an explicit module path.
     * Registered libraries are cached and exposed on the Juice instance.
     *
     * @example
     * await juice.import("forms");
     * juice.forms.refresh();
     *
     * @example
     * await juice.import("core", "Dev", "Log.mjs");
     * await juice.import("core/Dev/Log.mjs", ["Log"]);
     * await juice.import("core", "Dev/Log.mjs", { modules: ["Log"] });
     *
     * @param {...(string|string[]|{modules?: string[]})} args Section/path parts followed by an optional module selector.
     * @returns {Promise<Object|undefined>} Imported library or module namespace.
     */
    async import(...args) {
        let parsed;
        let imports = [];
        let modulePath = null;
        let section = null;
        let isSectionImport = false;

        if (Array.isArray(args[args.length - 1])) {
            //Multiple Modules
            const modules = args.pop();
            let base = args.join("/");
            if (!base.startsWith("/") && !base.startsWith("./")) base = "./" + base;
            modules
                .map((m) => base + "/" + (!m.endsWith(".mjs") && !m.endsWith(".js") ? m + ".mjs" : m))
                .forEach((m) => this.import(m));

            return;
        }

        if (args.length === 1 && typeof args[0] === "string") {
            if (Juice.rootSections.includes(args[0])) {
                isSectionImport = true;
                section = args[0];
                modulePath = "./" + section + "/" + this.importSections[section]?.index;
            } else {
                modulePath = args[0];
            }
        } else if (args.length) {
            modulePath = args.join("/");
        }

        if (this._cache[modulePath]) {
            return this._cache[modulePath];
        }

        const moduleUrl = new URL(`./${modulePath}`, this.config.paths.root + "/").href;
        const module = await import(/* @vite-ignore */ moduleUrl);
        let loadedModule = module;

        if (isSectionImport && module.default) {
            loadedModule = module.default;
            Object.entries(module).forEach(([name, value]) => {
                if (name !== "default" && !(name in loadedModule)) {
                    loadedModule[name] = value;
                }
            });
            this[section] = loadedModule;
        }

        this._cache[modulePath] = loadedModule;

        return loadedModule;
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

export { Juice };

/**
 * Global Juice instance.
 * @type {Juice}
 */
export default new Juice();
/**
 * Global configuration object.
 * @type {DotNotation}
 */
export const config = _config;
