import Validator from "../../../data/validate/Validator.mjs";
import Presets from "../../../data/validate/Presets.mjs";
import { getJuiceConfig } from "../../../config/juice-config.mjs";

const KNOWN_RULE_TYPES = new Set([
    "required", "min", "max", "length", "email", "phone", "address", "postal",
    "int", "integer", "string", "number", "array", "boolean", "object",
    "timestamp", "equals", "in", "chars", "empty", "notEmpty", "null"
]);

/**
 * Host attributes that should trigger revalidation or validation state updates.
 * @type {Set<string>}
 */
const VALIDATION_AFFECTING_ATTRIBUTES = new Set([
    "validation",
    "validate",
    "name",
    "required",
    "minlength",
    "maxlength",
    "min",
    "max",
    "pattern",
    "type",
    "validation-color",
    "validation-color-valid",
    "validation-color-incomplete",
    "validation-color-invalid",
    "validation-color-none"
]);

const INCOMPLETE_ERROR_TYPES = new Set(["required", "min", "length"]);
const STATUS_ICON_STATES = {
    none: "idle",
    valid: "success",
    incomplete: "warning",
    invalid: "error"
};
const DEFAULT_STATUS_COLORS = {
    none: "transparent",
    valid: "#73C322",
    incomplete: "#FFAB1A",
    invalid: "#D41111"
};

/**
 * Input-bound adapter between native form controls and the data validator.
 */
class FieldValidationController {
    /**
     * @param {HTMLElement} host Input host component instance.
     */
    constructor(host) {
        this.host = host;
        this._lastStatus = null;
    }

    /**
     * Determine whether this host currently has active validation rules.
     * @returns {boolean}
     */
    hasValidation() {
        const rule = this.getValidationRules();
        return Array.isArray(rule) ? rule.length > 0 : !!(rule && String(rule).trim());
    }

    /**
     * Check whether an attribute should trigger validation recomputation.
     * @param {string} name
     * @returns {boolean}
     */
    affectsAttribute(name) {
        return VALIDATION_AFFECTING_ATTRIBUTES.has(name);
    }

    /**
     * Sync validation-related native constraint attributes from host to native input.
     * @param {string} name
     * @param {HTMLElement} native
     * @returns {boolean} `true` when handled, `false` otherwise.
     */
    syncNativeConstraintAttribute(name, native) {
        if (!native) return false;

        switch (name) {
            case "required":
                if ("required" in native) {
                    native.required = this.host.hasAttribute("required");
                    return true;
                }
                return false;
            case "minlength":
                if ("minLength" in native) {
                    const raw = this.host.getAttribute("minlength");
                    if (raw == null || String(raw).trim() === "") {
                        native.removeAttribute("minlength");
                        return true;
                    }

                    const minLength = parseInt(raw, 10);
                    if (Number.isFinite(minLength) && minLength >= 0) {
                        try {
                            native.minLength = minLength;
                        } catch (_error) {
                            native.removeAttribute("minlength");
                        }
                    } else {
                        native.removeAttribute("minlength");
                    }
                    return true;
                }
                return false;
            case "maxlength":
                if ("maxLength" in native) {
                    const raw = this.host.getAttribute("maxlength");
                    if (raw == null || String(raw).trim() === "") {
                        native.removeAttribute("maxlength");
                        return true;
                    }

                    const maxLength = parseInt(raw, 10);
                    if (Number.isFinite(maxLength) && maxLength >= 0) {
                        try {
                            native.maxLength = maxLength;
                        } catch (_error) {
                            native.removeAttribute("maxlength");
                        }
                    } else {
                        native.removeAttribute("maxlength");
                    }
                    return true;
                }
                return false;
            case "min":
                if ("min" in native) {
                    native.min = this.host.getAttribute("min") || "";
                    return true;
                }
                return false;
            case "max":
                if ("max" in native) {
                    native.max = this.host.getAttribute("max") || "";
                    return true;
                }
                return false;
            case "pattern":
                if ("pattern" in native) {
                    native.pattern = this.host.getAttribute("pattern") || "";
                    return true;
                }
                return false;
            case "type":
                if ("type" in native) {
                    const descriptor = Object.getOwnPropertyDescriptor(
                        Object.getPrototypeOf(native),
                        "type"
                    );
                    const canSetType = !!(descriptor && (descriptor.writable || descriptor.set));
                    if (!canSetType) return false;

                    try {
                        native.type = this.host.getAttribute("type") || native.type || "text";
                        return true;
                    } catch (_error) {
                        return false;
                    }
                }
                return false;
            default:
                return false;
        }
    }

    normalizeRuleToken(token) {
        const raw = String(token || "").trim();
        if (!raw) return "";
        if (raw.includes(":")) return raw;
        if (KNOWN_RULE_TYPES.has(raw) || typeof Presets[raw] === "function") return raw;
        if (/^[a-z0-9-]+$/i.test(raw) && raw.includes("-")) {
            return `chars:${raw}`;
        }
        return raw;
    }

    ruleTypeFromToken(token) {
        const normalized = this.normalizeRuleToken(token);
        if (!normalized) return "";
        if (normalized.includes(":")) return normalized.split(":")[0].trim();
        return normalized.trim();
    }

    mergeRuleStrings(primaryRules = "", secondaryRules = "") {
        const mergedTokens = [];
        const seenTypes = new Set();
        const candidates = [primaryRules, secondaryRules]
            .filter(Boolean)
            .join("|")
            .split("|")
            .map((token) => this.normalizeRuleToken(token))
            .filter(Boolean);

        for (let i = 0; i < candidates.length; i += 1) {
            const token = candidates[i];
            const type = this.ruleTypeFromToken(token);
            if (!type || seenTypes.has(type)) continue;
            seenTypes.add(type);
            mergedTokens.push(token);
        }

        return mergedTokens.join("|");
    }

    mergeRuleDeclarations(primaryRules = "", secondaryRules = "") {
        if (!Array.isArray(primaryRules)) {
            return this.mergeRuleStrings(primaryRules, secondaryRules);
        }

        const stringRules = primaryRules.filter((rule) => typeof rule === "string").join("|");
        const structuredRules = primaryRules.filter((rule) => typeof rule !== "string");
        const mergedStringRules = this.mergeRuleStrings(stringRules, secondaryRules);
        return [...(mergedStringRules ? [mergedStringRules] : []), ...structuredRules];
    }

    /**
     * Convert basic character-class patterns to `chars:` rules where possible.
     * @param {string} pattern
     * @returns {string}
     */
    patternToCharsRule(pattern) {
        const raw = String(pattern || "").trim();
        if (!raw) return "";

        const match = raw.match(/^\^?\[([^[\]]+)\]\+\$?$/);
        if (!match) return "";
        return `chars:${match[1]}`;
    }

    /**
     * Build rule string from native/host attributes.
     * @returns {string}
     */
    getNativeValidationRules() {
        const native = this.host._dom ? this.host._dom.native : null;
        const tokens = [];

        const requiredFromHost = this.host.hasAttribute("required");
        const requiredFromNative = !!(native && native.required);
        if (requiredFromHost || requiredFromNative) {
            tokens.push("required");
        }

        const hostMinLength = this.host.getAttribute("minlength");
        const hostMaxLength = this.host.getAttribute("maxlength");
        const minLength = hostMinLength != null
            ? parseInt(hostMinLength, 10)
            : native && typeof native.minLength === "number"
                ? native.minLength
                : -1;
        const maxLength = hostMaxLength != null
            ? parseInt(hostMaxLength, 10)
            : native && typeof native.maxLength === "number"
                ? native.maxLength
                : -1;

        if (Number.isFinite(minLength) && minLength >= 0) {
            tokens.push(`min:${minLength}`);
        }
        if (Number.isFinite(maxLength) && maxLength >= 0) {
            tokens.push(`max:${maxLength}`);
        }

        const nativeType = String(
            this.host.getAttribute("type") || (native && native.type) || ""
        ).toLowerCase();
        if (nativeType === "email") {
            tokens.push("email");
        }
        if (nativeType === "url") {
            tokens.push("url");
        }
        if (nativeType === "tel") {
            tokens.push("phone");
        }
        if (nativeType === "number" || nativeType === "range") {
            tokens.push("number");

            const minValue = this.host.getAttribute("min") || (native && native.min) || "";
            const maxValue = this.host.getAttribute("max") || (native && native.max) || "";
            if (String(minValue).trim() !== "") {
                tokens.push(`min:${minValue}`);
            }
            if (String(maxValue).trim() !== "") {
                tokens.push(`max:${maxValue}`);
            }
        }

        const pattern = this.host.getAttribute("pattern") || (native && native.pattern) || "";
        const charsRule = this.patternToCharsRule(pattern);
        if (charsRule) {
            tokens.push(charsRule);
        }

        return tokens.join("|");
    }

    /**
     * Build merged validation rule string (explicit + native-derived).
     * @returns {string}
     */
    getValidationRules() {
        let explicitRules = "";
        if (this.host.hasAttribute("validation") || this.host.hasAttribute("validate")) {
            explicitRules = (
                this.host.getAttribute("validation") || this.host.getAttribute("validate") || ""
            ).trim();
            if (explicitRules === "false") return "";
        } else if (typeof this.host._getInputValidationSpec === "function") {
            const configRules = this.host._getInputValidationSpec();
            if (configRules === false) return "";
            if (Array.isArray(configRules)) explicitRules = configRules;
            else if (typeof configRules === "function") explicitRules = [["custom", [], configRules]];
            else explicitRules = String(configRules || "").trim();
        }
        const nativeRules = this.getNativeValidationRules();
        return this.mergeRuleDeclarations(explicitRules, nativeRules);
    }

    /**
     * Initialize or refresh validator instance for the host.
     */
    setup() {
        const rules = this.getValidationRules();
        if (!rules) {
            this.host._validator = null;
            this.host._validationRule = "";
            this.host._validationProperty = "__value";
            this.setValidationState(true, []);
            return;
        }

        this.host.classList.add("validate");

        const property = this.host.getAttribute("name") || "__value";
        if (
            !this.host._validator ||
            this.host._validationRule !== rules ||
            this.host._validationProperty !== property
        ) {
            this.host._validationProperty = property;
            this.host._validationRule = rules;
            this.host._validator = Validator.make({ [property]: rules }, null, this.host);
        }
    }

    /**
     * Resolve the current value to validate from the host/native control.
     * @returns {*}
     */
    getCurrentValidationValue() {
        const native = this.host._dom ? this.host._dom.native : null;
        if (!native) return "";
        if (this.host._isCheckableControl()) {
            return native.checked ? native.value : "";
        }

        // Custom input-select uses a read-only text input to display the option label.
        // Validate against the selected option value (host "value" attribute), not the label text.
        if (this.host.inputType === "select") {
            const isCustomSelectInput =
                String(native.tagName || "").toLowerCase() === "input" &&
                String(native.type || "").toLowerCase() === "text";
            if (isCustomSelectInput) {
                const selectedValue = this.host.getAttribute("value");
                return selectedValue == null ? "" : selectedValue;
            }
        }

        const nativeType = String(native.type || "").toLowerCase();
        if (nativeType === "number" || nativeType === "range") {
            if (native.value === "") return "";
            const numericValue = native.valueAsNumber;
            return Number.isNaN(numericValue) ? native.value : numericValue;
        }

        return native.value;
    }

    /**
     * Map engine errors to `ElementInternals.setValidity` state flags.
     * @param {Array<{type: string}>} [errors=[]]
     * @returns {Object}
     */
    buildValidityState(errors = []) {
        const state = {};
        const native = this.host._dom ? this.host._dom.native : null;
        const nativeType = native ? String(native.type || "").toLowerCase() : "";
        const isRangeLike = nativeType === "number" || nativeType === "range";
        const isDateLike = ["date", "time", "week", "month", "datetime-local"].includes(nativeType);

        (errors || []).forEach((error) => {
            switch (error.type) {
                case "required":
                    state.valueMissing = true;
                    break;
                case "max":
                    if (isRangeLike || isDateLike) state.rangeOverflow = true;
                    else state.tooLong = true;
                    break;
                case "min":
                    if (isRangeLike || isDateLike) state.rangeUnderflow = true;
                    else state.tooShort = true;
                    break;
                case "email":
                case "url":
                    state.typeMismatch = true;
                    break;
                case "postal":
                case "phone":
                case "address":
                case "chars":
                    state.patternMismatch = true;
                    break;
                case "number":
                case "int":
                case "integer":
                case "timestamp":
                case "boolean":
                case "array":
                case "object":
                case "string":
                    state.badInput = true;
                    break;
                default:
                    break;
            }
        });

        state.customError = true;
        return state;
    }

    /**
     * Apply validation state to host classes/attributes, internals, and status UI.
     * @param {boolean} valid
     * @param {string[]} [messages=[]]
     * @param {Array} [errors=[]]
     */
    setValidationState(valid, messages = [], errors = []) {
        const native = this.host._dom ? this.host._dom.native : null;
        this.host._validationMessages = messages;
        this.host._validationErrors = errors;
        const firstMessage = messages[0] || "";

        if (valid) {
            this.host.removeAttribute("invalid");
            if (native) native.removeAttribute("aria-invalid");
        } else {
            this.host.setAttribute("invalid", "");
            if (native) native.setAttribute("aria-invalid", "true");
        }

        if (this.host._internals && native) {
            if (valid) {
                this.host._internals.setValidity({}, "");
            } else {
                const validityState = this.buildValidityState(errors);
                this.host._internals.setValidity(
                    validityState,
                    firstMessage || "Invalid value",
                    native
                );
            }
        }

        if (typeof this.host._syncFieldFeedback === "function") {
            this.host._syncFieldFeedback();
        } else if (this.host._dom && this.host._dom.validationMessage) {
            this.host._dom.validationMessage.textContent = firstMessage;
        }

        const status = this.getStatusFromState(valid, errors);
        const configuredColors = this.getConfiguredValidationColors();
        const colors = this.getValidationColors(configuredColors);
        const color = this.getStatusColor(status, colors);
        this.applyStatusClasses(status);
        this.applyValidationColorVariable(status, color, colors);
        this.applyStatusIconState(status, color, colors);
        this.emitValidationEvents(status, valid, messages, errors, color, colors);
    }

    getStatusFromState(valid, errors = []) {
        if (!this.hasValidation()) return "none";
        if (!valid) {
            const activeTypes = (errors || []).map((error) => error.type);
            if (
                activeTypes.length > 0 &&
                activeTypes.every((type) => INCOMPLETE_ERROR_TYPES.has(type)) &&
                this.isFieldFocused()
            ) {
                return "incomplete";
            }
            return "invalid";
        }
        return valid ? "valid" : "invalid";
    }

    isFieldFocused() {
        const host = this.host;
        if (!host || typeof host.matches !== "function") return false;
        if (host.matches(":focus") || host.matches(":focus-within")) return true;
        const native = host._dom ? host._dom.native : null;
        if (!native) return false;
        const root = native.getRootNode ? native.getRootNode() : null;
        return Boolean(root && "activeElement" in root && root.activeElement === native);
    }

    applyStatusClasses(status) {
        const host = this.host;
        host.classList.toggle("has-validation", status !== "none");
        host.classList.toggle("is-valid", status === "valid");
        host.classList.toggle("is-invalid", status === "invalid");
        host.classList.toggle("is-incomplete", status === "incomplete");
        if (status === "none") host.removeAttribute("validation-state");
        else host.setAttribute("validation-state", status);
    }

    getConfiguredValidationColors() {
        const validationConfig = getJuiceConfig("validation");
        const configuredColors = validationConfig && validationConfig.colors
            ? validationConfig.colors
            : {};
        return { ...DEFAULT_STATUS_COLORS, ...(configuredColors || {}) };
    }

    getValidationColors(baseColors = this.getConfiguredValidationColors()) {
        const host = this.host;
        const colors = { ...(baseColors || DEFAULT_STATUS_COLORS) };
        const genericColor = host.getAttribute("validation-color");
        if (genericColor) {
            colors.valid = genericColor;
            colors.incomplete = genericColor;
            colors.invalid = genericColor;
        }
        const overrides = {
            valid: host.getAttribute("validation-color-valid"),
            incomplete: host.getAttribute("validation-color-incomplete"),
            invalid: host.getAttribute("validation-color-invalid"),
            none: host.getAttribute("validation-color-none")
        };
        Object.entries(overrides).forEach(([key, value]) => {
            if (value) colors[key] = value;
        });
        return colors;
    }

    getStatusColor(status, colors = this.getValidationColors()) {
        return colors[status] || colors.none || "transparent";
    }

    applyValidationColorVariable(status, color, colors = this.getValidationColors()) {
        const inputRoot = this.host._wireframe ? this.host._wireframe.root : null;
        if (inputRoot && inputRoot.style) {
            inputRoot.style.setProperty("--validation-color", color || this.getStatusColor(status, colors));
        }
    }

    applyStatusIconState(status, color, colors = this.getValidationColors()) {
        const icon = this.host._dom ? this.host._dom.status : null;
        const statusWrapper = this.host._wireframe ? this.host._wireframe.status : null;
        if (!icon) return;
        icon.setAttribute("state", STATUS_ICON_STATES[status] || "idle");
        icon.removeAttribute("color");
        const show = status !== "none";
        icon.toggleAttribute("hidden", !show);
        if (statusWrapper) statusWrapper.hidden = !show;
        const messageEl = this.host._dom ? this.host._dom.validationMessage : null;
        if (messageEl && (status === "invalid" || status === "incomplete")) {
            messageEl.style.color = color || this.getStatusColor(status, colors);
        } else if (messageEl) {
            messageEl.style.removeProperty("color");
        }
    }

    serializeErrors(errors = []) {
        return errors.map((error) => ({
            type: error.type,
            message: error.message,
            property: error.property,
            args: error.args
        }));
    }

    createEventDetail(status, valid, messages = [], errors = [], color, colors) {
        const resolvedColors = colors || this.getValidationColors();
        return {
            status,
            valid,
            invalid: status === "invalid",
            incomplete: status === "incomplete",
            complete: status !== "incomplete",
            color: color || this.getStatusColor(status, resolvedColors),
            colors: resolvedColors,
            property: this.host._validationProperty || this.host.getAttribute("name") || "__value",
            value: this.host.value,
            rules: this.getValidationRules(),
            messages: [...messages],
            message: messages[0] || "",
            errors: this.serializeErrors(errors)
        };
    }

    emitValidationEvents(status, valid, messages = [], errors = [], color, colors) {
        if (typeof this.host.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
        const detail = this.createEventDetail(status, valid, messages, errors, color, colors);
        const emit = (name) => this.host.dispatchEvent(new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true
        }));
        emit("validation:change");
        if (this._lastStatus !== status) emit("validation:statechange");
        if (status === "valid") emit("validation:valid");
        if (status === "invalid") emit("validation:invalid");
        if (status === "incomplete") emit("validation:incomplete");
        this._lastStatus = status;
    }

    /**
     * Run validation now and apply resulting state to host.
     * @returns {Promise<boolean>}
     */
    async run() {
        if (!this.host._validator && this.hasValidation()) {
            this.setup();
        }

        if (!this.host._validator || !this.hasValidation()) {
            this.setValidationState(true, []);
            return true;
        }

        const property = this.host._validationProperty;
        const valid = await this.host._validator.test(property, this.getCurrentValidationValue());
        const messages = this.host._validator.messages(property) || [];
        const errors = this.host._validator.errorsOf(property) || [];
        this.setValidationState(valid, messages, errors);
        return valid;
    }

    /**
     * Queue validation into a microtask.
     */
    queue() {
        if (!this.host.isConnected) return;
        Promise.resolve().then(() => this.run());
    }
}

export default FieldValidationController;
