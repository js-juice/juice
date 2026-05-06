#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const PUBLIC_METHOD_SUMMARIES = {
    constructor: "Initializes component state, DOM references, and default behavior.",
    connectedCallback: "Runs setup logic when the element is connected to the document.",
    disconnectedCallback: "Cleans up listeners, observers, and transient resources.",
    attributeChangedCallback: "Handles observed attribute changes and synchronizes runtime state.",
    observedAttributes: "Lists attributes observed for runtime synchronization.",
    registerFeatures: "Registers feature flags/options used by component behavior.",
    registerFormatters: "Registers named formatter functions used by the format pipeline.",
    hook: "Registers an action callback for a named component action.",
    bindForm: "Binds the component to a form instance and related integrations.",
    submit: "Submits the underlying form.",
    requestSubmit: "Requests a form submit, optionally with a submitter element.",
    reset: "Resets the underlying form state.",
    checkValidity: "Checks the current validity state.",
    reportValidity: "Reports validity and returns whether the state is valid.",
    click: "Triggers the primary interactive action programmatically."
};

const GETTER_SUMMARIES = {
    value: "Returns the current component value.",
    checked: "Returns the current checked state.",
    disabled: "Returns whether the component is disabled.",
    format: "Returns the active format specification.",
    formatters: "Returns registered formatter functions.",
    nativeInput: "Returns the underlying native input control.",
    size: "Returns the configured component size.",
    state: "Returns the current status state.",
    error: "Returns the current error message.",
    warning: "Returns the current warning message.",
    message: "Returns the current informational message.",
    form: "Returns the associated native form element.",
    elements: "Returns the form control collection.",
    length: "Returns the number of form controls.",
    styles: "Returns the style map used to build component CSS."
};

const SETTER_SUMMARIES = {
    value: "Updates the component value and synchronizes dependent state.",
    checked: "Updates the checked state and synchronizes dependent state.",
    disabled: "Updates the disabled state.",
    format: "Updates the active format specification.",
    formatters: "Replaces registered formatter functions and re-applies formatting.",
    size: "Updates the component size.",
    state: "Updates the status state.",
    error: "Updates the error message.",
    warning: "Updates the warning message.",
    message: "Updates the informational message."
};

const PARAM_DESCRIPTIONS = {
    name: "Attribute or field name",
    oldValue: "Previous value",
    newValue: "Next value",
    value: "Assigned value",
    event: "Event payload",
    ev: "Event payload",
    action: "Action identifier",
    form: "Form element or form-like host",
    force: "Whether to force a full refresh",
    target: "Target element or node",
    source: "Source element or value",
    state: "State value",
    submitter: "Submit button/control used for requestSubmit",
    options: "Options object",
    features: "Feature map to merge into the registry",
    formatters: "Formatter function map keyed by formatter name",
    fn: "Callback function",
    props: "Property names to upgrade",
    disabled: "Disabled state",
    callback: "Callback function",
    history: "History instance",
    input: "Input element",
    sourceConfig: "Source configuration object"
};

function isGenericSummary(line) {
    const text = line.trim();
    return (
        text.includes("Implements `") ||
        text.includes("Returns the current `") ||
        text.includes("Initializes component state and bindings.") ||
        text.includes("Executes ")
    );
}

function isGenericReturns(text) {
    return (
        text.includes("Operation result.") ||
        text.includes("Current `") ||
        text.includes("Result of ") ||
        text.includes(" value.")
    );
}

function signatureInfo(signatureLine) {
    const line = signatureLine.trim();
    let match = line.match(/^static\s+get\s+([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "static-getter", name: match[1] };

    match = line.match(/^get\s+([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "getter", name: match[1] };

    match = line.match(/^set\s+([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "setter", name: match[1] };

    match = line.match(/^(?:async\s+)?([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "method", name: match[1] };

    return null;
}

function isPublicMember(info) {
    if (!info) return false;
    if (!info.name) return false;
    return !info.name.startsWith("_");
}

function buildSummary(info) {
    if (info.kind === "getter") {
        return GETTER_SUMMARIES[info.name] || `Returns the current \`${info.name}\` value.`;
    }
    if (info.kind === "setter") {
        return SETTER_SUMMARIES[info.name] || `Updates the \`${info.name}\` value.`;
    }
    return PUBLIC_METHOD_SUMMARIES[info.name] || `Implements public \`${info.name}\` behavior.`;
}

function buildReturns(info) {
    if (info.kind === "setter") return "void.";
    if (info.kind === "method") {
        if (
            info.name === "constructor" ||
            info.name === "connectedCallback" ||
            info.name === "disconnectedCallback" ||
            info.name === "attributeChangedCallback" ||
            info.name === "registerFeatures" ||
            info.name === "registerFormatters" ||
            info.name === "hook" ||
            info.name === "bindForm" ||
            info.name === "submit" ||
            info.name === "requestSubmit" ||
            info.name === "reset" ||
            info.name === "click" ||
            info.name === "formResetCallback" ||
            info.name === "formStateRestoreCallback"
        ) {
            return "void.";
        }
    }
    if (info.name === "observedAttributes") return "List of observed attribute names.";
    if (info.name === "checkValidity" || info.name === "reportValidity") return "Boolean validity result.";
    if (info.name === "form") return "Associated form element or null.";
    if (info.name === "elements") return "Form controls collection.";
    if (info.name === "length") return "Number of form controls.";
    if (info.name === "disabled" || info.name === "checked") return "Boolean state value.";
    if (info.name === "value") return "Current value.";
    if (info.name === "size") return "Configured size value.";
    if (info.name === "state") return "Current normalized status state.";
    if (info.name === "error") return "Current error message.";
    if (info.name === "warning") return "Current warning message.";
    if (info.name === "message") return "Current informational message.";
    if (info.name === "styles") return "Style definition map.";
    if (info.name === "format") return "Current format specification.";
    if (info.name === "formatters") return "Registered formatter map.";
    if (info.name === "nativeInput") return "Native input element.";
    return "Operation result.";
}

function findNextCodeLine(source, fromIndex) {
    const tail = source.slice(fromIndex);
    const lines = tail.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith("/**") || line.startsWith("*") || line.startsWith("*/")) continue;
        if (line.startsWith("//")) continue;
        return line;
    }
    return "";
}

function refineJsdocBlock(block, info) {
    const summary = buildSummary(info);
    const returnsText = buildReturns(info);

    const lines = block.split(/\r?\n/);
    const out = [];
    let replacedSummary = false;

    for (let i = 0; i < lines.length; i += 1) {
        let line = lines[i];
        const trimmed = line.trim();

        if (!replacedSummary && /^\*\s/.test(trimmed) && !trimmed.startsWith("* @") && trimmed !== "*" && trimmed !== "*/") {
            if (isGenericSummary(trimmed) || trimmed.startsWith("* Initializes") || trimmed.startsWith("* Returns")) {
                line = line.replace(/\*\s+.*/, ` * ${summary}`);
                replacedSummary = true;
            }
        }

        const paramMatch = line.match(/(@param\s+\{[^}]+\}\s+)([A-Za-z0-9_$]+)(\s+-\s+)(.*)$/);
        if (paramMatch) {
            const [, prefix, paramName, infix] = paramMatch;
            const description = PARAM_DESCRIPTIONS[paramName] || "Input argument";
            line = line.replace(paramMatch[0], `${prefix}${paramName}${infix}${description}.`);
        }

        const returnsMatch = line.match(/@returns?\s+\{[^}]+\}\s+(.*)$/);
        if (returnsMatch) {
            const existing = returnsMatch[1] || "";
            if (isGenericReturns(existing) || existing.startsWith("Result of") || existing.startsWith("Current")) {
                line = line.replace(/@returns?\s+\{[^}]+\}\s+.*/, `@returns {*} ${returnsText}`);
            }
        }

        out.push(line);
    }

    return out.join("\n");
}

async function walk(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath, files);
            continue;
        }
        if (!/\.(js|mjs)$/i.test(entry.name)) continue;
        files.push(fullPath);
    }
    return files;
}

async function main() {
    const targetDir = process.argv[2] || "forms/components";
    const files = await walk(targetDir);
    let updatedFiles = 0;

    for (const file of files) {
        const source = await fs.readFile(file, "utf8");
        let changed = false;
        let next = "";
        let last = 0;

        const re = /\/\*\*[\s\S]*?\*\//g;
        let match;
        while ((match = re.exec(source)) !== null) {
            const block = match[0];
            const start = match.index;
            const end = start + block.length;
            const signatureLine = findNextCodeLine(source, end);
            const info = signatureInfo(signatureLine);
            if (!isPublicMember(info)) continue;

            const refined = refineJsdocBlock(block, info);
            if (refined !== block) {
                next += source.slice(last, start);
                next += refined;
                last = end;
                changed = true;
            }
        }

        if (!changed) continue;
        next += source.slice(last);
        await fs.writeFile(file, next, "utf8");
        updatedFiles += 1;
    }

    console.log(`Refined public-method JSDoc in ${updatedFiles} file(s).`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
