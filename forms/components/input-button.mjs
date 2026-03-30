/**
 * AUTODOC:START
 * Component: <input-button>
 * Class: InputButtonComponent
 * Overview: Form-aware button component with configurable label/icon styling and action event dispatching.
 *
 * Features:
 * - Supports icon slot or icon attribute rendering.
 * - Emits `input-button-click` and optional `input-button-action` custom events.
 * - Mirrors common button attributes (`type`, `name`, `value`, `disabled`, `aria-label`).
 * - Uses global forms theme config for default colors.
 *
 * Example:
 * `<input-button label="Save" action="saveProfile" icon="💾" type="submit"></input-button>`
 *
 * Attribute Reference:
 * - `label`: Visible button text.
 * - `icon`: Text/icon glyph shown before label.
 * - `action`: Action identifier emitted in event payload.
 * - `bgcolor`, `color`: Button color overrides.
 * - `disabled`, `type`, `name`, `value`, `aria-label`: Native-like button semantics.
 *
 * Property Reference:
 * - `disabled`: Getter/setter for disabled host state.
 * - `click()`: Programmatic click passthrough.
 *
 * CSS Variables:
 * - `--input-border-radius`: Button corner radius.
 * - `--input-button-bgcolor`, `--input-button-color`: Button theme colors.
 *
 * Part Names:
 * - `button`: Inner native button element.
 * AUTODOC:END
 */

import { getJuiceConfig } from "../../config/juice-config.mjs";

class InputButtonComponent extends HTMLElement {
    static tag = "input-button";

    static get observedAttributes() {
        return ["label", "icon", "bgcolor", "color", "disabled", "type", "name", "value", "action", "aria-label"];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._boundClick = (event) => this._handleButtonClick(event);
        this._boundSlotChange = () => this._syncIconVisibility();

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    box-sizing: border-box;
                }

                button {
                width:100%;
                    box-sizing: border-box;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    border: 1px solid transparent;
                    border-radius: var(--input-border-radius, 0);
                    padding: 0.5rem 1rem;
                    margin: 0;
                    cursor: pointer;
                    user-select: none;
                    font-size: inherit;
                    line-height: 1;
                    color: var(--input-button-color, #333333);
                    background: var(--input-button-bgcolor, #FFFFFF);
                    transition: filter 0.14s ease, opacity 0.14s ease;
                }

                button:hover:not(:disabled) {
                    filter: brightness(0.94);
                }

                button:active:not(:disabled) {
                    filter: brightness(0.88);
                }

                button:disabled {
                    cursor: not-allowed;
                    opacity: 0.55;
                }

                .content {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    min-width: 0;
                }

                .icon-wrap {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 auto;
                    min-width: 0.9em;
                }

                :host(.has-icon) .icon-wrap {
                    display: inline-flex;
                }

                .icon-text {
                    display: none;
                }

                :host(.has-icon-attr) .icon-text {
                    display: inline;
                }

                .icon-slot {
                    display: inline-flex;
                }

                .label {
                    display: inline-block;
                    white-space: nowrap;
                }
            </style>
            <button id="button" type="button" part="button">
                <span class="content">
                    <span class="icon-wrap" aria-hidden="true">
                        <span id="icon-text" class="icon-text"></span>
                        <slot id="icon-slot" class="icon-slot" name="icon"></slot>
                    </span>
                    <span id="label" class="label" part="label"></span>
                </span>
            </button>
        `;

        this._button = this._shadow.getElementById("button");
        this._label = this._shadow.getElementById("label");
        this._iconText = this._shadow.getElementById("icon-text");
        this._iconSlot = this._shadow.getElementById("icon-slot");
    }

    connectedCallback() {
        this._button.addEventListener("click", this._boundClick);
        this._iconSlot.addEventListener("slotchange", this._boundSlotChange);
        this._syncAll();
    }

    disconnectedCallback() {
        this._button.removeEventListener("click", this._boundClick);
        this._iconSlot.removeEventListener("slotchange", this._boundSlotChange);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        if (
            name === "label" ||
            name === "icon" ||
            name === "bgcolor" ||
            name === "color" ||
            name === "disabled" ||
            name === "type" ||
            name === "name" ||
            name === "value" ||
            name === "aria-label"
        ) {
            this._syncAll();
        }
    }

    _syncAll() {
        if (!this._button) return;

        const label = this.getAttribute("label");
        const fallbackLabel = this.textContent ? this.textContent.trim() : "";
        this._label.textContent = label != null ? label : fallbackLabel || "Submit";

        const icon = this.getAttribute("icon");
        this._iconText.textContent = icon || "";
        this.classList.toggle("has-icon-attr", !!icon);
        this._syncIconVisibility();

        const formsConfig = getJuiceConfig("forms") || {};
        const theme = formsConfig.theme || {};

        const type = this.getAttribute("type") || "button";
        this._button.type = type;

        const name = this.getAttribute("name");
        if (name == null) this._button.removeAttribute("name");
        else this._button.setAttribute("name", name);

        const value = this.getAttribute("value");
        if (value == null) this._button.removeAttribute("value");
        else this._button.setAttribute("value", value);

        const aria = this.getAttribute("aria-label");
        if (aria != null) {
            this._button.setAttribute("aria-label", aria);
        } else if (this._label.textContent) {
            this._button.setAttribute("aria-label", this._label.textContent);
        } else {
            this._button.removeAttribute("aria-label");
        }

        this._button.disabled = this.disabled;
    }

    _syncIconVisibility() {
        const hasIconAttr = !!this.getAttribute("icon");
        const assigned = this._iconSlot.assignedNodes({ flatten: true });
        const hasIconSlot = assigned.some((node) => {
            if (node.nodeType === Node.TEXT_NODE) return String(node.textContent || "").trim().length > 0;
            return node.nodeType === Node.ELEMENT_NODE;
        });
        this.classList.toggle("has-icon", hasIconAttr || hasIconSlot);
    }

    _handleButtonClick(event) {
        if (this.disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const detail = {
            action: this.getAttribute("action") || "",
            name: this.getAttribute("name") || "",
            value: this.getAttribute("value") || "",
            label: this._label?.textContent || "",
            source: this
        };

        this.dispatchEvent(
            new CustomEvent("input-button-click", {
                detail,
                bubbles: true,
                composed: true
            })
        );

        if (detail.action) {
            this.dispatchEvent(
                new CustomEvent("input-button-action", {
                    detail,
                    bubbles: true,
                    composed: true
                })
            );
        }

        const inlineHandler = this.getAttribute("onclick");
        if (inlineHandler && /^[A-Za-z_$][\w$]*$/.test(inlineHandler)) {
            const fn = globalThis[inlineHandler];
            if (typeof fn === "function") {
                fn.call(this, event);
            }
        }
    }

    click() {
        this._button?.click();
    }

    get disabled() {
        return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    }

    set disabled(value) {
        if (value) this.setAttribute("disabled", "true");
        else this.removeAttribute("disabled");
    }
}

if (!customElements.get(InputButtonComponent.tag)) {
    customElements.define(InputButtonComponent.tag, InputButtonComponent);
}

export default InputButtonComponent;
