/**
 * Collection of validation rules bound to a single property.
 * Tracks error changes and provides rule execution for a field.
 * @module data/validate/Rules/RuleSet
 */

import Emitter from "../Emitter.mjs";
import Rule from "./Rule.mjs";
import RuleParser from "./Parser.mjs";
import { ValidationError } from "../Errors.mjs";

/**
 * Collection of rules bound to one property.
 */
class RuleSet extends Emitter {
    /**
     * @param {string} property
     * @param {*} [scope]
     */
    constructor(property, scope) {
        super();
        this.rules = [];
        this.property = property;
        this.scope = scope || null;
    }

    /**
     * @returns {string[]}
     */
    get ruleTypes() {
        return this.rules.map((rule) => rule.type);
    }

    /**
     * @param {string} ruleType
     * @returns {Rule|undefined}
     */
    getRule(ruleType) {
        return this.rules.find((rule) => rule.type === ruleType);
    }

    /**
     * @param {string} ruleType
     * @returns {boolean}
     */
    has(ruleType) {
        return this.ruleTypes.includes(ruleType);
    }

    /**
     * Add rule declarations to this set.
     * @param {Rule|string|Array} rules
     * @returns {boolean}
     */
    add(rules) {
        let added = [];
        if (rules instanceof Rule) {
            if (this.has(rules.type)) return false;
            rules.property = this.property;
            if (this.scope) rules.scope = this.scope;
            added.push(rules);
        } else {
            const parsed = RuleParser.parse(rules).filter((rule) => !this.has(rule.type));
            added = parsed.map((rule) => {
                rule.property = this.property;
                if (this.scope) rule.scope = this.scope;
                return rule;
            });
        }
        this.rules = this.rules.concat(added);
        return true;
    }

    /**
     * Execute only one rule type against a value.
     * @param {string} ruleType
     * @param {*} value
     * @returns {Promise<true|ValidationError>}
     */
    async onlyTest(ruleType, value) {
        const rule = this.rules.find((item) => item.type === ruleType);
        if (!rule) return true;
        return rule.test(value);
    }

    /**
     * Execute all rules against a value and return only failures.
     * @param {*} value
     * @returns {Promise<ValidationError[]>}
     */
    async test(value) {
        const results = await Promise.all(this.rules.map((rule) => rule.test(value)));
        return results.filter((item) => item instanceof ValidationError);
    }
}

export default RuleSet;
