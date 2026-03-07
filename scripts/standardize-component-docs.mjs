import fs from "node:fs";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".js", ".mjs", ".ts"]);
const HEADER_START = "AUTODOC:START";
const HEADER_END = "AUTODOC:END";

function toPosix(value) {
    return value.replace(/\\/g, "/");
}

function walkFiles(rootDir) {
    const files = [];
    const queue = [rootDir];
    while (queue.length) {
        const dir = queue.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === "node_modules" || entry.name === ".git") continue;
                queue.push(fullPath);
                continue;
            }
            if (!entry.isFile()) continue;
            if (!SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
            files.push(fullPath);
        }
    }
    return files;
}

function findBalancedBlock(source, openIndex, openChar = "{", closeChar = "}") {
    if (openIndex < 0 || source[openIndex] !== openChar) return null;
    let depth = 0;
    for (let i = openIndex; i < source.length; i += 1) {
        const ch = source[i];
        if (ch === openChar) depth += 1;
        if (ch === closeChar) depth -= 1;
        if (depth === 0) {
            return { start: openIndex, end: i, body: source.slice(openIndex + 1, i) };
        }
    }
    return null;
}

function findComponentDefinition(source) {
    const defineRegex =
        /customElements\.define\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z_$][\w$]*)\s*[\),]/g;
    const match = defineRegex.exec(source);
    if (!match) return null;
    return { tag: match[1], className: match[2] };
}

function findClassDeclaration(source, className) {
    const regex = new RegExp(
        String.raw`^\s*(?:export\s+)?class\s+${className}\b(?:\s+extends\s+([^{\n]+))?\s*\{`,
        "m"
    );
    const match = regex.exec(source);
    if (!match) return null;
    const openIndex = match.index + match[0].lastIndexOf("{");
    const block = findBalancedBlock(source, openIndex);
    if (!block) return null;
    return {
        extendsExpr: match[1] ? match[1].trim() : null,
        startIndex: match.index,
        openIndex,
        closeIndex: block.end,
        body: block.body,
    };
}

function extractStringLiterals(source) {
    const values = [];
    const stringRegex = /["'`]([A-Za-z0-9_:\-.]+)["'`]/g;
    let match = stringRegex.exec(source);
    while (match) {
        values.push(match[1]);
        match = stringRegex.exec(source);
    }
    return values;
}

function parseObservedAttributes(classBody) {
    const observed = new Set();
    const getterRegex = /static\s+get\s+observedAttributes\s*\(\s*\)\s*\{/m;
    const getterMatch = getterRegex.exec(classBody);
    if (!getterMatch) return observed;

    const openIndex = getterMatch.index + getterMatch[0].length - 1;
    const block = findBalancedBlock(classBody, openIndex);
    if (!block) return observed;

    const returnIndex = block.body.indexOf("return");
    const searchIndex = returnIndex === -1 ? 0 : returnIndex;
    const arrayStart = block.body.indexOf("[", searchIndex);
    if (arrayStart === -1) return observed;
    const arrayBlock = findBalancedBlock(block.body, arrayStart, "[", "]");
    if (!arrayBlock) return observed;

    for (const literal of extractStringLiterals(arrayBlock.body)) observed.add(literal);
    return observed;
}

function parseObservedObjectArrays(classBody) {
    const observed = new Set();
    const getterRegex = /static\s+get\s+observed\s*\(\s*\)\s*\{/m;
    const getterMatch = getterRegex.exec(classBody);
    if (!getterMatch) return observed;
    const openIndex = getterMatch.index + getterMatch[0].length - 1;
    const block = findBalancedBlock(classBody, openIndex);
    if (!block) return observed;

    const keys = ["attributes", "properties", "all"];
    for (const key of keys) {
        const keyIndex = block.body.indexOf(`${key}`);
        if (keyIndex === -1) continue;
        const arrayStart = block.body.indexOf("[", keyIndex);
        if (arrayStart === -1) continue;
        const arrayBlock = findBalancedBlock(block.body, arrayStart, "[", "]");
        if (!arrayBlock) continue;
        for (const literal of extractStringLiterals(arrayBlock.body)) observed.add(literal);
    }
    return observed;
}

function parseStaticConfigProperties(classBody) {
    const props = new Map();
    const configIndex = classBody.indexOf("static config");
    if (configIndex === -1) return props;

    const objectStart = classBody.indexOf("{", configIndex);
    if (objectStart === -1) return props;
    const configBlock = findBalancedBlock(classBody, objectStart);
    if (!configBlock) return props;

    const propertiesIndex = configBlock.body.indexOf("properties");
    if (propertiesIndex === -1) return props;
    const propertiesStart = configBlock.body.indexOf("{", propertiesIndex);
    if (propertiesStart === -1) return props;
    const propertiesBlock = findBalancedBlock(configBlock.body, propertiesStart);
    if (!propertiesBlock) return props;

    const propRegex = /([A-Za-z_$][\w$-]*)\s*:\s*\{/g;
    let match = propRegex.exec(propertiesBlock.body);
    while (match) {
        const name = match[1];
        const valueStart = match.index + match[0].length - 1;
        const valueBlock = findBalancedBlock(propertiesBlock.body, valueStart);
        if (!valueBlock) {
            match = propRegex.exec(propertiesBlock.body);
            continue;
        }
        const typeMatch = valueBlock.body.match(/type\s*:\s*["'`]([^"'`]+)["'`]/);
        const defaultMatch = valueBlock.body.match(/default\s*:\s*([^,\n}]+)/);
        props.set(name, {
            type: typeMatch ? typeMatch[1] : null,
            default: defaultMatch ? defaultMatch[1].trim() : null,
        });
        propRegex.lastIndex = valueBlock.end + 1;
        match = propRegex.exec(propertiesBlock.body);
    }
    return props;
}

function parseAccessorProperties(classBody) {
    const props = new Set();
    const accessorRegex = /^\s*(?:static\s+)?(?:get|set)\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let match = accessorRegex.exec(classBody);
    while (match) {
        const name = match[1];
        if (name.startsWith("_")) {
            match = accessorRegex.exec(classBody);
            continue;
        }
        props.add(name);
        match = accessorRegex.exec(classBody);
    }
    return props;
}

function describeAttribute(name) {
    const key = String(name || "").toLowerCase();
    if (key.includes("min")) return "Minimum allowed value.";
    if (key.includes("max")) return "Maximum allowed value.";
    if (key.includes("step")) return "Step increment/decrement size.";
    if (key.includes("label")) return "Visible label text.";
    if (key.includes("value")) return "Current value or value-related setting.";
    if (key.includes("offset")) return "Position/angle offset configuration.";
    if (key.includes("size")) return "Component size configuration.";
    if (key.includes("options")) return "Option set used by the component.";
    if (key.includes("disabled")) return "Disables user interaction.";
    if (key.includes("required")) return "Marks input as required.";
    return `Controls the ${name} setting.`;
}

function describeProperty(name) {
    const key = String(name || "").toLowerCase();
    if (key === "value") return "Reads or updates the component value.";
    if (key === "disabled") return "Reads or updates disabled state.";
    if (key === "checked") return "Reads or updates checked state.";
    if (key === "format") return "Reads or updates formatting behavior.";
    return `Reads or updates ${name}.`;
}

function detectFeatures(classBody, attributes) {
    const features = [];
    const add = (name, description) => {
        if (features.some((feature) => feature.name === name)) return;
        features.push({ name, description });
    };

    if (attributes.length) {
        add("Configurable Attributes", "Supports attribute-driven runtime configuration.");
    }
    if (/pointerdown|pointermove|pointerup/.test(classBody)) {
        add("Pointer Interaction", "Supports pointer/mouse interactions.");
    }
    if (/keydown|onKeyDown|ArrowLeft|ArrowRight|ArrowUp|ArrowDown/.test(classBody)) {
        add("Keyboard Interaction", "Supports keyboard interactions.");
    }
    if (/wheel|deltaY|wheelDelta/.test(classBody)) {
        add("Wheel Interaction", "Supports mouse wheel interactions.");
    }
    if (/dispatchEvent\s*\(\s*new\s+CustomEvent\(/.test(classBody)) {
        add("Custom Events", "Emits custom events for host integrations.");
    }
    if (/attributeChangedCallback/.test(classBody)) {
        add("Reactive Attributes", "Reacts to attribute changes at runtime.");
    }
    if (/connectedCallback|disconnectedCallback/.test(classBody)) {
        add("Lifecycle Hooks", "Uses custom-element lifecycle hooks.");
    }
    if (/_renderDefault|render\(/.test(classBody)) {
        add("Custom Rendering", "Renders custom UI beyond default native controls.");
    }
    return features;
}

function summarizeComponent(tag, className) {
    const normalized = String(tag || className || "component").replace(/-/g, " ");
    return `Custom element <${tag}> for ${normalized} behavior.`;
}

function buildExample(tag, attributes) {
    const keys = ["label", "value", "min", "max", "step", "offset", "options"];
    const picked = [];
    for (const key of keys) {
        const match = attributes.find((attr) => attr.name === key);
        if (match) picked.push(match.name);
    }
    for (const attr of attributes) {
        if (picked.length >= 4) break;
        if (picked.includes(attr.name)) continue;
        picked.push(attr.name);
    }
    if (!picked.length) return `<${tag}></${tag}>`;
    return `<${tag} ${picked.map((name) => `${name}="..."`).join(" ")}></${tag}>`;
}

function parseParamNames(rawParams) {
    if (!rawParams) return [];
    return rawParams
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token, index) => {
            const noDefault = token.split("=")[0].trim();
            if (noDefault.startsWith("{") || noDefault.startsWith("[")) return `param${index + 1}`;
            return noDefault.replace(/^\.{3}/, "");
        });
}

function describeMethod(name) {
    if (name === "constructor") return "Initializes component state and bindings.";
    if (name.startsWith("on")) return `Handles ${name.slice(2)} workflow.`;
    if (name.startsWith("set")) return `Sets ${name.slice(3)} values.`;
    if (name.startsWith("get")) return `Returns ${name.slice(3)} data.`;
    if (name.startsWith("render")) return "Renders component UI state.";
    if (name.startsWith("sync")) return "Synchronizes internal and external state.";
    if (name.startsWith("update")) return "Updates internal state from current inputs.";
    return `Executes ${name}.`;
}

function hasDocBlockAbove(linesOut) {
    let i = linesOut.length - 1;
    while (i >= 0 && linesOut[i].trim() === "") i -= 1;
    if (i < 0) return false;
    if (!linesOut[i].trim().endsWith("*/")) return false;
    while (i >= 0) {
        const trimmed = linesOut[i].trim();
        if (trimmed.startsWith("/**")) return true;
        if (trimmed.startsWith("*") || trimmed.endsWith("*/")) {
            i -= 1;
            continue;
        }
        return false;
    }
    return false;
}

function annotateClassMethods(source, className) {
    const lines = source.split(/\r?\n/);
    const classLineRegex = new RegExp(String.raw`^\s*(?:export\s+)?class\s+${className}\b`);
    const methodRegex =
        /^\s*(?:static\s+)?(?:async\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;

    const out = [];
    let inTargetClass = false;
    let classDepth = 0;

    const stripStringsAndComments = (line) =>
        line
            .replace(/\/\/.*$/, "")
            .replace(/`[^`]*`/g, "``")
            .replace(/"[^"]*"/g, "\"\"")
            .replace(/'[^']*'/g, "''");

    for (let idx = 0; idx < lines.length; idx += 1) {
        const line = lines[idx];
        if (!inTargetClass && classLineRegex.test(line)) {
            inTargetClass = true;
            const clean = stripStringsAndComments(line);
            classDepth += (clean.match(/\{/g) || []).length - (clean.match(/\}/g) || []).length;
            out.push(line);
            continue;
        }

        if (inTargetClass && classDepth === 1) {
            const methodMatch = line.match(methodRegex);
            if (methodMatch) {
                const accessorKind = methodMatch[1] || null;
                const methodName = methodMatch[2];
                const rawParams = methodMatch[3] || "";
                if (!hasDocBlockAbove(out)) {
                    const indent = line.match(/^\s*/)[0];
                    const params = parseParamNames(rawParams);
                    const docLines = [
                        `${indent}/**`,
                        `${indent} * ${describeMethod(methodName)}`,
                    ];
                    if (accessorKind === "get") {
                        docLines.push(`${indent} * @returns {*} ${methodName} value.`);
                    } else {
                        for (const paramName of params) {
                            docLines.push(`${indent} * @param {*} ${paramName} - Parameter value.`);
                        }
                        docLines.push(`${indent} * @returns {*} Result of ${methodName}.`);
                    }
                    docLines.push(`${indent} */`);
                    out.push(...docLines);
                }
            }
        }

        out.push(line);
        if (inTargetClass) {
            const clean = stripStringsAndComments(line);
            classDepth += (clean.match(/\{/g) || []).length - (clean.match(/\}/g) || []).length;
            if (classDepth <= 0) inTargetClass = false;
        }
    }

    return out.join("\n");
}

function buildHeaderBlock(componentInfo) {
    const features = componentInfo.features.length
        ? componentInfo.features.map((feature) => ` * - ${feature.name}: ${feature.description}`)
        : [" * - None detected."];

    const attributes = componentInfo.attributes.length
        ? componentInfo.attributes.map(
              (attr) => ` * - \`${attr.name}\`${attr.type ? ` (${attr.type})` : ""}: ${attr.description}`
          )
        : [" * - None."];

    const properties = componentInfo.properties.length
        ? componentInfo.properties.map((prop) => ` * - \`${prop.name}\`: ${prop.description}`)
        : [" * - None."];

    return [
        "/**",
        ` * ${HEADER_START}`,
        ` * Component: <${componentInfo.tag}>`,
        ` * Class: ${componentInfo.className}`,
        ` * Overview: ${componentInfo.overview}`,
        " *",
        " * Features:",
        ...features,
        " *",
        " * Example:",
        ` * \`${componentInfo.example}\``,
        " *",
        " * Attribute Reference:",
        ...attributes,
        " *",
        " * Property Reference:",
        ...properties,
        ` * ${HEADER_END}`,
        " */",
    ].join("\n");
}

function upsertHeader(source, headerBlock) {
    const startIndex = source.indexOf(HEADER_START);
    const endIndex = source.indexOf(HEADER_END);
    if (startIndex !== -1 && endIndex !== -1) {
        const commentStart = source.lastIndexOf("/**", startIndex);
        const commentEnd = source.indexOf("*/", endIndex);
        if (commentStart !== -1 && commentEnd !== -1) {
            const before = source.slice(0, commentStart).replace(/\s*$/, "");
            const after = source.slice(commentEnd + 2).replace(/^\s*/, "\n\n");
            return `${before}\n\n${headerBlock}${after}`;
        }
    }

    const importIndex = source.search(/^\s*import\s/m);
    if (importIndex === -1) return `${headerBlock}\n\n${source}`;
    return `${source.slice(0, importIndex)}${headerBlock}\n\n${source.slice(importIndex)}`;
}

function buildComponentDocModel(source, filePath) {
    const definition = findComponentDefinition(source);
    if (!definition) return null;
    const classDecl = findClassDeclaration(source, definition.className);
    if (!classDecl) return null;

    const observed = new Set([
        ...parseObservedAttributes(classDecl.body),
        ...parseObservedObjectArrays(classDecl.body),
    ]);
    const configProps = parseStaticConfigProperties(classDecl.body);
    for (const key of configProps.keys()) observed.add(key);
    const accessorProps = parseAccessorProperties(classDecl.body);

    const attributes = [...observed]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
            name,
            description: describeAttribute(name),
            type: configProps.get(name)?.type || null,
        }));

    const properties = [...accessorProps].sort((a, b) => a.localeCompare(b)).map((name) => ({
        name,
        description: describeProperty(name),
    }));

    const features = detectFeatures(classDecl.body, attributes);

    return {
        tag: definition.tag,
        className: definition.className,
        file: toPosix(filePath),
        overview: summarizeComponent(definition.tag, definition.className),
        features,
        attributes,
        properties,
        example: buildExample(definition.tag, attributes),
    };
}

function processFile(filePath) {
    const original = fs.readFileSync(filePath, "utf8");
    const model = buildComponentDocModel(original, filePath);
    if (!model) return { changed: false, skipped: true };

    let next = upsertHeader(original, buildHeaderBlock(model));
    next = annotateClassMethods(next, model.className);

    if (next === original) return { changed: false, skipped: false };
    fs.writeFileSync(filePath, next, "utf8");
    return { changed: true, skipped: false };
}

function main() {
    const rawTarget = process.argv[2];
    if (!rawTarget) {
        console.error("Usage: node scripts/standardize-component-docs.mjs <directory>");
        process.exit(1);
    }
    const targetDir = path.resolve(process.cwd(), rawTarget);
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        console.error(`Target directory does not exist: ${targetDir}`);
        process.exit(1);
    }

    const files = walkFiles(targetDir);
    let changed = 0;
    let skipped = 0;
    for (const filePath of files) {
        const result = processFile(filePath);
        if (result.skipped) {
            skipped += 1;
            continue;
        }
        if (result.changed) changed += 1;
    }
    console.log(
        `Processed ${files.length} files in ${toPosix(targetDir)}. Updated ${changed} component files. Skipped ${skipped}.`
    );
}

main();
