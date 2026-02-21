/**
 * Field alias lookup used when composing human-readable validation messages.
 * @type {Record<string, string>}
 */
const ALIASES = {};

/**
 * Default validation message templates.
 * Supported tokens:
 * - `%s` scalar values (field + args)
 * - `%a...` all args joined
 * - `%v` current value
 * @type {Record<string, string>}
 */
const MESSAGES = {
    min: "%s must be minimum of %s chars long",
    max: "%s must be maximum of %s chars long",
    length: "%s must be between %s and %s chars long",
    int: "%s must be an integer",
    email: "%s must be a valid email",
    phone: "%s must be a valid phone number",
    address: "%s must be a valid street address",
    postal: "%s must be a valid postal code",
    unique: "%s must be unique this has been used already",
    in: "%s must be one of the following: %a...",
    required: "%s is a required field",
    chars: "%s contains invalid characters"
};

/**
 * @typedef {Object} RuleLike
 * @property {string} [type]
 * @property {string} [field]
 * @property {string} [property]
 * @property {Array<*>} [args]
 * @property {*} [value]
 */

/**
 * Replace template tokens with values from the rule context.
 * @param {string} template
 * @param {RuleLike} rule
 * @param {string} propertyLabel
 * @returns {string}
 */
function replaceTokens(template, rule, propertyLabel) {
    let output = template;
    output = output.replace("%a...", Array.isArray(rule.args) ? rule.args.join(", ") : "");

    const scalarValues = [propertyLabel, ...(Array.isArray(rule.args) ? rule.args : [])];
    output = output.replace(/%s/g, () => `${scalarValues.shift() ?? ""}`);
    output = output.replace(/%v/g, () => `${rule.value ?? ""}`);

    return output;
}

/**
 * Message registry and formatter for validation rules.
 */
const ValidationMessages = {
    /**
     * Register a friendly display name for a field/property.
     * @param {string} field
     * @param {string} name
     */
    addAlias(field, name) {
        ALIASES[field] = name;
    },
    /**
     * Override or add a message template for a rule type.
     * @param {string} type
     * @param {string} message
     */
    add(type, message) {
        MESSAGES[type] = message;
    },
    /**
     * Check whether a template exists for a rule type.
     * @param {string} type
     * @returns {boolean}
     */
    has(type) {
        return !!MESSAGES[type];
    },
    /**
     * Resolve a final message for a rule.
     * @param {RuleLike} rule
     * @returns {string}
     */
    get(rule) {
        const property = rule.field || rule.property || "field";
        const propertyLabel = ALIASES[property] || property;
        const template = MESSAGES[rule.type];
        if (template) {
            return replaceTokens(template, rule, propertyLabel);
        }
        return `${propertyLabel} ${rule.type} ${(rule.args || []).join(" ")}`.trim();
    }
};

export default ValidationMessages;
