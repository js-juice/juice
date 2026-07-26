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

export function formRow(...inputs) {
    return new FormRow(...inputs);
}

export function input(object) {
    if (!object.type) object.type = "text";
    const input = document.createElement(`input-${object.tag || object.type}`);
    input.name = object.name;
    input.value = object.value;
    if (object.id) input.id = object.id;
    delete object.id;
    if (object.className) input.className = object.className;
    delete object.className;
    if (object.class) {
        if (typeof object.class === "string") {
            input.className = object.class;
        } else if (Array.isArray(object.class)) {
            for (let i = 0; i < object.class.length; i++) {
                input.classList.add(object.class[i]);
            }
        }
        delete object.class;
    }
    if (object.options) {
        for (let i = 0; i < object.options.length; i++) {
            let value = object.options[i].value || object.options[i];
            let label = object.options[i].label || object.options[i];
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            input.appendChild(option);
        }
        delete object.options;
    }

    for (let i = 0; i < Object.keys(object).length; i++) {
        input.setAttribute(Object.keys(object)[i], object[Object.keys(object)[i]]);
    }
    return input;
}

export class FormBuilder extends EventTarget {
    title = "form";
    inputs = [];
    layout = [];

    fromMap(formMap) {
        const form = document.createElement("form");
        for (let i = 0; i < formMap.length; i++) {
            if (Array.isArray(formMap[i])) {
                const row = this.fromMap(formMap[i]);
                form.appendChild(row);
            } else if (typeof formMap[i] == "object") {
                const el = input(formMap[i]);
                form.appendChild(el);
            }
        }
        return form;
    }

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
        const config = this.config;
        const form = document.createElement("form");
        form.name = this.name;

        const formHeader = document.createElement("header");
        formHeader.innerText = this.title || "Form";
        const formBody = document.createElement("main");
        formBody.className = "form-body";

        if (config.includeInfo || this.includeInfo) {
            const info = document.createElement("form-info");
            form.appendChild(info);
        }

        form.appendChild(formBody);

        this.layout.forEach((asset) => {
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
