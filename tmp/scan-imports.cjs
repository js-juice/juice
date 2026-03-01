const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [];
const exts = new Set([".mjs", ".js"]);
const skipDirs = new Set(["node_modules", ".git"]);
const scanAll = process.argv.includes("--all");
const includeStaging = process.argv.includes("--include-staging");
const skipPathFragments = includeStaging
    ? []
    : [path.join("ui", "components", "staging"), path.join("squeeze", "node_modules")];
const scanRoots = scanAll ? [root] : [path.join(root, "ui")];

function walk(dir) {
    const relativeDir = path.relative(root, dir);
    if (skipPathFragments.some((fragment) => relativeDir.startsWith(fragment))) {
        return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skipDirs.has(entry.name)) continue;
        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(filePath);
            continue;
        }
        if (exts.has(path.extname(entry.name))) {
            files.push(filePath);
        }
    }
}

function existsResolved(baseFile, specifier) {
    const cleaned = specifier.split("?")[0].split("#")[0];
    const base = path.resolve(path.dirname(baseFile), cleaned);
    const candidates = [
        base,
        `${base}.mjs`,
        `${base}.js`,
        path.join(base, "index.mjs"),
        path.join(base, "index.js")
    ];
    return candidates.some((candidate) => fs.existsSync(candidate));
}

const patterns = [
    /^\s*(?:import|export)\s+[\s\S]*?\s+from\s*["']([^"']+)["']/gm,
    /^\s*import\s*\(\s*["']([^"']+)["']\s*\)/gm
];

for (const scanRoot of scanRoots) {
    if (fs.existsSync(scanRoot)) {
        walk(scanRoot);
    }
}

const missing = [];
for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const regex of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(source)) !== null) {
            const specifier = match[1];
            if (!specifier.startsWith(".")) continue;
            if (!existsResolved(filePath, specifier)) {
                missing.push(`${path.relative(root, filePath)} -> ${specifier}`);
            }
        }
    }
}

missing.sort();
for (const item of missing) {
    console.log(item);
}
console.log(`TOTAL ${missing.length}`);
