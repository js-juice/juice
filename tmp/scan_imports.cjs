const fs = require("fs");
const path = require("path");

const roots = process.argv.slice(2);
const needles = [
    "Animation/Properties/",
    "core/Animation/Properties/",
    "./Properties/",
    "../Properties/"
];
const exts = new Set([".mjs", ".js", ".md"]);

function walk(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const next = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(next, files);
            continue;
        }
        if (!exts.has(path.extname(entry.name).toLowerCase())) continue;
        files.push(next);
    }
    return files;
}

function decodeText(buffer) {
    // UTF-16LE BOM
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        return buffer.toString("utf16le");
    }
    // UTF-16BE BOM
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        const swapped = Buffer.allocUnsafe(buffer.length - 2);
        for (let i = 2, w = 0; i + 1 < buffer.length; i += 2, w += 2) {
            swapped[w] = buffer[i + 1];
            swapped[w + 1] = buffer[i];
        }
        return swapped.toString("utf16le");
    }

    const utf8 = buffer.toString("utf8");
    if (utf8.includes("\u0000")) {
        return buffer.toString("utf16le");
    }
    return utf8;
}

function scanFile(file) {
    const buffer = fs.readFileSync(file);
    const text = decodeText(buffer);
    const lines = text.split(/\r?\n/);
    const hits = [];

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const needle of needles) {
            if (line.includes(needle)) {
                hits.push({ line: i + 1, text: line.trim() });
                break;
            }
        }
    }
    return hits;
}

for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const files = walk(root);
    for (const file of files) {
        const hits = scanFile(file);
        if (!hits.length) continue;
        for (const hit of hits) {
            console.log(`${file}:${hit.line}:${hit.text}`);
        }
    }
}
