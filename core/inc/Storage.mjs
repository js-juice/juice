/**
 * Local storage wrapper with namespacing and type conversion.
 * Provides enhanced localStorage with automatic serialization and caching.
 * Also installs a fast localStorage fallback when the runtime does not provide one.
 * @module inc/Storage
 */

const root = typeof globalThis !== "undefined" ? globalThis : {};
const nodeProcess = typeof process !== "undefined" ? process : null;
const nodeFs = nodeProcess?.getBuiltinModule?.("node:fs");
const nodePath = nodeProcess?.getBuiltinModule?.("node:path");
const nodeOs = nodeProcess?.getBuiltinModule?.("node:os");

const DEFAULT_STORAGE_FILE =
    nodeFs && nodePath
        ? nodePath.join(nodeProcess?.cwd?.() || nodeOs?.homedir?.() || ".", ".juice", "local-storage.json")
        : null;
const DEFAULT_FLUSH_DELAY = 32;

function isLocalStorageAvailable() {
    try {
        if (!root.localStorage) return false;
        const testKey = "__juice_storage_test__";
        root.localStorage.setItem(testKey, testKey);
        root.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

class PersistentLocalStorage {
    constructor({ filePath = DEFAULT_STORAGE_FILE, flushDelay = DEFAULT_FLUSH_DELAY } = {}) {
        this.filePath = filePath;
        this.flushDelay = flushDelay;
        this.data = Object.create(null);
        this.keys = [];
        this.flushTimer = null;
        this.pendingWrite = null;
        this.queuedPayload = null;
        this.isWriting = false;
        this.dirty = false;
        this.#load();
    }

    get length() {
        return this.keys.length;
    }

    clear() {
        if (!this.keys.length) return;
        this.data = Object.create(null);
        this.keys = [];
        this.scheduleFlush();
    }

    getItem(key) {
        key = String(key);
        return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    }

    key(index) {
        return this.keys[index] ?? null;
    }

    removeItem(key) {
        key = String(key);
        if (!Object.prototype.hasOwnProperty.call(this.data, key)) return;
        delete this.data[key];
        this.keys = this.keys.filter((existingKey) => existingKey !== key);
        this.scheduleFlush();
    }

    setItem(key, value) {
        key = String(key);
        value = String(value);

        const isNewKey = !Object.prototype.hasOwnProperty.call(this.data, key);
        if (!isNewKey && this.data[key] === value) return;

        this.data[key] = value;
        if (isNewKey) this.keys.push(key);
        this.scheduleFlush();
    }

    toJSON() {
        return { ...this.data };
    }

    scheduleFlush() {
        this.dirty = true;

        if (!this.filePath || !nodeFs || !nodePath) return;
        if (this.flushTimer) return;

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            this.flush();
        }, this.flushDelay);
    }

    flush() {
        if (!this.filePath || !nodeFs || !nodePath || !this.dirty) {
            return this.pendingWrite || Promise.resolve();
        }

        const payload = JSON.stringify(this.data, null, 2);
        this.dirty = false;

        if (this.isWriting) {
            this.queuedPayload = payload;
            return this.pendingWrite || Promise.resolve();
        }

        this.isWriting = true;
        this.pendingWrite = new Promise((resolve) => {
            this.#writePayload(payload, resolve);
        });

        return this.pendingWrite;
    }

    flushSync() {
        if (!this.filePath || !nodeFs || !nodePath || !this.dirty) return;

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        try {
            nodeFs.mkdirSync(nodePath.dirname(this.filePath), { recursive: true });
            nodeFs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
            this.dirty = false;
            this.queuedPayload = null;
        } catch (error) {
            console.warn("Juice localStorage flushSync failed", error);
        }
    }

    #load() {
        if (!this.filePath || !nodeFs) return;

        try {
            if (!nodeFs.existsSync(this.filePath)) return;
            const raw = nodeFs.readFileSync(this.filePath, "utf8");
            if (!raw.trim()) return;
            const parsed = JSON.parse(raw);

            if (parsed && typeof parsed === "object") {
                this.data = Object.create(null);
                for (const [key, value] of Object.entries(parsed)) {
                    this.data[key] = String(value);
                }
                this.keys = Object.keys(this.data);
            }
        } catch (error) {
            console.warn("Juice localStorage load failed", error);
        }
    }

    #writePayload(payload, resolve) {
        try {
            nodeFs.mkdirSync(nodePath.dirname(this.filePath), { recursive: true });
            nodeFs.writeFile(this.filePath, payload, "utf8", (error) => {
                if (error) {
                    console.warn("Juice localStorage flush failed", error);
                }

                if (this.queuedPayload !== null) {
                    const nextPayload = this.queuedPayload;
                    this.queuedPayload = null;
                    this.#writePayload(nextPayload, resolve);
                    return;
                }

                this.isWriting = false;
                this.pendingWrite = null;
                resolve();
            });
        } catch (error) {
            this.isWriting = false;
            this.pendingWrite = null;
            console.warn("Juice localStorage write setup failed", error);
            resolve();
        }
    }
}

function createLocalStorageProxy(storage) {
    return new Proxy(storage, {
        deleteProperty(target, prop) {
            if (typeof prop === "string" && !(prop in target)) {
                target.removeItem(prop);
                return true;
            }
            return Reflect.deleteProperty(target, prop);
        },
        get(target, prop, receiver) {
            if (typeof prop === "symbol" || prop in target) {
                return Reflect.get(target, prop, receiver);
            }

            if (typeof prop === "string") {
                return target.getItem(prop);
            }

            return undefined;
        },
        getOwnPropertyDescriptor(target, prop) {
            if (typeof prop === "string" && !(prop in target) && target.getItem(prop) !== null) {
                return {
                    configurable: true,
                    enumerable: true,
                    value: target.getItem(prop),
                    writable: true
                };
            }

            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
        ownKeys(target) {
            return Reflect.ownKeys(target).concat(target.keys);
        },
        set(target, prop, value, receiver) {
            if (typeof prop === "string" && !(prop in target)) {
                target.setItem(prop, value);
                return true;
            }
            return Reflect.set(target, prop, value, receiver);
        }
    });
}

function registerLocalStorageFlush(storage) {
    if (storage.__juiceRegisteredFlush) return;
    storage.__juiceRegisteredFlush = true;

    if (typeof root.addEventListener === "function") {
        root.addEventListener("beforeunload", () => storage.flushSync());
        root.addEventListener("pagehide", () => storage.flushSync());
    }

    if (nodeProcess?.on) {
        nodeProcess.on("beforeExit", () => storage.flushSync());
        nodeProcess.on("exit", () => storage.flushSync());
    }
}

function ensureLocalStorage() {
    if (isLocalStorageAvailable()) {
        return root.localStorage;
    }

    if (!root.__juiceLocalStorage) {
        const storage = new PersistentLocalStorage();
        registerLocalStorageFlush(storage);
        root.__juiceLocalStorage = createLocalStorageProxy(storage);
        root.localStorage = root.__juiceLocalStorage;
    }

    return root.__juiceLocalStorage;
}

/**
 * JuiceStorage provides a wrapper around localStorage with support for namespaced storage,
 * type conversions, and caching functionality.
 * @class JuiceStorage
 * @example
 * const storage = new JuiceStorage();
 * storage.set('user.name', 'John');
 * const name = storage.get('user.name');
 */
class JuiceStorage {
    basePath = "juice:storage";
    internalPath = "juice:storage:_index";
    cacheBasePath = "juice:cache";
    cacheIndexPath = "juice:cache:_index";
    bucketsPath = "juice:storage:buckets";
    _index = {};
    buckets = [];
    cacheIndex = {};

    /**
     * Creates a new JuiceStorage instance and initializes it from localStorage.
     */
    constructor() {
        this.localStorage = ensureLocalStorage();
        this.directory = "";
        this.currentIndex = this._index;
        this.initialize();
    }

    /**
     * Sets the current directory to the root level.
     */
    root() {
        this.directory = "";
        this.currentIndex = this._index;
    }

    /**
     * Changes the current directory for storage operations.
     * Supports special navigation: ":" or "|" to go to root.
     * @param {string} dir - The directory to change to
     * @returns {boolean} True if directory change was successful
     */
    cd(dir) {
        let directory = this.directory;

        if (dir == ":" || dir.charAt(0) === "|") {
            this.root();
            return true;
        }

        this.directory = [directory, dir].filter(Boolean).join(":");
        const parts = this.directory ? this.directory.split(":") : [];
        let idx = this._index;

        while (parts.length) {
            const part = parts.shift();
            idx[part] ||= { type: "object", children: {} };
            idx = idx[part].children;
        }

        this.currentIndex = idx;
        return true;
    }

    buildKey(key) {
        return [this.basePath, this.directory, key].filter(Boolean).join(":");
    }

    /**
     * Retrieves a value from localStorage.
     * @param {string} key - The key to retrieve
     * @param {*} [defaultValue] - Default value if key doesn't exist
     * @returns {string|*} The stored value or default value
     */
    get(key, defaultValue) {
        const value = this.localStorage.getItem(this.buildKey(key));
        return value === null ? defaultValue : this.accessor(key, value);
    }

    /**
     * Converts a stored value back to its original type based on the index metadata.
     * @param {string} key - The key of the value in the index
     * @param {*} value - The value to convert
     * @param {string} [type] - The type to convert to (if known)
     * @returns {*} The converted value
     */
    accessor(key, value, type) {
        const meta = this.currentIndex?.[key];
        const valueType = type || meta?.type;

        if (valueType === "number") return Number(value);
        if (valueType === "array" || valueType === "object") return JSON.parse(value);
        if (valueType === "boolean") return value === "true";

        return value;
    }

    /**
     * Converts a value to a string representation suitable for storage.
     * @param {*} value - The value to convert
     * @param {string} [type] - The type of the value
     * @returns {string} The stringified value
     */
    mutator(value, type) {
        const valueType = type || (Array.isArray(value) ? "array" : typeof value);

        if (valueType === "array" || valueType === "object") return JSON.stringify(value);
        return String(value);
    }

    /**
     * Sets a value in localStorage with type tracking.
     * @param {string} key - The key to set
     * @param {*} value - The value to store
     * @param {string|null} [type=null] - Optional explicit type (auto-detected if null)
     */
    set(key, value, type = null) {
        const valueType = type || (Array.isArray(value) ? "array" : typeof value);
        this.localStorage.setItem(this.buildKey(key), this.mutator(value, valueType));
        this.currentIndex[key] = { type: valueType };
        this.save();
    }

    /**
     * Removes a value from storage.
     * @param {string} key - The key to remove
     */
    remove(key) {
        this.localStorage.removeItem(this.buildKey(key));
        delete this.currentIndex[key];
        this.save();
    }

    /**
     * Caches data with an optional expiration time.
     * @param {string} key - The cache key
     * @param {*} data - The data to cache
     * @param {number} [expires] - Expiration time in milliseconds (Infinity if not provided)
     * @param {Object} [options={}] - Additional cache options
     */
    cache(key, data, expires, options = {}) {
        const now = Date.now();
        const cacheName = [this.cacheBasePath, key].join(":");
        const cacheData = {
            data,
            expires: expires ? now + expires : Infinity,
            options
        };

        this.cacheIndex[key] = {
            expires: cacheData.expires
        };

        this.localStorage.setItem(cacheName, JSON.stringify(cacheData));
        this.localStorage.setItem(this.cacheIndexPath, JSON.stringify(this.cacheIndex));
    }

    /**
     * Fetches and caches a file from a URL.
     * @param {string} url - The URL to fetch and cache
     * @returns {Promise<void>}
     */
    async cacheFile(url) {
        await fetch(url).then();
    }

    /**
     * Saves the current state to localStorage.
     */
    save() {
        this.localStorage.setItem(this.internalPath, JSON.stringify(this._index));
        this.localStorage.setItem(this.bucketsPath, JSON.stringify(this.buckets));
    }

    /**
     * Initializes the storage by loading buckets and indexes from localStorage.
     */
    initialize() {
        this.buckets = JSON.parse(this.localStorage.getItem(this.bucketsPath) || "[]");
        this.cacheIndex = JSON.parse(this.localStorage.getItem(this.cacheIndexPath) || "{}");
        this._index = JSON.parse(this.localStorage.getItem(this.internalPath) || "{}");
        this.currentIndex = this._index;
    }
}

export { ensureLocalStorage, PersistentLocalStorage };
export default JuiceStorage;
