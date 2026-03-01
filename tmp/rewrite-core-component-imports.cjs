const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const coreComponents = path.join(root, "core", "Components");
const uiComponent = path.join(root, "ui", "component.mjs");
const exts = new Set([".mjs", ".js"]);

const pattern = /from\s*(["'])(\.\/Component\.mjs|\.\.\/Component\.mjs|\.\.\/\.\.\/Component\.mjs)\1/g;

function normalizeRelative(value) {
    const normalized = value.replace(/\\/g, "/");
    if (normalized.startsWith(".")) return normalized;
    return `./${normalized}`;
}

function walk(dir, list = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(filePath, list);
        } else if (exts.has(path.extname(entry.name))) {
            list.push(filePath);
        }
    }
    return list;
}

let changed = 0;
for (const filePath of walk(coreComponents)) {
    const source = fs.readFileSync(filePath, "utf8");
    if (!pattern.test(source)) continue;
    pattern.lastIndex = 0;
    const relative = normalizeRelative(path.relative(path.dirname(filePath), uiComponent));
    const next = source.replace(pattern, (full, quote) => `from ${quote}${relative}${quote}`);
    if (next !== source) {
        fs.writeFileSync(filePath, next, "utf8");
        changed += 1;
        console.log(path.relative(root, filePath));
    }
}

console.log(`CHANGED ${changed}`);
