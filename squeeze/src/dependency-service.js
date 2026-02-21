const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { promisify } = require("node:util");
const archiver = require("archiver");
const esbuild = require("esbuild");
const execFileAsync = promisify(execFile);

const CODE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);
const RESOLVABLE_EXTENSIONS = [".mjs", ".js", ".cjs", ".ts", ".mts", ".cts", ".json"];

function normalizeSlashes(value) {
    return value.split(path.sep).join("/");
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRelative(rootDir, absolutePath) {
    return normalizeSlashes(path.relative(rootDir, absolutePath));
}

function isLikelyCodeFile(absolutePath) {
    return CODE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase());
}

function shouldSkipDirectory(name) {
    return name === ".git" || name === "node_modules";
}

async function listFiles(rootDir) {
    const output = [];

    async function walk(currentDir) {
        const entries = await fsp.readdir(currentDir, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (shouldSkipDirectory(entry.name)) continue;
                await walk(path.join(currentDir, entry.name));
                continue;
            }
            const absolutePath = path.join(currentDir, entry.name);
            output.push({
                relativePath: toRelative(rootDir, absolutePath),
                absolutePath,
                extension: path.extname(entry.name).toLowerCase(),
                codeFile: isLikelyCodeFile(absolutePath)
            });
        }
    }

    await walk(rootDir);
    return output;
}

async function buildFileTree(rootDir) {
    async function buildNode(currentDir) {
        const entries = await fsp.readdir(currentDir, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));

        const children = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (shouldSkipDirectory(entry.name)) continue;
                children.push(await buildNode(path.join(currentDir, entry.name)));
                continue;
            }
            const absolutePath = path.join(currentDir, entry.name);
            children.push({
                type: "file",
                name: entry.name,
                relativePath: toRelative(rootDir, absolutePath),
                codeFile: isLikelyCodeFile(absolutePath)
            });
        }

        return {
            type: "directory",
            name: path.basename(currentDir),
            relativePath: toRelative(rootDir, currentDir) || ".",
            children
        };
    }

    return buildNode(rootDir);
}

function extractSpecifiers(source) {
    const specifiers = new Set();
    const patterns = [
        /import\s+[^"'`]*?\s+from\s+["']([^"']+)["']/g,
        /import\s*["']([^"']+)["']/g,
        /export\s+[^"'`]*?\s+from\s+["']([^"']+)["']/g,
        /require\s*\(\s*["']([^"']+)["']\s*\)/g,
        /import\s*\(\s*["']([^"']+)["']\s*\)/g
    ];

    for (const regex of patterns) {
        for (const match of source.matchAll(regex)) {
            specifiers.add(match[1]);
        }
    }

    return [...specifiers];
}

function parseImportClause(clause) {
    const result = {
        defaultImport: null,
        namespaceImport: null,
        namedImports: []
    };

    const trimmed = clause.trim();
    if (!trimmed) return result;

    if (trimmed.startsWith("{")) {
        const inner = trimmed.replace(/^\{/, "").replace(/\}$/, "").trim();
        if (!inner) return result;
        for (const part of inner.split(",")) {
            const token = part.trim();
            if (!token) continue;
            const [importedRaw] = token.split(/\s+as\s+/i);
            const imported = importedRaw.trim();
            if (imported) result.namedImports.push(imported);
        }
        return result;
    }

    if (trimmed.startsWith("*")) {
        const nsMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (nsMatch) result.namespaceImport = nsMatch[1];
        return result;
    }

    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) {
        result.defaultImport = trimmed;
        return result;
    }

    result.defaultImport = trimmed.slice(0, commaIndex).trim();
    const rest = trimmed.slice(commaIndex + 1).trim();
    if (rest.startsWith("{")) {
        const inner = rest.replace(/^\{/, "").replace(/\}$/, "").trim();
        if (inner) {
            for (const part of inner.split(",")) {
                const token = part.trim();
                if (!token) continue;
                const [importedRaw] = token.split(/\s+as\s+/i);
                const imported = importedRaw.trim();
                if (imported) result.namedImports.push(imported);
            }
        }
    } else if (rest.startsWith("*")) {
        const nsMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (nsMatch) result.namespaceImport = nsMatch[1];
    }
    return result;
}

function extractImportsDetailed(source) {
    const entries = [];
    const fromRegex = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
    const sideEffectRegex = /import\s+["']([^"']+)["']/g;

    for (const match of source.matchAll(fromRegex)) {
        entries.push({
            specifier: match[2],
            ...parseImportClause(match[1] || "")
        });
    }

    for (const match of source.matchAll(sideEffectRegex)) {
        if (entries.some((entry) => entry.specifier === match[1])) continue;
        entries.push({
            specifier: match[1],
            defaultImport: null,
            namespaceImport: null,
            namedImports: [],
            sideEffectOnly: true
        });
    }

    return entries;
}

async function fileExists(candidate) {
    try {
        const stat = await fsp.stat(candidate);
        return stat.isFile();
    } catch {
        return false;
    }
}

async function resolveRelativeDependency(baseFile, specifier) {
    const baseDir = path.dirname(baseFile);
    const rawCandidate = path.resolve(baseDir, specifier);

    if (await fileExists(rawCandidate)) return rawCandidate;

    for (const ext of RESOLVABLE_EXTENSIONS) {
        if (await fileExists(rawCandidate + ext)) return rawCandidate + ext;
    }

    for (const ext of RESOLVABLE_EXTENSIONS) {
        const indexFile = path.join(rawCandidate, "index" + ext);
        if (await fileExists(indexFile)) return indexFile;
    }

    return null;
}

function isRelativeSpecifier(specifier) {
    return specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
}

async function resolveDependency(baseFile, specifier, rootDir) {
    if (!isRelativeSpecifier(specifier)) return null;
    if (specifier.startsWith("/")) {
        const rootBased = path.resolve(rootDir, "." + specifier);
        if (await fileExists(rootBased)) return rootBased;
        for (const ext of RESOLVABLE_EXTENSIONS) {
            if (await fileExists(rootBased + ext)) return rootBased + ext;
        }
        return null;
    }
    return resolveRelativeDependency(baseFile, specifier);
}

async function getDirectDependencies(filePath, rootDir) {
    if (!isLikelyCodeFile(filePath)) return [];
    const source = await fsp.readFile(filePath, "utf8");
    const specifiers = extractSpecifiers(source);
    const deps = [];

    for (const specifier of specifiers) {
        const resolved = await resolveDependency(filePath, specifier, rootDir);
        if (!resolved) continue;
        if (!resolved.startsWith(rootDir)) continue;
        deps.push(resolved);
    }

    return [...new Set(deps)];
}

async function collectTransitiveDependencies(entryFiles, rootDir) {
    const visited = new Set();
    const queue = [...entryFiles];

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);

        const deps = await getDirectDependencies(current, rootDir);
        for (const dep of deps) {
            if (!visited.has(dep)) queue.push(dep);
        }
    }

    return visited;
}

async function ensureDirectory(dirPath) {
    await fsp.mkdir(dirPath, { recursive: true });
}

async function listDirectoryFilesWithSizes(rootDir) {
    const output = [];

    async function walk(currentDir) {
        const entries = await fsp.readdir(currentDir, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
            const absolutePath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolutePath);
                continue;
            }
            const stat = await fsp.stat(absolutePath);
            output.push({
                path: normalizeSlashes(path.relative(rootDir, absolutePath)),
                bytes: stat.size
            });
        }
    }

    await walk(rootDir);
    return output;
}

async function sha256File(filePath) {
    const buffer = await fsp.readFile(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function runGit(rootDir, args) {
    try {
        const { stdout } = await execFileAsync("git", ["-C", rootDir, ...args]);
        return stdout.trim();
    } catch {
        return null;
    }
}

async function getGitSnapshot(rootDir) {
    const head = await runGit(rootDir, ["rev-parse", "HEAD"]);
    const branch = await runGit(rootDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const remoteUrl = await runGit(rootDir, ["config", "--get", "remote.origin.url"]);
    const statusShort = await runGit(rootDir, ["status", "--short"]);
    const headShort = head ? head.slice(0, 12) : null;
    return {
        head,
        headShort,
        branch,
        remoteUrl,
        dirty: Boolean(statusShort)
    };
}

function serializeSymbolMap(rootDir, symbolMap) {
    const entries = [];
    for (const [absolutePath, usage] of symbolMap.entries()) {
        entries.push({
            source: toRelative(rootDir, absolutePath),
            imports: {
                default: usage.needsDefault,
                namespace: usage.needsNamespace,
                sideEffectOnly: usage.sideEffectOnly,
                named: [...usage.named].sort((a, b) => a.localeCompare(b))
            }
        });
    }
    entries.sort((a, b) => a.source.localeCompare(b.source));
    return entries;
}

async function copyWithParents(rootDir, absolutePath, outputDir, basePrefix = "") {
    const relativePath = toRelative(rootDir, absolutePath);
    const targetPath = path.join(outputDir, basePrefix, relativePath);
    await ensureDirectory(path.dirname(targetPath));
    await fsp.copyFile(absolutePath, targetPath);
}

function safeBundleName(relativePath) {
    return relativePath.replace(/[\\/]/g, "__").replace(/\.[^.]+$/, "") + ".bundle.js";
}

function getCodeLoaderForPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".ts") return "ts";
    if (ext === ".mts") return "ts";
    if (ext === ".cts") return "ts";
    return "js";
}

function getMinifyBuildOptions(minify) {
    if (!minify) return { minify: false };
    return {
        minify: true,
        legalComments: "none"
    };
}

function toRelativeImportSpecifier(baseDir, absolutePath) {
    let rel = path.relative(baseDir, absolutePath).split(path.sep).join("/");
    if (!rel.startsWith(".") && !rel.startsWith("/")) rel = "./" + rel;
    return rel;
}

async function buildBundles(entryFiles, rootDir, outputDir) {
    const bundleDir = path.join(outputDir, "Pulp");
    await ensureDirectory(bundleDir);
    const manifest = [];

    for (const filePath of entryFiles) {
        if (!isLikelyCodeFile(filePath)) continue;
        const rel = toRelative(rootDir, filePath);
        const bundleName = safeBundleName(rel);
        const outfile = path.join(bundleDir, bundleName);
        await esbuild.build({
            entryPoints: [filePath],
            outfile,
            bundle: true,
            format: "esm",
            platform: "neutral",
            sourcemap: false,
            logLevel: "silent"
        });
        manifest.push({
            entry: rel,
            bundle: normalizeSlashes(path.join("Pulp", bundleName))
        });
    }

    const manifestPath = path.join(bundleDir, "manifest.json");
    await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

async function createSymbolMap(entryFiles, rootDir) {
    const symbolMap = new Map();

    for (const filePath of entryFiles) {
        if (!isLikelyCodeFile(filePath)) continue;
        const source = await fsp.readFile(filePath, "utf8");
        const imports = extractImportsDetailed(source);

        for (const parsedImport of imports) {
            const resolved = await resolveDependency(filePath, parsedImport.specifier, rootDir);
            if (!resolved) continue;
            if (!resolved.startsWith(rootDir)) continue;

            if (!symbolMap.has(resolved)) {
                symbolMap.set(resolved, {
                    named: new Set(),
                    needsDefault: false,
                    needsNamespace: false,
                    sideEffectOnly: false
                });
            }

            const entry = symbolMap.get(resolved);
            if (parsedImport.defaultImport) entry.needsDefault = true;
            if (parsedImport.namespaceImport) entry.needsNamespace = true;
            if (parsedImport.sideEffectOnly) entry.sideEffectOnly = true;
            for (const imported of parsedImport.namedImports || []) {
                entry.named.add(imported);
            }
        }
    }

    return symbolMap;
}

function createPlannedSymbolMap(symbolMap) {
    const planned = new Map();
    const namedOwners = new Map();
    const skippedNamedImports = [];

    for (const [absolutePath, usage] of symbolMap.entries()) {
        const nextUsage = {
            named: new Set(),
            needsDefault: usage.needsDefault,
            needsNamespace: usage.needsNamespace,
            sideEffectOnly: usage.sideEffectOnly
        };

        const namedSorted = [...usage.named].sort((a, b) => a.localeCompare(b));
        for (const imported of namedSorted) {
            const owner = namedOwners.get(imported);
            if (owner) {
                skippedNamedImports.push({
                    symbol: imported,
                    skippedSource: absolutePath,
                    keptSource: owner
                });
                continue;
            }
            namedOwners.set(imported, absolutePath);
            nextUsage.named.add(imported);
        }

        planned.set(absolutePath, nextUsage);
    }

    return {
        planned,
        skippedNamedImports
    };
}

async function buildDependencyImportRegistry(entryFiles, rootDir, plannedSymbolMap) {
    const files = [];
    for (const entryFile of entryFiles) {
        const source = await fsp.readFile(entryFile, "utf8");
        const imports = extractImportsDetailed(source);
        const perSource = new Map();

        for (const parsedImport of imports) {
            const resolved = await resolveDependency(entryFile, parsedImport.specifier, rootDir);
            if (!resolved) continue;
            if (!resolved.startsWith(rootDir)) continue;

            const sourceRel = toRelative(rootDir, resolved);
            if (!perSource.has(sourceRel)) {
                perSource.set(sourceRel, {
                    source: sourceRel,
                    default: false,
                    namespace: false,
                    sideEffectOnly: false,
                    named: new Set()
                });
            }
            const entry = perSource.get(sourceRel);
            if (parsedImport.defaultImport) entry.default = true;
            if (parsedImport.namespaceImport) entry.namespace = true;
            if (parsedImport.sideEffectOnly) entry.sideEffectOnly = true;
            for (const imported of parsedImport.namedImports || []) {
                entry.named.add(imported);
            }
        }

        const importsList = [...perSource.values()]
            .map((item) => ({
                source: item.source,
                default: item.default,
                namespace: item.namespace,
                sideEffectOnly: item.sideEffectOnly,
                named: [...item.named].sort((a, b) => a.localeCompare(b))
            }))
            .sort((a, b) => a.source.localeCompare(b.source));

        files.push({
            file: toRelative(rootDir, entryFile),
            imports: importsList
        });
    }

    const methodOwners = [];
    for (const [absolutePath, usage] of plannedSymbolMap.entries()) {
        const source = toRelative(rootDir, absolutePath);
        for (const named of usage.named) {
            methodOwners.push({
                symbol: named,
                source
            });
        }
    }
    methodOwners.sort((a, b) => {
        const symbolCmp = a.symbol.localeCompare(b.symbol);
        if (symbolCmp !== 0) return symbolCmp;
        return a.source.localeCompare(b.source);
    });

    files.sort((a, b) => a.file.localeCompare(b.file));
    return {
        files,
        methodOwners
    };
}

function makeBundleSpecifier(rootDir, absolutePath) {
    let rel = toRelative(rootDir, absolutePath);
    if (!rel.startsWith(".")) rel = "./" + rel;
    return rel;
}

async function buildDependencyBundle(entryFiles, rootDir, outputDir, options = {}) {
    const { minify = false } = options;
    const symbolMap = await createSymbolMap(entryFiles, rootDir);
    if (symbolMap.size === 0) return null;
    const symbolPlan = createPlannedSymbolMap(symbolMap);
    const plannedSymbolMap = symbolPlan.planned;

    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "juice-dep-entry-"));
    const entryFile = path.join(tempDir, "dependency-entry.mjs");
    await ensureDirectory(outputDir);
    const outfile = path.join(outputDir, "pulp.mjs");

    const lines = [];
    let depIndex = 0;
    for (const [absolutePath, usage] of plannedSymbolMap.entries()) {
        depIndex += 1;
        // Use absolute filesystem path with forward slashes so esbuild can resolve it
        const specifier = absolutePath.split(path.sep).join("/");
        const importAliasBase = `dep_${depIndex}`;

        if (usage.sideEffectOnly && !usage.needsDefault && !usage.needsNamespace && usage.named.size === 0) {
            lines.push(`import "${specifier}";`);
            continue;
        }

        lines.push(`import * as ${importAliasBase}_ns from "${specifier}";`);
        if (usage.needsNamespace) {
            lines.push(`export const ${importAliasBase}_namespace = ${importAliasBase}_ns;`);
        }
        if (usage.needsDefault) {
            lines.push(`export const ${importAliasBase}_default_export = ${importAliasBase}_ns.default;`);
        }
        for (const imported of usage.named) {
            lines.push(`export const ${imported} = ${importAliasBase}_ns.${imported};`);
        }
    }

    await fsp.writeFile(entryFile, lines.join("\n"), "utf8");
    try {
        await esbuild.build({
            entryPoints: [entryFile],
            outfile,
            bundle: true,
            format: "esm",
            platform: "neutral",
            treeShaking: true,
            sourcemap: false,
            logLevel: "silent",
            absWorkingDir: rootDir,
            ...getMinifyBuildOptions(!!minify)
        });
    } catch (err) {
        const context = {
            message: err.message || String(err),
            absWorkingDir: rootDir,
            entryFile,
            entryContentPreview: lines.slice(0, 50)
        };
        await fsp.rm(tempDir, { recursive: true, force: true });
        throw new Error(`Dependency bundle build failed: ${JSON.stringify(context, null, 2)}`);
    }

    await fsp.rm(tempDir, { recursive: true, force: true });
    const importRegistry = await buildDependencyImportRegistry(entryFiles, rootDir, plannedSymbolMap);
    return {
        output: "pulp.mjs",
        sources: [...plannedSymbolMap.keys()].map((absolutePath) => toRelative(rootDir, absolutePath)),
        imports: serializeSymbolMap(rootDir, plannedSymbolMap),
        importRegistry,
        skippedDuplicateNamedImports: symbolPlan.skippedNamedImports.map((item) => ({
            symbol: item.symbol,
            skippedSource: toRelative(rootDir, item.skippedSource),
            keptSource: toRelative(rootDir, item.keptSource)
        }))
    };
}

async function buildCombinedBundle(entryFiles, rootDir, outputDir, options = {}) {
    const { minify = true } = options;
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "juice-combined-entry-"));
    const entryFile = path.join(tempDir, "combined-entry.mjs");
    const outDir = path.join(outputDir, "Pulp");
    await ensureDirectory(outDir);
    const outfile = path.join(outDir, "combined.mjs");

    const lines = [];
    for (const absolutePath of entryFiles) {
        if (!isLikelyCodeFile(absolutePath)) continue;
        const spec = absolutePath.split(path.sep).join("/");
        lines.push(`import "${spec}";`);
    }

    await fsp.writeFile(entryFile, lines.join("\n"), "utf8");
    try {
        await esbuild.build({
            entryPoints: [entryFile],
            outfile,
            bundle: true,
            format: "esm",
            platform: "neutral",
            treeShaking: true,
            sourcemap: false,
            logLevel: "silent",
            absWorkingDir: rootDir,
            ...getMinifyBuildOptions(!!minify)
        });
    } catch (err) {
        const context = {
            message: err.message || String(err),
            absWorkingDir: rootDir,
            entryFile,
            entryContentPreview: lines.slice(0, 50)
        };
        await fsp.rm(tempDir, { recursive: true, force: true });
        throw new Error(`Combined bundle build failed: ${JSON.stringify(context, null, 2)}`);
    }

    await fsp.rm(tempDir, { recursive: true, force: true });

    return {
        output: normalizeSlashes(path.join("Pulp", "combined.mjs")),
        sources: entryFiles.map((p) => toRelative(rootDir, p))
    };
}

async function createZipFromDirectory(inputDir, zipPath) {
    await ensureDirectory(path.dirname(zipPath));
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    const completion = new Promise((resolve, reject) => {
        output.on("close", resolve);
        archive.on("error", reject);
        output.on("error", reject);
    });

    archive.pipe(output);
    archive.directory(inputDir, false);
    await archive.finalize();
    await completion;
}

async function writeUpdaterScript(payloadDir) {
    const scriptDir = path.join(payloadDir, "scripts");
    await ensureDirectory(scriptDir);
    const scriptPath = path.join(scriptDir, "resqueeze.mjs");
    const script = `#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const exportRoot = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const juiceArgIndex = args.indexOf("--juice");
const juiceArgPath = juiceArgIndex >= 0 ? args[juiceArgIndex + 1] : null;

const manifestPath = path.join(scriptDir, "extract-manifest.json");
const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
let juiceRoot = null;
let cleanupDir = null;

async function resolveJuiceSource() {
    if (juiceArgPath) {
        const explicitPath = path.resolve(exportRoot, juiceArgPath);
        if (!fs.existsSync(explicitPath)) {
            throw new Error("Provided --juice path does not exist: " + explicitPath);
        }
        return explicitPath;
    }

    const remoteUrl = manifest.git?.remoteUrl || null;
    if (remoteUrl) {
        const tempBase = await fsp.mkdtemp(path.join(os.tmpdir(), "juice-updater-"));
        const cloneDir = path.join(tempBase, "juice");
        await execFileAsync("git", ["clone", "--depth", "1", remoteUrl, cloneDir]);
        cleanupDir = tempBase;
        return cloneDir;
    }

    const localFallback = path.join(exportRoot, "juice");
    if (fs.existsSync(localFallback)) return localFallback;

    throw new Error("Unable to resolve Juice source. Manifest has no remote URL and local ./juice not found.");
}

juiceRoot = await resolveJuiceSource();

async function runGit(argsList) {
    try {
        const { stdout } = await execFileAsync("git", ["-C", juiceRoot, ...argsList]);
        return stdout.trim();
    } catch {
        return null;
    }
}

async function hashFile(filePath) {
    const buffer = await fsp.readFile(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function relToOS(rel) {
    return rel.split("/").join(path.sep);
}

const git = {
    head: await runGit(["rev-parse", "HEAD"]),
    branch: await runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    remoteUrl: await runGit(["config", "--get", "remote.origin.url"])
};

let remoteHead = null;
if (git.remoteUrl) {
    try {
        const { stdout } = await execFileAsync("git", ["ls-remote", git.remoteUrl, "HEAD"]);
        const first = stdout.trim().split(/\\s+/)[0];
        if (first) remoteHead = first;
    } catch {
        remoteHead = null;
    }
}

const sourceHashes = manifest.sourceHashes || {};
const changes = [];
for (const [source, expectedHash] of Object.entries(sourceHashes)) {
    const abs = path.join(juiceRoot, relToOS(source));
    if (!fs.existsSync(abs)) {
        changes.push({ source, status: "missing" });
        continue;
    }
    const currentHash = await hashFile(abs);
    if (currentHash !== expectedHash) {
        changes.push({ source, status: "changed", currentHash, expectedHash });
    }
}

const report = {
    manifestCreatedAt: manifest.createdAt,
    manifestHead: manifest.git?.head || null,
    currentHead: git.head,
    remoteHead,
    remoteAdvanced: Boolean(remoteHead && git.head && remoteHead !== git.head),
    sameHead: Boolean(manifest.git?.head && git.head && manifest.git.head === git.head),
    changedFiles: changes
};

if (apply) {
    const destinationRoot = path.join(exportRoot, "juice");
    for (const change of changes) {
        const sourceFile = path.join(juiceRoot, relToOS(change.source));
        if (!fs.existsSync(sourceFile)) continue;
        const destination = path.join(destinationRoot, relToOS(change.source));
        await fsp.mkdir(path.dirname(destination), { recursive: true });
        await fsp.copyFile(sourceFile, destination);
    }

    const bundle = manifest.bundledDependencies?.[0];
    if (bundle && bundle.imports && bundle.output) {
        try {
            const esbuild = await import("esbuild");
            const entryLines = [];
            let idx = 0;
            for (const item of bundle.imports) {
                idx += 1;
                const specifier = "./" + item.source;
                const alias = "dep_" + idx;
                if (item.imports.sideEffectOnly && !item.imports.default && !item.imports.namespace && (!item.imports.named || item.imports.named.length === 0)) {
                    entryLines.push(\`import "\${specifier}";\`);
                    continue;
                }
                entryLines.push(\`import * as \${alias}_ns from "\${specifier}";\`);
                if (item.imports.namespace) {
                    entryLines.push(\`export const \${alias}_namespace = \${alias}_ns;\`);
                }
                if (item.imports.default) {
                    entryLines.push(\`export const \${alias}_default_export = \${alias}_ns.default;\`);
                }
                for (const named of item.imports.named || []) {
                    entryLines.push(\`export const \${named} = \${alias}_ns.\${named};\`);
                }
            }

            const tempEntry = path.join(cwd, "scripts", ".pulp-rebuild-entry.mjs");
            await fsp.writeFile(tempEntry, entryLines.join("\\n"), "utf8");
            await esbuild.build({
                entryPoints: [tempEntry],
                outfile: path.join(exportRoot, bundle.output.split("/").join(path.sep)),
                bundle: true,
                format: "esm",
                platform: "neutral",
                treeShaking: true,
                sourcemap: false,
                logLevel: "silent",
                absWorkingDir: destinationRoot
            });
            await fsp.rm(tempEntry, { force: true });
            report.bundleRebuilt = true;
        } catch (error) {
            report.bundleRebuilt = false;
            report.bundleRebuildError = error.message;
        }
    }
}

console.log(JSON.stringify(report, null, 2));
if (cleanupDir) {
    await fsp.rm(cleanupDir, { recursive: true, force: true });
}
`;

    await fsp.writeFile(scriptPath, script, "utf8");
}

async function buildExtraction({
    rootDir,
    selectedRelativePaths,
    includeDependencies = true,
    bundleDependencies = false,
    minimizeMode = "none",
    outputZipPath
}) {
    if (!selectedRelativePaths || selectedRelativePaths.length === 0) {
        throw new Error("No files selected.");
    }

    const entryFiles = selectedRelativePaths.map((rel) => path.resolve(rootDir, rel));
    for (const entry of entryFiles) {
        if (!(await fileExists(entry))) {
            throw new Error(`Selected file does not exist: ${entry}`);
        }
    }

    let filesToCopy = new Set(entryFiles);
    if (includeDependencies) {
        const transitive = await collectTransitiveDependencies(entryFiles, rootDir);
        filesToCopy = transitive;
    }

    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "juice-extract-"));
    const payloadDir = path.join(tempDir, "payload");
    await ensureDirectory(payloadDir);

    const filesToCopyArray = [...filesToCopy];
    const selectedSet = new Set(entryFiles);
    const dependencyFiles = filesToCopyArray.filter((filePath) => !selectedSet.has(filePath));
    const dependencySet = new Set(dependencyFiles);
    const minimizeDependencies = minimizeMode === "dependencies";
    const minimizeEverything = minimizeMode === "everything";

    // Build dependency bundle first if requested and not combining everything
    let dependencyBundle = null;
    if (bundleDependencies && !minimizeEverything) {
        dependencyBundle = await buildDependencyBundle(entryFiles, rootDir, payloadDir, {
            minify: !!minimizeDependencies
        });
        // Use bundle path relative name for replacement
        dependencyBundle._pulpPayloadPath = "./pulp.mjs";
    }

    // Create a temporary directory with rewritten selected sources that import from pulp.mjs
    const tempJuiceDir = await fsp.mkdtemp(path.join(os.tmpdir(), "juice-selected-"));
    const tempEntryFiles = [];
    const externalDependencySpecifiers = new Set();

    for (const absolutePath of entryFiles) {
        const rel = toRelative(rootDir, absolutePath);
        const destPath = path.join(tempJuiceDir, rel.split("/").join(path.sep));
        await ensureDirectory(path.dirname(destPath));
        let src = await fsp.readFile(absolutePath, "utf8");
        const imports = extractImportsDetailed(src);

        if (dependencyBundle) {
            let modified = src;
            for (const imp of imports) {
                const spec = imp.specifier;
                const resolved = await resolveDependency(absolutePath, spec, rootDir);
                if (!resolved) continue;
                const relResolved = toRelative(rootDir, resolved);
                const idx = dependencyBundle.sources.indexOf(relResolved);
                if (idx === -1) continue;

                const bundleIndex = idx + 1;
                const bundleRel = dependencyBundle._pulpPayloadPath; // './pulp.mjs'

                let replacement = null;
                if (imp.sideEffectOnly) {
                    replacement = `import \"${bundleRel}\";`;
                } else if (imp.namespaceImport) {
                    replacement = `import { dep_${bundleIndex}_namespace as ${imp.namespaceImport} } from \"${bundleRel}\";`;
                } else {
                    const parts = [];
                    if (imp.defaultImport) parts.push(`dep_${bundleIndex}_default_export as ${imp.defaultImport}`);
                    if (imp.namedImports && imp.namedImports.length > 0) parts.push(...imp.namedImports);
                    replacement = `import { ${parts.join(", ")} } from \"${bundleRel}\";`;
                }

                const importRegex = new RegExp(`(import\\s+[\\s\\S]*?from\\s*)(["'])${escapeRegExp(spec)}\\2`, "g");
                const sideEffectRegex = new RegExp(`import\\s*(["'])${escapeRegExp(spec)}\\1`, "g");
                if (imp.sideEffectOnly) modified = modified.replace(sideEffectRegex, replacement);
                else modified = modified.replace(importRegex, replacement);
            }
            src = modified;
        } else if (includeDependencies && !bundleDependencies) {
            let modified = src;
            for (const imp of imports) {
                const spec = imp.specifier;
                const resolved = await resolveDependency(absolutePath, spec, rootDir);
                if (!resolved) continue;
                if (!dependencySet.has(resolved)) continue;

                const depRel = `./juice/${toRelative(rootDir, resolved)}`;
                externalDependencySpecifiers.add(depRel);

                const importRegex = new RegExp(`(import\\s+[\\s\\S]*?from\\s*)(["'])${escapeRegExp(spec)}\\2`, "g");
                const sideEffectRegex = new RegExp(`import\\s*(["'])${escapeRegExp(spec)}\\1`, "g");
                if (imp.sideEffectOnly) {
                    modified = modified.replace(sideEffectRegex, `import "${depRel}";`);
                } else {
                    modified = modified.replace(importRegex, `$1"${depRel}"`);
                }
            }
            src = modified;
        }

        await fsp.writeFile(destPath, src, "utf8");
        tempEntryFiles.push(destPath);
    }

    // Build juiced bundle from selected entry files. esbuild requires a single entry
    // when using outfile, so multi-select uses an auto-generated aggregator entry.
    const juicedOut = path.join(payloadDir, "juiced.mjs");
    let juicedEntryPoint = null;
    if (tempEntryFiles.length === 1) {
        juicedEntryPoint = tempEntryFiles[0];
    } else {
        const combinedEntryPath = path.join(tempJuiceDir, "__juiced-entry__.mjs");
        const combinedLines = [];
        let idx = 0;
        for (const entryFile of tempEntryFiles) {
            idx += 1;
            const specifier = toRelativeImportSpecifier(tempJuiceDir, entryFile);
            const exportName = `entry_${idx}`;
            combinedLines.push(`import * as ${exportName} from "${specifier}";`);
            combinedLines.push(`export { ${exportName} };`);
        }
        await fsp.writeFile(combinedEntryPath, combinedLines.join("\n"), "utf8");
        juicedEntryPoint = combinedEntryPath;
    }
    try {
        await esbuild.build({
            entryPoints: [juicedEntryPoint],
            outfile: juicedOut,
            bundle: true,
            format: "esm",
            platform: "neutral",
            treeShaking: true,
            sourcemap: false,
            logLevel: "silent",
            absWorkingDir: tempJuiceDir,
            external: ["./pulp.mjs", "pulp.mjs", ...externalDependencySpecifiers],
            ...getMinifyBuildOptions(!!minimizeEverything)
        });
    } catch (err) {
        await fsp.rm(tempJuiceDir, { recursive: true, force: true });
        throw err;
    }

    await fsp.rm(tempJuiceDir, { recursive: true, force: true });

    // If we created a dependency bundle, rewrite imports in selected files to point at the bundle
    async function rewriteSelectedImportsToBundle(dependencyBundle) {
        if (!dependencyBundle) return;
        const bundleOutput = dependencyBundle.output; // e.g., Pulp/pulp.mjs
        const importsMeta = dependencyBundle.imports || [];

        for (const absolutePath of entryFiles) {
            const rel = toRelative(rootDir, absolutePath);
            const payloadPath = path.join(payloadDir, "juice", rel.split("/").join(path.sep));
            let src;
            try {
                src = await fsp.readFile(payloadPath, "utf8");
            } catch {
                continue; // file may not be present
            }

            const imports = extractImportsDetailed(src);
            let modified = src;

            for (const imp of imports) {
                const spec = imp.specifier;
                const resolved = await resolveDependency(absolutePath, spec, rootDir);
                if (!resolved) continue;
                const relResolved = toRelative(rootDir, resolved);
                const idx = dependencyBundle.sources.indexOf(relResolved);
                if (idx === -1) continue; // not part of bundle

                // compute bundle path relative to the payload file
                const absBundlePath = path.join(payloadDir, bundleOutput.split("/").join(path.sep));
                let bundleRel = path.relative(path.dirname(payloadPath), absBundlePath).split(path.sep).join("/");
                if (!bundleRel.startsWith(".") && !bundleRel.startsWith("/")) bundleRel = "./" + bundleRel;

                const bundleIndex = idx + 1;

                let replacement = null;

                if (imp.sideEffectOnly) {
                    replacement = `import \"${bundleRel}\";`;
                } else if (imp.namespaceImport) {
                    // import * as X from 'spec' -> import { dep_N_namespace as X } from 'bundle'
                    replacement = `import { dep_${bundleIndex}_namespace as ${imp.namespaceImport} } from \"${bundleRel}\";`;
                } else {
                    const parts = [];
                    if (imp.defaultImport) {
                        parts.push(`dep_${bundleIndex}_default_export as ${imp.defaultImport}`);
                    }
                    if (imp.namedImports && imp.namedImports.length > 0) {
                        parts.push(...imp.namedImports);
                    }
                    replacement = `import { ${parts.join(", ")} } from \"${bundleRel}\";`;
                }

                // replace the import statement that references the original specifier
                const importRegex = new RegExp(`(import\\s+[\\s\\S]*?from\\s*)(["'])${escapeRegExp(spec)}\\2`, "g");
                const sideEffectRegex = new RegExp(`import\\s*(["'])${escapeRegExp(spec)}\\1`, "g");

                if (imp.sideEffectOnly) {
                    modified = modified.replace(sideEffectRegex, replacement);
                } else {
                    modified = modified.replace(importRegex, replacement);
                }
            }

            if (modified !== src) {
                await fsp.writeFile(payloadPath, modified, "utf8");
            }
        }
    }

    const git = await getGitSnapshot(rootDir);

    const sourceHashPairs = [];
    for (const absolutePath of filesToCopyArray) {
        sourceHashPairs.push([toRelative(rootDir, absolutePath), await sha256File(absolutePath)]);
    }
    const sourceHashes = Object.fromEntries(sourceHashPairs.sort((a, b) => a[0].localeCompare(b[0])));

    // If dependencies are not bundled but were requested, copy them into payload/juice
    if (includeDependencies && !bundleDependencies) {
        const shouldMinifySeparateDependencies = minimizeDependencies || minimizeEverything;
        for (const absolutePath of dependencyFiles) {
            const targetPath = path.join(payloadDir, "juice", toRelative(rootDir, absolutePath).split("/").join(path.sep));
            await ensureDirectory(path.dirname(targetPath));

            const canMinifyFile = shouldMinifySeparateDependencies && isLikelyCodeFile(absolutePath);
            if (!canMinifyFile) {
                await fsp.copyFile(absolutePath, targetPath);
                continue;
            }

            const raw = await fsp.readFile(absolutePath, "utf8");
            const transformed = await esbuild.transform(raw, {
                loader: getCodeLoaderForPath(absolutePath),
                format: "esm",
                target: "esnext",
                minify: true,
                legalComments: "none",
                sourcemap: false
            });
            await fsp.writeFile(targetPath, transformed.code, "utf8");
        }
    }

    const selectedEntries = [
        {
            kind: "bundle",
            output: "juiced.mjs",
            sources: entryFiles.map((p) => toRelative(rootDir, p))
        }
    ];

    const includedDependencyEntries =
        includeDependencies && !bundleDependencies
            ? dependencyFiles.map((absolutePath) => ({
                  kind: "dependency",
                  source: toRelative(rootDir, absolutePath),
                  output: normalizeSlashes(path.join("juice", toRelative(rootDir, absolutePath)))
              }))
            : [];

    const finalEntries = [...selectedEntries, ...includedDependencyEntries];

    const metadata = {
        createdAt: new Date().toISOString(),
        rootDir,
        git,
        selectedFiles: ["juiced.mjs"],
        includeDependencies,
        bundleDependencies,
        fileCount: 1 + (dependencyBundle ? 1 : 0) + includedDependencyEntries.length,
        sourceHashes,
        entries: finalEntries,
        bundledDependencies: dependencyBundle
                ? [
                  {
                      kind: "dependency-bundle",
                      output: "pulp.mjs",
                      sources: dependencyBundle.sources,
                      imports: dependencyBundle.imports,
                      importRegistry: dependencyBundle.importRegistry,
                      skippedDuplicateNamedImports: dependencyBundle.skippedDuplicateNamedImports
                  }
              ]
            : []
    };
    await fsp.writeFile(path.join(payloadDir, "extract-manifest.json"), JSON.stringify(metadata, null, 2), "utf8");

    const outputFiles = await listDirectoryFilesWithSizes(payloadDir);
    const expectedExportBytes = outputFiles.reduce((sum, item) => sum + (item.bytes || 0), 0);
    metadata.outputFiles = outputFiles;
    metadata.expectedExportBytes = expectedExportBytes;

    await createZipFromDirectory(payloadDir, outputZipPath);
    try {
        const zipStat = await fsp.stat(outputZipPath);
        metadata.outputZipBytes = zipStat.size;
    } catch {
        metadata.outputZipBytes = null;
    }
    await fsp.rm(tempDir, { recursive: true, force: true });

    return metadata;
}

module.exports = {
    listFiles,
    buildFileTree,
    collectTransitiveDependencies,
    buildExtraction
};
