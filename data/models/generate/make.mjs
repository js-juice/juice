import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toSnakePlural } from "./util.mjs";

const JS_TYPE_MAP = {
    int: "integer",
    integer: "integer",
    bool: "boolean",
    boolean: "boolean",
    array: "json",
    json: "json",
    object: "json",
    collection: "json",
    date: "date",
    datetime: "date",
    timestamp: "date",
    float: "float",
    double: "float",
    decimal: "float"
};

function stripPhp(value = "") {
    return value.replace(/^<\?php\s*/u, "");
}

function unquote(text) {
    if (!text) return text;
    const quote = text[0];
    const body = text.slice(1, -1);
    if (quote === "'") return body.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    return body.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function tokenize(source) {
    const tokens = [];
    let index = 0;

    const push = (type, value) => tokens.push({ type, value });
    const isIdentifierStart = (char) => /[A-Za-z_]/.test(char);
    const isIdentifierPart = (char) => /[A-Za-z0-9_:\\]/.test(char);

    while (index < source.length) {
        const char = source[index];
        const next = source[index + 1];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === "/" && next === "/") {
            index = source.indexOf("\n", index);
            if (index < 0) break;
            continue;
        }

        if (char === "#") {
            index = source.indexOf("\n", index);
            if (index < 0) break;
            continue;
        }

        if (char === "/" && next === "*") {
            const end = source.indexOf("*/", index + 2);
            index = end < 0 ? source.length : end + 2;
            continue;
        }

        if (char === "'" || char === '"') {
            const quote = char;
            let end = index + 1;
            while (end < source.length) {
                if (source[end] === "\\" && end + 1 < source.length) {
                    end += 2;
                    continue;
                }
                if (source[end] === quote) break;
                end += 1;
            }
            push("string", unquote(source.slice(index, end + 1)));
            index = end + 1;
            continue;
        }

        if (char === "=" && next === ">") {
            push("arrow", "=>");
            index += 2;
            continue;
        }

        if ("[](),;".includes(char)) {
            push(char, char);
            index += 1;
            continue;
        }

        if (/[0-9.-]/.test(char)) {
            let end = index + 1;
            while (end < source.length && /[0-9._-]/.test(source[end])) end += 1;
            const raw = source.slice(index, end).replace(/_/g, "");
            push("number", raw.includes(".") ? Number.parseFloat(raw) : Number.parseInt(raw, 10));
            index = end;
            continue;
        }

        if (isIdentifierStart(char)) {
            let end = index + 1;
            while (end < source.length && isIdentifierPart(source[end])) end += 1;
            push("identifier", source.slice(index, end));
            index = end;
            continue;
        }

        index += 1;
    }

    return tokens;
}

class PhpArrayParser {
    constructor(tokens, constants = {}) {
        this.tokens = tokens;
        this.constants = constants;
        this.index = 0;
    }

    current() {
        return this.tokens[this.index] || null;
    }

    next() {
        const token = this.current();
        this.index += 1;
        return token;
    }

    matches(type) {
        return this.current()?.type === type;
    }

    expect(type) {
        const token = this.next();
        if (token?.type !== type) {
            throw new Error(`Expected token [${type}], received [${token?.type || "end"}].`);
        }
        return token;
    }

    parse() {
        return this.parseValue();
    }

    parseValue() {
        const token = this.current();
        if (!token) return null;

        if (token.type === "[") return this.parseArray();
        if (token.type === "string" || token.type === "number") return this.next().value;

        if (token.type === "identifier") {
            const value = this.next().value;
            const normalized = value.toLowerCase();
            if (normalized === "true") return true;
            if (normalized === "false") return false;
            if (normalized === "null") return null;
            if (value.startsWith("self::")) return this.constants[value.slice(6)] ?? value;
            return value;
        }

        return this.next().value;
    }

    parseArray() {
        this.expect("[");
        const entries = [];
        let associative = false;

        while (!this.matches("]") && this.current()) {
            if (this.matches(",")) {
                this.next();
                continue;
            }

            const first = this.parseValue();
            if (this.matches("arrow")) {
                associative = true;
                this.next();
                entries.push([first, this.parseValue()]);
            } else {
                entries.push([entries.length, first]);
            }

            if (this.matches(",")) this.next();
        }

        this.expect("]");

        if (!associative) return entries.map(([, value]) => value);

        const object = {};
        for (const [key, value] of entries) {
            object[String(key)] = value;
        }
        return object;
    }
}

function extractBalancedArray(source, startIndex) {
    const openIndex = source.indexOf("[", startIndex);
    if (openIndex < 0) throw new Error("Could not find properties array opening bracket.");

    let depth = 0;
    let quote = "";
    let escaped = false;

    for (let index = openIndex; index < source.length; index += 1) {
        const char = source[index];

        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === "\\") {
                escaped = true;
                continue;
            }
            if (char === quote) quote = "";
            continue;
        }

        if (char === "'" || char === '"') {
            quote = char;
            continue;
        }

        if (char === "[") depth += 1;
        if (char === "]") {
            depth -= 1;
            if (depth === 0) return source.slice(openIndex, index + 1);
        }
    }

    throw new Error("Could not find properties array closing bracket.");
}

function extractConstants(source) {
    const constants = {};
    const pattern = /public\s+const\s+([A-Z0-9_]+)\s*=\s*([^;]+);/g;
    let match;

    while ((match = pattern.exec(source))) {
        const [, name, rawValue] = match;
        const tokens = tokenize(rawValue.trim());
        constants[name] = new PhpArrayParser(tokens, constants).parse();
    }

    return constants;
}

function parseAssignedValue(source, pattern) {
    const match = source.match(pattern);
    if (!match) return undefined;
    const tokens = tokenize(match[1].trim());
    return new PhpArrayParser(tokens).parse();
}

function extractLaravelModel(source) {
    const php = stripPhp(source);
    const classMatch = php.match(/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (!classMatch) throw new Error("Could not find Laravel model class name.");

    const propertiesIndex = php.search(/protected\s+\$properties\s*=/);
    if (propertiesIndex < 0) throw new Error("Could not find protected $properties array.");

    const constants = extractConstants(php);
    const propertiesSource = extractBalancedArray(php, propertiesIndex);
    const properties = new PhpArrayParser(tokenize(propertiesSource), constants).parse();

    return {
        className: classMatch[1],
        properties,
        constants,
        tableName: parseAssignedValue(php, /protected\s+\$table\s*=\s*([^;]+);/),
        primaryKey: parseAssignedValue(php, /protected\s+\$primaryKey\s*=\s*([^;]+);/),
        timestamps: parseAssignedValue(php, /public\s+\$timestamps\s*=\s*([^;]+);/)
    };
}

function jsType(config = {}) {
    const type = config.cast || config.type || "string";
    return JS_TYPE_MAP[String(type).toLowerCase()] || "string";
}

function validationFromRules(rules = []) {
    const skip = new Set(["required", "nullable", "string", "boolean", "integer", "array", "date", "datetime"]);
    const tokens = [];

    for (const rule of Array.isArray(rules) ? rules : [rules]) {
        if (typeof rule !== "string") continue;
        const name = rule.split(":", 1)[0];
        if (!skip.has(name)) tokens.push(rule);
    }

    return tokens.length ? tokens.join("|") : null;
}

function buildModelData(modelName, properties = {}, options = {}) {
    const schema = {};
    const rules = {};
    const form = {};
    const format = {};

    for (const [property, config] of Object.entries(properties)) {
        const field = config && typeof config === "object" && !Array.isArray(config) ? config : {};
        schema[property] = {
            type: jsType(field)
        };

        for (const key of ["label", "fillable", "primaryKey", "autoIncrement", "null", "cast"]) {
            if (Object.prototype.hasOwnProperty.call(field, key)) schema[property][key] = field[key];
        }
        if (!schema[property].label && field.form?.label) schema[property].label = field.form.label;

        if (field.rules) {
            const ruleList = Array.isArray(field.rules) ? field.rules : [field.rules];
            rules[property] = ruleList.join("|");
        }

        const fieldFormat = field.format || field.form?.format;
        if (fieldFormat) format[property] = fieldFormat;

        if (field.form && typeof field.form === "object" && !Array.isArray(field.form)) {
            const formConfig = { ...field.form };
            const ruleList = field.rules ? (Array.isArray(field.rules) ? field.rules : [field.rules]) : [];
            if (!Object.prototype.hasOwnProperty.call(formConfig, "name")) formConfig.name = property;
            if (!Object.prototype.hasOwnProperty.call(formConfig, "required")) {
                formConfig.required = ruleList.includes("required");
            }
            if (!Object.prototype.hasOwnProperty.call(formConfig, "validation")) {
                const validation = validationFromRules(ruleList);
                if (validation) formConfig.validation = validation;
            }
            if (fieldFormat && !Object.prototype.hasOwnProperty.call(formConfig, "format")) {
                formConfig.format = fieldFormat;
            }
            form[property] = formConfig;
        }
    }

    return {
        modelName,
        tableName: options.tableName || toSnakePlural(modelName),
        primaryKey: options.primaryKey || "id",
        timestamps: options.timestamps ?? true,
        schema,
        rules,
        form,
        format
    };
}

function jsonBlock(value) {
    return JSON.stringify(value, null, 4).replace(/\n/g, "\n        ");
}

export function create(modelName, options = {}) {
    const data = buildModelData(modelName, options.properties || {}, options);
    const modelImportPath = options.modelImportPath || "../vendor/juice/data/models/Model.mjs";

    return `// Generated by juice/data/models/generate/make.mjs. Edit the source model, not this file.
import Model from "${modelImportPath}";

class ${data.modelName} extends Model {
    static tableName = "${data.tableName}";
    static primaryKey = "${data.primaryKey}";
    static timestamps = ${data.timestamps ? "true" : "false"};

    static get schema() {
        return ${jsonBlock(data.schema)};
    }

    static get rules() {
        return ${jsonBlock(data.rules)};
    }

    static get form() {
        return ${jsonBlock(data.form)};
    }

    static get format() {
        return ${jsonBlock(data.format)};
    }
}

export default ${data.modelName};
`;
}

export function from(sourceType, source, modelName = null, options = {}) {
    if (sourceType !== "laravel") {
        throw new Error(
            `Source type not implemented. Add an implementation for ${sourceType} in juice/data/models/generate/${sourceType}.mjs`
        );
    }

    const parsed = extractLaravelModel(source);
    return create(modelName || parsed.className, {
        ...options,
        tableName: options.tableName || parsed.tableName,
        primaryKey: options.primaryKey || parsed.primaryKey,
        timestamps: options.timestamps ?? parsed.timestamps,
        properties: parsed.properties
    });
}

function resolveModelImport(outputPath, baseModelPath) {
    let importPath = path.relative(path.dirname(outputPath), baseModelPath).replace(/\\/g, "/");
    if (!importPath.startsWith(".")) importPath = `./${importPath}`;
    return importPath;
}

function parseArgs(argv) {
    const args = { sourceType: "laravel" };
    const positional = [];

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--out" || arg === "-o") {
            args.out = argv[index + 1];
            index += 1;
        } else if (arg === "--name") {
            args.name = argv[index + 1];
            index += 1;
        } else if (arg === "--base") {
            args.base = argv[index + 1];
            index += 1;
        } else if (arg === "--source" || arg === "--type") {
            args.sourceType = argv[index + 1];
            index += 1;
        } else {
            positional.push(arg);
        }
    }

    args.source = positional[0];
    return args;
}

function runCli() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.source) {
        throw new Error(
            "Laravel model path is required. Example: node resources/js/vendor/juice/data/models/generate/make.mjs app/Models/Onboarding.php --out resources/js/models/Onboarding.mjs"
        );
    }

    const sourcePath = path.resolve(process.cwd(), args.source);
    const source = fs.readFileSync(sourcePath, "utf8");
    const parsed = extractLaravelModel(source);
    const modelName = args.name || parsed.className;
    const outputPath = path.resolve(process.cwd(), args.out || `resources/js/models/${modelName}.mjs`);
    const basePath = path.resolve(process.cwd(), args.base || "resources/js/vendor/juice/data/models/Model.mjs");
    const modelImportPath = resolveModelImport(outputPath, basePath);
    const code = create(modelName, {
        properties: parsed.properties,
        modelImportPath,
        tableName: parsed.tableName,
        primaryKey: parsed.primaryKey,
        timestamps: parsed.timestamps
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, code);
    console.log(`Generated ${path.relative(process.cwd(), outputPath).replace(/\\/g, "/")}`);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
    runCli();
}
