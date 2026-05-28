import layoutDefaults from "./presets/layout.mjs";
import formatDefaults from "./presets/format.mjs";
import validationDefaults from "./presets/validation.mjs";

const formsConfig = {
    layout: layoutDefaults.layout,
    presets: layoutDefaults.presets,
    groups: layoutDefaults.groups,
    formatters: formatDefaults.presets,
    validation: validationDefaults
};

export const layout = formsConfig.layout;
export const presets = formsConfig.presets;
export const groups = formsConfig.groups;
export const formatters = formsConfig.formatters;
export const validation = formsConfig.validation;

export default formsConfig;
