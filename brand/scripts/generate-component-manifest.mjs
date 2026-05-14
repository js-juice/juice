import fs from "node:fs";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".js", ".mjs", ".ts"]);
const OUTPUT_FILE = "component-manifest.json";

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
            return {
                start: openIndex,
                end: i,
                body: source.slice(openIndex + 1, i),
            };
        }
    }
    return null;
}

function findClassBodies(source) {
    const classMap = new Map();
    const classRegex = /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+[^{\n]+)?\s*\{/gm;
    let match = classRegex.exec(source);
    while (match) {
        const className = match[1];
        const openIndex = match.index + match[0].lastIndexOf("{");
        const block = findBalancedBlock(source, openIndex);
        if (block) classMap.set(className, block.body);
        match = classRegex.exec(source);
    }
    return classMap;
}

function findTagDefinitions(source) {
    const pairs = [];
    const defineRegex =
        /customElements\.define\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z_$][\w$]*)\s*[\),]/g;
    let match = defineRegex.exec(source);
    while (match) {
        pairs.push({ tag: match[1], className: match[2] });
        match = defineRegex.exec(source);
    }
    return pairs;
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

    const literals = extractStringLiterals(arrayBlock.body);
    for (const literal of literals) {
        observed.add(literal);
    }
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
        const literals = extractStringLiterals(arrayBlock.body);
        for (const literal of literals) observed.add(literal);
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

function summarizeComponent(tagName, className) {
    const cleanTag = String(tagName || "").replace(/-/g, " ").trim();
    const cleanClass = String(className || "").replace(/Component$/i, "").trim();
    const noun = cleanTag || cleanClass || "component";
    return `Custom element <${tagName}> providing ${noun} behavior.`;
}

function describeAttribute(name) {
    const key = String(name || "").toLowerCase();
    if (key.includes("min")) return "Minimum allowed value.";
    if (key.includes("max")) return "Maximum allowed value.";
    if (key.includes("step")) return "Step size used for value changes.";
    if (key.includes("label")) return "Visible label text.";
    if (key.includes("value")) return "Current value or value-related setting.";
    if (key.includes("offset")) return "Angular/position offset configuration.";
    if (key.includes("size")) return "Component size setting.";
    if (key.includes("option")) return "List or mode options for the component.";
    if (key.includes("disabled")) return "Disables user interaction.";
    if (key.includes("required")) return "Marks input as required.";
    return `Controls the ${name} setting.`;
}

function buildExample(tagName, attributes) {
    const priority = ["label", "value", "min", "max", "step", "offset", "options"];
    const used = [];
    for (const key of priority) {
        const found = attributes.find((attr) => attr.name === key);
        if (found) used.push(found);
    }
    for (const attr of attributes) {
        if (used.length >= 4) break;
        if (used.some((entry) => entry.name === attr.name)) continue;
        used.push(attr);
    }

    const rendered = used.map((attr) => {
        if (attr.default && attr.default !== "null" && attr.default !== "undefined") {
            const normalized = String(attr.default).replace(/^["'`](.*)["'`]$/s, "$1");
            return `${attr.name}="${normalized}"`;
        }
        return `${attr.name}="..."`;
    });

    if (!rendered.length) return `<${tagName}></${tagName}>`;
    return `<${tagName} ${rendered.join(" ")}></${tagName}>`;
}

function detectFeatures(classBody, attributes) {
    const features = [];
    const add = (name, description) => {
        if (!name || !description) return;
        if (features.some((feature) => feature.name === name)) return;
        features.push({ name, description });
    };

    if (attributes.length) {
        const sample = attributes
            .slice(0, 5)
            .map((attribute) => attribute.name)
            .join(", ");
        add(
            "Configurable Attributes",
            `Supports ${attributes.length} configurable attributes (for example: ${sample}).`
        );
    }

    if (/pointerdown|pointermove|pointerup/.test(classBody)) {
        add("Pointer Interaction", "Supports pointer/mouse interactions for direct manipulation.");
    }
    if (/keydown|onKeyDown|ArrowLeft|ArrowRight|ArrowUp|ArrowDown/.test(classBody)) {
        add("Keyboard Interaction", "Supports keyboard-based control and navigation.");
    }
    if (/wheel|deltaY|wheelDelta/.test(classBody)) {
        add("Wheel Interaction", "Supports mouse wheel adjustments.");
    }
    if (/querySelectorAll\(\s*["'`]option["'`]\s*\)|getAttribute\(\s*["'`]options["'`]\s*\)/.test(classBody)) {
        add("Options Input", "Can read option values from child <option> elements or options attributes.");
    }
    if (/dispatchEvent\s*\(\s*new\s+CustomEvent\(/.test(classBody)) {
        const names = [];
        const eventRegex = /new\s+CustomEvent\(\s*["'`]([^"'`]+)["'`]/g;
        let match = eventRegex.exec(classBody);
        while (match) {
            names.push(match[1]);
            match = eventRegex.exec(classBody);
        }
        const unique = [...new Set(names)];
        if (unique.length) {
            add(
                "Custom Events",
                `Emits custom events (${unique.slice(0, 6).join(", ")}${unique.length > 6 ? ", ..." : ""}).`
            );
        } else {
            add("Custom Events", "Emits custom events for host integrations.");
        }
    }
    if (/static\s+get\s+formAssociated/.test(classBody)) {
        add("Form Association", "Participates in form-associated custom element behavior.");
    }
    if (/attributeChangedCallback/.test(classBody)) {
        add("Reactive Attributes", "Responds to runtime attribute changes.");
    }
    if (/connectedCallback|disconnectedCallback/.test(classBody)) {
        add("Lifecycle Hooks", "Uses custom-element lifecycle callbacks.");
    }
    if (/_renderDefault|render\(/.test(classBody)) {
        add("Custom Rendering", "Renders custom visual structure beyond native inputs.");
    }

    return features;
}

function parseComponentFile(filePath, rootDir) {
    const source = fs.readFileSync(filePath, "utf8");
    const definitions = findTagDefinitions(source);
    if (!definitions.length) return [];

    const classBodies = findClassBodies(source);
    const components = [];
    for (const definition of definitions) {
        const classBody = classBodies.get(definition.className) || "";
        const observed = new Set([
            ...parseObservedAttributes(classBody),
            ...parseObservedObjectArrays(classBody),
        ]);
        const configProps = parseStaticConfigProperties(classBody);
        for (const key of configProps.keys()) observed.add(key);

        const attributes = [...observed]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => {
                const metadata = configProps.get(name) || {};
                return {
                    name,
                    type: metadata.type || null,
                    default: metadata.default || null,
                    description: describeAttribute(name),
                };
            });

        components.push({
            tag: definition.tag,
            className: definition.className,
            file: toPosix(path.relative(rootDir, filePath)),
            overview: summarizeComponent(definition.tag, definition.className),
            attributes,
            features: detectFeatures(classBody, attributes),
            example: buildExample(definition.tag, attributes),
        });
    }
    return components;
}

function generateManifest(targetDir) {
    const files = walkFiles(targetDir);
    const components = files
        .flatMap((filePath) => parseComponentFile(filePath, targetDir))
        .sort((a, b) => a.tag.localeCompare(b.tag));

    return {
        generatedAt: new Date().toISOString(),
        targetDirectory: toPosix(targetDir),
        componentCount: components.length,
        components,
    };
}

function main() {
    const rawTarget = process.argv[2];
    if (!rawTarget) {
        console.error("Usage: node scripts/generate-component-manifest.mjs <directory>");
        process.exit(1);
    }

    const targetDir = path.resolve(process.cwd(), rawTarget);
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        console.error(`Target directory does not exist: ${targetDir}`);
        process.exit(1);
    }

    const manifest = generateManifest(targetDir);
    const outputPath = path.join(targetDir, OUTPUT_FILE);
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Wrote ${outputPath} (${manifest.componentCount} components)`);
}

main();
