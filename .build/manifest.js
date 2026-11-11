import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, "..");

const ignore = [".build", "node_modules", ".git", ".gitignore", "config/manifest.json"];

async function walkFlat(dir, index = { files: [], folders: [], configs: [] }) {
    return new Promise((resolve) => {
        fs.readdir(dir, async (err, files) => {
            for (const file of files) {
                if (file === ".git" || file === "node_modules") continue;

                const abs = path.join(dir, file);
                const rel = path.relative(root, abs).replace(/\\/g, "/");

                if (file === "config.json" || file === "config.mjs") {
                    index.configs.push(rel);
                }

                if (ignore.includes(rel)) continue;
                // will also include directory names
                if (fs.statSync(dir + "/" + file).isDirectory()) {
                    index.folders.push(rel);
                    await walkFlat(path.join(dir, file), index);
                } else {
                    index.files.push(rel);
                }
            }
            resolve(index);
        });
    });
}

function indexEntries(manifest) {
    const searchMarkers = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const indexes = {};
    let fileIndex = 0;

    function findIndex(letter) {
        for (let i = fileIndex; i < manifest.length; i++) {
            fileIndex = i;
            const entry = manifest[i];
            if (entry.startsWith(letter)) {
                if (indexes[letter] === undefined) {
                    indexes[letter] = { start: i, end: i, entries: 1 };
                } else {
                    indexes[letter].end = i;
                    indexes[letter].entries++;
                }
            } else {
                break;
            }
        }
    }

    for (const letter of searchMarkers) {
        findIndex(letter);
    }
    return indexes;
}

export async function make(location, writeToFile = null) {
    if (!location.endsWith("/")) {
        location += "/";
    }
    const manifest = {};
    manifest.flat = await walkFlat(location);
    manifest.flat.indexes = indexEntries(manifest.flat.files);

    const hash = crypto.createHash("sha256");
    manifest.hash = hash.update(JSON.stringify(manifest)).digest("hex");
    if (writeToFile) {
        fs.writeFileSync(writeToFile, JSON.stringify(manifest, null, 2));
    }
    return manifest;
}

export default {
    build: async function () {
        return new Promise(async (resolve, reject) => {
            try {
                const manifest = await make(root, root + "/config/manifest.json");
                resolve(manifest);
                console.log(`Wrote ${root}/config/manifest.json`);
            } catch (error) {
                reject(error);
            }
        });
    }
};
