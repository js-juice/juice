export const presets = {
    alnum(value) {
        return /^[a-z0-9]+$/i.test(String(value || ""));
    },
    alpha(value) {
        return /^[a-z]+$/i.test(String(value || ""));
    },
    noSpaces(value) {
        return !/\s/.test(String(value || ""));
    },
    zip5(value) {
        return /^[0-9]{5}$/.test(String(value || ""));
    }
};

export const errorTypes = {};

export default {
    presets,
    errorTypes
};
