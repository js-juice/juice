import "./import.mjs";

class JuiceForms {
    constructor() {
        this._forms = new Map();
        this._FormCtor = null;
        this._initialized = false;
        this._warnedFormImport = false;
    }

    async _loadFormCtor() {
        if (this._FormCtor) return this._FormCtor;
        try {
            const module = await import("./forms/Form.mjs");
            this._FormCtor = module.default || null;
        } catch (error) {
            if (!this._warnedFormImport) {
                this._warnedFormImport = true;
                console.warn(
                    "[JUICE FORMS] Form engine not loaded. Missing legacy dependencies may still need to be exported.",
                    error
                );
            }
            this._FormCtor = null;
        }
        return this._FormCtor;
    }

    _collectFormElements() {
        const nativeForms = Array.from(document.querySelectorAll("form"));
        const juiceFormRoots = Array.from(document.querySelectorAll("juice-forms"));

        const embeddedForms = juiceFormRoots.map((root) => root.form).filter((form) => form instanceof HTMLFormElement);

        const allForms = new Set([...nativeForms, ...embeddedForms]);
        return Array.from(allForms);
    }

    async refresh() {
        const FormCtor = await this._loadFormCtor();
        const currentForms = this._collectFormElements();

        for (const [formElement] of this._forms.entries()) {
            if (!currentForms.includes(formElement)) {
                this._forms.delete(formElement);
            }
        }

        if (!FormCtor) return;

        for (let i = 0; i < currentForms.length; i += 1) {
            const formElement = currentForms[i];
            if (this._forms.has(formElement)) continue;

            try {
                const formInstance = new FormCtor(formElement);
                this._forms.set(formElement, formInstance);
            } catch (error) {
                console.warn("[JUICE FORMS] Failed to initialize form instance.", formElement, error);
            }
        }
    }

    async initialize() {
        if (this._initialized) return;
        this._initialized = true;
        await this.refresh();
    }
}

const juiceForms = new JuiceForms();
window.JUICE_FORMS = juiceForms;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        window.JUICE_FORMS.initialize();
    });
} else {
    window.JUICE_FORMS.initialize();
}
