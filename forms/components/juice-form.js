import { render } from "./layout.js";

class JuiceFormElement extends HTMLElement {
    static get observedAttributes() {
        return ["disabled", "novalidate", "readonly", "required", "action", "method", "enctype"];
    }

    constructor() {
        super();

        this._fields = {};
        this._shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        this._style = render("style");

        const form = document.createElement("form");
        form.setAttribute("novalidate", "");
        form.setAttribute("method", this.getAttribute("method") || "get");
        if (this.hasAttribute("action")) {
            form.setAttribute("action", this.getAttribute("action"));
        }
        if (this.hasAttribute("enctype")) {
            form.setAttribute("enctype", this.getAttribute("enctype"));
        }

        const info = render("form-info");
        info.form = form;
        form.appendChild(info);

        const fields = render("div.fields");
        form.appendChild(fields);

        const slot = document.createElement("slot");
        fields.appendChild(slot);

        this._form = form;

        this._shadow.append(this._style, this._form);
    }

    connectedCallback() {
        this._render();
    }

    _render() {}
}

customElements.define("juice-form", JuiceFormElement);
