import {
    extendJuiceConfig,
    getJuiceConfig
} from "../../core/Configuration.mjs";

const DEFAULT_DATA_CONFIG = {
    db: {},
    models: {},
    validation: {},
    formatting: {}
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
        const sourceValue = source[key];
        if (isPlainObject(sourceValue)) {
            if (!isPlainObject(target[key])) {
                target[key] = {};
            }
            deepMerge(target[key], sourceValue);
        } else if (Array.isArray(sourceValue)) {
            target[key] = sourceValue.map((item) => deepClone(item));
        } else {
            target[key] = sourceValue;
        }
    }
    return target;
}

function getEffectiveDataConfig() {
    const currentDataConfig = getJuiceConfig("data") || {};
    return deepMerge(deepClone(DEFAULT_DATA_CONFIG), currentDataConfig);
}

export function configureData(nextConfig = {}) {
    extendJuiceConfig("data", getEffectiveDataConfig());
    if (isPlainObject(nextConfig)) {
        extendJuiceConfig("data", nextConfig);
    }
    return getDataConfig();
}

export function getDataConfig(section) {
    const effective = getEffectiveDataConfig();
    if (!section) return deepClone(effective);
    if (!Object.prototype.hasOwnProperty.call(effective, section)) return {};
    return deepClone(effective[section]);
}

export function resetDataConfig() {
    extendJuiceConfig("data", deepClone(DEFAULT_DATA_CONFIG));
    return getDataConfig();
}

configureData();

export default {
    configureData,
    getDataConfig,
    resetDataConfig
};
