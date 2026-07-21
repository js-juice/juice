/**
 * AUTODOC:START
 * Component: <input-buttonbar>
 * Class: InputButtonBarComponent
 * Overview: Horizontal labeled button-group container that normalizes border radii for adjacent slotted buttons.
 *
 * Features:
 * - Presents slotted buttons in a compact row.
 * - Applies first/last-child rounded corners for grouped appearance.
 * - Supports both native `button` and `<input-button>` children.
 *
 * Example:
 * `<input-buttonbar label="Actions"><input-button label="Cancel"></input-button><input-button label="Save"></input-button></input-buttonbar>`
 *
 * Attribute Reference:
 * - `label`: Optional visible label rendered as the first inline segment.
 * - `label-placement="inline|before"`: Places the label beside or above the buttons.
 * - `bgcolor`: Default button background, or state values such as `active:#333;default:#fff`.
 * - `color`: Default button text color, or state values such as `active:#fff;default:#333`.
 * - `bordercolor`: Outer border and internal divider color.
 *
 * Property Reference:
 * - Slot-based API only; no custom public properties.
 *
 * CSS Variables:
 * - `--form-border-radius`: First/last button corner radius.
 * - `--input-buttonbar-button-bgcolor`, `--input-buttonbar-button-color`: Default button colors.
 * - `--input-buttonbar-active-button-bgcolor`, `--input-buttonbar-active-button-color`: Active button colors.
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

class InputButtonBarComponent extends HTMLElement {
    static tag = "input-buttonbar";

    static get observedAttributes() {
        return ["label", "label-placement", "bgcolor", "color", "bordercolor"];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });

        this._shadow.innerHTML = `
            <style>
                :host {
                    --input-button-bgcolor: var(--input-buttonbar-button-bgcolor, inherit);
                    --input-button-color: var(--input-buttonbar-button-color, inherit);
                    display: flex;
                    flex-direction: row;
                    overflow: hidden;
                    border-radius: var(--form-border-radius, 4px);
                    background: var(--input-buttonbar-bgcolor, transparent);
                    border: 1px solid var(--input-buttonbar-border-color, #aaa);
                }
                .label {
                    display: flex;
                    align-items: center;
                    flex: 0 0 auto;
                    padding: var(--input-buttonbar-label-padding, 0 1rem);
                    background: var(--input-buttonbar-label-bgcolor, transparent);
                    color: var(--input-buttonbar-label-color, inherit);
                    font-weight: var(--input-buttonbar-label-font-weight, normal);
                    white-space: nowrap;
                    border-right: 1px solid var(--input-buttonbar-border-color, #aaa);
                }
                .label[hidden] {
                    display: none;
                }
                :host([label-placement="before"]) {
                    flex-direction: column;
                }
                :host([label-placement="before"]) .label {
                    border-right: 0;
                    border-bottom: 1px solid var(--input-buttonbar-border-color, #aaa);
                }
                slot{
                    width:100%;
                    display: flex;
                    flex-direction: row;
                }
            
                
                ::slotted(button), ::slotted(input-button) {
                    --form-input-border-radius: 0;
                    --input-border-radius: 0;
                    border:0;
                    border-radius:0 !important;
                    width:100%;
                    margin:0;
                    display:block;
                    border-left:1px solid var(--input-buttonbar-border-color, #aaa);
                }
                ::slotted([aria-pressed="true"]) {
                    --input-button-bgcolor: var(--input-buttonbar-active-button-bgcolor, var(--input-buttonbar-button-bgcolor, inherit));
                    --input-button-color: var(--input-buttonbar-active-button-color, var(--input-buttonbar-button-color, inherit));
                }
                ::slotted(button:first-child), ::slotted(input-button:first-child) {
                    border-left:0 !important;
                }

            }
            </style>
            <span class="label" part="label" hidden></span>
            <slot></slot>
        `;

        this._label = this._shadow.querySelector(".label");
        this._syncLabel();
        this._syncColors();
        this._syncBorderColor();
    }

    attributeChangedCallback(name) {
        if (name === "label") this._syncLabel();
        if (name === "bgcolor" || name === "color") this._syncColors();
        if (name === "bordercolor") this._syncBorderColor();
    }

    _syncLabel() {
        const label = String(this.getAttribute("label") || "").trim();
        this._label.textContent = label;
        this._label.hidden = !label;

        if (label) {
            this.setAttribute("role", "group");
            if (!this.hasAttribute("aria-label")) this.setAttribute("aria-label", label);
        }
    }

    _parseStateValues(attributeName) {
        const value = String(this.getAttribute(attributeName) || "").trim();
        if (!value) return {};
        if (!value.includes(":")) return { default: value };

        return Object.fromEntries(value
            .split(";")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
                const separator = entry.indexOf(":");
                return [entry.slice(0, separator).trim().toLowerCase(), entry.slice(separator + 1).trim()];
            })
            .filter(([state, stateValue]) => ["default", "active"].includes(state) && stateValue));
    }

    _syncColors() {
        const backgrounds = this._parseStateValues("bgcolor");
        const colors = this._parseStateValues("color");
        const values = {
            "--input-buttonbar-button-bgcolor": backgrounds.default,
            "--input-buttonbar-active-button-bgcolor": backgrounds.active,
            "--input-buttonbar-button-color": colors.default,
            "--input-buttonbar-active-button-color": colors.active
        };

        Object.entries(values).forEach(([property, value]) => {
            if (value) this.style.setProperty(property, value);
            else this.style.removeProperty(property);
        });
    }

    _syncBorderColor() {
        const borderColor = String(this.getAttribute("bordercolor") || "").trim();
        if (borderColor) this.style.setProperty("--input-buttonbar-border-color", borderColor);
        else this.style.removeProperty("--input-buttonbar-border-color");
    }
}

customElements.define(InputButtonBarComponent.tag, InputButtonBarComponent);

export default InputButtonBarComponent;
