/**
 * AUTODOC:START
 * Component: <input-file>
 * Class: InputFileComponent
 * Overview: Styled file-picker trigger built on InputComponent that proxies clicks to a hidden native file input.
 *
 * Features:
 * - Reuses button-like label/icon rendering for file selection UX.
 * - Supports single or multiple file selection.
 * - Mirrors accept/name/disabled semantics to the underlying file input.
 * - Emits button-click style events for host orchestration.
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

import InputComponent from "./input-component.mjs";
import { getJuiceConfig } from "../../config/juice-config.mjs";

class InputFileComponent extends InputComponent {
    static tag = "input-file";

    static get observedAttributes() {
        return ["label", "icon", "bgcolor", "color", "disabled", "multiple", "name", "accept", "aria-label"];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._boundClick = (event) => this._handleButtonClick(event);
        this._boundSlotChange = () => this._syncIconVisibility();

        this._acceptedTypes = this.getAttribute("accept") || "";
        this._multiple = this.hasAttribute("multiple");

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    box-sizing: border-box;
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

        this._button = this._shadow.getElementById("button");
        this._label = this._shadow.getElementById("label");
        this._iconText = this._shadow.getElementById("icon-text");
        this._iconSlot = this._shadow.getElementById("icon-slot");
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "file";
        input.classList.add("native");
        return input;
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
        const fallbackBg = theme.inputButtonBgColor || "#2f5ea6";
        const fallbackColor = theme.inputButtonColor || "#ffffff";
        const bg = this.getAttribute("bgcolor") || fallbackBg;
        const color = this.getAttribute("color") || fallbackColor;
        this.style.setProperty("--input-button-bgcolor", bg);
        this.style.setProperty("--input-button-color", color);

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

        this._dom.native.click();

        const detail = {
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
