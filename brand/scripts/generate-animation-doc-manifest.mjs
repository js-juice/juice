#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".js", ".mjs"]);

function toPosix(value) {
    return value.replace(/\\/g, "/");
}

function walk(rootDir, files = []) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === ".git" || entry.name === "node_modules") continue;
            walk(fullPath, files);
            continue;
        }
        if (!entry.isFile()) continue;
        if (!SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        files.push(fullPath);
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

function extractOverview(source, fallback) {
    const docMatch = source.match(/\/\*\*([\s\S]*?)\*\//m);
    if (!docMatch) return fallback;
    const lines = docMatch[1]
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*\*\s?/, "").trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("@") && !line.startsWith("AUTODOC:"));
    if (!lines.length) return fallback;
    return lines[0];
}

function parseExports(source) {
    const exports = [];
    const add = (kind, name) => {
        if (!name) return;
        if (exports.some((entry) => entry.name === name && entry.kind === kind)) return;
        exports.push({ kind, name });
    };

    for (const match of source.matchAll(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)/g)) {
        add("default-class", match[1]);
    }
    for (const match of source.matchAll(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g)) {
        add("default-function", match[1]);
    }
    if (/export\s+default\s+/.test(source)) {
        add("default", "default");
    }
    for (const match of source.matchAll(/export\s+class\s+([A-Za-z_$][\w$]*)/g)) {
        add("class", match[1]);
    }
    for (const match of source.matchAll(/export\s+function\s+([A-Za-z_$][\w$]*)/g)) {
        add("function", match[1]);
    }
    for (const match of source.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
        add("variable", match[1]);
    }
    for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
        const body = match[1] || "";
        const tokens = body
            .split(",")
            .map((token) => token.trim())
            .filter(Boolean);
        for (const token of tokens) {
            const alias = token.split(/\s+as\s+/i).map((item) => item.trim());
            add("named", alias[1] || alias[0]);
        }
    }
    return exports;
}

function parseCustomElementsTags(source) {
    const tags = [];
    for (const match of source.matchAll(/customElements\.define\(\s*["'`]([^"'`]+)["'`]/g)) {
        const tag = (match[1] || "").trim();
        if (!tag) continue;
        if (!tags.includes(tag)) tags.push(tag);
    }
    return tags;
}

function parseClasses(source) {
    const classes = [];
    const classRegex = /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^{\n]+))?\s*\{/g;
    let match = classRegex.exec(source);
    while (match) {
        const className = match[1];
        const extendsExpr = (match[2] || "").trim() || null;
        const openIndex = match.index + match[0].lastIndexOf("{");
        const block = findBalancedBlock(source, openIndex);
        if (!block) {
            match = classRegex.exec(source);
            continue;
        }

        const body = block.body;
        const methods = [];
        const methodRegex = /(?:^|\n)\s*(?:static\s+)?(?:async\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
        let methodMatch = methodRegex.exec(body);
        while (methodMatch) {
            const kind = methodMatch[1] || "method";
            const name = methodMatch[2];
            if (!["constructor", "if", "for", "while", "switch", "catch"].includes(name)) {
                methods.push({
                    name,
                    kind,
                    visibility: name.startsWith("_") ? "private" : "public",
                });
            }
            methodMatch = methodRegex.exec(body);
        }

        const observed = [];
        const observedMatch = body.match(/static\s+get\s+observedAttributes\s*\(\)\s*\{([\s\S]*?)\}/m);
        if (observedMatch) {
            for (const token of observedMatch[1].matchAll(/["'`]([^"'`]+)["'`]/g)) {
                const name = (token[1] || "").trim();
                if (name && !observed.includes(name)) observed.push(name);
            }
        }

        const accessors = [];
        for (const accessor of body.matchAll(/(?:^|\n)\s*(?:get|set)\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
            const name = (accessor[1] || "").trim();
            if (!name || name.startsWith("_")) continue;
            if (!accessors.includes(name)) accessors.push(name);
        }

        classes.push({
            name: className,
            extends: extendsExpr,
            methodCount: methods.length,
            methods,
            observedAttributes: observed,
            properties: accessors,
        });

        classRegex.lastIndex = block.end + 1;
        match = classRegex.exec(source);
    }
    return classes;
}

function parseCssVariables(source) {
    const vars = [];
    for (const token of source.matchAll(/--[a-z0-9-]+/gi)) {
        const name = (token[0] || "").trim();
        if (!name) continue;
        if (!vars.includes(name)) vars.push(name);
    }
    return vars;
}

function detectFeatures(source) {
    const features = [];
    const add = (name) => {
        if (!features.includes(name)) features.push(name);
    };
    if (/customElements\.define\(/.test(source)) add("custom-element");
    if (/requestAnimationFrame|cancelAnimationFrame/.test(source)) add("raf-loop");
    if (/webgl|WebGL|gl\./.test(source)) add("webgl");
    if (/canvas|CanvasRenderingContext2D|2d/.test(source)) add("canvas");
    if (/addEventListener\(/.test(source)) add("events");
    if (/MutationObserver|ResizeObserver/.test(source)) add("observers");
    if (/fetch\(|XMLHttpRequest/.test(source)) add("network");
    return features;
}

function parseFile(filePath, rootDir) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativeFile = toPosix(path.relative(rootDir, filePath));
    const exports = parseExports(source);
    const classes = parseClasses(source);
    const observedAttributes = [...new Set(classes.flatMap((entry) => entry.observedAttributes || []))];
    const properties = [...new Set(classes.flatMap((entry) => entry.properties || []))];
    const methodCount = classes.reduce((sum, entry) => sum + (entry.methodCount || 0), 0);
    const tags = parseCustomElementsTags(source);
    const cssVariables = parseCssVariables(source);
    const fallbackOverview = `Module at ${relativeFile}.`;

    return {
        file: relativeFile,
        overview: extractOverview(source, fallbackOverview),
        exports,
        classes,
        methodCount,
        customElements: tags,
        observedAttributes,
        properties,
        cssVariables,
        features: detectFeatures(source),
    };
}

function main() {
    const rawTarget = process.argv[2] || "animation";
    const targetDir = path.resolve(process.cwd(), rawTarget);
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        console.error(`Target directory does not exist: ${targetDir}`);
        process.exit(1);
    }

    const files = walk(targetDir);
    const modules = files
        .map((filePath) => parseFile(filePath, targetDir))
        .sort((a, b) => a.file.localeCompare(b.file));

    const manifest = {
        generatedAt: new Date().toISOString(),
        root: toPosix(targetDir),
        fileCount: modules.length,
        modules,
    };

    const outputPath = path.join(targetDir, "animation-doc-manifest.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Wrote ${outputPath} (${modules.length} files)`);
}

main();
