import Emitter from "./Emitter.mjs";
import ValidationRules from "./Rules.mjs";
import { ValidationErrors } from "./Errors.mjs";
import { empty } from "./ValidationUtil.mjs";

/**
 * Runtime validator bound to one scope.
 * Owns rule execution and live error collection.
 */
class ValidatorInstance extends Emitter {
    /**
     * ValidatorInstance constructor
     * @param {Object} rules - The rules for the Validator
     * @param {Object} scope - The scope of the Validator
     */
    constructor(rules, scope) {
        super();
        this.scope = scope || this;
        this._rules = new ValidationRules(rules, this.scope);
        this._errors = new ValidationErrors(this);
        this._debug = false;

        this.onRuleErrorsChange = this.onRuleErrorsChange.bind(this);
        this._rules.on("change", this.onRuleErrorsChange);
    }

    /**
     * Apply rule-error diff updates into the exposed error collection.
     * @param {string} property
     * @param {{added: string[], removed: string[]}} diff
     */
    onRuleErrorsChange(property, diff) {
        if (!empty(diff.added)) {
            this.updateErrors(property, diff.added);
        }
        if (!empty(diff.removed)) {
            this.removeErrors(property, diff.removed);
        }
    }

    /**
     * @param {string} property
     * @param {string[]} addedTypes
     */
    updateErrors(property, addedTypes) {
        this._rules
            .errorsOf(property)
            .filter((error) => addedTypes.includes(error.type))
            .forEach((error) => this.errors.set(property, error));
    }

    /**
     * @param {string} property
     * @param {string[]} removedTypes
     */
    removeErrors(property, removedTypes) {
        this.errors.resolve(property, removedTypes);
    }

    /**
     * @param {string} property
     * @param {string|Array} [rules=""]
     */
    addRule(property, rules = "") {
        this._rules.add(property, rules);
    }

    /**
     * @param {string} property
     * @param {string} ruleType
     * @returns {boolean}
     */
    hasRule(property, ruleType) {
        return this._rules.propertyHasRule(property, ruleType);
    }

    /**
     * @returns {ValidationErrors}
     */
    get errors() {
        return this._errors;
    }

    /**
     * Enable/disable debug console logging of validation runs.
     * @returns {boolean}
     */
    get debug() {
        return this._debug;
    }

    /**
     * @param {boolean} value
     */
    set debug(value) {
        this._debug = !!value;
    }

    /**
     * @param {string} property
     * @returns {Array}
     */
    errorsOf(property) {
        return this.errors.get(property) || [];
    }

    /**
     * Get resolved messages for one field or all fields.
     * @param {string} [field]
     * @returns {string[]|Record<string, string[]>}
     */
    messages(field) {
        if (field) {
            if (!this.errors.has(field)) return [];
            return this.errors.get(field).map((error) => error.message);
        }
        const all = {};
        const properties = Object.keys(this.errors.properties || {});
        properties.forEach((property) => {
            all[property] = this.errors.get(property).map((error) => error.message);
        });
        return all;
    }

    /**
     * Validate a single field value.
     * @param {string} field
     * @param {*} value
     * @returns {Promise<boolean>}
     */
    async validateField(field, value) {
        const valid = await this._rules.test(field, value);
        this.logFieldDebug(field, value, valid);
        return valid;
    }

    /**
     * Alias for `validateField`.
     * @param {string} field
     * @param {*} value
     * @returns {Promise<boolean>}
     */
    async test(field, value) {
        return this.validateField(field, value);
    }

    /**
     * Validate all fields in a data object.
     * @param {Record<string, *>} data
     * @returns {Promise<boolean>}
     */
    async validate(data) {
        const valid = await this._rules.testAll(data);
        this.logAllDebug(data, valid);
        return valid;
    }

    /**
     * Debug helper for single-field validation runs.
     * @param {string} field
     * @param {*} value
     * @param {boolean} valid
     */
    logFieldDebug(field, value, valid) {
        if (!this.debug || !field) return;

        const payload = this.errorsOf(field).map((error) => ({
            type: error.type,
            message: error.message,
            args: error.args
        }));

        console.groupCollapsed(`[Validator debug] "${field}" -> ${valid ? "valid" : "invalid"}`);
        console.log("value:", value);
        if (payload.length > 0) {
            console.table(payload);
        } else {
            console.log("errors: []");
        }
        console.groupEnd();
    }

    /**
     * Debug helper for multi-field validation runs.
     * @param {Record<string, *>} data
     * @param {boolean} valid
     */
    logAllDebug(data, valid) {
        if (!this.debug) return;

        const fields = Object.keys(data || {});
        if (fields.length === 0) return;

        console.groupCollapsed(`[Validator debug] validate(data) -> ${valid ? "valid" : "invalid"}`);
        fields.forEach((field) => {
            const value = data ? data[field] : undefined;
            const fieldErrors = this.errorsOf(field).map((error) => ({
                type: error.type,
                message: error.message,
                args: error.args
            }));

            console.log(`field "${field}" value:`, value);
            if (fieldErrors.length > 0) {
                console.table(fieldErrors);
            } else {
                console.log(`field "${field}" errors: []`);
            }
        });
        console.groupEnd();
    }
}

/**
 * Factory/static helpers for creating validator instances.
 */
class Validator {
    /**
     * Create a new validator with the given rules and scope.
     * If data is provided, validate the data against the rules.
     * @param {Object} rules - An object containing the validation rules.
     * @param {Object} [data] - An optional object containing the data to validate.
     * @param {Object} [scope] - An optional object containing the scope of the validation.
     * @returns {ValidatorInstance} - A new ValidatorInstance object.
     */
    static make(rules, data, scope) {
        const validator = new ValidatorInstance(rules, scope);
        if (data) validator.validate(data);
        return validator;
    }

    /**
     * Wrap an object in a proxy that auto-validates changed properties.
     * Exposes the validator via `proxy.validator`.
     * @param {Object} target
     * @param {Record<string, string|Array>} rules
     * @param {{scope?: Object}} [options={}]
     * @returns {Proxy}
     */
    static watchObject(target, rules, options = {}) {
        const validator = new ValidatorInstance(rules, options.scope || target);
        validator.validate(target);

        return new Proxy(target, {
            get(innerTarget, property, receiver) {
                if (property === "validator") return validator;
                return Reflect.get(innerTarget, property, receiver);
            },
            set(innerTarget, property, value, receiver) {
                const ok = Reflect.set(innerTarget, property, value, receiver);
                validator.test(property, value);
                return ok;
            }
        });
    }
}

export default Validator;
