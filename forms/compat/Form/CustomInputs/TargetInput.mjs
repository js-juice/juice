/**
 * Target input form component with crosshair selector.
 * Provides visual target selection with drag-and-drop crosshair interface.
 * @module Form/CustomInputs/TargetInput
 */

import { vElement } from "../../../native/virtual-builder.mjs";

/**
 * Crosshair element for target selection.
 * @private
 */
const CrossHair = vElement.make("div", { class: "crosshair round" }, [
    new vElement("div", { class: "line vertical w-1px h-120 centered" }),
    new vElement("div", { class: "line horizontal h-1px w-120 centered" })
]);

const Activator = vElement.make(
    "a",
    { class: "activator block absolute height-80 aspect-ratio-1", href: "#" },
    [new CrossHair()],
    {
        events: {
            click(event) {
                event.preventDefault();
                this.dispatchEvent(
                    new CustomEvent("target-input:activate", {
                        bubbles: true,
                        detail: { source: this }
                    })
                );
            }
        }
    }
);

export default vElement.make("div", { class: "target-input" }, [
    new Activator(),
    new vElement("input", { name: "target", type: "text" })
]);
