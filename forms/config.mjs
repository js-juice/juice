import layoutDefaults from "./presets/layout.mjs";
import formatDefaults from "./presets/format.mjs";
import validationDefaults from "./presets/validation.mjs";

const input = document.createElement("input");
input.type = "text";

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
    styles: {
        "--form-font-family": "system-ui, Segoe UI, Roboto, Arial, sans-serif",
        "--form-label-color": "var(--color-text-primary, #48484a)",
        "--form-label-font-size": "0.7rem",
        "--form-label-weight": "700",
        "--form-label-text-transform": "uppercase",
        "--form-guidance-color": "var(--color-text-secondary, #64748b)",
        "--form-accent-color": "var(--color-primary, #2563eb)",
        "--input-height": inputHeight,
        "--input-padding": "0.25em",
        "--input-text-indent": "0.75em",
        "--input-bgcolor": "var(--color-input-background, #ffffff)",
        "--input-color": "var(--color-input-text, #293241)",
        "--input-border": "1px solid var(--color-input-border, #c8c8c8)",
        "--input-border-radius": "var(--button-border-radius, 5px)",
        "--input-focus-bgcolor": "var(--color-input-background, #ffffff)",
        "--input-disabled-bgcolor": "var(--color-disabled-background, #f1f5f9)",
        "--validation-color": "var(--color-error, #dc2626)",
        "--juice-forms-gap": "1rem",
        "--input-button-bgcolor": "var(--color-primary, #2563eb)",
        "--input-button-color": "#ffffff"
    }
};

export const layout = formsConfig.layout;
export const presets = formsConfig.presets;
export const groups = formsConfig.groups;
export const formatters = formsConfig.formatters;
export const validation = formsConfig.validation;
export const inputs = formsConfig.inputs;
export const styles = formsConfig.styles;

export default formsConfig;
