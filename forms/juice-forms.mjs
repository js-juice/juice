import JuiceForm from "./native/juice-form.mjs";

export class JuiceForms {
    constructor() {
        this._forms = new Map();
        this._initialized = false;
    }

    _collectFormElements() {
        const nativeForms = Array.from(document.querySelectorAll("form"));
        const juiceFormRoots = Array.from(document.querySelectorAll("juice-forms"));

        const embeddedForms = juiceFormRoots.map((root) => root.form).filter((form) => form instanceof HTMLFormElement);

        const allForms = new Set([...nativeForms, ...embeddedForms]);
        return Array.from(allForms);
    }

    async refresh() {
        const currentForms = this._collectFormElements();

        for (const [formElement] of this._forms.entries()) {
            if (!currentForms.includes(formElement)) {
                this._forms.delete(formElement);
            }
        }

        for (let i = 0; i < currentForms.length; i += 1) {
            const formElement = currentForms[i];
            if (this._forms.has(formElement)) continue;

            try {
                const formInstance = new JuiceForm(formElement);
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

export const juiceForms = new JuiceForms();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        juiceForms.initialize();
    });
} else {
    juiceForms.initialize();
}

export default juiceForms;
