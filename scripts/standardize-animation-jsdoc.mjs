#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".js", ".mjs"]);
const KEYWORD_METHOD_NAMES = new Set(["if", "for", "while", "switch", "catch", "else"]);

function toPosix(value) {
    return value.replace(/\\/g, "/");
}

async function walk(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === ".git" || entry.name === "node_modules") continue;
            await walk(fullPath, files);
            continue;
        }
        if (!entry.isFile()) continue;
        if (!SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        files.push(fullPath);
    }
    return files;
}

function stripInlineComments(line) {
    return line.replace(/\/\/.*$/, "");
}

function stripQuotedContent(line) {
    return line
        .replace(/`[^`]*`/g, "``")
        .replace(/"[^"]*"/g, "\"\"")
        .replace(/'[^']*'/g, "''");
}

function getBraceDelta(line) {
    const stripped = stripQuotedContent(stripInlineComments(line));
    const opens = (stripped.match(/\{/g) || []).length;
    const closes = (stripped.match(/\}/g) || []).length;
    return opens - closes;
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

function parseParamNames(rawParams) {
    if (!rawParams) return [];
    return rawParams
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token, index) => {
            const noDefault = token.split("=")[0].trim().replace(/^\.{3}/, "");
            if (!noDefault || noDefault.startsWith("{") || noDefault.startsWith("[")) {
                return `param${index + 1}`;
            }
            return noDefault;
        });
}

function describeClass(name) {
    return `Represents the ${name} animation module class.`;
}

function describeFunction(name) {
    if (name.startsWith("parse")) return `Parses input values for ${name.slice(5).toLowerCase()} behavior.`;
    if (name.startsWith("create")) return `Creates and returns ${name.slice(6).toLowerCase()} data.`;
    if (name.startsWith("build")) return `Builds ${name.slice(5).toLowerCase()} output data.`;
    if (name.startsWith("render")) return "Renders module output using the current state.";
    if (name.startsWith("update")) return "Updates module state from runtime inputs.";
    if (name.startsWith("set")) return `Sets ${name.slice(3).toLowerCase()} values.`;
    if (name.startsWith("get")) return `Returns ${name.slice(3).toLowerCase()} values.`;
    return `Executes ${name}.`;
}

function describeMethod(name, accessorKind = "") {
    if (accessorKind === "get") return `Returns the current ${name} value.`;
    if (accessorKind === "set") return `Updates the ${name} value.`;
    if (name === "constructor") return "Initializes class state and runtime dependencies.";
    if (name.startsWith("_")) return `Implements internal ${name} behavior.`;
    if (name.startsWith("on")) return `Handles ${name.slice(2).toLowerCase()} events.`;
    if (name.startsWith("render")) return "Renders output from current module state.";
    if (name.startsWith("update")) return "Updates internal state from incoming values.";
    if (name.startsWith("set")) return `Sets ${name.slice(3).toLowerCase()} values.`;
    if (name.startsWith("get")) return `Returns ${name.slice(3).toLowerCase()} values.`;
    return `Executes ${name}.`;
}

function docBlockForClass(indent, className) {
    return [
        `${indent}/**`,
        `${indent} * ${describeClass(className)}`,
        `${indent} */`,
    ];
}

function docBlockForCallable(indent, name, rawParams, options = {}) {
    const params = parseParamNames(rawParams);
    const accessorKind = options.accessorKind || "";
    const summary = options.isMethod ? describeMethod(name, accessorKind) : describeFunction(name);
    const lines = [
        `${indent}/**`,
        `${indent} * ${summary}`,
    ];
    if (accessorKind !== "get") {
        for (const paramName of params) {
            lines.push(`${indent} * @param {*} ${paramName} - Parameter value.`);
        }
    }
    if (accessorKind === "set") {
        lines.push(`${indent} * @returns {*} void.`);
    } else if (accessorKind === "get") {
        lines.push(`${indent} * @returns {*} Current ${name} value.`);
    } else {
        lines.push(`${indent} * @returns {*} Result of ${name}.`);
    }
    lines.push(`${indent} */`);
    return lines;
}

function injectDocs(source, relativePath) {
    const lines = source.split(/\r?\n/);
    const out = [];
    let braceDepth = 0;
    const classDepthStack = [];
    let inBlockComment = false;

    const classRegex = /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\b(?:\s+extends\s+[^{\n]+)?\s*\{/;
    const fnRegex = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;
    const exportArrowRegex =
        /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/;
    const methodRegex =
        /^\s*(?:static\s+)?(?:async\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();

        if (inBlockComment) {
            out.push(line);
            if (trimmed.includes("*/")) inBlockComment = false;
            braceDepth += getBraceDelta(line);
            while (classDepthStack.length && braceDepth < classDepthStack[classDepthStack.length - 1]) {
                classDepthStack.pop();
            }
            continue;
        }

        if (trimmed.startsWith("/*")) {
            out.push(line);
            if (!trimmed.includes("*/")) inBlockComment = true;
            braceDepth += getBraceDelta(line);
            while (classDepthStack.length && braceDepth < classDepthStack[classDepthStack.length - 1]) {
                classDepthStack.pop();
            }
            continue;
        }

        const inClassTopLevel =
            classDepthStack.length > 0 && braceDepth === classDepthStack[classDepthStack.length - 1];
        const topLevel = braceDepth === 0;

        const classMatch = line.match(classRegex);
        if (topLevel && classMatch) {
            if (!hasDocBlockAbove(out)) {
                const indent = line.match(/^\s*/)?.[0] || "";
                out.push(...docBlockForClass(indent, classMatch[1]));
            }
            out.push(line);
            braceDepth += getBraceDelta(line);
            classDepthStack.push(braceDepth);
            continue;
        }

        const fnMatch = line.match(fnRegex);
        if (topLevel && fnMatch) {
            if (!hasDocBlockAbove(out)) {
                const indent = line.match(/^\s*/)?.[0] || "";
                out.push(...docBlockForCallable(indent, fnMatch[1], fnMatch[2], { isMethod: false }));
            }
            out.push(line);
            braceDepth += getBraceDelta(line);
            continue;
        }

        const exportArrowMatch = line.match(exportArrowRegex);
        if (topLevel && exportArrowMatch) {
            if (!hasDocBlockAbove(out)) {
                const indent = line.match(/^\s*/)?.[0] || "";
                out.push(...docBlockForCallable(indent, exportArrowMatch[1], exportArrowMatch[2], { isMethod: false }));
            }
            out.push(line);
            braceDepth += getBraceDelta(line);
            continue;
        }

        const methodMatch = line.match(methodRegex);
        if (inClassTopLevel && methodMatch) {
            const accessorKind = methodMatch[1] || "";
            const name = methodMatch[2];
            if (!KEYWORD_METHOD_NAMES.has(name) && !hasDocBlockAbove(out)) {
                const indent = line.match(/^\s*/)?.[0] || "";
                out.push(...docBlockForCallable(indent, name, methodMatch[3], { isMethod: true, accessorKind }));
            }
            out.push(line);
            braceDepth += getBraceDelta(line);
            while (classDepthStack.length && braceDepth < classDepthStack[classDepthStack.length - 1]) {
                classDepthStack.pop();
            }
            continue;
        }

        out.push(line);
        braceDepth += getBraceDelta(line);
        while (classDepthStack.length && braceDepth < classDepthStack[classDepthStack.length - 1]) {
            classDepthStack.pop();
        }
    }

    let next = out.join("\n");
    if (!/\/\*\*/.test(next)) {
        const header = [
            "/**",
            ` * @file ${toPosix(relativePath)}`,
            " * @description Animation module.",
            " */",
            "",
        ].join("\n");
        next = `${header}${next}`;
    }
    return next;
}

async function processFile(filePath, rootDir) {
    const source = await fs.readFile(filePath, "utf8");
    const relativePath = path.relative(rootDir, filePath);
    const next = injectDocs(source, relativePath);
    if (next === source) return false;
    await fs.writeFile(filePath, next, "utf8");
    return true;
}

async function main() {
    const rawTarget = process.argv[2] || "animation";
    const targetDir = path.resolve(process.cwd(), rawTarget);
    const stats = await fs.stat(targetDir).catch(() => null);
    if (!stats || !stats.isDirectory()) {
        console.error(`Target directory does not exist: ${targetDir}`);
        process.exit(1);
    }

    const files = await walk(targetDir);
    let updated = 0;
    for (const filePath of files) {
        const changed = await processFile(filePath, targetDir);
        if (changed) updated += 1;
    }

    console.log(`Processed ${files.length} files in ${toPosix(targetDir)}. Updated ${updated} files with JSDoc.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
