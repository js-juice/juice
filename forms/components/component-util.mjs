export function toKebabCase(propertyName) {
    return propertyName.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function makeCSSString(styles) {
    function resolveNestedSelector(parentSelector, nestedKey) {
        const key = String(nestedKey || "").trim();
        if (!key) return parentSelector;
        if (key.includes("&")) {
            return key.replace(/&/g, parentSelector);
        }
        if (key.startsWith(":") || key.startsWith("::") || key.startsWith("[")) {
            return `${parentSelector}${key}`;
        }
        return `${parentSelector} ${key}`;
    }

    function compileSelector(selector, styleObject) {
        if (!selector || !isPlainObject(styleObject)) return "";

        const declarationParts = [];
        let nestedText = "";
        const keys = Object.keys(styleObject);

        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            const value = styleObject[key];

            if (isPlainObject(value)) {
                if (String(key).trim().startsWith("@")) {
                    const inner = compileSelector(selector, value);
                    if (inner.trim()) {
                        nestedText += `${key} {\n${inner}}\n`;
                    }
                } else {
                    const nestedSelector = resolveNestedSelector(selector, key);
                    nestedText += compileSelector(nestedSelector, value);
                }
                continue;
            }

            declarationParts.push(`${toKebabCase(key)}: ${value};`);
        }

        let text = "";
        if (declarationParts.length) {
            text += `${selector} { ${declarationParts.join(" ")} }\n`;
        }
        text += nestedText;
        return text;
    }

    let text = "";
    const selectors = Object.keys(styles || {});
    for (let i = 0; i < selectors.length; i += 1) {
        const selector = selectors[i];
        const value = styles[selector];
        if (!isPlainObject(value)) continue;

        if (String(selector).trim().startsWith("@")) {
            const inner = makeCSSString(value);
            if (inner.trim()) {
                text += `${selector} {\n${inner}}\n`;
            }
            continue;
        }

        text += compileSelector(selector, value);
    }
    return text;
}

export function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isSelectorKey(key) {
    if (!key) return false;
    if (
        key.startsWith(".") ||
        key.startsWith("#") ||
        key.startsWith(":") ||
        key.startsWith("[") ||
        key.startsWith("@") ||
        key.startsWith("*")
    ) {
        return true;
    }
    return key.includes(" ") || key.includes(">") || key.includes("+") || key.includes("~");
}

export function looksLikeStyleMap(value) {
    if (!isPlainObject(value)) return false;
    const keys = Object.keys(value);
    if (!keys.length) return false;
    return keys.some((key) => isSelectorKey(String(key).trim()));
}

export function mergeStyleMaps(...maps) {
    function mergeNestedObjects(target, source) {
        const sourceKeys = Object.keys(source);
        for (let i = 0; i < sourceKeys.length; i += 1) {
            const key = sourceKeys[i];
            const nextValue = source[key];
            if (isPlainObject(nextValue) && isPlainObject(target[key])) {
                mergeNestedObjects(target[key], nextValue);
            } else if (isPlainObject(nextValue)) {
                target[key] = {};
                mergeNestedObjects(target[key], nextValue);
            } else {
                target[key] = nextValue;
            }
        }
    }

    const merged = {};

    for (let i = 0; i < maps.length; i += 1) {
        const map = maps[i];
        if (!isPlainObject(map)) continue;

        const selectors = Object.keys(map);
        for (let j = 0; j < selectors.length; j += 1) {
            const selector = selectors[j];
            const declarations = map[selector];
            if (!isPlainObject(declarations)) continue;

            if (!isPlainObject(merged[selector])) {
                merged[selector] = {};
            }
            mergeNestedObjects(merged[selector], declarations);
        }
    }

    return merged;
}
