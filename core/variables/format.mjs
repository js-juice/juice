import { TYPES, GROUP_TYPES, GROUP_PREFIXES, GROUP_UNITS } from "./types.mjs";

function includesAny(string, substrings) {
    if (!Array.isArray(substrings)) {
        substrings = [substrings];
    }
    return substrings.some((substring) => string.includes(substring));
}

const TYPE_NAMES = Object.keys(TYPES);

const ALIAS_NAMES = Object.values(TYPES)
    .map((t) => t.aliases)
    .flat();

export function isGroupType(type) {
    if (GROUP_PREFIXES.some((prefix) => type.includes(prefix))) {
        const group = Object.values(GROUP_TYPES).find((group) => type.includes(group.prefix));
    } else {
        return false;
    }
}

export function parseType(type = "string") {
    type = type.trim();
    if (isGroupType(type)) {
    }
    if (TYPE_NAMES.includes(type)) {
        return type;
    }
}

export function formatToType(value, type) {}
