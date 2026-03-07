#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function describeMethod(methodName, signatureLine = "") {
    const name = String(methodName || "").trim();
    const signature = String(signatureLine || "").trim();

    if (name === "constructor") return "Initializes component state, DOM references, and event bindings.";
    if (name === "connectedCallback") return "Runs setup logic when the element is connected to the document.";
    if (name === "disconnectedCallback") return "Cleans up listeners and observers when the element is disconnected.";
    if (name === "attributeChangedCallback") return "Responds to observed attribute changes and synchronizes state.";
    if (name === "observedAttributes") return "Lists attributes that are observed for runtime updates.";

    if (signature.startsWith("get ")) {
        return `Returns the current \`${name}\` value.`;
    }
    if (signature.startsWith("set ")) {
        return `Updates the \`${name}\` value.`;
    }

    if (name.startsWith("_render")) return "Builds or updates the component's rendered UI.";
    if (name.startsWith("_sync")) return "Synchronizes component state between attributes, DOM, and internals.";
    if (name.startsWith("_bind")) return "Attaches event handlers used by the component.";
    if (name.startsWith("_on")) return "Handles a component event or user interaction.";
    if (name.startsWith("_create")) return "Creates and returns a required DOM/native control node.";
    if (name.startsWith("_get")) return "Computes and returns derived component state.";
    if (name.startsWith("_set")) return "Updates internal component state and applies side effects.";
    if (name.startsWith("_parse")) return "Parses incoming values into a normalized internal representation.";
    if (name.startsWith("_normalize")) return "Normalizes incoming values into a safe internal form.";
    if (name.startsWith("_apply")) return "Applies computed state to the rendered component.";
    if (name.startsWith("_collect")) return "Collects component data from attributes and child nodes.";
    if (name.startsWith("_resolve")) return "Resolves effective configuration from attributes and defaults.";

    return `Implements \`${name}\` for this component.`;
}

function describeParam(paramName) {
    const name = String(paramName || "").trim().toLowerCase();
    if (!name) return "Input argument.";
    if (name === "name") return "Attribute or field name.";
    if (name === "oldvalue") return "Previous value.";
    if (name === "newvalue") return "Next value.";
    if (name === "value") return "Assigned value.";
    if (name === "event" || name === "ev") return "Event payload.";
    if (name === "detail") return "Event detail payload.";
    if (name === "target") return "Target element or node.";
    if (name === "source") return "Source element or input.";
    if (name === "field") return "Field element being processed.";
    if (name === "state") return "State value.";
    if (name === "fallback") return "Fallback value used when input is invalid.";
    if (name === "options" || name === "param2") return "Options object.";
    return "Input argument.";
}

function describeReturns(methodName, signatureLine = "") {
    const name = String(methodName || "").trim();
    const signature = String(signatureLine || "").trim();
    if (name === "observedAttributes") return "List of observed attribute names.";
    if (name === "constructor") return "Initialized instance.";
    if (signature.startsWith("get ")) return `Current \`${name}\` value.`;
    if (name.startsWith("_get") || name.startsWith("_parse") || name.startsWith("_resolve")) return "Derived value.";
    if (name.startsWith("_render")) return "Rendered output.";
    return "Operation result.";
}

async function walk(dir, out = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath, out);
            continue;
        }
        if (!/\.(js|mjs)$/i.test(entry.name)) continue;
        out.push(fullPath);
    }
    return out;
}

function findNextSignatureLine(content, fromIndex) {
    const tail = content.slice(fromIndex);
    const lines = tail.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith("/**") || line.startsWith("*") || line.startsWith("*/")) continue;
        return line;
    }
    return "";
}

function refineBlock(block, methodName, signatureLine) {
    const lines = block.split(/\r?\n/);
    const summary = describeMethod(methodName, signatureLine);
    const returns = describeReturns(methodName, signatureLine);

    const refined = lines.map((line) => {
        if (line.includes("* Executes ")) {
            return line.replace(/\* Executes [^.]+\./, `* ${summary}`);
        }

        const paramMatch = line.match(/(@param\s+\{\*\}\s+)([A-Za-z0-9_]+)(\s+-\s+)Parameter value\./);
        if (paramMatch) {
            const [, prefix, paramName, infix] = paramMatch;
            return line.replace(paramMatch[0], `${prefix}${paramName}${infix}${describeParam(paramName)}.`);
        }

        if (/@returns\s+\{\*\}\s+Result of [^.]+\./.test(line)) {
            return line.replace(/@returns\s+\{\*\}\s+Result of [^.]+\./, `@returns {*} ${returns}`);
        }

        if (/@returns\s+\{\*\}\s+[^.]+\s+value\./.test(line)) {
            return line.replace(/@returns\s+\{\*\}\s+[^.]+\s+value\./, `@returns {*} ${returns}`);
        }

        return line;
    });

    return refined.join("\n");
}

async function main() {
    const targetDir = process.argv[2] || "forms/components";
    const files = await walk(targetDir);
    let updated = 0;

    for (const file of files) {
        const source = await fs.readFile(file, "utf8");
        let changed = false;
        let next = "";
        let lastIndex = 0;

        const regex = /\/\*\*[\s\S]*?\*\//g;
        let match;
        while ((match = regex.exec(source)) !== null) {
            const block = match[0];
            const start = match.index;
            const end = start + block.length;

            if (!block.includes("* Executes ")) continue;

            const methodMatch = block.match(/\* Executes ([^.]+)\./);
            const methodName = methodMatch ? methodMatch[1].trim() : "";
            const signatureLine = findNextSignatureLine(source, end);
            const replacement = refineBlock(block, methodName, signatureLine);

            next += source.slice(lastIndex, start);
            next += replacement;
            lastIndex = end;
            changed = true;
        }

        if (!changed) continue;
        next += source.slice(lastIndex);
        await fs.writeFile(file, next, "utf8");
        updated += 1;
    }

    console.log(`Refined generic method JSDoc in ${updated} file(s).`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
