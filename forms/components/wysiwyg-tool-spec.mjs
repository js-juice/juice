export const DEFAULT_TOOLS = ["strong", "em", "u", "s", "source"];
export const SOURCE_TOOL_KEY = "source";
export const ALLOWED_TAGS = new Set(["strong", "em", "b", "i", "u", "s", "code", "mark", "small"]);
export const TOOL_LABELS = {
    strong: "B",
    b: "B",
    em: "I",
    i: "I",
    u: "U",
    s: "S",
    source: "</>",
    code: "</>",
    mark: "M",
    small: "Sm"
};

/** Utility / visibility classes may include colons (e.g. hidden:mobile). */
const CLASS_NAME_PATTERN = /^[a-zA-Z0-9_:.\\-]+$/;

function normalizeClassName(value) {
    return String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_:.\\-]/g, "");
}

/**
 * A bare CSS class applied via <span class="…"> — used for visibility utilities and similar.
 *
 * @param {string} raw
 * @returns {{ type: "wrap", tag: string, className: string, key: string }|null}
 */
export function parseClassTool(raw) {
    const className = normalizeClassName(raw);
    if (!className || !CLASS_NAME_PATTERN.test(className)) return null;

    return {
        type: "wrap",
        tag: "span",
        className,
        key: className
    };
}

/**
 * Parse one toolbar entry: a wrap/source tool, or a disclosure group `label[tool,tool,…]`.
 * Group children are the same wrap tools — the bracket is only toolbar layout.
 *
 * @param {string} raw
 * @returns {{ type: "wrap"|"source", tag: string, className: string, key: string }|{ type: "group", label: string, key: string, tools: Array<{ type: "wrap", tag: string, className: string, key: string }> }|null}
 */
export function parseToolSpec(raw) {
    const value = String(raw || "").trim();
    if (!value) return null;

    const groupMatch = value.match(/^([^[\]]+)\[([^\]]+)\]$/);
    if (groupMatch) {
        const label = groupMatch[1].trim();
        const tools = groupMatch[2]
            .split(",")
            .map((part) => parseClassTool(part))
            .filter(Boolean);

        if (!label || tools.length === 0) return null;

        return {
            type: "group",
            label,
            key: label,
            tools
        };
    }

    const normalized = value.toLowerCase();
    if (normalized === "source" || normalized === "code") {
        return {
            type: "source",
            tag: "source",
            className: "",
            key: SOURCE_TOOL_KEY
        };
    }

    // A bare utility class (e.g. `hidden:mobile`) — colons never appear in tag names.
    if (value.includes(":")) {
        return parseClassTool(value);
    }

    const parts = value.split(".").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return null;

    const tag = String(parts[0] || "")
        .trim()
        .toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return null;

    const classNames = parts
        .slice(1)
        .map((part) => normalizeClassName(part))
        .filter(Boolean);
    const className = classNames.join(" ");

    return {
        type: "wrap",
        tag,
        className,
        key: className ? `${tag}.${classNames.join(".")}` : tag
    };
}

/**
 * Parse a tool list from either a comma string ("strong,em,hidden[hidden:mobile]")
 * or an already-split array (as it may be stored in the juice config). No fallback —
 * callers decide what to do with an empty result.
 *
 * @param {string|Array<string>} value
 * @returns {Array<NonNullable<ReturnType<typeof parseToolSpec>>>}
 */
export function parseToolList(value) {
    const specs = Array.isArray(value) ? value : String(value || "").split(",");
    return specs.map((spec) => parseToolSpec(spec)).filter(Boolean);
}

/**
 * @param {string|Array<string>} raw
 * @returns {Array<NonNullable<ReturnType<typeof parseToolSpec>>>}
 */
export function parseToolsAttribute(raw) {
    const configured = parseToolList(raw);
    if (configured.length) return configured;

    return parseToolList(DEFAULT_TOOLS);
}

/**
 * Every wrap/source tool in toolbar order (group children included).
 *
 * @param {Array<ReturnType<typeof parseToolSpec>>} items
 */
export function flattenTools(items) {
    const out = [];

    for (const item of items) {
        if (!item) continue;
        if (item.type === "group") {
            out.push(...item.tools);
            continue;
        }
        out.push(item);
    }

    return out;
}

export function toolLabel(tool) {
    if (tool?.type === "source" || tool?.key === SOURCE_TOOL_KEY) {
        return TOOL_LABELS.source;
    }
    if (tool?.type === "group") {
        return tool.label;
    }

    if (tool.className && tool.tag === "span") {
        const colon = tool.className.lastIndexOf(":");
        if (colon !== -1 && colon < tool.className.length - 1) {
            return tool.className.slice(colon + 1);
        }
    }

    const base = TOOL_LABELS[tool.tag] || tool.tag.toUpperCase();
    if (!tool.className) return base;
    return `${base}.${tool.className.split(/\s+/)[0]}`;
}

export function elementMatchesTool(element, tool) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element.nodeName.toLowerCase() !== tool.tag) return false;
    if (!tool.className) return true;

    return tool.className
        .split(/\s+/)
        .filter(Boolean)
        .every((className) => element.classList.contains(className));
}

export function findWrappingTool(node, tool, root) {
    let current = node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (current && current !== root) {
        if (elementMatchesTool(current, tool)) return current;
        current = current.parentElement;
    }
    return null;
}

export function isSourceTool(tool) {
    return tool?.type === "source" || tool?.key === SOURCE_TOOL_KEY;
}

export function createToolElement(tool) {
    const element = document.createElement(tool.tag);
    if (tool.className) {
        element.className = tool.className;
    }
    return element;
}
