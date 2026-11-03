class InputBuilder {
    static applyConfig(input, config) {
        if (config.label) {
            input.setAttribute("label", config.label);
        } else {
            input.setAttribute("label", input.getAttribute("name").replace("-", " "));
        }
        if (config.placeholder) input.setAttribute("placeholder", config.placeholder);
        if (config.validation) input.setAttribute("validation", config.validation);
        if (config.datalist) input.setAttribute("datalist", config.datalist);
        if (config.description) input.setAttribute("description", config.description);
        if (config.format) input.setAttribute("format", config.format);
        if (config.disabled) input.setAttribute("disabled", "");
        if (config.readonly) input.setAttribute("readonly", "");
        if (config.required) input.setAttribute("required", "");
        for (const key of ["min", "max", "step", "precision", "decimals", "units", "label-placement"]) {
            if (config[key] !== undefined) input.setAttribute(key, config[key]);
        }

        if (config.attributes) {
            Object.entries(config.attributes).forEach(([key, value]) => {
                input.setAttribute(key, value || "");
            });
        }

        if (config.options && input.tagName.toLowerCase() === "input-select") {
            config.options.forEach((option) => {
                const optionEl = document.createElement("option");
                optionEl.value = option.value;
                optionEl.textContent = option.label;
                input.appendChild(optionEl);
            });
        }

        if (config.subscribe) {
            input.addEventListener("input", config.subscribe);
            input.addEventListener("change", config.subscribe);
        }

        if (config.on) {
            for (let event in config.on) {
                input.addEventListener(event, config.on[event]);
            }
        }

        return input;
    }

    static text(name, value, config = {}) {
        const input = document.createElement("input-text");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static number(name, value, config = {}) {
        const input = document.createElement("input-number");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static textarea(name, value, config = {}) {
        const input = document.createElement("input-textarea");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static select(name, value, config = {}) {
        const input = document.createElement("input-select");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static checkbox(name, value, config = {}) {
        const input = document.createElement("input-checkbox");
        input.setAttribute("name", name);
        if (value) input.setAttribute("checked", "");
        return this.applyConfig(input, config);
    }

    static radio(name, value, config = {}) {
        const input = document.createElement("input-radio");
        input.setAttribute("name", name);
        if (value) input.setAttribute("checked", "");
        return this.applyConfig(input, config);
    }

    static hidden(name, value, config = {}) {
        const input = document.createElement("input-hidden");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static file(name, value, config = {}) {
        const input = document.createElement("input-file");
        input.setAttribute("name", name);
        input.value = value;
        return this.applyConfig(input, config);
    }

    static files(name, value, config = {}) {
        const input = document.createElement("input-files");
        input.setAttribute("name", name);
        if (value && typeof value !== "string") input.files = value;
        return this.applyConfig(input, config);
    }

    static password(name, value, config = {}) {
        const input = document.createElement("input-password");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static color(name, value, config = {}) {
        const input = document.createElement("input-color");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static date(name, value, config = {}) {
        const input = document.createElement("input-date");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static time(name, value, config = {}) {
        const input = document.createElement("input-time");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static datetime(name, value, config = {}) {
        const input = document.createElement("input-datetime");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static button(name, value, config = {}) {
        const input = document.createElement("input-button");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static range(name, min, max, value, config = {}) {
        const input = document.createElement("input-range");
        input.setAttribute("name", name);
        input.setAttribute("min", min);
        input.setAttribute("max", max);
        input.setAttribute("value", value ?? "");
        if (config.step !== undefined) input.setAttribute("step", config.step);
        if (config.precision !== undefined) input.setAttribute("precision", config.precision);
        return this.applyConfig(input, config);
    }

    static vector(name, value, config = {}) {
        const input = document.createElement("input-vector");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static direction(name, value, config = {}) {
        const input = document.createElement("input-direction");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }

    static rotation(name, value, config = {}) {
        const input = document.createElement("input-rotation");
        input.setAttribute("name", name);
        input.setAttribute("value", value ?? "");
        return this.applyConfig(input, config);
    }
}

export default InputBuilder;
