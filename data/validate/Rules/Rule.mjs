/**
 * Individual validation rule with execution and error handling.
 * Executes validation logic and manages async endpoint validation.
 * @module data/validate/Rules/Rule
 */

import RulePresets, { ERROR_TYPES } from "../Presets.mjs";
import Messages from "../Messages.mjs";
import { ValidationError } from "../Errors.mjs";

/**
 * Global map of in-flight endpoint controllers keyed by rule+endpoint.
 * Used to cancel stale async validation requests.
 * @type {Map<string, AbortController>}
 */
const ENDPOINT_CONTROLLERS = new Map();

/**
 * Merge one or more AbortSignals into a single signal.
 * @param {...AbortSignal|null} signals
 * @returns {AbortSignal|null}
 */
function mergeAbortSignals(...signals) {
    const activeSignals = signals.filter(Boolean);
    if (activeSignals.length === 0) return null;
    if (activeSignals.length === 1) return activeSignals[0];

    const controller = new AbortController();
    const onAbort = () => {
        if (!controller.signal.aborted) {
            controller.abort();
        }
    };

    for (let i = 0; i < activeSignals.length; i += 1) {
        const signal = activeSignals[i];
        if (signal.aborted) {
            onAbort();
            break;
        }
        signal.addEventListener("abort", onAbort, { once: true });
    }

    return controller.signal;
}

/**
 * Normalize URL/Request input into an endpoint key segment.
 * Query strings are intentionally excluded.
 * @param {string|URL|Request} url
 * @returns {string}
 */
function normalizeEndpointUrl(url) {
    if (url instanceof URL) {
        return `${url.origin}${url.pathname}`;
    }
    if (typeof Request !== "undefined" && url instanceof Request) {
        try {
            const requestUrl = new URL(url.url, typeof location !== "undefined" ? location.href : undefined);
            return `${requestUrl.origin}${requestUrl.pathname}`;
        } catch (_error) {
            return String(url.url || "");
        }
    }
    if (typeof url === "string") {
        try {
            const parsed = new URL(url, typeof location !== "undefined" ? location.href : undefined);
            return `${parsed.origin}${parsed.pathname}`;
        } catch (_error) {
            return url.split("?")[0];
        }
    }
    return String(url || "");
}

/**
 * Executable validation rule instance.
 */
class Rule {
    /**
     * @param {string} type
     * @param {...*} args
     */
    constructor(type, ...args) {
        this.type = type;
        this.args = args;
        this.fn = RulePresets[type] || null;
        this.value = undefined;
        this.property = "";
        this.scope = null;
        this.state = "initial";
        this.status = "initial";
        this.valid = null;
        this._activeRun = null;
        this._runId = 0;
    }

    /**
     * Get formatted message for a specific field label.
     * @param {string} field
     * @returns {string}
     */
    msg(field) {
        this.field = field;
        return Messages.get(this);
    }

    /**
     * Get formatted message using current rule state.
     * @returns {string}
     */
    message() {
        return Messages.get(this);
    }

    /**
     * Convert the current rule failure into a typed error.
     * @returns {ValidationError}
     */
    toError() {
        const ErrorType = ERROR_TYPES[this.type];
        if (typeof ErrorType === "function") {
            const typedError = new ErrorType(this);
            if (typedError instanceof ValidationError) return typedError;
        }
        return new ValidationError(this);
    }

    /**
     * Abort any currently running async validation for this rule.
     */
    _abortActiveRun() {
        if (!this._activeRun) return;
        this._activeRun.aborted = true;
        if (this._activeRun.controller) {
            this._activeRun.controller.abort();
        }

        const endpointEntries = Array.from(this._activeRun.endpointControllers.entries());
        for (let i = 0; i < endpointEntries.length; i += 1) {
            const [endpointKey, endpointController] = endpointEntries[i];
            if (ENDPOINT_CONTROLLERS.get(endpointKey) === endpointController) {
                ENDPOINT_CONTROLLERS.delete(endpointKey);
            }
            endpointController.abort();
        }

        this._activeRun.endpointControllers.clear();
        this._activeRun = null;
    }

    /**
     * Build a cache/cancel key for async endpoint validation.
     * @param {string|URL|Request} url
     * @param {{cancelKey?: string, method?: string}} [options={}]
     * @returns {string}
     */
    _endpointKeyFor(url, options = {}) {
        if (options && options.cancelKey) {
            return String(options.cancelKey);
        }

        const requestMethod = options && options.method
            ? String(options.method).toUpperCase()
            : typeof Request !== "undefined" && url instanceof Request
                ? String(url.method || "GET").toUpperCase()
                : "GET";
        const endpointUrl = normalizeEndpointUrl(url);
        const scopeKey = `${this.property || "__value"}:${this.type || "rule"}`;
        return `${scopeKey} ${requestMethod} ${endpointUrl}`;
    }

    /**
     * Build the contextual helpers passed to async validation functions.
     * @param {{controller: AbortController, endpointControllers: Map<string, AbortController>, aborted: boolean}} runState
     * @returns {{signal: AbortSignal, aborted: Function, fetch: Function}}
     */
    _buildRuleContext(runState) {
        return {
            signal: runState.controller.signal,
            aborted: () => runState.controller.signal.aborted || runState.aborted,
            fetch: async (url, options = {}) => {
                if (typeof fetch !== "function") {
                    throw new Error('Global "fetch" is not available in this environment.');
                }

                const { cancelKey, ...requestInit } = options || {};
                const endpointKey = this._endpointKeyFor(url, {
                    ...requestInit,
                    cancelKey
                });

                const existingController = ENDPOINT_CONTROLLERS.get(endpointKey);
                if (existingController) {
                    existingController.abort();
                }

                const endpointController = new AbortController();
                ENDPOINT_CONTROLLERS.set(endpointKey, endpointController);
                runState.endpointControllers.set(endpointKey, endpointController);

                const signal = mergeAbortSignals(
                    requestInit.signal || null,
                    runState.controller.signal,
                    endpointController.signal
                );

                try {
                    return await fetch(url, {
                        ...requestInit,
                        signal: signal || undefined
                    });
                } finally {
                    runState.endpointControllers.delete(endpointKey);
                    if (ENDPOINT_CONTROLLERS.get(endpointKey) === endpointController) {
                        ENDPOINT_CONTROLLERS.delete(endpointKey);
                    }
                }
            }
        };
    }

    /**
     * Execute this rule against a value.
     * Returns `true` when valid, or a `ValidationError` when invalid.
     * @param {*} value
     * @returns {Promise<true|ValidationError>}
     */
    async test(value) {
        this.value = value;
        this.status = "testing";
        this._abortActiveRun();

        if (!this.fn) {
            this.state = "tested";
            this.valid = true;
            return true;
        }

        const runState = {
            id: (this._runId += 1),
            controller: new AbortController(),
            endpointControllers: new Map(),
            aborted: false
        };
        this._activeRun = runState;

        const context = this._buildRuleContext(runState);
        const expectedArgsWithoutContext = 1 + this.args.length;
        const shouldPassContext = this.fn.usesValidationContext === true ||
            this.fn.length > expectedArgsWithoutContext;
        const invocationArgs = shouldPassContext
            ? [value, ...this.args, context]
            : [value, ...this.args];

        let result;
        try {
            result = await Promise.resolve(this.fn(...invocationArgs));
        } catch (error) {
            if (runState.aborted || (error && error.name === "AbortError")) {
                this.state = "tested";
                this.valid = true;
                return true;
            }
            throw error;
        } finally {
            if (this._activeRun === runState) {
                this._activeRun = null;
            }
        }

        if (runState.aborted || runState.controller.signal.aborted) {
            this.state = "tested";
            this.valid = true;
            return true;
        }

        if (typeof result !== "boolean") {
            throw new Error(`Validation rule "${this.type}" must return a boolean or Promise<boolean>.`);
        }

        this.state = "tested";
        this.valid = result;
        return result ? true : this.toError();
    }
}

export default Rule;
