/**
 * Built-in validation rule presets and error type mappings.
 * Provides common validation rules for email, phone, postal, types, and more.
 * @module data/validate/Presets
 */

import {
    EmailValidationError,
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
    in: InSetError
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
        const charClass = source
            .replace(/\\/g, "\\\\")
            .replace(/\]/g, "\\]")
            .replace(/\^/g, "\\^");
        const regex = new RegExp(`^[${charClass}]+$`);
        return regex.test(input);
    }

    static null(value) {
        return value === null;
    }

    static in(value, ...values) {
        return values.includes(value);
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
 * @returns {boolean}
 */
export function registerPreset(name, fn, ErrorType) {
    const presetName = normalizePresetName(name);
    if (!presetName || typeof fn !== "function") return false;
    Presets[presetName] = fn;
    if (ErrorType) {
        ERROR_TYPES[presetName] = ErrorType;
    }
    return true;
}

/**
 * Register multiple presets and optional error type mappings.
 * @param {Record<string, Function>} [presets={}]
 * @param {Record<string, Function>} [errorTypes={}]
 * @returns {boolean}
 */
export function registerPresets(presets = {}, errorTypes = {}) {
    const entries = Object.entries(presets || {});
    for (let i = 0; i < entries.length; i += 1) {
        const [name, fn] = entries[i];
        registerPreset(name, fn, errorTypes[name]);
    }
    return true;
}

export default Presets;
