

/**
 * AUTODOC:START
 * Component: <juice-form>
 * Class: JuiceFormElement
 * Overview: Shadow-DOM form wrapper that hosts `<form-info>` and a slotted field container.
 *
 * Features:
 * - Creates an internal `<form>` with method/action/enctype forwarding.
 * - Provides built-in `<form-info>` status block above slotted fields.
 * - Encapsulates base layout/style within shadow DOM.
 *
 * Example:
 * `<juice-form method="post" action="/api/profile"><input-text name="name"></input-text></juice-form>`
 *
 * Attribute Reference:
 * - `method`: Forwarded to internal form method (`get` default).
 * - `action`: Forwarded submit target URL.
 * - `enctype`: Forwarded form encoding type.
 * - `novalidate`: Forwarded native form validation toggle.
 *
 * Property Reference:
 * - Internal form node available as `this._form` for component internals.
 *
 * CSS Variables:
 * - None (uses shared styles from rendered layout helpers/components).
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

import { render } from "./layout.mjs";

class JuiceFormElement extends HTMLElement {
    /**
     * Lists attributes that are observed for runtime updates.
     * @returns {*} List of observed attribute names.
     */
    static get observedAttributes() {
        return ["disabled", "novalidate", "readonly", "required", "action", "method", "enctype"];
    }

    /**
        * Initializes component state, DOM references, and default behavior.
     * @returns {*} void.
     */
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

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        this._render();
    }

    /**
      * Renders render UI content.
     * @returns {*} void.
     */
    _render() {}
}

customElements.define("juice-form", JuiceFormElement);
