/**
 * Model file generator for creating model classes from templates.
 * CLI utility for scaffolding database models.
 * @module DB/Model/make
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Converts camelCase string to snake_case plural.
 * @private
 * @param {string} str - String to convert
 * @returns {string} snake_case plural string
 */
function toSnakePlural(str) {
    return (
        str
            // Insert underscore before each capital letter (except the first)
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            // Lowercase everything
            .toLowerCase() +
        // Add "s" for plural (basic pluralization)
        "s"
    );
}

const target = process.argv[2];

if (!target) {
    throw new Error("Model name or path is required. Example: node vendor/juice/data/models/make.mjs data/models/User");
}

const normalizedTarget = target.replace(/\\/g, "/");
const parsedTarget = path.posix.parse(normalizedTarget);
const dir = parsedTarget.dir;
const modelName = parsedTarget.name;
const tableName = toSnakePlural(modelName);
const modelPath = path.resolve(process.cwd(), dir || ".", `${modelName}.mjs`);
const baseModelPath = path.resolve(process.cwd(), "vendor", "juice", "data", "models", "Model.mjs");
let modelImportPath = path.relative(path.dirname(modelPath), baseModelPath).replace(/\\/g, "/");

if (!modelImportPath.startsWith(".")) {
    modelImportPath = `./${modelImportPath}`;
}

const code = `
import Model from "${modelImportPath}";


class ${modelName} extends Model {

    static get tableName() {
        return "${tableName}";
    }

    static get primaryKey() {
        return "id";
    }

    static get schema() {
        return {
            id: { type: "integer", primaryKey: true, autoIncrement: true },
            created_at: { type: "datetime", null: true },
            updated_at: { type: "datetime", null: true }
        };
    }
}

export default ${modelName};
`;

fs.mkdirSync(path.dirname(modelPath), { recursive: true });
fs.writeFileSync(modelPath, code.trimStart());
