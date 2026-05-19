/**
 * AUTODOC:START
 * Component: <input-file>
 * Class: InputFileComponent
 * Overview: Styled file-picker trigger that proxies clicks to a hidden native file input.
 *
 * Features:
 * - Reuses button-like label/icon rendering for file selection UX.
 * - Supports single or multiple file selection.
 * - Mirrors accept/name/disabled semantics to the underlying file input.
 * - Exposes `files`, `nativeInput`, and input/change events for integrations.
 *
 * Example:
 * `<input-file label="Upload" accept=".png,.jpg" multiple></input-file>`
 *
 * Attribute Reference:
 * - `accept`: File MIME/extensions filter.
 * - `multiple`: Enables multi-file selection.
 * - `label`, `icon`, `bgcolor`, `color`: Visual trigger customization.
 * - `name`, `disabled`, `aria-label`: Native input semantics.
 *
 * Property Reference:
 * - `files`: Selected FileList.
 * - `nativeInput`: Underlying native file input.
 * - `disabled`: Getter/setter for disabled state.
 * - `click()`: Programmatic trigger click.
 *
 * CSS Variables:
 * - `--input-border-radius`: Trigger button corner radius.
 * - `--input-button-bgcolor`, `--input-button-color`: Trigger button theme colors.
 *
 * Part Names:
 * - `button`: Inner trigger button element.
 * AUTODOC:END
 */

import { getJuiceConfig } from "../../config/juice-config.mjs";

class InputFileComponent extends HTMLElement {
    static tag = "input-file";

    static get observedAttributes() {
        return ["label", "icon", "bgcolor", "color", "disabled", "multiple", "name", "accept", "aria-label"];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._boundClick = (event) => this._handleButtonClick(event);
        this._boundNativeInput = () => this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this._boundNativeChange = () => this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        this._boundSlotChange = () => this._syncIconVisibility();

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    box-sizing: border-box;
                }

                input[type="file"] {
                    display: none;
                }

                button {
                    box-sizing: border-box;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    border: 1px solid transparent;
                    border-radius: var(--input-border-radius, 5px);
                    padding: 0.5rem 1rem;
                    margin: 0;
                    cursor: pointer;
                    user-select: none;
                    font: inherit;
                    line-height: 1;
                    color: var(--input-button-color, #ffffff);
                    background: var(--input-button-bgcolor, #2f5ea6);
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
            <input id="native" type="file">
            <button id="button" type="button" part="button">
                <span class="content">
                    <span class="icon-wrap" aria-hidden="true">
                        <span id="icon-text" class="icon-text"></span>
                        <slot id="icon-slot" class="icon-slot" name="icon"></slot>
                    </span>
                    <span id="label" class="label"></span>
                </span>
            </button>
        `;

        this._native = this._shadow.getElementById("native");
        this._button = this._shadow.getElementById("button");
        this._label = this._shadow.getElementById("label");
        this._iconText = this._shadow.getElementById("icon-text");
        this._iconSlot = this._shadow.getElementById("icon-slot");
    }

    connectedCallback() {
        this._button.addEventListener("click", this._boundClick);
        this._native.addEventListener("input", this._boundNativeInput);
        this._native.addEventListener("change", this._boundNativeChange);
        this._iconSlot.addEventListener("slotchange", this._boundSlotChange);
        this._syncAll();
    }

    disconnectedCallback() {
        this._button.removeEventListener("click", this._boundClick);
        this._native.removeEventListener("input", this._boundNativeInput);
        this._native.removeEventListener("change", this._boundNativeChange);
        this._iconSlot.removeEventListener("slotchange", this._boundSlotChange);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this._syncAll();
    }

    _syncAll() {
        if (!this._button || !this._native) return;

        const label = this.getAttribute("label");
        const fallbackLabel = this.textContent ? this.textContent.trim() : "";
        this._label.textContent = label != null ? label : fallbackLabel || "Choose file";

        const icon = this.getAttribute("icon");
        this._iconText.textContent = icon || "";
        this.classList.toggle("has-icon-attr", !!icon);
        this._syncIconVisibility();

        const formsConfig = getJuiceConfig("forms") || {};
        const theme = formsConfig.theme || {};
        this.style.setProperty("--input-button-bgcolor", this.getAttribute("bgcolor") || theme.inputButtonBgColor || "#2f5ea6");
        this.style.setProperty("--input-button-color", this.getAttribute("color") || theme.inputButtonColor || "#ffffff");

        const name = this.getAttribute("name");
        if (name == null) this._native.removeAttribute("name");
        else this._native.setAttribute("name", name);

        this._native.accept = this.getAttribute("accept") || "";
        this._native.multiple = this.hasAttribute("multiple");
        this._native.disabled = this.disabled;
        this._button.disabled = this.disabled;

        const aria = this.getAttribute("aria-label");
        if (aria != null) {
            this._button.setAttribute("aria-label", aria);
        } else if (this._label.textContent) {
            this._button.setAttribute("aria-label", this._label.textContent);
        } else {
            this._button.removeAttribute("aria-label");
        }
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

        this._native.click();

        this.dispatchEvent(
            new CustomEvent("input-button-click", {
                detail: {
                    name: this.getAttribute("name") || "",
                    value: this.value,
                    label: this._label?.textContent || "",
                    source: this
                },
                bubbles: true,
                composed: true
            })
        );
    }

    click() {
        this._button?.click();
    }

    get files() {
        return this._native?.files || null;
    }

    get nativeInput() {
        return this._native || null;
    }

    get value() {
        return Array.from(this.files || [])
            .map((file) => file.name)
            .join(",");
    }

    set value(value) {
        if ((value === "" || value === null || value === undefined) && this._native) {
            this._native.value = "";
        }
    }

    get disabled() {
        return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    }

    set disabled(value) {
        if (value) this.setAttribute("disabled", "true");
        else this.removeAttribute("disabled");
    }
}

if (!customElements.get(InputFileComponent.tag)) {
    customElements.define(InputFileComponent.tag, InputFileComponent);
}

export default InputFileComponent;
