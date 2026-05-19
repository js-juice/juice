export { default as InputBuilder } from "./input.mjs";

export class FormFieldSet {
    constructor(title, inputs) {
        this.title = title;
        this.inputs = inputs;
    }

    build() {
        const fieldset = document.createElement("input-fieldset");
        fieldset.className = "form-fieldset";
        fieldset.setAttribute("label", this.title);

        for (let i = 0; i < this.inputs.length; i++) {
            fieldset.appendChild(this.inputs[i]);
        }
        return fieldset;
    }
}

export class FormRow {
    constructor(...inputs) {
        this.inputs = inputs;
    }
    build() {
        const formRow = document.createElement("div");
        formRow.className = "form-row";
        for (let i = 0; i < this.inputs.length; i++) {
            formRow.appendChild(this.inputs[i]);
        }
        return formRow;
    }
}

export class FormBuilder extends EventTarget {
    title = "form";
    inputs = [];
    layout = [];
    constructor(name, title, config = {}) {
        super();
        this.name = name;
        this.title = title;
        this.config = config;
        this.listeners = {
            input: [],
            change: [],
            submit: []
        };
    }

    add(...asset) {
        this.layout.push(...asset);
    }

    row(label = null) {
        const row = document.createElement("div");
        row.className = "row";
        if (label) {
            const labelEl = document.createElement("label");
            labelEl.innerText = label;
            row.appendChild(labelEl);
        }
        return row;
    }

    build() {
        const form = document.createElement("form");
        form.name = this.name;

        const formHeader = document.createElement("header");
        formHeader.innerText = this.title || "Form";
        const formBody = document.createElement("main");
        formBody.className = "form-body";

        if (this.includeInfo) {
            const info = document.createElement("form-info");
            form.appendChild(info);
        }

        form.appendChild(formBody);

        this.layout.forEach((asset) => {
            /*
            asset.subscribe((e) => {
                this.dispatchEvent(new CustomEvent("input", { detail: e }));
            });
            */

            formBody.appendChild(asset.build ? asset.build() : asset);
        });

        form.addEventListener("submit", (e) => {
            if (this.listeners.submit) this.listeners.submit.forEach((fn) => fn(e));
            this.dispatchEvent(new CustomEvent("formsubmit", { detail: e }));
        });
        form.addEventListener("input", (e) => {
            if (this.listeners.input) this.listeners.input.forEach((fn) => fn(e));
            this.dispatchEvent(new CustomEvent("forminput", { detail: e }));
        });
        form.addEventListener("change", (e) => {
            if (this.listeners.change) this.listeners.change.forEach((fn) => fn(e));
            this.dispatchEvent(new CustomEvent("formchange", { detail: e }));
        });

        return form;
    }

    subscribe(fn) {
        this.onInput(fn);
        this.onChange(fn);
        this.onSubmit(fn);
    }

    onInput(fn) {
        if (!this.listeners.input) this.listeners.input = [];
        this.listeners.input.push(fn);
    }

    onChange(fn) {
        if (!this.listeners.change) this.listeners.change = [];
        this.listeners.change.push(fn);
    }

    onSubmit(fn) {
        if (!this.listeners.submit) this.listeners.submit = [];
        this.listeners.submit.push(fn);
    }
}

export default FormBuilder;
