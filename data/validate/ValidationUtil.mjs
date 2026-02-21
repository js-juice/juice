/**
 * Resolve runtime value type using Object.prototype tag.
 * Optionally compare against an expected type string.
 * Prefix expected type with `!` to test non-equality.
 * @param {*} value
 * @param {string} [expectedType]
 * @returns {string|boolean}
 */
export function type(value, expectedType) {
    const actualType = Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
    if (!expectedType) return actualType;
    const normalized = String(expectedType).toLowerCase();
    if (normalized.startsWith("!")) {
        return actualType !== normalized.slice(1);
    }
    return actualType === normalized;
}

/**
 * Check whether a value should be treated as empty.
 * Supports strings, arrays, plain objects, nullish, and empty string.
 * @param {*} value
 * @returns {boolean}
 */
export function empty(value) {
    if (value === undefined || value === null || value === "") return true;
    switch (type(value)) {
        case "string":
            return value.trim().length === 0;
        case "array":
            return value.length === 0;
        case "object":
            return Object.keys(value).length === 0;
        default:
            return false;
    }
}

/**
 * Compute added/removed values between two arrays.
 * @template T
 * @param {T[]} previous
 * @param {T[]} current
 * @returns {{added: T[], removed: T[]}}
 */
export function arrayDiff(previous, current) {
    const oldValues = Array.isArray(previous) ? previous : [];
    const newValues = Array.isArray(current) ? current : [];
    return {
        added: newValues.filter((item) => !oldValues.includes(item)),
        removed: oldValues.filter((item) => !newValues.includes(item))
    };
}
