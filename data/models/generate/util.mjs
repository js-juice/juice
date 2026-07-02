/**
 * Converts camelCase string to snake_case plural.
 * @private
 * @param {string} str - String to convert
 * @returns {string} snake_case plural string
 */
export function toSnakePlural(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase() + "s";
}

export function normalizedTarget(target) {
    return target.replace(/\\/g, "/");
}
