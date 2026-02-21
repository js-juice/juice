/**
 * @typedef {Object} ValidationErrorLike
 * @property {string} [type]
 * @property {string} [property]
 * @property {*} [value]
 * @property {Array<*>} [args]
 * @property {Function} [onResolved]
 */

/**
 * Normalize incoming error-like data for tag rendering.
 * @param {ValidationErrorLike|Object|null|undefined} error
 * @returns {{type: string, property: string, value: *, args: Array<*>}}
 */
function normalizeError(error) {
    if (!error || typeof error !== "object") {
        return {
            type: "validation",
            property: "field",
            value: "",
            args: []
        };
    }

    return {
        type: String(error.type || "validation"),
        property: String(error.property || "field"),
        value: error.value ?? "",
        args: Array.isArray(error.args) ? error.args : []
    };
}

/**
 * Builds concise display text for a validation tag.
 * @param {ValidationErrorLike} error
 * @returns {string}
 */
export function formatErrorTagText(error) {
    const normalized = normalizeError(error);
    switch (normalized.type) {
        case "min":
        case "max":
            return `${normalized.type}: ${normalized.args[0] ?? ""}`;
        case "length":
            return `${normalized.type}: ${normalized.args[0] ?? ""} - ${normalized.args[1] ?? ""}`;
        default:
            return normalized.type;
    }
}

/**
 * Creates a DOM tag element for an error.
 * Returns `null` when no DOM is available.
 * @param {ValidationErrorLike} error
 * @param {{className?: string}} [options]
 * @returns {HTMLElement|null}
 */
export function createErrorTag(error, options = {}) {
    if (typeof document === "undefined") return null;

    const normalized = normalizeError(error);
    const tag = document.createElement("div");
    tag.className = options.className || "e-tag";
    tag.setAttribute("data-type", normalized.type);
    tag.setAttribute("data-property", normalized.property);
    tag.setAttribute("data-value", String(normalized.value));
    tag.textContent = formatErrorTagText(normalized);
    return tag;
}

/**
 * Appends a rendered error tag into a container and auto-removes it when the error resolves.
 * @param {ValidationErrorLike} error
 * @param {HTMLElement} container
 * @param {{className?: string}} [options]
 * @returns {HTMLElement|null}
 */
export function mountErrorTag(error, container, options = {}) {
    if (!container || typeof container.appendChild !== "function") return null;
    const tag = createErrorTag(error, options);
    if (!tag) return null;

    container.appendChild(tag);
    if (error && typeof error.onResolved === "function") {
        error.onResolved(() => {
            if (tag.parentNode) {
                tag.parentNode.removeChild(tag);
            }
        });
    }

    return tag;
}

export default {
    formatErrorTagText,
    createErrorTag,
    mountErrorTag
};
