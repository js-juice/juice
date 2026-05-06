const fs = require("fs");
const path = require("path");

const dir = path.join("animation", "properties");
const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => path.join(dir, name));

function read(file) {
    return fs.readFileSync(file, "utf8");
}

function lineCount(text) {
    return text.split(/\r?\n/).length;
}

function getClasses(text) {
    const classes = [];
    const rx = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_$.]+))?/g;
    let m;
    while ((m = rx.exec(text))) {
        classes.push({ name: m[1], extends: m[2] || null });
    }
    return classes;
}

function getExports(text) {
    const named = [];
    const rx = /export\s+\{([^}]+)\}/g;
    let m;
    while ((m = rx.exec(text))) {
        named.push(
            ...m[1]
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
        );
    }

    const hasDefault = /export\s+default\s+/.test(text);
    return { named, hasDefault };
}

function approxMethodCount(text) {
    const rx = /^\s{4,}(?:static\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)\s*\{/gm;
    let count = 0;
    while (rx.exec(text)) count += 1;
    return count;
}

function featureFlags(text) {
    return {
        trackDirty: /trackDirty|dirty/.test(text),
        history: /\bhistory\b/.test(text),
        freezable: /\bfreez|freeze/.test(text),
        typedArray: /extends\s+Float32Array/.test(text),
        proxy: /\bProxy\b/.test(text)
    };
}

console.log("=== Property Module Structure ===");
for (const file of files) {
    const text = read(file);
    const classes = getClasses(text);
    const exports = getExports(text);
    const features = featureFlags(text);
    console.log(
        JSON.stringify(
            {
                file: file.replace(/\\/g, "/"),
                lines: lineCount(text),
                classes,
                methodsApprox: approxMethodCount(text),
                exports,
                features
            },
            null,
            2
        )
    );
}

