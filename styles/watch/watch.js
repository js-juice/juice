import chokidar from "chokidar";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import stylesConfig from "../config.mjs";
import { CHECK_CSS_PROPERTIES, UNITLESS_PROPERTIES as EXPORTED_UNITLESS_PROPERTIES } from "../property-list.mjs";

/**
 * Description placeholder
 *
 * @type {*}
 */
const __filename = fileURLToPath(import.meta.url);
/**
 * Description placeholder
 *
 * @type {*}
 */
const __dirname = path.dirname(__filename);

/**
 * Description placeholder
 *
 * @type {*}
 */
const argumentsAfterNode = process.argv.slice(2);
/**
 * Description placeholder
 *
 * @type {*}
 */
const outputArgument = argumentsAfterNode[argumentsAfterNode.length - 1];
/**
 * Description placeholder
 *
 * @type {*}
 */
const watchArguments = argumentsAfterNode.length > 1 ? argumentsAfterNode.slice(0, -1) : argumentsAfterNode;
/**
 * Description placeholder
 *
 * @type {boolean}
 */
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

/**
 * Description placeholder
 *
 * @type {*}
 */
const DEFAULT_WATCH_DIR = path.resolve(process.cwd(), "../../../scss");
/**
 * Description placeholder
 *
 * @type {*}
 */
const DEFAULT_VIEW_DIR = path.resolve(process.cwd(), "../../../views");
/**
 * Description placeholder
 *
 * @type {*}
 */
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "../../../css");

/**
 * Description placeholder
 *
 * @type {{}}
 */
const defaultWatchDirs = [DEFAULT_WATCH_DIR, DEFAULT_VIEW_DIR];

/**
 * Description placeholder
 *
 * @type {*}
 */
const watchDirs = isDirectExecution
    ? watchArguments.length > 0
        ? watchArguments.map((value) => path.resolve(process.cwd(), value))
        : defaultWatchDirs
    : defaultWatchDirs;
/**
 * Description placeholder
 *
 * @type {*}
 */
const outputArgumentPath = isDirectExecution
    ? path.resolve(process.cwd(), outputArgument || DEFAULT_OUTPUT_DIR)
    : DEFAULT_OUTPUT_DIR;

/**
 * Description placeholder
 *
 * @type {*}
 */
const outputFile =
    path.extname(outputArgumentPath).toLowerCase() === ".css"
        ? outputArgumentPath
        : path.join(outputArgumentPath, "generated.css");

/**
 * Description placeholder
 *
 * @type {*}
 */
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

/**
 * Description placeholder
 *
 * @type {*}
 */
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

/**
 * Description placeholder
 *
 * @type {*}
 */
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

/**
 * Description placeholder
 *
 * @type {"%"}
 */
const DEFAULT_UNIT = "%";
/**
 * Description placeholder
 *
 * @type {30}
 */
const REBUILD_DELAY = 30;

/**
 * Description placeholder
 *
 * @type {{}}
 */
const CLASS_ATTRIBUTE = /\bclass(?:Name)?\s*(?:=|:)\s*(["'`])([\s\S]*?)\1/g;

/**
 * Description placeholder
 *
 * @type {{}}
 */
const CLASS_LIST_CALL = /\bclassList\.(?:add|remove|toggle|contains|replace)\s*\(([^)]*)\)/g;

/**
 * Description placeholder
 *
 * @type {{}}
 */
const BLADE_CLASS_DIRECTIVE = /@class\s*\(\s*\[([\s\S]*?)\]\s*\)/g;

/**
 * Description placeholder
 *
 * @type {{}}
 */
const STRING_LITERAL = /(["'`])([\s\S]*?)\1/g;

/*
 * Absolute filepath -> Set<className>
 */
/**
 * Description placeholder
 *
 * @type {*}
 */
const fileClassCache = new Map();

/*
 * className -> number of files using it
 */
/**
 * Description placeholder
 *
 * @type {*}
 */
const classReferenceCounts = new Map();

/*
 * className -> resolved declarations or null
 */
/**
 * Description placeholder
 *
 * @type {*}
 */
const resolvedClassCache = new Map();

/**
 * Description placeholder
 *
 * @type {*}
 */
let rebuildTimer = null;
/**
 * Description placeholder
 *
 * @type {boolean}
 */
let initialScanComplete = false;
/**
 * Description placeholder
 *
 * @type {boolean}
 */
let writeInProgress = false;
/**
 * Description placeholder
 *
 * @type {boolean}
 */
let writeRequested = false;
/**
 * Description placeholder
 *
 * @type {*}
 */
let lastWrittenCSS = null;

function normalizePath(filePath) {
    return path.resolve(filePath);
}

function isOutputFile(filePath) {
    return normalizePath(filePath) === outputFile;
}

function isIgnoredDirectory(filePath) {
    const absolutePath = normalizePath(filePath);

    const isInWatchedTree = watchDirs.some((watchDir) => {
        const relativePath = path.relative(watchDir, absolutePath);

        return (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) || relativePath === "";
    });

    if (!isInWatchedTree) {
        return false;
    }

    for (const watchDir of watchDirs) {
        const relativePath = path.relative(watchDir, absolutePath);

        if (relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))) {
            return relativePath.split(path.sep).some((segment) => IGNORED_DIRECTORIES.has(segment));
        }
    }

    return false;
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

/**
 * Description placeholder
 *
 * @param {*} filePath
 * @param {*} stats
 * @returns {boolean}
 */
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

/**
 * Description placeholder
 *
 * @param {*} classes
 * @param {*} value
 */
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

/**
 * Description placeholder
 *
 * @param {*} contents
 * @returns {*}
 */
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

/**
 * Description placeholder
 *
 * @param {*} className
 * @returns {boolean}
 */
function incrementClassReference(className) {
    const currentCount = classReferenceCounts.get(className) ?? 0;

    classReferenceCounts.set(className, currentCount + 1);

    return currentCount === 0;
}

/**
 * Description placeholder
 *
 * @param {*} className
 * @returns {boolean}
 */
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

/**
 * Description placeholder
 *
 * @async
 * @param {*} filePath
 * @returns {*}
 */
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

/**
 * Description placeholder
 *
 * @param {*} filePath
 */
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

function mergeConfigMaps(...sources) {
    const merged = {};

    for (const source of sources) {
        if (!source || typeof source !== "object") {
            continue;
        }

        for (const [key, value] of Object.entries(source)) {
            if (value !== undefined && value !== null) {
                merged[key] = value;
            }
        }
    }

    return merged;
}

function normalizeMediaValue(value) {
    if (typeof value === "number") {
        return `${value}px`;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return "0";
        }

        if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
            return `${trimmed}px`;
        }

        return trimmed;
    }

    return "0";
}

function getScreenMap(config = stylesConfig) {
    return mergeConfigMaps(
        { xs: "0", sm: "576px", md: "768px", lg: "992px", xl: "1200px" },
        config?.screens,
        config?.breakpoints,
        config?.media,
        config?.mediaSizes,
        config?.abbreviations,
        config?.screenAliases
    );
}

/**
 * Description placeholder
 *
 * @param {*} [config=stylesConfig]
 * @returns {{}}
 */
function getStateMap(config = stylesConfig) {
    return mergeConfigMaps(
        {
            hover: ":hover",
            focus: ":focus",
            "focus-visible": ":focus-visible",
            active: ":active",
            visited: ":visited"
        },
        config?.states,
        config?.pseudos,
        config?.stateAliases
    );
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

/**
 * Description placeholder
 *
 * @param {*} value
 * @returns {*}
 */
function isStyleMethod(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0 &&
        Object.values(value).every((item) => typeof item === "function")
    );
}

/**
 * Description placeholder
 *
 * @param {*} property
 * @returns {*}
 */
function toKebabCase(property) {
    return property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function decodeValue(rawValue) {
    return (
        rawValue
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

/**
 * Description placeholder
 *
 * @param {*} rawValue
 * @param {*} property
 * @param {*} template
 * @returns {*}
 */
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
     * Dimensional numeric values require an explicit unit.
     *
     * width:50% -> 50%
     * padding:1.5rem -> 1.5rem
     * padding:1.5% -> 1.5%
     * 1.5rem   -> 1.5rem
     * 20px     -> 20px
     */
    if (isNumeric(value)) {
        if (REM_PROPERTIES.has(property) || PERCENT_PROPERTIES.has(property)) {
            return null;
        }

        return value;
    }

    return value;
}

/**
 * Description placeholder
 *
 * @param {*} value
 * @returns {boolean}
 */
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

    if (index === parts.length && hasOwn(current, "$") && isStyleMethod(current.$)) {
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
        index >= parts.length ||
        (parts.length - index > 1 && hasOwn(CHECK_CSS_PROPERTIES, parts[index]))
    ) {
        return null;
    }

    const rawValue = parts.slice(index).join(":");

    if (!isSafeCSSValue(rawValue)) {
        return null;
    }

    const declarations = [];

    for (const [property, template] of Object.entries(current.$)) {
        const value = normalizeValue(rawValue, property, template);

        if (value === null) {
            return null;
        }

        declarations.push([property, template.replaceAll("@", value)]);
    }

    return Object.fromEntries(declarations);
}

function getResolvedClass(className) {
    if (resolvedClassCache.has(className)) {
        return resolvedClassCache.get(className);
    }

    const declarations = parseClassContext(className)?.declarations ?? null;

    /*
     * Cache null results too, preventing repeated attempts to resolve
     * ordinary classes that do not belong to this utility system.
     */
    resolvedClassCache.set(className, declarations);

    return declarations;
}

function parseClassContext(className, config = stylesConfig) {
    if (!className || typeof className !== "string") {
        return null;
    }

    const parts = className.split(":").filter(Boolean);
    if (parts.length === 0) {
        return null;
    }

    const screens = getScreenMap(config);
    const states = getStateMap(config);
    const modifierParts = [];
    let mediaQuery = null;
    let selectorSuffix = "";
    let propertyParts = [];
    let sawUtilityStart = false;

    for (const part of parts) {
        if (!sawUtilityStart) {
            if (hasOwn(states, part)) {
                const stateValue = states[part];
                selectorSuffix += stateValue.startsWith(":") ? stateValue : `:${stateValue}`;
                modifierParts.push(part);
                continue;
            }

            if (hasOwn(screens, part)) {
                mediaQuery = `@media (min-width: ${normalizeMediaValue(screens[part])})`;
                modifierParts.push(part);
                continue;
            }

            sawUtilityStart = true;
        }

        propertyParts.push(part);
    }

    const remainder = propertyParts.join(":");
    const declarations = resolveClass(remainder);

    if (!declarations) {
        return null;
    }

    return {
        className,
        declarations,
        mediaQuery,
        selectorSuffix,
        selector: `.${escapeClassName(className)}${selectorSuffix}`
    };
}

function serializeClass(className, declarations, context = parseClassContext(className)) {
    const selector = context?.selector || `.${escapeClassName(className)}`;
    const body = Object.entries(declarations)
        .map(([property, value]) => {
            return `    ${toKebabCase(property)}: ${value};`;
        })
        .join("\n");

    if (context?.mediaQuery) {
        return `${context.mediaQuery} {\n    ${selector} {\n${body}\n    }\n}`;
    }

    return `${selector} {\n${body}\n}`;
}

/**
 * Description placeholder
 *
 * @returns {string}
 */
function generateStyleSheet() {
    const blocks = [];

    for (const className of classReferenceCounts.keys()) {
        const declarations = getResolvedClass(className);

        if (!declarations) {
            continue;
        }

        blocks.push(serializeClass(className, declarations, parseClassContext(className)));
    }

    return blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
}

/**
 * Description placeholder
 *
 * @async
 * @returns {*}
 */
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

/** Description placeholder */
function scheduleBuild() {
    if (rebuildTimer !== null) {
        clearTimeout(rebuildTimer);
    }

    rebuildTimer = setTimeout(() => {
        rebuildTimer = null;
        void writeStyleSheet();
    }, REBUILD_DELAY);
}

export { getResolvedClass, parseClassContext };

if (isDirectExecution) {
    if (!outputArgument) {
        console.error("Usage: node watcher.mjs <watch-directory> [<watch-directory> ...] <output-file-or-directory>");
        process.exit(1);
    }

    for (const watchDir of watchDirs) {
        if (!existsSync(watchDir)) {
            console.error(`Watch directory does not exist: ${watchDir}`);
            process.exit(1);
        }
    }

    if (!CHECK_CSS_PROPERTIES || typeof CHECK_CSS_PROPERTIES !== "object") {
        console.error("CHECK_CSS_PROPERTIES must be an object.");
        process.exit(1);
    }

    console.log(`Watching: ${watchDirs.join(", ")}`);
    console.log(`Output:   ${outputFile}`);

    const watcher = chokidar.watch(watchDirs, {
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
}
