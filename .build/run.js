import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, "..");

async function walkDir(dir, index = { files: [], dirs: [] }) {
    return new Promise((resolve) => {
        fs.readdir(dir, async (err, files) => {
            for (const file of files) {
                if (file === ".git" || file === "node_modules") continue;

                const abs = path.join(dir, file);
                const rel = path.relative(root, abs).replace(/\\/g, "/");
                // will also include directory names
                if (fs.statSync(dir + "/" + file).isDirectory()) {
                    index.dirs.push(rel);
                    await walkDir(path.join(dir, file), index);
                } else {
                    index.files.push(rel);
                }
            }
            resolve(index);
        });
    });
}

const manifest = await walkDir(root + "/");
console.log(manifest);

fs.writeFileSync(root + "/config/manifest.json", JSON.stringify(manifest, null, 2));
