import Emitter from "./Emitter.mjs";

/**
 * @typedef {Object} ValidationRuleLike
 * @property {string} [type]
 * @property {Array<*>} [args]
 * @property {string} [property]
 * @property {string} [field]
 * @property {*} [value]
 * @property {*} [scope]
 * @property {Function} [message]
 */

/**
 * Normalize a rule-like input into a stable shape consumed by errors/messages.
 * @param {ValidationRuleLike|Object|null|undefined} rule
 * @returns {{type: string, args: Array<*>, property: string, value: *, scope: *}}
 */
function normalizeRule(rule) {
    if (!rule || typeof rule !== "object") {
        return {
            type: "validation",
            args: [],
            property: "field",
            value: undefined,
            scope: null
        };
    }

    const property = rule.property || rule.field || "field";
    const args = Array.isArray(rule.args) ? rule.args : [];
    return {
        type: String(rule.type || "validation"),
        args,
        property: String(property),
        value: rule.value,
        scope: rule.scope || null
    };
}

/**
 * Derive a fallback message from a rule-like input.
 * @param {ValidationRuleLike|Object|null|undefined} ruleLike
 * @returns {string}
 */
function defaultMessageFromRule(ruleLike) {
    if (ruleLike && typeof ruleLike.message === "function") {
        try {
            const fromRule = ruleLike.message();
            if (fromRule) return String(fromRule);
        } catch (_error) {
            // Fall back to generated message when custom rule message throws.
        }
    }

    const normalized = normalizeRule(ruleLike);
    const argsText = normalized.args.length ? ` ${normalized.args.join(" ")}` : "";
    return `${normalized.property} ${normalized.type}${argsText}`.trim();
}

/**
 * Stores active validation errors grouped by property and emits lifecycle events.
 */
export class ValidationErrors extends Emitter {
    /**
     * @param {Emitter} scope Validator-like emitter that receives error events.
     */
    constructor(scope) {
        super();
        this.scope = scope;
        this.properties = {};
        this._valid = true;
    }

    /**
     * Add an error instance to a property.
     * @param {string} property
     * @param {ValidationError} error
     */
    set(property, error) {
        const isNewProperty = !this.has(property);
        if (isNewProperty) this.properties[property] = [];

        this.scope.emit("error", property, error);

        if (isNewProperty) {
            this.scope.emit("property:invalid", property);
            if (this._valid) {
                this._valid = false;
                this.scope.emit("invalid", property);
            }
        }

        const alreadySet = this.get(property).some((existing) => existing.type === error.type);
        if (!alreadySet) {
            this.properties[property].push(error);
        }
    }

    /**
     * Resolve errors by type for a property.
     * @param {string} property
     * @param {string[]} [errorTypes=[]]
     */
    resolve(property, errorTypes = []) {
        const current = this.get(property);
        current
            .filter((error) => errorTypes.includes(error.type))
            .forEach((error) => error.resolve());

        this.properties[property] = current.filter((error) => !errorTypes.includes(error.type));
        this.scope.emit("resolve", property, errorTypes);

        if (!this.has(property)) {
            delete this.properties[property];
            this.scope.emit("property:valid", property);
        }

        if (this.length === 0) {
            this._valid = true;
            this.scope.emit("valid", property);
        }
    }

    /**
     * Check whether a property has any active errors.
     * @param {string} property
     * @param {string} [errorType]
     * @returns {boolean}
     */
    has(property, errorType) {
        if (!this.properties[property] || this.properties[property].length === 0) return false;
        if (errorType) {
            return this.properties[property].some((error) => error.type === errorType);
        }
        return true;
    }

    /**
     * @returns {Record<string, ValidationError[]>}
     */
    all() {
        return this.properties;
    }

    /**
     * @param {string} property
     * @returns {ValidationError[]}
     */
    get(property) {
        return this.properties[property] || [];
    }

    /**
     * Alias of `get(property)`.
     * @param {string} property
     * @returns {ValidationError[]}
     */
    of(property) {
        return this.get(property);
    }

    /**
     * @returns {boolean}
     */
    get empty() {
        return this.length === 0;
    }

    /**
     * Number of properties that currently contain at least one error.
     * @returns {number}
     */
    get length() {
        return Object.keys(this.properties).filter((key) => this.properties[key].length > 0).length;
    }
}

/**
 * Base validation error object returned by validation rules.
 */
export class ValidationError extends Error {
    /**
     * @param {ValidationRuleLike} rule
     * @param {Object} [options]
     * @param {string} [options.message]
     * @param {string} [options.code]
     */
    constructor(rule, options = {}) {
        const normalized = normalizeRule(rule);
        const message = String(options.message || defaultMessageFromRule(rule));
        super(message);

        this.name = "ValidationError";
        this.type = normalized.type;
        this.args = normalized.args;
        this.property = normalized.property;
        this.scope = normalized.scope;
        this.value = normalized.value;
        this.rule = rule || null;
        this.message = message;
        this.code = options.code || "VALIDATION_ERROR";
        this.resolvedCallbacks = [];
    }

    /**
     * Resolve this error and run registered callbacks.
     */
    resolve() {
        this.resolvedCallbacks.forEach((callback) => callback());
    }

    /**
     * Register a callback invoked when this error resolves.
     * @param {Function} fn
     */
    onResolved(fn) {
        if (typeof fn === "function") {
            this.resolvedCallbacks.push(fn);
        }
    }

    /**
     * Serialize error details for logs/events/UI adapters.
     * @returns {{name: string, code: string, type: string, property: string, args: Array<*>, value: *}}
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            type: this.type,
            property: this.property,
            args: [...this.args],
            value: this.value
        };
    }
}

/**
 * Build a user-facing message for known built-in rule types.
 * @param {ValidationRuleLike|Object|null|undefined} rule
 * @param {string} [fallback]
 * @returns {string}
 */
function createRuleMessage(rule, fallback) {
    const normalized = normalizeRule(rule);
    const property = normalized.property;

    switch (normalized.type) {
        case "required":
            return `Property "${property}" is required.`;
        case "min":
            return `Property "${property}" must be at least ${normalized.args[0]}.`;
        case "max":
            return `Property "${property}" must be at most ${normalized.args[0]}.`;
        case "length":
            return `Property "${property}" must be between ${normalized.args[0]} and ${normalized.args[1]}.`;
        case "email":
            return `Property "${property}" must be a valid email address.`;
        case "phone":
            return `Property "${property}" must be a valid phone number.`;
        case "address":
            return `Property "${property}" must be a valid address.`;
        case "postal":
            return `Property "${property}" must be a valid postal code.`;
        case "equals":
            return `Property "${property}" does not match the expected value.`;
        case "in":
            return `Property "${property}" must be one of: ${normalized.args.join(", ")}.`;
        default:
            return fallback || defaultMessageFromRule(rule);
    }
}

/**
 * Apply a typed error name and code to a validation error instance.
 * @param {ValidationError} error
 * @param {string} name
 * @param {string} code
 */
function assignTypedError(error, name, code) {
    error.name = name;
    error.code = code;
}

/**
 * Type validation failure.
 */
export class TypeValidationError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not the expected type.") });
        assignTypedError(this, "TypeValidationError", "TYPE_VALIDATION");
    }
}

/**
 * Timestamp parsing/format failure.
 */
export class InvalidTimestamp extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not a valid timestamp.") });
        assignTypedError(this, "InvalidTimestamp", "INVALID_TIMESTAMP");
    }
}

/**
 * Required-field validation failure.
 */
export class ValueRequiredError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "A value is required.") });
        assignTypedError(this, "ValueRequiredError", "VALUE_REQUIRED");
    }
}

/**
 * Maximum value/length failure.
 */
export class MaxLengthError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value exceeds allowed maximum.") });
        assignTypedError(this, "MaxLengthError", "MAX_LENGTH");
    }
}

/**
 * Minimum value/length failure.
 */
export class MinLengthError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value does not meet minimum requirement.") });
        assignTypedError(this, "MinLengthError", "MIN_LENGTH");
    }
}

/**
 * Postal code format failure.
 */
export class PostalValidationError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not a valid postal code.") });
        assignTypedError(this, "PostalValidationError", "POSTAL_INVALID");
    }
}

/**
 * Address format failure.
 */
export class AddressValidationError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not a valid address.") });
        assignTypedError(this, "AddressValidationError", "ADDRESS_INVALID");
    }
}

/**
 * Phone format failure.
 */
export class PhoneValidationError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not a valid phone number.") });
        assignTypedError(this, "PhoneValidationError", "PHONE_INVALID");
    }
}

/**
 * Email format failure.
 */
export class EmailValidationError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not a valid email address.") });
        assignTypedError(this, "EmailValidationError", "EMAIL_INVALID");
    }
}

/**
 * Equality check failure.
 */
export class NotEqualError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Values are not equal.") });
        assignTypedError(this, "NotEqualError", "NOT_EQUAL");
    }
}

/**
 * Inclusion check failure.
 */
export class InSetError extends ValidationError {
    constructor(rule) {
        super(rule, { message: createRuleMessage(rule, "Value is not in the allowed set.") });
        assignTypedError(this, "InSetError", "NOT_IN_SET");
    }
}
