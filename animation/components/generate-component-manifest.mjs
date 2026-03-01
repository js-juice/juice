import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(SCRIPT_DIR, "component-manifest.json");

function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...walk(fullPath));
            continue;
        }
        if (item.isFile() && fullPath.endsWith(".mjs") && item.name !== path.basename(fileURLToPath(import.meta.url))) {
            files.push(fullPath);
        }
    }
    return files;
}

function findBlock(source, startPattern, openChar = "{", closeChar = "}") {
    const start = source.indexOf(startPattern);
    if (start === -1) return null;

    const openIndex = source.indexOf(openChar, start);
    if (openIndex === -1) return null;

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

function findBalancedBlock(source, openIndex, openChar = "{", closeChar = "}") {
    if (openIndex === -1 || source[openIndex] !== openChar) return null;
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

function parseImports(source, filePath) {
    const imports = {};
    const regex = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];/g;
    let match = regex.exec(source);

    const register = (localName, importPath) => {
        if (!localName) return;
        const resolved = importPath.startsWith(".")
            ? path.resolve(path.dirname(filePath), importPath)
            : null;
        imports[localName] = resolved;
    };

    const parseNamed = (namedSpec, importPath) => {
        const inner = namedSpec.replace(/^\{/, "").replace(/\}$/, "");
        inner
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((entry) => {
                const alias = entry.split(/\s+as\s+/i).map((x) => x.trim());
                const localName = alias.length > 1 ? alias[1] : alias[0];
                register(localName, importPath);
            });
    };

    while (match) {
        const spec = match[1].trim();
        const importPath = match[2].trim();

        if (spec.startsWith("{")) {
            parseNamed(spec, importPath);
        } else if (spec.startsWith("* as ")) {
            register(spec.replace("* as ", "").trim(), importPath);
        } else if (spec.includes("{")) {
            const firstComma = spec.indexOf(",");
            const defaultSpec = spec.slice(0, firstComma).trim();
            register(defaultSpec, importPath);
            const namedSpec = spec.slice(firstComma + 1).trim();
            parseNamed(namedSpec, importPath);
        } else {
            register(spec, importPath);
        }

        match = regex.exec(source);
    }

    return imports;
}

function parseClassHeaderForTag(source) {
    const tagIndex = source.indexOf("static tag");
    const classRegex = /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^{\n]+))?\s*\{/gm;
    let match = classRegex.exec(source);
    let selected = null;

    while (match) {
        const entry = {
            className: match[1].trim(),
            extendsExpr: match[2] ? match[2].trim() : null,
            index: match.index,
        };
        if (tagIndex === -1) {
            return entry;
        }
        if (entry.index <= tagIndex) {
            selected = entry;
        } else {
            break;
        }
        match = classRegex.exec(source);
    }

    return selected;
}

function parsePropertyObjects(configBody) {
    const propertiesBlock = findBlock(configBody, "properties");
    if (!propertiesBlock) return [];

    const text = propertiesBlock.body;
    const parseDefaultValue = (raw) => {
        if (!raw) return null;
        const value = raw.trim();
        if (/^["'][\s\S]*["']$/.test(value)) return value.slice(1, -1);
        if (value === "true") return true;
        if (value === "false") return false;
        if (value === "null") return null;
        if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
        return value;
    };

    const entries = [];
    const propRegex = /([A-Za-z_$][\w$-]*)\s*:\s*\{/g;
    let match = propRegex.exec(text);
    while (match) {
        const name = match[1];
        const objectStart = match.index + match[0].length - 1;
        let depth = 1;
        let i = objectStart + 1;
        for (; i < text.length; i += 1) {
            const ch = text[i];
            if (ch === "{") depth += 1;
            if (ch === "}") depth -= 1;
            if (depth === 0) break;
        }
        const objectText = text.slice(objectStart + 1, i);
        const typeMatch = objectText.match(/type\s*:\s*["']([^"']+)["']/);
        const defaultMatch = objectText.match(/default\s*:\s*([^,\n}]+)/);
        const linkedMatch = objectText.match(/linked\s*:\s*(true|false)/);
        entries.push({
            name,
            type: typeMatch ? typeMatch[1] : null,
            default: parseDefaultValue(defaultMatch ? defaultMatch[1] : null),
            linked: linkedMatch ? linkedMatch[1] === "true" : null,
        });
        propRegex.lastIndex = i + 1;
        match = propRegex.exec(text);
    }
    return entries;
}

function parseObservedArrays(source) {
    const observedBlock = findBlock(source, "static get observed()");
    if (!observedBlock) return { all: [], attributes: [], properties: [] };

    const body = observedBlock.body;
    const extract = (key) => {
        const rx = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`);
        const m = body.match(rx);
        if (!m) return [];
        return m[1]
            .split(",")
            .map((x) => x.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
    };

    return {
        all: extract("all"),
        attributes: extract("attributes"),
        properties: extract("properties"),
    };
}

function parseJSDocDescription(lines, signatureLineIndex) {
    let i = signatureLineIndex - 1;
    while (i >= 0 && lines[i].trim() === "") i -= 1;
    if (i < 0 || !lines[i].trim().endsWith("*/")) return null;

    const block = [];
    while (i >= 0) {
        block.unshift(lines[i]);
        if (lines[i].trim().startsWith("/**")) break;
        i -= 1;
    }
    if (!block.length || !block[0].trim().startsWith("/**")) return null;

    const cleaned = block
        .map((line) => line.replace(/^\s*\/\*\*?/, "").replace(/\*\/\s*$/, "").replace(/^\s*\*\s?/, "").trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("@"));
    const useful = cleaned.find((line) => /[A-Za-z]/.test(line) && !/^[*#\-\s0-9a-f]{8,}$/i.test(line));
    return useful || null;
}

function describeFromName(name) {
    if (name.startsWith("on")) return `Lifecycle/event hook: ${name}.`;
    if (name.startsWith("add")) return `Adds ${name.slice(3).toLowerCase()} data or elements.`;
    if (name.startsWith("set")) return `Sets ${name.slice(3).toLowerCase()} values.`;
    if (name.startsWith("get")) return `Returns ${name.slice(3).toLowerCase()} data.`;
    if (name.startsWith("move")) return "Moves the component or its internal state.";
    if (name.startsWith("update")) return "Updates internal animation state.";
    if (name.startsWith("render")) return "Renders the component state to DOM/canvas.";
    if (name.startsWith("play")) return "Starts playback or animation progression.";
    if (name.startsWith("stop") || name.startsWith("pause")) return "Stops or pauses animation updates.";
    if (name.startsWith("next") || name.startsWith("prev")) return "Navigates animation frame state.";
    return `Performs the ${name} operation.`;
}

function findClassBody(source, targetClassName = null) {
    const classRegex = /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^{\n]+))?\s*\{/gm;
    let match = classRegex.exec(source);
    while (match) {
        const className = match[1].trim();
        if (!targetClassName || className === targetClassName) {
            const openIndex = match.index + match[0].lastIndexOf("{");
            return findBalancedBlock(source, openIndex);
        }
        match = classRegex.exec(source);
    }
    return null;
}

function parseMethodsFromClassBody(classBody) {
    const lines = classBody.split(/\r?\n/);
    const methods = [];
    const skipNames = new Set(["constructor", "if", "for", "while", "switch", "catch", "else", "return"]);
    const seen = new Set();
    const methodRegex = /^\s*(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;
    const stripStrings = (line) =>
        line
            .replace(/`[^`]*`/g, "``")
            .replace(/"[^"]*"/g, "\"\"")
            .replace(/'[^']*'/g, "''");

    let depth = 0; // depth within class body; 0 means class top-level
    let inBlockComment = false;
    for (let i = 0; i < lines.length; i += 1) {
        let rawLine = lines[i];

        if (inBlockComment) {
            const endIdx = rawLine.indexOf("*/");
            if (endIdx === -1) continue;
            rawLine = rawLine.slice(endIdx + 2);
            inBlockComment = false;
        }

        const blockCommentStart = rawLine.indexOf("/*");
        if (blockCommentStart !== -1) {
            const blockCommentEnd = rawLine.indexOf("*/", blockCommentStart + 2);
            if (blockCommentEnd === -1) {
                rawLine = rawLine.slice(0, blockCommentStart);
                inBlockComment = true;
            } else {
                rawLine = `${rawLine.slice(0, blockCommentStart)} ${rawLine.slice(blockCommentEnd + 2)}`;
            }
        }

        const withoutLineComment = rawLine.replace(/\/\/.*$/, "");
        if (depth === 0) {
            const match = withoutLineComment.match(methodRegex);
            if (match) {
                const name = match[1];
                if (!skipNames.has(name) && !name.startsWith("_")) {
                    const params = match[2]
                        .split(",")
                        .map((p) => p.trim())
                        .filter(Boolean)
                        .map((p) => p.split("=")[0].trim());
                    const key = `${name}(${params.join(",")})`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const jsdoc = parseJSDocDescription(lines, i);
                        methods.push({
                            name,
                            params,
                            description: jsdoc || describeFromName(name),
                        });
                    }
                }
            }
        }

        const line = stripStrings(withoutLineComment);
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        depth += opens - closes;
    }
    return methods;
}

function parseMethods(source, targetClassName = null) {
    const classBlock = findClassBody(source, targetClassName);
    if (!classBlock) return [];
    return parseMethodsFromClassBody(classBlock.body);
}

function dedupeAttributeNames(names) {
    return [...new Set(names.filter(Boolean))];
}

function parseComponentHTMLElementMethods(source) {
    const lines = source.split(/\r?\n/);
    const methods = [];
    const seen = new Set();
    const skipNames = new Set(["constructor", "if", "for", "while", "switch", "catch", "else", "return"]);
    const methodRegex = /^\s{12}(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;

    let inBlockComment = false;
    for (let i = 0; i < lines.length; i += 1) {
        let line = lines[i];
        if (inBlockComment) {
            if (line.includes("*/")) inBlockComment = false;
            continue;
        }

        const trimmed = line.trim();
        if (trimmed.startsWith("/*")) {
            if (!trimmed.includes("*/")) inBlockComment = true;
            continue;
        }

        const withoutLineComment = line.replace(/\/\/.*$/, "");
        const match = withoutLineComment.match(methodRegex);
        if (!match) continue;

        const name = match[1];
        if (skipNames.has(name) || name.startsWith("_")) continue;

        const params = (match[2] || "")
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.split("=")[0].trim());
        const key = `${name}(${params.join(",")})`;
        if (seen.has(key)) continue;
        seen.add(key);

        const jsdoc = parseJSDocDescription(lines, i);
        methods.push({
            name,
            params,
            description: jsdoc || describeFromName(name),
        });
    }

    return methods;
}

function resolveBaseComponent(source, filePath, classInfo, imports) {
    if (!classInfo || !classInfo.extendsExpr) return null;

    const extendsExpr = classInfo.extendsExpr;
    const simpleName = extendsExpr.split(".")[0].trim();
    const resolvedFile = imports[simpleName] || null;
    const repoRoot = path.resolve(SCRIPT_DIR, "..", "..");

    const baseComponent = {
        name: extendsExpr,
        file: resolvedFile ? path.relative(repoRoot, resolvedFile).replace(/\\/g, "/") : null,
        methods: [],
    };

    if (extendsExpr.includes(".")) {
        if (simpleName === "Component" && resolvedFile && fs.existsSync(resolvedFile)) {
            try {
                const componentSource = fs.readFileSync(resolvedFile, "utf8");
                baseComponent.methods = parseComponentHTMLElementMethods(componentSource);
            } catch {
                baseComponent.methods = [];
            }
            return baseComponent;
        }

        if (resolvedFile && fs.existsSync(resolvedFile)) {
            try {
                const baseSource = fs.readFileSync(resolvedFile, "utf8");
                const memberName = extendsExpr.split(".").pop().trim();
                let methods = parseMethods(baseSource, memberName);
                if (!methods.length) methods = parseMethods(baseSource);
                baseComponent.methods = methods;
            } catch {
                baseComponent.methods = [];
            }
        }
        return baseComponent;
    }

    const candidateFile = resolvedFile || filePath;
    if (!candidateFile || !fs.existsSync(candidateFile)) {
        return baseComponent;
    }

    try {
        const baseSource = fs.readFileSync(candidateFile, "utf8");
        let methods = parseMethods(baseSource, simpleName);
        if (!methods.length) methods = parseMethods(baseSource);
        baseComponent.methods = methods;
    } catch {
        baseComponent.methods = [];
    }

    return baseComponent;
}

function parseComponent(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    if (!source.includes("customElements.define(")) return null;

    const tagMatch = source.match(/static\s+tag\s*=\s*["']([^"']+)["']/);
    if (!tagMatch) return null;
    const tag = tagMatch[1];
    const imports = parseImports(source, filePath);
    const classInfo = parseClassHeaderForTag(source);

    const configBlock = findBlock(source, "static config");
    const configProps = configBlock ? parsePropertyObjects(configBlock.body) : [];
    const observed = parseObservedArrays(source);

    const attributes = dedupeAttributeNames([
        ...configProps.map((p) => p.name),
        ...observed.all,
        ...observed.attributes,
        ...observed.properties,
    ]).map((name) => {
        const fromConfig = configProps.find((p) => p.name === name);
        return {
            name,
            type: fromConfig?.type || null,
            default: fromConfig?.default ?? null,
            linked: fromConfig?.linked ?? null,
        };
    });

    const methods = parseMethods(source, classInfo?.className || null);
    const baseComponent = resolveBaseComponent(source, filePath, classInfo, imports);
    const repoRoot = path.resolve(SCRIPT_DIR, "..", "..");

    return {
        tag,
        file: path.relative(repoRoot, filePath).replace(/\\/g, "/"),
        extends: classInfo?.extendsExpr || null,
        baseComponent,
        attributes,
        methods,
    };
}

const files = walk(SCRIPT_DIR);
const components = files.map(parseComponent).filter(Boolean).sort((a, b) => a.tag.localeCompare(b.tag));
const componentsByTag = {};
for (const component of components) {
    const { tag, ...rest } = component;
    componentsByTag[tag] = rest;
}

const manifest = {
    generatedAt: new Date().toISOString(),
    root: "animation/components",
    count: components.length,
    componentsByTag,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUTPUT} (${components.length} components)`);
