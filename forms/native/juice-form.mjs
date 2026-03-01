import { getJuiceConfig } from "../../config/juice-config.mjs";

const CONTROL_SELECTOR = "input, textarea, select";
const EXCLUDE_SELECTOR = "[juicex], .juicex";

function isObjectLike(value) {
    return value != null && typeof value === "object";
}

function isNativeFormElement(value) {
    return isObjectLike(value) && String(value.tagName || "").toLowerCase() === "form";
}

function isElementNode(value) {
    return isObjectLike(value) && value.nodeType === 1;
}

function normalizeName(name) {
    return String(name || "").trim();
}

function normalizeNameList(value) {
    if (value == null) return [];
    const list = Array.isArray(value) ? value : [value];
    return list.map((item) => normalizeName(item)).filter(Boolean);
}

function readEnhancerRun(enhancer) {
    if (typeof enhancer === "function") return enhancer;
    if (isObjectLike(enhancer) && typeof enhancer.run === "function") {
        return enhancer.run.bind(enhancer);
    }
    return null;
}

function collectNativeForms(root) {
    if (isNativeFormElement(root)) return [root];
    if (!isObjectLike(root) || typeof root.querySelectorAll !== "function") return [];
    return Array.from(root.querySelectorAll("form")).filter((node) => isNativeFormElement(node));
}

function getControlValue(control) {
    if (!isElementNode(control)) return "";
    const tag = String(control.tagName || "").toLowerCase();
    if (tag === "select") return String(control.value || "");

    const type = String(control.type || "").toLowerCase();
    if (type === "checkbox" || type === "radio") {
        return control.checked ? "1" : "";
    }

    return String(control.value || "");
}

function isExcluded(control, root) {
    if (!isElementNode(control) || typeof control.closest !== "function") return true;
    if (!control.matches(CONTROL_SELECTOR)) return true;

    if (control.matches(EXCLUDE_SELECTOR)) return true;
    const nearestExcluded = control.closest(EXCLUDE_SELECTOR);
    if (!nearestExcluded) return false;
    return root ? root.contains(nearestExcluded) : true;
}

class JuiceForm {
    static enhancerRegistry = new Map();

    static register(name, enhancer) {
        const normalized = normalizeName(name);
        if (!normalized) {
            throw new TypeError("JuiceForm.register(name, enhancer) requires a non-empty enhancer name.");
        }

        if (!readEnhancerRun(enhancer)) {
            throw new TypeError("Enhancer must be a function or an object with a run(form, context) method.");
        }

        JuiceForm.enhancerRegistry.set(normalized, enhancer);
        return enhancer;
    }

    static unregister(name) {
        return JuiceForm.enhancerRegistry.delete(normalizeName(name));
    }

    static clearEnhancers() {
        JuiceForm.enhancerRegistry.clear();
    }

    static listEnhancers() {
        return Array.from(JuiceForm.enhancerRegistry.keys());
    }

    static enhanceAll(root = document, options = {}) {
        const forms = collectNativeForms(root);
        return forms.map((form) => new JuiceForm(form, options));
    }

    constructor(form, options = {}) {
        if (!isNativeFormElement(form)) {
            throw new TypeError("new JuiceForm(form) requires a native <form> element.");
        }

        this.form = form;
        this.options = options;
        this.configPath = normalizeName(options.configPath) || "forms.native";
        this.config = getJuiceConfig(this.configPath) || {};
        this.state = new Map();
        this.applied = [];
        this._inputBehaviorBound = false;
        this._onInput = null;
        this._onChange = null;
        this._onBlur = null;
        this._controlObserver = null;

        if (options.autoEnhance !== false) {
            this.enhance();
        }
    }

    refreshConfig() {
        this.config = getJuiceConfig(this.configPath) || {};
        return this.config;
    }

    enhance(options = {}) {
        const include = normalizeNameList(options.include ?? this.options.include);
        const exclude = normalizeNameList(options.exclude ?? this.options.exclude);

        const includeSet = include.length ? new Set(include) : null;
        const excludeSet = exclude.length ? new Set(exclude) : null;

        this.refreshConfig();
        this.applied = [];
        this._enhanceInputs();
        this._observeControls();

        const names = JuiceForm.listEnhancers();
        for (let i = 0; i < names.length; i += 1) {
            const name = names[i];
            if (includeSet && !includeSet.has(name)) continue;
            if (excludeSet && excludeSet.has(name)) continue;

            const enhancer = JuiceForm.enhancerRegistry.get(name);
            const run = readEnhancerRun(enhancer);
            if (!run) continue;

            run(this.form, this);
            this.applied.push(name);
        }

        return this;
    }

    destroy() {
        if (this._controlObserver) {
            this._controlObserver.disconnect();
            this._controlObserver = null;
        }
        if (!this._inputBehaviorBound) return;
        this.form.removeEventListener("input", this._onInput);
        this.form.removeEventListener("change", this._onChange);
        this.form.removeEventListener("blur", this._onBlur, true);
        this._inputBehaviorBound = false;
    }

    _getEnhanceableControls() {
        const controls = Array.from(this.form.querySelectorAll(CONTROL_SELECTOR));
        return controls.filter((control) => !isExcluded(control, this.form));
    }

    _markTouched(control) {
        control.classList.add("j-touched");
    }

    _markDirty(control) {
        const originalValue = control.dataset.jOriginalValue ?? "";
        const currentValue = getControlValue(control);
        if (currentValue !== originalValue) {
            control.classList.add("j-dirty");
        } else {
            control.classList.remove("j-dirty");
        }
    }

    _syncValidity(control) {
        if (!control.willValidate) {
            control.classList.remove("j-valid");
            control.classList.remove("j-invalid");
            return;
        }

        const valid = typeof control.checkValidity === "function" ? control.checkValidity() : true;
        control.classList.toggle("j-valid", valid);
        control.classList.toggle("j-invalid", !valid);
        control.setAttribute("aria-invalid", valid ? "false" : "true");
    }

    _syncValueState(control) {
        const hasValue = getControlValue(control).length > 0;
        control.classList.toggle("j-has-value", hasValue);
        control.classList.toggle("j-empty", !hasValue);
    }

    _syncControlState(control) {
        control.classList.add("j-enhanced");
        this._syncValueState(control);
        this._markDirty(control);
        this._syncValidity(control);
    }

    _bindInputBehavior() {
        if (this._inputBehaviorBound) return;

        this._onInput = (event) => {
            const control = event.target;
            if (isExcluded(control, this.form)) return;
            this._syncControlState(control);
        };

        this._onChange = (event) => {
            const control = event.target;
            if (isExcluded(control, this.form)) return;
            this._syncControlState(control);
        };

        this._onBlur = (event) => {
            const control = event.target;
            if (isExcluded(control, this.form)) return;
            this._markTouched(control);
            this._syncControlState(control);
        };

        this.form.addEventListener("input", this._onInput);
        this.form.addEventListener("change", this._onChange);
        this.form.addEventListener("blur", this._onBlur, true);
        this._inputBehaviorBound = true;
    }

    _enhanceInputs() {
        this._bindInputBehavior();
        const controls = this._getEnhanceableControls();
        for (let i = 0; i < controls.length; i += 1) {
            const control = controls[i];
            if (!Object.prototype.hasOwnProperty.call(control.dataset, "jOriginalValue")) {
                control.dataset.jOriginalValue = getControlValue(control);
            }
            this._syncControlState(control);
        }
    }

    _observeControls() {
        if (this._controlObserver || typeof MutationObserver !== "function") return;
        this._controlObserver = new MutationObserver(() => {
            this._enhanceInputs();
        });
        this._controlObserver.observe(this.form, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "juicex", "value", "checked", "selected"]
        });
    }
}

export { JuiceForm };
export default JuiceForm;
