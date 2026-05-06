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
                if (entry.name === ".git" || entry.name === "node_modules") continue;
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

function parseHeaderDoc(source) {
    const blockMatch =
        source.match(/\/\*\*[\s\S]*?AUTODOC:START([\s\S]*?)AUTODOC:END[\s\S]*?\*\//m) || null;
    if (!blockMatch) return null;
    const body = blockMatch[1];
    const lines = body
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*\*\s?/, "").trim())
        .filter(Boolean);

    const component = {
        tag: null,
        className: null,
        overview: null,
        features: [],
        attributes: [],
        properties: [],
        example: null,
    };

    let section = "";
    for (const line of lines) {
        if (line.startsWith("Component:")) {
            const tagMatch = line.match(/<([^>]+)>/);
            component.tag = tagMatch ? tagMatch[1].trim() : null;
            section = "";
            continue;
        }
        if (line.startsWith("Class:")) {
            component.className = line.slice("Class:".length).trim() || null;
            section = "";
            continue;
        }
        if (line.startsWith("Overview:")) {
            component.overview = line.slice("Overview:".length).trim() || null;
            section = "";
            continue;
        }
        if (line === "Features:") {
            section = "features";
            continue;
        }
        if (line === "Example:") {
            section = "example";
            continue;
        }
        if (line === "Attribute Reference:") {
            section = "attributes";
            continue;
        }
        if (line === "Property Reference:") {
            section = "properties";
            continue;
        }

        if (section === "features" && line.startsWith("- ")) {
            const entry = line.slice(2).trim();
            const separator = entry.indexOf(":");
            if (separator === -1) {
                component.features.push({ name: entry, description: "" });
            } else {
                component.features.push({
                    name: entry.slice(0, separator).trim(),
                    description: entry.slice(separator + 1).trim(),
                });
            }
            continue;
        }

        if (section === "attributes" && line.startsWith("- ")) {
            const entry = line.slice(2).trim();
            const match = entry.match(/^`([^`]+)`(?:\s+\(([^)]+)\))?:\s*(.+)$/);
            if (match) {
                component.attributes.push({
                    name: match[1].trim(),
                    type: match[2] ? match[2].trim() : null,
                    description: match[3].trim(),
                });
            }
            continue;
        }

        if (section === "properties" && line.startsWith("- ")) {
            const entry = line.slice(2).trim();
            const match = entry.match(/^`([^`]+)`:\s*(.+)$/);
            if (match) {
                component.properties.push({
                    name: match[1].trim(),
                    description: match[2].trim(),
                });
            }
            continue;
        }

        if (section === "example") {
            component.example = line.replace(/^`|`$/g, "").trim();
            continue;
        }
    }

    return component;
}

function parseMethodDocs(source) {
    const methods = [];
    const regex =
        /\/\*\*([\s\S]*?)\*\/\s*\n\s*(?:static\s+)?(?:async\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
    let match = regex.exec(source);
    while (match) {
        const rawBlock = match[1];
        const kind = match[2] || null;
        const name = match[3];
        const rawParams = match[4] || "";

        const lines = rawBlock
            .split(/\r?\n/)
            .map((line) => line.replace(/^\s*\*\s?/, "").trim())
            .filter(Boolean);
        const description = lines.find((line) => !line.startsWith("@")) || "";

        const params = [];
        const paramRegex = /@param\s+\{([^}]+)\}\s+([A-Za-z_$][\w$]*)\s*-\s*(.+)$/;
        for (const line of lines) {
            const paramMatch = line.match(paramRegex);
            if (!paramMatch) continue;
            params.push({
                name: paramMatch[2],
                type: paramMatch[1],
                description: paramMatch[3],
            });
        }

        let returns = null;
        const returnLine = lines.find((line) => line.startsWith("@returns"));
        if (returnLine) {
            const returnMatch = returnLine.match(/@returns\s+\{([^}]+)\}\s*(.+)?$/);
            if (returnMatch) {
                returns = {
                    type: returnMatch[1],
                    description: (returnMatch[2] || "").trim(),
                };
            }
        }

        // Skip the file-level AUTODOC block if it was accidentally matched.
        if (description.includes("AUTODOC:START") || description.includes("AUTODOC:END")) {
            match = regex.exec(source);
            continue;
        }

        methods.push({
            name: kind ? `${kind} ${name}` : name,
            signatureParams: rawParams
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            description,
            params,
            returns,
        });
        match = regex.exec(source);
    }
    return methods;
}

function parseComponentDefinition(source) {
    const match =
        source.match(/customElements\.define\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z_$][\w$]*)\s*[\),]/) || null;
    if (!match) return null;
    return { tag: match[1], className: match[2] };
}

function parseComponentFile(filePath, rootDir) {
    const source = fs.readFileSync(filePath, "utf8");
    const definition = parseComponentDefinition(source);
    if (!definition) return null;

    const header = parseHeaderDoc(source) || {};
    const methods = parseMethodDocs(source);

    return {
        tag: header.tag || definition.tag,
        className: header.className || definition.className,
        file: toPosix(path.relative(rootDir, filePath)),
        overview: header.overview || "",
        features: Array.isArray(header.features) ? header.features : [],
        attributes: Array.isArray(header.attributes) ? header.attributes : [],
        properties: Array.isArray(header.properties) ? header.properties : [],
        example: header.example || `<${definition.tag}></${definition.tag}>`,
        methods,
    };
}

function main() {
    const rawTarget = process.argv[2];
    if (!rawTarget) {
        console.error("Usage: node scripts/generate-component-manifest-from-docs.mjs <directory>");
        process.exit(1);
    }
    const targetDir = path.resolve(process.cwd(), rawTarget);
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        console.error(`Target directory does not exist: ${targetDir}`);
        process.exit(1);
    }

    const files = walkFiles(targetDir);
    const components = files
        .map((filePath) => parseComponentFile(filePath, targetDir))
        .filter(Boolean)
        .sort((a, b) => a.tag.localeCompare(b.tag));

    const manifest = {
        generatedAt: new Date().toISOString(),
        source: "component-doc-comments",
        targetDirectory: toPosix(targetDir),
        componentCount: components.length,
        components,
    };

    const outputPath = path.join(targetDir, OUTPUT_FILE);
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Wrote ${outputPath} (${components.length} components)`);
}

main();
