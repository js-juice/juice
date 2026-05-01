/**
 * @file JSDOC_SPEC.js
 * @module JSDOC_SPEC
 * @description
 * Canonical JSDoc specification for Juice source files.
 * A JSDoc Reader can import this file and enforce consistent docs,
 * then generate structured documentation per source file.
 *
 * This file intentionally includes:
 * 1) machine-readable spec metadata,
 * 2) required/optional tags by symbol kind,
 * 3) concrete JSDoc block examples,
 * 4) lightweight helpers for readers.
 */

const JSDOC_SPEC_VERSION = "1.0.0";

/**
 * Core tag glossary recognized by the reader.
 * `required` means tag is mandatory for at least one symbol kind.
 */
const TAGS = {
    file: { required: true, description: "Documents the file path/name." },
    module: { required: true, description: "Defines logical module name." },
    description: { required: true, description: "Human-readable summary." },
    class: { required: false, description: "Marks class symbols." },
    function: { required: false, description: "Marks function symbols." },
    param: { required: false, description: "Documents function parameters." },
    returns: { required: false, description: "Documents return type/value." },
    property: { required: false, description: "Documents object/class properties." },
    typedef: { required: false, description: "Defines reusable type aliases." },
    example: { required: false, description: "Executable usage examples." },
    throws: { required: false, description: "Error contracts." },
    see: { required: false, description: "Cross-reference or URL." },
    since: { required: false, description: "Version availability." },
    deprecated: { required: false, description: "Deprecation lifecycle details." }
};

/**
 * Required tags by symbol kind.
 * A JSDoc Reader can validate blocks by their inferred kind.
 */
const REQUIRED_TAGS_BY_KIND = {
    file: ["file", "module", "description"],
    typedef: ["typedef", "description"],
    class: ["class", "description"],
    method: ["description"],
    function: ["function", "description"],
    constant: ["description"],
    property: ["property", "description"]
};

/**
 * Recommended tag order for consistent parsing and output readability.
 */
const TAG_ORDER = [
    "file",
    "module",
    "description",
    "typedef",
    "property",
    "class",
    "function",
    "param",
    "returns",
    "throws",
    "example",
    "see",
    "since",
    "deprecated"
];

/**
 * Syntax constraints for parser compatibility.
 */
const FORMAT_RULES = {
    requireBlockStyle: true,
    requireTypes: true,
    allowSingleLineBlocks: false,
    allowMarkdownInDescription: true,
    requireParamNameAndType: true,
    requireReturnsTypeWhenPresent: true,
    requireFileBlockAtTop: true,
    normalizeWhitespace: true
};

/**
 * Example blocks that can be copied into any source file.
 * `template` should parse as plain JSDoc by standard readers.
 */
const EXAMPLES = {
    fileHeader: {
        kind: "file",
        template: `/**
 * @file src/example/math-tools.mjs
 * @module math-tools
 * @description Utility functions for numeric formatting and math-safe operations.
 * @since 1.0.0
 * @see {@link https://github.com/js-juice/juice}
 */`
    },

    typedef: {
        kind: "typedef",
        template: `/**
 * @typedef {Object} BetPlan
 * @description Normalized bet plan data returned from strategy calculations.
 * @property {number} steps Total number of steps in the plan.
 * @property {number[]} bets Bet amount for each step.
 * @property {number[]} profits Expected profit at each step.
 */`
    },

    functionDoc: {
        kind: "function",
        template: `/**
 * Calculate weighted payout targets.
 * @function buildProfitCurveWeights
 * @param {number} stepCount Number of steps to generate.
 * @param {("flat"|"early"|"middle"|"late")} [mode="flat"] Weight distribution mode.
 * @param {number} [peakBoost=1] Additional emphasis applied to the selected curve region.
 * @returns {number[]} Weights array with one value per step.
 * @throws {TypeError} Thrown when stepCount is invalid.
 * @example
 * const weights = buildProfitCurveWeights(5, "middle", 1.2);
 * // [1, 1.3, 1.6, 1.3, 1]
 */`
    },

    classDoc: {
        kind: "class",
        template: `/**
 * Data normalization helper for chart payload generation.
 * @class ChartData
 * @param {Array<*>} [dataset=[]] Input dataset to normalize.
 * @param {Object} [config={}] Chart configuration overrides.
 * @example
 * const cd = new ChartData([{ x: 1, y: 10 }, { x: 2, y: 12 }]);
 * const payload = cd.initialize().toChartPayload();
 */`
    },

    methodDoc: {
        kind: "method",
        template: `/**
 * Returns compact payload intended for chart renderers.
 * @param {boolean} [withAxis=true] Include axis metadata when true.
 * @returns {{ labels: string[], datasets: Object[], axis?: Object }}
 */`
    }
};

/**
 * Reader-facing schema for emitted documentation payloads.
 */
const READER_OUTPUT_SCHEMA = {
    file: {
        path: "string",
        module: "string",
        description: "string"
    },
    symbols: [
        {
            kind: "file|typedef|class|method|function|constant|property",
            name: "string",
            description: "string",
            params: [
                {
                    name: "string",
                    type: "string",
                    optional: "boolean",
                    default: "string|number|boolean|null"
                }
            ],
            returns: {
                type: "string",
                description: "string"
            },
            examples: ["string"],
            since: "string",
            deprecated: "string|boolean"
        }
    ],
    errors: [
        {
            code: "string",
            message: "string",
            line: "number"
        }
    ]
};

/**
 * Returns full spec payload for a JSDoc Reader.
 * @returns {Object}
 */
function getJSDocSpec() {
    return {
        version: JSDOC_SPEC_VERSION,
        tags: TAGS,
        requiredTagsByKind: REQUIRED_TAGS_BY_KIND,
        tagOrder: TAG_ORDER,
        formatRules: FORMAT_RULES,
        examples: EXAMPLES,
        readerOutputSchema: READER_OUTPUT_SCHEMA
    };
}

/**
 * Creates a pre-filled file-level JSDoc block for a source file.
 * @param {Object} meta
 * @param {string} meta.file File path or name.
 * @param {string} meta.module Module name.
 * @param {string} meta.description Human-readable summary.
 * @param {string} [meta.since]
 * @returns {string}
 */
function createFileHeaderTemplate(meta) {
    const file = meta && meta.file ? String(meta.file) : "src/example/file.mjs";
    const mod = meta && meta.module ? String(meta.module) : "example-module";
    const description = meta && meta.description ? String(meta.description) : "Describe this file.";
    const since = meta && meta.since ? String(meta.since) : "";

    const lines = ["/**", ` * @file ${file}`, ` * @module ${mod}`, ` * @description ${description}`];

    if (since) {
        lines.push(` * @since ${since}`);
    }

    lines.push(" */");
    return lines.join("\n");
}

/**
 * Validates whether required tags exist for a symbol kind.
 * @param {string} kind Symbol kind.
 * @param {string[]} tags Present tags.
 * @returns {{ valid: boolean, missing: string[] }}
 */
function validateRequiredTags(kind, tags) {
    const expected = REQUIRED_TAGS_BY_KIND[kind] || [];
    const present = Array.isArray(tags) ? tags : [];
    const missing = expected.filter((tag) => !present.includes(tag));
    return {
        valid: missing.length === 0,
        missing
    };
}

const JSDOC_SPEC = getJSDocSpec();

module.exports = {
    JSDOC_SPEC_VERSION,
    TAGS,
    REQUIRED_TAGS_BY_KIND,
    TAG_ORDER,
    FORMAT_RULES,
    EXAMPLES,
    READER_OUTPUT_SCHEMA,
    getJSDocSpec,
    createFileHeaderTemplate,
    validateRequiredTags,
    default: JSDOC_SPEC
};
