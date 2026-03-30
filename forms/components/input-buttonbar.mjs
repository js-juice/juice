/**
 * AUTODOC:START
 * Component: <input-buttonbar>
 * Class: InputButtonBarComponent
 * Overview: Horizontal button-group container that normalizes border radii for adjacent slotted buttons.
 *
 * Features:
 * - Presents slotted buttons in a compact row.
 * - Applies first/last-child rounded corners for grouped appearance.
 * - Supports both native `button` and `<input-button>` children.
 *
 * Example:
 * `<input-buttonbar><input-button label="Cancel"></input-button><input-button label="Save"></input-button></input-buttonbar>`
 *
 * Attribute Reference:
 * - No component-specific attributes.
 *
 * Property Reference:
 * - Slot-based API only; no custom public properties.
 *
 * CSS Variables:
 * - `--form-border-radius`: First/last button corner radius.
 *
 * Part Names:
 * - None.
 * AUTODOC:END
 */

import { getJuiceConfig } from "../../config/juice-config.mjs";

class InputButtonBarComponent extends HTMLElement {
    static tag = "input-buttonbar";
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: row;
                    gap: 0.5rem;
                }
                slot{
                    width:100%;
                    display: flex;
                    flex-direction: row;
                    flex-gap: 0rem;
                    overflow: hidden;
                    border-radius: var(--form-border-radius, 4px) !important;
                    background:var(--input-buttonbar-bgcolor, transparent);
                    border:1px solid var(--input-buttonbar-border-color, #FFFFFF);
                }
            
                
                ::slotted(button), ::slotted(input-button) {
                    border:0;
                    border-radius:0 !important;
                    width:100%;
                    margin:0;
                    display:block;
                    border-left:1px solid var(--input-buttonbar-border-color, #FFFFFF);
                }
                ::slotted(button:first-child), ::slotted(input-button:first-child) {
                    border-left:0 !important;
                    border-top-left-radius: var(--form-border-radius, 4px) !important;
                    border-bottom-left-radius: var(--form-border-radius, 4px) !important;    
                }
                ::slotted(button:last-child), ::slotted(input-button:last-child) {
                    border-top-right-radius: var(--form-border-radius, 4px) !important;
                    border-bottom-right-radius: var(--form-border-radius, 4px) !important;
                }

            }
            </style>
            <slot></slot>
        `;
    }
}

customElements.define(InputButtonBarComponent.tag, InputButtonBarComponent);

export default InputButtonBarComponent;
