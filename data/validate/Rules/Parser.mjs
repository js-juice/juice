/**
 * Validation rule string parser.
 * Converts shorthand rule syntax into Rule objects.
 * @module data/validate/Rules/Parser
 */

import { type } from "../ValidationUtil.mjs";
import Presets from "../Presets.mjs";
import Rule from "./Rule.mjs";

/**
 * Known shorthand rule names used to disambiguate tokens without `:`.
 * @type {Set<string>}
 */
const KNOWN_TYPES = new Set([
    "required",
    "min",
    "max",
    "length",
    "email",
    "phone",
    "address",
    "postal",
    "int",
    "integer",
    "string",
    "number",
    "array",
    "boolean",
    "object",
    "timestamp",
    "equals",
    "in",
    "chars",
    "empty",
    "notEmpty",
    "null"
]);

/**
 * @param {*} arr
 * @returns {boolean}
 */
function hasFunction(arr) {
    return Array.isArray(arr) && arr.some((item) => typeof item === "function");
}

/**
 * Normalize a raw token to a canonical rule token.
 * Supports legacy shorthand like `a-z0-9` => `chars:a-z0-9`.
 * @param {*} token
 * @returns {string}
 */
function normalizeToken(token) {
    const raw = String(token || "").trim();
    if (!raw) return raw;
    if (raw.includes(":")) return raw;
    if (KNOWN_TYPES.has(raw) || typeof Presets[raw] === "function") return raw;

    // Backward-compatible shorthand like "a-z0-9".
    if (/^[a-z0-9-]+$/i.test(raw) && raw.includes("-")) {
        return `chars:${raw}`;
    }
    return raw;
}

/**
 * Parse string/array rule declarations into `Rule` instances.
 */
class RuleParser {
    /**
     * Normalize rule argument input into an array.
     * @param {*} args
     * @returns {Array<*>}
     */
    static parseArgs(args) {
        if (type(args, "string")) {
            return args.includes(",") ? args.split(",").map((part) => part.trim()) : [args.trim()];
        }
        if (Array.isArray(args)) return args;
        if (args === undefined || args === null || args === "") return [];
        return [args];
    }

    /**
     * Parse a pipe-delimited string into Rule instances.
     * @param {string} raw
     * @returns {Rule[]}
     */
    static parseString(raw) {
        const tokens = String(raw)
            .split("|")
            .map((token) => normalizeToken(token))
            .filter(Boolean);

        return tokens.map((token) => {
            if (token.includes(":")) {
                const [ruleType, args] = token.split(":");
                return new Rule(ruleType, ...RuleParser.parseArgs(args));
            }
            return new Rule(token);
        });
    }

    /**
     * Parse rule declarations from string/array formats.
     * Supports:
     * - `required|min:3`
     * - `["required|min:3", ["equals", "x"]]`
     * - `Rule` instances
     * @param {string|Array|Rule} raw
     * @returns {Rule[]}
     */
    static parse(raw) {
        let rules = [];
        if (type(raw, "string")) {
            rules = RuleParser.parseString(raw);
        } else if (type(raw, "array")) {
            for (let i = 0; i < raw.length; i += 1) {
                const item = raw[i];
                if (type(item, "string")) {
                    rules = rules.concat(RuleParser.parse(item));
                } else if (item instanceof Rule) {
                    rules.push(item);
                } else if (type(item, "array")) {
                    if (hasFunction(item)) {
                        const rule = new Rule(item[0], ...RuleParser.parseArgs(item[1]));
                        if (item.length > 2) rule.fn = item[2];
                        rules.push(rule);
                    } else {
                        rules = rules.concat(RuleParser.parse(item));
                    }
                }
            }
        }
        return rules;
    }
}

export default RuleParser;
