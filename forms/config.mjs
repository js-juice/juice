import layoutDefaults from "./presets/layout.mjs";
import formatDefaults from "./presets/format.mjs";
import validationDefaults from "./presets/validation.mjs";

const input = document.createElement("input");
input.type = "text";
// Measure intrinsic control height without participating in a flex/grid page layout.
input.style.position = "absolute";
input.style.visibility = "hidden";
input.style.pointerEvents = "none";
input.tabIndex = -1;
input.setAttribute("aria-hidden", "true");

document.body.appendChild(input);
const inputHeight = getComputedStyle(input).height;
input.remove();

const formsConfig = {
    layout: layoutDefaults.layout,
    presets: layoutDefaults.presets,
    groups: layoutDefaults.groups,
    formatters: formatDefaults.presets,
    validation: validationDefaults,
    // Per-input-type configuration, keyed by input alias (the part after `input-`).
    // Apps (e.g. the admin panel) extend this via
    // configureJuice({ forms: { inputs: { <type>: { ... } } } }).
    //
    // Every type entry is consulted by the base input component:
    // - `attributes`: map applied as default host attributes (markup wins).
    // - `validation`: rule string/array merged with the host's rules
    //   (host attribute > config > native-derived, deduped by rule type).
    // - `format` / `formatters`: merged with shared `forms` formatting config.
    inputs: {
        wysiwyg: {
            // Default toolbar when an <input-wysiwyg> has no `tools` attribute.
            tools: ["strong", "em", "u", "s", "source"],
            // Named toolsets referenced with tools="@name".
            presets: {}
        }
    },
    // Set to another CSS URL to replace the default theme, or false to load none.
    stylesheet: new URL("./styles.css", import.meta.url).href,
    // Small runtime overrides; static defaults belong in styles.css.
    styles: {
        "--input-height": inputHeight
    }
};

export const layout = formsConfig.layout;
export const presets = formsConfig.presets;
export const groups = formsConfig.groups;
export const formatters = formsConfig.formatters;
export const validation = formsConfig.validation;
export const inputs = formsConfig.inputs;
export const styles = formsConfig.styles;
export const stylesheet = formsConfig.stylesheet;

export default formsConfig;
