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
 * - `--input-height`: Native input height measured once in this form's style context.
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

import render from "../../ui/render.mjs";

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
        this._inputHeightMeasured = false;
        this._typographySignature = "";
        this._resizeObserver = null;
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

        if (this.hasAttribute("form-info")) {
            const info = render("form-info");
            info.form = form;
            form.appendChild(info);
        }

        const fields = render("div.fields");
        form.appendChild(fields);

        const slot = document.createElement("slot");
        fields.appendChild(slot);

        this._form = form;

        this._shadow.append(this._style, this._form);
    }

    get elements() {
        return this._form.elements;
    }

    collectInputs() {
        const children = this.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.isInputComponent || ["INPUT", "TEXTAREA", "SELECT"].includes(child.tagName)) {
                this._fields[child.name] = child;
            }
        }
    }

    /**
     * Runs setup logic when the element is connected to the document.
     * @returns {*} void.
     */
    connectedCallback() {
        this._measureInputHeight();
        if (typeof ResizeObserver === "function" && !this._resizeObserver) {
            this._resizeObserver = new ResizeObserver(() => this._measureInputHeight());
            this._resizeObserver.observe(this);
        }
        this._render();
    }

    disconnectedCallback() {
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }

    /**
     * Measures one native input in this form's inherited style context.
     * All Juice inputs in the form inherit the resulting local height.
     * @returns {void}
     */
    _measureInputHeight() {
        const computed = getComputedStyle(this);
        const typographySignature = [
            computed.fontFamily,
            computed.fontSize,
            computed.fontStyle,
            computed.fontWeight,
            computed.lineHeight,
            computed.letterSpacing
        ].join("|");

        if (this._inputHeightMeasured && typographySignature === this._typographySignature) return;

        const probe = document.createElement("input");
        probe.type = "text";
        probe.tabIndex = -1;
        probe.setAttribute("aria-hidden", "true");
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.style.pointerEvents = "none";
        probe.style.margin = "0";
        probe.style.padding = "0";
        probe.style.border = "0";
        probe.style.font = "inherit";

        this.appendChild(probe);
        const height = probe.getBoundingClientRect().height;
        probe.remove();

        if (!Number.isFinite(height) || height <= 0) return;

        this.style.setProperty("--input-height", `${height}px`);
        this._typographySignature = typographySignature;
        this._inputHeightMeasured = true;
    }

    /**
     * Renders render UI content.
     * @returns {*} void.
     */
    _render() {}
}

customElements.define("juice-form", JuiceFormElement);
