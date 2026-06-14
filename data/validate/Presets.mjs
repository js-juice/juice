/**
 * Built-in validation rule presets and error type mappings.
 * Provides common validation rules for email, phone, postal, types, and more.
 * @module data/validate/Presets
 */

import {
    EmailValidationError,
    UrlValidationError,
    PhoneValidationError,
    AddressValidationError,
    PostalValidationError,
    TypeValidationError,
    InvalidTimestamp,
    MinLengthError,
    MaxLengthError,
    NotEqualError,
    ValueRequiredError,
    InSetError
} from "./Errors.mjs";
import { type } from "./ValidationUtil.mjs";

/**
 * Map rule type to custom error class used when that rule fails.
 * @type {Record<string, Function>}
 */
export const ERROR_TYPES = {
    email: EmailValidationError,
    phone: PhoneValidationError,
    address: AddressValidationError,
    postal: PostalValidationError,
    string: TypeValidationError,
    number: TypeValidationError,
    array: TypeValidationError,
    boolean: TypeValidationError,
    object: TypeValidationError,
    int: TypeValidationError,
    timestamp: InvalidTimestamp,
    min: MinLengthError,
    max: MaxLengthError,
    equals: NotEqualError,
    required: ValueRequiredError,
    in: InSetError,
    url: UrlValidationError
};

const PRESET_METADATA = {
    name: {
        description: "Enter a name.",
        example: "John Doe",
        formatter: "ucwords"
    },
    email: {
        description: "Enter a complete email address.",
        example: "name@example.com",
        formatter: "lower"
    },
    url: {
        description: "Enter a complete HTTP or HTTPS URL with a valid domain.",
        example: "https://example.com"
    },
    phone: {
        description: "Enter a phone number including its area code.",
        example: "(555) 555-5555"
    },
    postal: {
        description: "Enter a five-digit ZIP code with an optional four-digit extension.",
        example: "12345-6789"
    },
    number: {
        description: "Enter a numeric value.",
        example: "42.5"
    },
    address: {
        description: "Enter a complete street address.",
        example: "123 Main Street"
    },
    string: {
        description: "Enter text.",
        example: "Example text"
    },
    text: {
        description: "Enter text.",
        example: "Example text"
    },
    array: {
        description: "Provide a list of values.",
        example: "one, two, three"
    },
    boolean: {
        description: "Choose a true or false value.",
        example: "true"
    },
    object: {
        description: "Provide a structured object value.",
        example: '{"name":"Example"}'
    },
    int: {
        description: "Enter a whole number.",
        example: "42"
    },
    integer: {
        description: "Enter a whole number.",
        example: "42"
    },
    timestamp: {
        description: "Enter a valid date, time, or timestamp.",
        example: "2026-06-14T12:00:00Z"
    },
    sha256: {
        description: "Enter a 64-character SHA-256 hash.",
        example: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    equals: {
        description: "Enter the same value as the related field."
    },
    max: {
        description: "Keep the value at or below the configured maximum."
    },
    min: {
        description: "Meet the configured minimum value or length."
    },
    length: {
        description: "Keep the value within the configured length range."
    },
    required: {
        description: "This field must be completed."
    },
    empty: {
        description: "Leave this field empty."
    },
    notEmpty: {
        description: "Enter a value."
    },
    chars: {
        description: "Use only the allowed characters."
    },
    null: {
        description: "This value must be empty."
    },
    in: {
        description: "Choose one of the allowed values."
    }
};

/**
 * Parse date-like input to epoch milliseconds.
 * @param {*} value
 * @returns {number}
 */
function parseDateValue(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    const date = new Date(value);
    return date.getTime();
}

/**
 * Built-in validation predicate presets.
 * Each method returns `true` when valid.
 */
class Presets {
    static name(value) {
        if (Presets.empty(value)) return true;
        const words = String(value).trim().split(/\s+/).filter(Boolean);
        return words.length >= 2 && words.every((word) => /^\p{Lu}/u.test(word));
    }

    static email(email) {
        const re = /(\w\.?)+@[\w.-]+\.\w{2,}/;
        return re.test(String(email).toLowerCase());
    }

    static phone(phone) {
        const digits = String(phone).replace(/[\D+()]/g, "");
        return /[0-9]{10,14}$/.test(digits);
    }

    static address(address) {
        return /^[a-zA-Z0-9\s,.'-]{3,}$/i.test(String(address));
    }

    static postal(postal) {
        return /^[0-9]{5}(?:-[0-9]{4})?$/i.test(String(postal));
    }

    static string(value) {
        return type(value, "string");
    }

    static text(value) {
        return type(value, "string");
    }

    static number(value) {
        return !Number.isNaN(Number(value));
    }

    static array(arr) {
        return type(arr, "array");
    }

    static boolean(value) {
        return type(value, "boolean");
    }

    static object(value) {
        return type(value, "object");
    }

    static int(value) {
        return Number.isInteger(Number(value));
    }

    static integer(value) {
        return Presets.int(value);
    }

    static timestamp(value) {
        return parseDateValue(value) > 0;
    }

    static sha256(hash) {
        return this.string(hash) && String(hash).length === 64;
    }

    static equals(value, eq) {
        if (value instanceof Date && eq instanceof Date) {
            return value.getTime() === eq.getTime();
        }
        return value === eq;
    }

    static max(value, max) {
        if (value === undefined || value === null || value === "") return true;
        const valueType = type(value);
        if (valueType === "date") {
            return parseDateValue(value) <= parseDateValue(max);
        }
        if (valueType === "number") {
            return Number(value) <= Number(max);
        }
        return String(value).trim().length <= parseInt(max, 10);
    }

    static min(value, min) {
        if ((value === undefined || value === null || value === "") && parseInt(min, 10) > 0) return false;
        const valueType = type(value);
        if (valueType === "date") {
            return parseDateValue(value) >= parseDateValue(min);
        }
        if (valueType === "number") {
            return Number(value) >= Number(min);
        }
        return String(value).trim().length >= parseInt(min, 10);
    }

    static length(value, min, max) {
        if (value === undefined || value === null) return false;
        const len = String(value).length;
        return len >= parseInt(min, 10) && len <= parseInt(max, 10);
    }

    static required(value) {
        return Presets.notEmpty(value);
    }

    static empty(value) {
        if (value === undefined || value === null || value === "") return true;
        if (Array.isArray(value)) return value.length === 0;
        if (type(value, "object")) return Object.keys(value).length === 0;
        if (type(value, "string")) return value.trim() === "";
        return false;
    }

    static notEmpty(value) {
        return !Presets.empty(value);
    }

    static chars(value, ...chars) {
        const input = String(value);
        const source = chars.map((char) => String(char)).join("");
        if (!source.length) return true;
        const charClass = source.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^");
        const regex = new RegExp(`^[${charClass}]+$`);
        return regex.test(input);
    }

    static null(value) {
        return value === null;
    }

    static in(value, ...values) {
        return values.includes(value);
    }

    static url(value) {
        if (Presets.empty(value)) return true;

        const input = String(value);
        if (input !== input.trim()) return false;

        let url;
        try {
            url = new URL(input);
        } catch (_error) {
            return false;
        }

        if (url.protocol !== "http:" && url.protocol !== "https:") return false;

        const hostname = url.hostname.toLowerCase();
        if (!hostname || hostname.startsWith("[") || hostname.length > 253) return false;

        const labels = hostname.split(".");
        if (labels.length < 2) return false;

        const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
        if (!labels.every((label) => validLabel.test(label))) return false;

        const topLevelDomain = labels[labels.length - 1];
        return /^[a-z]{2,63}$/.test(topLevelDomain) || /^xn--[a-z0-9-]{2,59}$/.test(topLevelDomain);
    }
}

/**
 * Normalize dynamic preset names.
 * @param {*} name
 * @returns {string}
 */
function normalizePresetName(name) {
    return String(name || "").trim();
}

/**
 * Register a single validation preset at runtime.
 * @param {string} name
 * @param {Function} fn
 * @param {Function} [ErrorType]
 * @param {{description?: string, example?: string, format?: string, formatter?: string}} [metadata]
 * @returns {boolean}
 */
export function registerPreset(name, fn, ErrorType, metadata = {}) {
    const presetName = normalizePresetName(name);
    if (!presetName || typeof fn !== "function") return false;
    Presets[presetName] = fn;
    if (ErrorType) {
        ERROR_TYPES[presetName] = ErrorType;
    }
    PRESET_METADATA[presetName] = { ...(metadata || {}) };
    return true;
}

/**
 * Register multiple presets and optional error type mappings.
 * @param {Record<string, Function>} [presets={}]
 * @param {Record<string, Function>} [errorTypes={}]
 * @param {Record<string, {description?: string, example?: string, format?: string, formatter?: string}>} [metadata={}]
 * @returns {boolean}
 */
export function registerPresets(presets = {}, errorTypes = {}, metadata = {}) {
    const entries = Object.entries(presets || {});
    for (let i = 0; i < entries.length; i += 1) {
        const [name, fn] = entries[i];
        registerPreset(name, fn, errorTypes[name], metadata[name]);
    }
    return true;
}

export function getPresetMetadata(name) {
    const presetName = normalizePresetName(name);
    return { ...(PRESET_METADATA[presetName] || {}) };
}

export function describeValidationRule(typeName, args = []) {
    const type = normalizePresetName(typeName).toLowerCase();
    const values = Array.isArray(args) ? args : [args];
    const first = values[0];
    const second = values[1];
    const descriptions = {
        name: "At least two words.",
        email: "Email address with a username, @ symbol, domain, and domain extension.",
        url: "HTTP or HTTPS URL with a valid domain and domain extension.",
        phone: "10 to 14 digits, including an area or country code.",
        postal: "Five digits, optionally followed by a hyphen and four digits.",
        number: "Numeric value with an optional decimal point and sign.",
        int: "Whole number without a decimal point.",
        integer: "Whole number without a decimal point.",
        boolean: "Boolean value: true or false.",
        timestamp: "Valid date, time, or numeric timestamp.",
        sha256: "Exactly 64 hexadecimal characters.",
        required: "A value is required.",
        empty: "No value.",
        notempty: "A non-empty value.",
        null: "Null value."
    };

    if (descriptions[type]) return descriptions[type];
    if (type === "min" && first != null) return `Minimum value or length: ${first}.`;
    if (type === "max" && first != null) return `Maximum value or length: ${first}.`;
    if (type === "length" && first != null && second != null) {
        return `Length between ${first} and ${second} characters.`;
    }
    if (type === "chars" && values.length) return `Allowed characters: ${values.join("")}.`;
    if (type === "in" && values.length) return `Allowed values: ${values.join(", ")}.`;
    if (type === "equals" && first != null) return `Must match ${first}.`;
    return "";
}

export default Presets;
