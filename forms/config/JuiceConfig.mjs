import {
    configureJuice as configureCoreJuice,
    getJuiceConfig as getCoreJuiceConfig
} from "../../core/Configuration.mjs";
import { registerPresets } from "../../data/validate/Presets.mjs";
import { registerFormatters } from "../../data/format/Presets.mjs";
import {
    presets as DEFAULT_VALIDATION_PRESETS,
    errorTypes as DEFAULT_VALIDATION_ERROR_TYPES
} from "../presets/validation.mjs";
import { presets as DEFAULT_FORMAT_PRESETS } from "../presets/format.mjs";

const DEFAULT_JUICE_CONFIG = {
    forms: {},
    ui: {},
    formatting: {
        presets: {}
    },
    validation: {
        colors: {
            none: "transparent",
            valid: "#73C322",
            incomplete: "#FFAB1A",
            invalid: "#D41111"
        },
        presets: {},
        errorTypes: {}
    }
};

function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item));
    }
    if (isPlainObject(value)) {
        const clone = {};
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            clone[key] = deepClone(value[key]);
        }
        return clone;
    }
    return value;
}

function deepMerge(target, source) {
    if (!isPlainObject(source)) return target;
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const nextValue = source[key];
        if (isPlainObject(nextValue)) {
            if (!isPlainObject(target[key])) {
                target[key] = {};
            }
            deepMerge(target[key], nextValue);
        } else if (Array.isArray(nextValue)) {
            target[key] = [...nextValue];
        } else {
            target[key] = nextValue;
        }
    }
    return target;
}

function getEffectiveConfig() {
    const current = getCoreJuiceConfig() || {};
    return deepMerge(deepClone(DEFAULT_JUICE_CONFIG), current);
}

function applyValidationColorVariables(validationConfig = {}) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (!root || !root.style) return;

    const colors =
        validationConfig && validationConfig.colors
            ? validationConfig.colors
            : {};
    const mergedColors = {
        ...DEFAULT_JUICE_CONFIG.validation.colors,
        ...(colors || {})
    };

    root.style.setProperty("--juice-validation-color-none", mergedColors.none);
    root.style.setProperty("--juice-validation-color-valid", mergedColors.valid);
    root.style.setProperty("--juice-validation-color-incomplete", mergedColors.incomplete);
    root.style.setProperty("--juice-validation-color-invalid", mergedColors.invalid);
}

function applyValidationConfig(validationConfig = {}) {
    applyValidationColorVariables(validationConfig || {});
    const configuredPresets =
        validationConfig && validationConfig.presets
            ? validationConfig.presets
            : {};
    const configuredErrorTypes =
        validationConfig && validationConfig.errorTypes
            ? validationConfig.errorTypes
            : {};
    registerPresets(
        { ...(DEFAULT_VALIDATION_PRESETS || {}), ...(configuredPresets || {}) },
        { ...(DEFAULT_VALIDATION_ERROR_TYPES || {}), ...(configuredErrorTypes || {}) }
    );
}

function applyFormattingConfig(formattingConfig = {}) {
    const configuredPresets =
        formattingConfig && formattingConfig.presets
            ? formattingConfig.presets
            : {};
    registerFormatters({
        ...(DEFAULT_FORMAT_PRESETS || {}),
        ...(configuredPresets || {})
    });
}

function syncRuntimeConfig() {
    const config = getEffectiveConfig();
    applyFormattingConfig(config.formatting || {});
    applyValidationConfig(config.validation || {});
    return config;
}

let listeningForChanges = false;
function ensureConfigListener() {
    if (listeningForChanges) return;
    if (typeof document === "undefined") return;
    listeningForChanges = true;
    document.addEventListener("juice:configchange", () => {
        syncRuntimeConfig();
    });
}

function ensureDefaults() {
    const merged = getEffectiveConfig();
    configureCoreJuice(merged);
    return merged;
}

export function configureJuice(nextConfig = {}) {
    ensureDefaults();
    if (isPlainObject(nextConfig)) {
        configureCoreJuice(nextConfig);
    }
    return deepClone(syncRuntimeConfig());
}

export function getJuiceConfig(section) {
    const effective = getEffectiveConfig();
    if (!section) return deepClone(effective);
    if (!Object.prototype.hasOwnProperty.call(effective, section)) return {};
    return deepClone(effective[section]);
}

export function resetJuiceConfig() {
    configureCoreJuice(deepClone(DEFAULT_JUICE_CONFIG));
    return deepClone(syncRuntimeConfig());
}

ensureConfigListener();
ensureDefaults();
syncRuntimeConfig();

export default {
    configureJuice,
    getJuiceConfig,
    resetJuiceConfig
};
