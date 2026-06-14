/**
 * Built-in formatter presets and registry management.
 * @module data/format/Presets
 */

import StringFormat from "./String.mjs";

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
 * Apply a digit-mask template where `d` tokens consume numeric digits.
 *
 * @param {*} value - Raw input value.
 * @param {string} [template=""] - Digit template, for example `+d (ddd) ddd-dddd`.
 * @returns {string} Formatted output.
 *
 * @example
 * applyDigitTemplate("1234567890", "(ddd) ddd-dddd");
 * // => "(123) 456-7890"
 */
export function applyDigitTemplate(value, template = "") {
    const rawTemplate = toStringValue(template);
    if (!rawTemplate) return toStringValue(value);

    const digits = toStringValue(value).replace(/\D/g, "");
    if (!digits.length) return "";

    let output = "";
    let digitIndex = 0;

    for (let i = 0; i < rawTemplate.length; i += 1) {
        const token = rawTemplate[i];
        if (token === "d") {
            if (digitIndex >= digits.length) break;
            output += digits[digitIndex];
            digitIndex += 1;
            continue;
        }

        const hasPlaceholderAhead = rawTemplate.slice(i + 1).includes("d");
        const hasDigitsLeft = digitIndex < digits.length;
        if (hasPlaceholderAhead && hasDigitsLeft) {
            output += token;
        }
    }

    return output;
}

/**
 * Built-in formatter implementations.
 * Each formatter receives a value and returns the formatted result.
 * @type {Record<string, Function>}
 */
const BUILT_IN_FORMATTERS = {
    upper(value) {
        return StringFormat.upper(toStringValue(value));
    },
    lower(value) {
        return StringFormat.lower(toStringValue(value));
    },
    ucword(value) {
        return StringFormat.ucword(toStringValue(value));
    },
    ucwords(value) {
        return StringFormat.ucwords(toStringValue(value));
    },
    dashed(value) {
        return StringFormat.dashed(toStringValue(value));
    },
    computize(value) {
        return StringFormat.computize(toStringValue(value));
    },
    camel(value) {
        return StringFormat.camel(toStringValue(value));
    },
    camelCase(value) {
        return StringFormat.camelCase(toStringValue(value));
    },
    pascalCase(value) {
        return StringFormat.pascalCase(toStringValue(value));
    },
    studly(value) {
        return StringFormat.studly(toStringValue(value));
    },
    unStudly(value) {
        return StringFormat.unStudly(toStringValue(value));
    },
    unPascal(value, separator = "_") {
        return StringFormat.unPascal(toStringValue(value), toStringValue(separator));
    },
    trim(value) {
        return toStringValue(value).trim();
    },
    digits(value) {
        return toStringValue(value).replace(/\D/g, "");
    },
    tpl(value, template = "") {
        return applyDigitTemplate(value, template);
    },
    template(value, template = "") {
        return applyDigitTemplate(value, template);
    }
};

/**
 * Mutable runtime formatter registry seeded with built-ins.
 * @type {Record<string, Function>}
 */
const PRESET_FORMATTERS = { ...BUILT_IN_FORMATTERS };

const FORMATTER_METADATA = {
    upper: {
        description: "Converts the value to uppercase.",
        example: "EXAMPLE TEXT",
        format: "All letters uppercase."
    },
    lower: {
        description: "Converts the value to lowercase.",
        example: "example text",
        format: "All letters lowercase."
    },
    ucword: {
        description: "Capitalizes the first word.",
        example: "Example text",
        format: "First word begins with an uppercase letter."
    },
    ucwords: {
        description: "Capitalizes each word.",
        example: "Example Text",
        format: "Each word begins with an uppercase letter."
    },
    dashed: {
        description: "Converts the value to lowercase dashed text.",
        example: "example-text",
        format: "Lowercase words separated by hyphens."
    },
    computize: {
        description: "Converts the value to a computer-safe identifier.",
        example: "example_text",
        format: "Lowercase words separated by underscores."
    },
    camel: {
        description: "Converts the value to camel case.",
        example: "exampleText",
        format: "First word lowercase; following words begin uppercase with no spaces."
    },
    camelCase: {
        description: "Converts the value to camel case.",
        example: "exampleText",
        format: "First word lowercase; following words begin uppercase with no spaces."
    },
    pascalCase: {
        description: "Converts the value to Pascal case.",
        example: "ExampleText",
        format: "Every word begins uppercase with no spaces."
    },
    studly: {
        description: "Converts the value to studly case.",
        example: "ExampleText",
        format: "Every word begins uppercase with no spaces."
    },
    unStudly: {
        description: "Splits a studly-cased value into words.",
        example: "example text",
        format: "Words separated by spaces."
    },
    unPascal: {
        description: "Splits a Pascal-cased value using the configured separator.",
        example: "example_text",
        format: "Words separated by the configured separator."
    },
    trim: {
        description: "Removes whitespace from the beginning and end.",
        example: "Example text",
        format: "No leading or trailing whitespace."
    },
    digits: {
        description: "Removes all non-numeric characters.",
        example: "5551234567",
        format: "Digits only; non-numeric characters are removed."
    },
    tpl: {
        description: "Formats digits using the supplied template.",
        example: "(555) 555-5555",
        format: "Digits arranged according to the configured template."
    },
    template: {
        description: "Formats digits using the supplied template.",
        example: "(555) 555-5555",
        format: "Digits arranged according to the configured template."
    }
};

/**
 * Normalize formatter names for registry keys.
 * @param {*} name - Formatter name.
 * @returns {string} Normalized name.
 */
function normalizeFormatterName(name) {
    return String(name || "").trim();
}

/**
 * Register a single formatter function by name.
 * @param {string} name - Formatter name.
 * @param {Function} formatter - Formatter implementation.
 * @param {{description?: string, example?: string, format?: string}} [metadata] - Field feedback metadata.
 * @returns {boolean} True when formatter was registered.
 */
export function registerFormatter(name, formatter, metadata = {}) {
    const formatterName = normalizeFormatterName(name);
    if (!formatterName || typeof formatter !== "function") return false;
    PRESET_FORMATTERS[formatterName] = formatter;
    FORMATTER_METADATA[formatterName] = { ...(metadata || {}) };
    return true;
}

/**
 * Register multiple formatters from a map.
 * @param {Record<string, Function>} [formatters={}] - Formatter map.
 * @param {Record<string, {description?: string, example?: string, format?: string}>} [metadata={}]
 * @returns {boolean} Always true after processing input map.
 */
export function registerFormatters(formatters = {}, metadata = {}) {
    const entries = Object.entries(formatters || {});
    for (let i = 0; i < entries.length; i += 1) {
        const [name, formatter] = entries[i];
        registerFormatter(name, formatter, metadata[name]);
    }
    return true;
}

/**
 * Get a copy of the current formatter registry.
 * @returns {Record<string, Function>} Formatter map.
 */
export function getFormatters() {
    return { ...PRESET_FORMATTERS };
}

export function getFormatterMetadata(name) {
    const formatterName = normalizeFormatterName(name);
    return { ...(FORMATTER_METADATA[formatterName] || {}) };
}

export default {
    applyDigitTemplate,
    getFormatters,
    getFormatterMetadata,
    registerFormatter,
    registerFormatters
};
