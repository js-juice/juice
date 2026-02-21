import Emitter from "./Emitter.mjs";
import RuleSet from "./Rules/RuleSet.mjs";
import { empty, arrayDiff } from "./ValidationUtil.mjs";

/**
 * Rule registry/executor per validated scope.
 * Tracks rule sets by property and maintains current errors per property.
 */
class ValidationRules extends Emitter {
    /**
     * @param {Record<string, string|Array>} [rules={}]
     * @param {*} [scope]
     */
    constructor(rules = {}, scope) {
        super();
        this.scope = scope || null;
        this.errors = {};
        this._ruleSets = {};
        this._testTokens = {};

        Object.keys(rules || {}).forEach((property) => {
            this.add(property, rules[property]);
        });
    }

    /**
     * @returns {boolean}
     */
    hasErrors() {
        return Object.keys(this.errors).length > 0;
    }

    /**
     * @param {string} property
     * @returns {boolean}
     */
    has(property) {
        return !!this._ruleSets[property];
    }

    /**
     * @param {string} property
     * @returns {RuleSet|[]}
     */
    get(property) {
        return this._ruleSets[property] || [];
    }

    /**
     * @param {string} property
     * @returns {Array}
     */
    errorsOf(property) {
        return this.errors[property] || [];
    }

    /**
     * @param {string} property
     * @param {string} ruleType
     * @returns {boolean}
     */
    propertyHasRule(property, ruleType) {
        return this._ruleSets[property] && this._ruleSets[property].has(ruleType);
    }

    /**
     * Add rules for a property.
     * @param {string} property
     * @param {string|Array} rules
     */
    add(property, rules) {
        if (empty(rules)) return;
        const ruleSet = this.has(property) ? this._ruleSets[property] : new RuleSet(property, this.scope);
        ruleSet.add(rules);
        if (!this._ruleSets[property]) this._ruleSets[property] = ruleSet;
    }

    /**
     * @param {string} property
     * @returns {string[]}
     */
    errorTypes(property) {
        return (this.errors[property] || []).map((rule) => rule.type);
    }

    /**
     * Validate a single property value against its RuleSet.
     * Emits a `"change"` event when error types change.
     * @param {string} property
     * @param {*} value
     * @returns {Promise<boolean>}
     */
    async test(property, value) {
        if (!this.has(property)) return true;
        const testToken = (this._testTokens[property] || 0) + 1;
        this._testTokens[property] = testToken;

        const previousErrorTypes = this.errorTypes(property);
        let changes = { added: [], removed: [] };

        if (empty(value)) {
            if (!this._ruleSets[property].has("required")) {
                if (this._testTokens[property] !== testToken) {
                    return this.errorTypes(property).length === 0;
                }
                this.errors[property] = [];
                this.emit("change", property, { added: [], removed: previousErrorTypes });
                return true;
            }

            const requiredRule = this._ruleSets[property].getRule("required");
            if (this._testTokens[property] !== testToken) {
                return this.errorTypes(property).length === 0;
            }
            this.errors[property] = [requiredRule.toError()];
            changes = arrayDiff(previousErrorTypes, ["required"]);
            this.emit("change", property, changes);
            return false;
        }

        const errors = await this._ruleSets[property].test(value);
        if (this._testTokens[property] !== testToken) {
            return this.errorTypes(property).length === 0;
        }

        if (empty(errors)) {
            this.errors[property] = [];
            if (!empty(previousErrorTypes)) {
                changes = { added: [], removed: [...previousErrorTypes] };
            }
        } else {
            const currentTypes = errors.map((error) => error.type);
            changes = arrayDiff(previousErrorTypes, currentTypes);
            this.errors[property] = errors;
        }

        if (!empty([...(changes.added || []), ...(changes.removed || [])])) {
            this.emit("change", property, changes);
        }

        return empty(errors);
    }

    /**
     * Validate all properties from a data object.
     * @param {Record<string, *>} data
     * @returns {Promise<boolean>}
     */
    async testAll(data) {
        this.errors = {};
        const tests = Object.keys(data || {}).map((property) => this.test(property, data[property]));
        const results = await Promise.all(tests);
        return results.every(Boolean);
    }
}

export default ValidationRules;
