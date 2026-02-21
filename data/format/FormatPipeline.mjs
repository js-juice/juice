/**
 * Format pipeline utilities.
 * Parses formatter expressions and applies them sequentially.
 * @module data/format/FormatPipeline
 */

import { getFormatters, applyDigitTemplate } from "./Presets.mjs";

/**
 * Split a string on a delimiter while ignoring delimiters inside parentheses.
 * @param {string} text - Source text.
 * @param {string} delimiter - Delimiter character.
 * @returns {string[]} Parsed parts.
 */
function splitTopLevel(text, delimiter) {
    const input = String(text || "");
    const parts = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        if (char === "(") {
            depth += 1;
            current += char;
            continue;
        }
        if (char === ")") {
            depth = Math.max(0, depth - 1);
            current += char;
            continue;
        }
        if (char === delimiter && depth === 0) {
            parts.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }

    if (current.trim().length) {
        parts.push(current.trim());
    }

    return parts;
}

/**
 * Remove matching single or double quotes from a string.
 * @param {string} text - Raw token text.
 * @returns {string} Unquoted value.
 */
function unquote(text) {
    const value = String(text || "").trim();
    if (value.length < 2) return value;
    const quote = value[0];
    if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) {
        return value;
    }
    return value.slice(1, -1);
}

/**
 * Parse formatter token arguments.
 * @param {string} argsText - Raw args text.
 * @returns {string[]} Parsed args.
 */
function parseTokenArgs(argsText) {
    if (typeof argsText !== "string" || !argsText.trim()) return [];
    return splitTopLevel(argsText, ",").map((arg) => unquote(arg.trim()));
}

/**
 * Parse a formatter token like `upper` or `tpl(ddddd-dddd)`.
 * @param {string} token - Raw token text.
 * @returns {{type: "named", name: string, args: string[]} | null} Parsed token.
 */
function parseFormatterToken(token) {
    const text = String(token || "").trim();
    if (!text) return null;

    const fnMatch = text.match(/^([a-zA-Z0-9_-]+)\(([\s\S]*)\)$/);
    if (fnMatch) {
        const name = fnMatch[1];
        const args = parseTokenArgs(fnMatch[2]);
        return { type: "named", name, args };
    }

    return { type: "named", name: text, args: [] };
}

/**
 * Check whether a token looks like a digit template (for example `ddddd-dddd`).
 * @param {string} token - Token text.
 * @returns {boolean} True when token resembles a digit template.
 */
function looksLikeTemplateToken(token) {
    const text = String(token || "").trim();
    if (!text || !text.includes("d")) return false;
    return /^[d0-9\s+\-()./]+$/i.test(text);
}

/**
 * Normalize a format spec into executable pipeline steps.
 * @param {string|Function|Array<string|Function>} formatSpec - Format specification.
 * @returns {Array<{type: "named", name: string, args: string[]} | {type: "callable", fn: Function, args: Array}>}
 * Parsed steps.
 */
function normalizeSteps(formatSpec) {
    if (typeof formatSpec === "function") {
        return [{ type: "callable", fn: formatSpec, args: [] }];
    }

    if (Array.isArray(formatSpec)) {
        const nested = formatSpec.flatMap((entry) => normalizeSteps(entry));
        return nested;
    }

    if (typeof formatSpec !== "string") return [];

    const tokens = splitTopLevel(formatSpec, ":");
    const steps = [];
    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (!token) continue;
        const parsed = parseFormatterToken(token);
        if (!parsed) continue;
        steps.push(parsed);
    }
    return steps;
}

/**
 * Resolve a named step to a formatter function and args.
 * @param {{name?: string, args?: Array}} step - Parsed step.
 * @param {Record<string, Function>} formatters - Formatter registry.
 * @returns {{fn: Function, args: Array} | null} Executable formatter entry.
 */
function resolveNamedFormatter(step, formatters) {
    const name = String(step && step.name ? step.name : "").trim();
    if (!name) return null;
    if (typeof formatters[name] === "function") return { fn: formatters[name], args: step.args || [] };
    if (looksLikeTemplateToken(name)) {
        return {
            fn(value, template) {
                return applyDigitTemplate(value, template);
            },
            args: [name]
        };
    }
    return null;
}

/**
 * Normalize unknown input to string.
 * @param {*} value - Input value.
 * @returns {string} String value.
 */
function toStringValue(value) {
    if (value == null) return "";
    return String(value);
}

/**
 * Apply a formatter pipeline to a value.
 * Supports string specs (`upper:trim`), function steps, and arrays of steps.
 *
 * @param {*} value - Input value.
 * @param {string|Function|Array<string|Function>} formatSpec - Pipeline specification.
 * @param {Object} [options={}] - Runtime options.
 * @param {Record<string, Function>} [options.formatters] - Custom formatter overrides.
 * @param {*} [options.context] - `this` context for formatter function calls.
 * @returns {string} Formatted string value.
 *
 * @example
 * applyFormatPipeline(" hello world ", "trim:upper");
 * // => "HELLO WORLD"
 *
 * @example
 * applyFormatPipeline("123456789", "tpl(ddddd-dddd)");
 * // => "12345-6789"
 */
export function applyFormatPipeline(value, formatSpec, options = {}) {
    const steps = normalizeSteps(formatSpec);
    if (!steps.length) return toStringValue(value);

    const externalFormatters = options && options.formatters ? options.formatters : {};
    const formatters = { ...getFormatters(), ...(externalFormatters || {}) };
    const context = options && options.context ? options.context : null;

    let formatted = toStringValue(value);
    for (let i = 0; i < steps.length; i += 1) {
        const step = steps[i];
        let entry = null;
        if (step.type === "callable") {
            entry = { fn: step.fn, args: step.args || [] };
        } else if (step.type === "named") {
            entry = resolveNamedFormatter(step, formatters);
        }

        if (!entry || typeof entry.fn !== "function") continue;

        try {
            const next = entry.fn.apply(context, [formatted, ...(entry.args || [])]);
            if (next != null) {
                formatted = toStringValue(next);
            }
        } catch (_error) {
            // Ignore formatter failure so input updates continue.
        }
    }

    return formatted;
}

export default {
    applyFormatPipeline
};
