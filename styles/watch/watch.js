import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CHECK_CSS_PROPERTIES, UNITLESS_PROPERTIES as EXPORTED_UNITLESS_PROPERTIES } from "../property-list.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const watchArgument = process.argv[2];
const outputArgument = process.argv[3];

if (!watchArgument || !outputArgument) {
    console.error("Usage: node watcher.mjs <watch-directory> <output-file-or-directory>");
    process.exit(1);
}

const watchDir = path.resolve(process.cwd(), watchArgument);
const outputArgumentPath = path.resolve(process.cwd(), outputArgument);

const outputFile =
    path.extname(outputArgumentPath).toLowerCase() === ".css"
        ? outputArgumentPath
        : path.join(outputArgumentPath, "generated.css");

const SUPPORTED_EXTENSIONS = new Set([
    ".html",
    ".htm",
    ".tpl",
    ".vue",
    ".svelte",
    ".astro",
    ".php",
    ".blade.php",
    ".js",
    ".mjs",
    ".cjs",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".scss",
    ".sass",
    ".less"
]);

const IGNORED_DIRECTORIES = new Set([
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    "vendor",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".cache"
]);

const UNITLESS_PROPERTIES = new Set(
    EXPORTED_UNITLESS_PROPERTIES ?? [
        "zIndex",
        "opacity",
        "fontWeight",
        "lineHeight",
        "flex",
        "flexGrow",
        "flexShrink",
        "order"
    ]
);

const DEFAULT_UNIT = "%";
const REBUILD_DELAY = 30;

const CLASS_ATTRIBUTE = /\bclass(?:Name)?\s*(?:=|:)\s*(["'`])([\s\S]*?)\1/g;

const CLASS_LIST_CALL = /\bclassList\.(?:add|remove|toggle|contains|replace)\s*\(([^)]*)\)/g;

const BLADE_CLASS_DIRECTIVE = /@class\s*\(\s*\[([\s\S]*?)\]\s*\)/g;

const STRING_LITERAL = /(["'`])([\s\S]*?)\1/g;

/*
 * Absolute filepath -> Set<className>
 */
const fileClassCache = new Map();

/*
 * className -> number of files using it
 */
const classReferenceCounts = new Map();

/*
 * className -> resolved declarations or null
 */
const resolvedClassCache = new Map();

let rebuildTimer = null;
let initialScanComplete = false;
let writeInProgress = false;
let writeRequested = false;
let lastWrittenCSS = null;

function normalizePath(filePath) {
    return path.resolve(filePath);
}

function isOutputFile(filePath) {
    return normalizePath(filePath) === outputFile;
}

function isIgnoredDirectory(filePath) {
    const relativePath = path.relative(watchDir, filePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return false;
    }

    return relativePath.split(path.sep).some((segment) => IGNORED_DIRECTORIES.has(segment));
}

function getExtension(filePath) {
    const lowerPath = filePath.toLowerCase();

    if (lowerPath.endsWith(".blade.php")) {
        return ".blade.php";
    }

    return path.extname(lowerPath);
}

function isSupportedFile(filePath) {
    return SUPPORTED_EXTENSIONS.has(getExtension(filePath));
}

function shouldIgnore(filePath, stats) {
    const absolutePath = normalizePath(filePath);

    if (isOutputFile(absolutePath)) {
        return true;
    }

    if (isIgnoredDirectory(absolutePath)) {
        return true;
    }

    /*
     * Chokidar calls ignored once without stats and again with stats.
     * Do not reject an unknown path because it might be a directory that
     * must be traversed.
     */
    if (stats?.isFile()) {
        return !isSupportedFile(absolutePath);
    }

    return false;
}

function addClasses(classes, value) {
    String(value)
        .split(/\s+/)
        .map((className) => className.trim())
        .filter(Boolean)
        .forEach((className) => {
            /*
             * Runtime-generated class names cannot be determined safely by
             * a build-time scanner.
             */
            if (
                className.includes("${") ||
                className.includes("{{") ||
                className.includes("}}") ||
                className.includes("<%") ||
                className.includes("%>")
            ) {
                return;
            }

            classes.add(className);
        });
}

function extractClassList(contents) {
    const classes = new Set();
    let match;

    CLASS_ATTRIBUTE.lastIndex = 0;

    while ((match = CLASS_ATTRIBUTE.exec(contents)) !== null) {
        addClasses(classes, match[2]);
    }

    CLASS_LIST_CALL.lastIndex = 0;

    while ((match = CLASS_LIST_CALL.exec(contents)) !== null) {
        STRING_LITERAL.lastIndex = 0;

        let literal;

        while ((literal = STRING_LITERAL.exec(match[1])) !== null) {
            addClasses(classes, literal[2]);
        }
    }

    BLADE_CLASS_DIRECTIVE.lastIndex = 0;

    while ((match = BLADE_CLASS_DIRECTIVE.exec(contents)) !== null) {
        STRING_LITERAL.lastIndex = 0;

        let literal;

        while ((literal = STRING_LITERAL.exec(match[1])) !== null) {
            addClasses(classes, literal[2]);
        }
    }

    return classes;
}

function incrementClassReference(className) {
    const currentCount = classReferenceCounts.get(className) ?? 0;

    classReferenceCounts.set(className, currentCount + 1);

    return currentCount === 0;
}

function decrementClassReference(className) {
    const currentCount = classReferenceCounts.get(className) ?? 0;

    if (currentCount <= 1) {
        classReferenceCounts.delete(className);
        resolvedClassCache.delete(className);
        return currentCount === 1;
    }

    classReferenceCounts.set(className, currentCount - 1);

    return false;
}

async function updateFile(filePath) {
    const absolutePath = normalizePath(filePath);

    if (isOutputFile(absolutePath) || !isSupportedFile(absolutePath)) {
        return;
    }

    let contents;

    try {
        contents = await fs.readFile(absolutePath, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            removeFile(absolutePath);
            return;
        }

        console.error(`Unable to read ${absolutePath}:`, error);

        return;
    }

    const previousClasses = fileClassCache.get(absolutePath) ?? new Set();

    const nextClasses = extractClassList(contents);

    let globalClassSetChanged = false;

    for (const className of previousClasses) {
        if (!nextClasses.has(className)) {
            if (decrementClassReference(className)) {
                globalClassSetChanged = true;
            }
        }
    }

    for (const className of nextClasses) {
        if (!previousClasses.has(className)) {
            if (incrementClassReference(className)) {
                globalClassSetChanged = true;
            }
        }
    }

    fileClassCache.set(absolutePath, nextClasses);

    /*
     * During Chokidar's initial scan, wait until "ready" before writing.
     */
    if (initialScanComplete && globalClassSetChanged) {
        scheduleBuild();
    }
}

function removeFile(filePath) {
    const absolutePath = normalizePath(filePath);
    const previousClasses = fileClassCache.get(absolutePath);

    if (!previousClasses) {
        return;
    }

    let globalClassSetChanged = false;

    for (const className of previousClasses) {
        if (decrementClassReference(className)) {
            globalClassSetChanged = true;
        }
    }

    fileClassCache.delete(absolutePath);

    if (initialScanComplete && globalClassSetChanged) {
        scheduleBuild();
    }
}

function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
}

function isStyleObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0 &&
        Object.values(value).every((item) => typeof item === "string")
    );
}

function toKebabCase(property) {
    return property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function decodeValue(rawValue) {
    return (
        rawValue
            /*
             * Decimal encoding:
             * 1o5 -> 1.5
             */
            .replace(/(\d)o(?=\d)/g, "$1.")

            /*
             * Optional class-safe encodings:
             * "_" represents a space
             * "|" represents a comma
             */
            .replace(/_/g, " ")
            .replace(/\|/g, ",")
    );
}

function isNumeric(value) {
    return /^-?\d+(?:\.\d+)?$/.test(value);
}

function isZero(value) {
    return /^-?0+(?:\.0+)?$/.test(value);
}

function normalizeValue(rawValue, property, template) {
    const value = decodeValue(rawValue);

    if (isZero(value)) {
        return "0";
    }

    if (UNITLESS_PROPERTIES.has(property) && isNumeric(value)) {
        return value;
    }

    /*
     * Scale values are also unitless when used in scale(...).
     */
    if (template.includes("scale(@)") && isNumeric(value)) {
        return value;
    }

    /*
     * Bare numeric values default to percentages.
     *
     * 50       -> 50%
     * 1o5      -> 1.5%
     * 1o5rem   -> 1.5rem
     * 20px     -> 20px
     */
    if (isNumeric(value)) {
        return `${value}${DEFAULT_UNIT}`;
    }

    return value;
}

function isSafeCSSValue(value) {
    return value.length > 0 && !/[;{}]/.test(value) && !value.includes("/*") && !value.includes("*/");
}

function escapeClassName(className) {
    /*
     * Escape punctuation for CSS selectors:
     *
     * text:center -> .text\:center
     * width:50%   -> .width\:50\%
     */
    return className.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function resolveClass(className) {
    const parts = className.split(":").filter(Boolean);

    if (parts.length === 0) {
        return null;
    }

    let current = CHECK_CSS_PROPERTIES;
    let index = 0;

    /*
     * Traverse known property segments.
     *
     * padding:left:1o5rem
     * ├─ padding
     * ├─ left
     * └─ 1o5rem
     */
    while (index < parts.length && current !== null && typeof current === "object" && hasOwn(current, parts[index])) {
        current = current[parts[index]];
        index++;
    }

    /*
     * Static class:
     *
     * text:center
     */
    if (index === parts.length && isStyleObject(current)) {
        return current;
    }

    /*
     * Dynamic class:
     *
     * padding:1o2
     * padding:left:1o5rem
     */
    if (
        current === null ||
        typeof current !== "object" ||
        !hasOwn(current, "$") ||
        !isStyleObject(current.$) ||
        index >= parts.length
    ) {
        return null;
    }

    const rawValue = parts.slice(index).join(":");

    if (!isSafeCSSValue(rawValue)) {
        return null;
    }

    return Object.fromEntries(
        Object.entries(current.$).map(([property, template]) => {
            const value = normalizeValue(rawValue, property, template);

            return [property, template.replaceAll("@", value)];
        })
    );
}

function getResolvedClass(className) {
    if (resolvedClassCache.has(className)) {
        return resolvedClassCache.get(className);
    }

    const declarations = resolveClass(className);

    /*
     * Cache null results too, preventing repeated attempts to resolve
     * ordinary classes that do not belong to this utility system.
     */
    resolvedClassCache.set(className, declarations);

    return declarations;
}

function serializeClass(className, declarations) {
    const selector = `.${escapeClassName(className)}`;

    const body = Object.entries(declarations)
        .map(([property, value]) => {
            return `    ${toKebabCase(property)}: ${value};`;
        })
        .join("\n");

    return `${selector} {\n${body}\n}`;
}

function generateStyleSheet() {
    const blocks = [];

    for (const className of classReferenceCounts.keys()) {
        const declarations = getResolvedClass(className);

        if (!declarations) {
            continue;
        }

        blocks.push(serializeClass(className, declarations));
    }

    return blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
}

async function writeStyleSheet() {
    /*
     * Prevent overlapping filesystem writes. If another rebuild is
     * requested while writing, perform it immediately afterward.
     */
    if (writeInProgress) {
        writeRequested = true;
        return;
    }

    writeInProgress = true;

    try {
        do {
            writeRequested = false;

            const stylesheet = generateStyleSheet();

            if (stylesheet === lastWrittenCSS) {
                continue;
            }

            await fs.mkdir(path.dirname(outputFile), { recursive: true });

            /*
             * On the first build, compare against the existing file so a
             * watcher restart does not cause an unnecessary write.
             */
            if (lastWrittenCSS === null) {
                try {
                    lastWrittenCSS = await fs.readFile(outputFile, "utf8");
                } catch (error) {
                    if (error.code !== "ENOENT") {
                        throw error;
                    }

                    lastWrittenCSS = "";
                }
            }

            if (stylesheet === lastWrittenCSS) {
                continue;
            }

            await fs.writeFile(outputFile, stylesheet, "utf8");

            lastWrittenCSS = stylesheet;

            const generatedCount = [...classReferenceCounts.keys()].reduce((count, className) => {
                return getResolvedClass(className) ? count + 1 : count;
            }, 0);

            console.log(`Generated ${generatedCount} classes → ${outputFile}`);
        } while (writeRequested);
    } catch (error) {
        console.error("Unable to write stylesheet:", error);
    } finally {
        writeInProgress = false;
    }
}

function scheduleBuild() {
    if (rebuildTimer !== null) {
        clearTimeout(rebuildTimer);
    }

    rebuildTimer = setTimeout(() => {
        rebuildTimer = null;
        void writeStyleSheet();
    }, REBUILD_DELAY);
}

if (!existsSync(watchDir)) {
    console.error(`Watch directory does not exist: ${watchDir}`);
    process.exit(1);
}

if (!CHECK_CSS_PROPERTIES || typeof CHECK_CSS_PROPERTIES !== "object") {
    console.error("CHECK_CSS_PROPERTIES must be an object.");
    process.exit(1);
}

console.log(`Watching: ${watchDir}`);
console.log(`Output:   ${outputFile}`);

const watcher = chokidar.watch(watchDir, {
    persistent: true,

    /*
     * Chokidar emits "add" events for existing files. Those events populate
     * the initial class cache before "ready".
     */
    ignoreInitial: false,

    /*
     * Avoid polling for normal local filesystems. Native filesystem events
     * generally use substantially less CPU.
     */
    usePolling: false,

    /*
     * Chokidar 5 no longer supports glob patterns. Filter files using the
     * ignored callback instead.
     */
    ignored: shouldIgnore,

    /*
     * Chokidar normally handles editor atomic writes automatically.
     */
    atomic: true,

    /*
     * Disabled for maximum responsiveness. Enable awaitWriteFinish only if
     * your editor produces incomplete reads.
     */
    awaitWriteFinish: false
});

watcher
    .on("add", (filePath) => {
        void updateFile(filePath);
    })
    .on("change", (filePath) => {
        void updateFile(filePath);
    })
    .on("unlink", (filePath) => {
        removeFile(filePath);
    })
    .on("ready", async () => {
        initialScanComplete = true;
        await writeStyleSheet();
        console.log("Initial scan complete. Watching...");
    })
    .on("error", (error) => {
        console.error("Watcher error:", error);
    });

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.log(`\nReceived ${signal}. Stopping...`);

    if (rebuildTimer !== null) {
        clearTimeout(rebuildTimer);
        rebuildTimer = null;
    }

    await writeStyleSheet();
    await watcher.close();

    process.exit(0);
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
