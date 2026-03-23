/**
 * Database management module providing connection handling, model registration, and table operations.
 * Base database class for managing database connections and model instances.
 * @module DB/Database
 */

import EventEmitter from "../../juice/Event/Emitter.mjs";
import fs from "node:fs";
import path from "node:path";

/**
 * Base database class for managing database connections and models.
 * Extends EventEmitter to provide event-based notifications for database operations.
 * Subclasses should implement the abstract methods for specific database engines.
 * @class Database
 * @extends EventEmitter
 */
class Database extends EventEmitter {
    /** @type {Object<string, typeof Model>} Registered model classes by name */
    models = {};

    /** @type {Object<string, Object>} Model metadata indexed by table name */
    tables = {};

    /**
     * Creates a new database instance.
     * @param {*} db - The underlying database connection/instance
     */
    constructor(db) {
        super();
        this.db = db;
        this.initialize();
    }

    /**
     * Initialize the database connection and setup.
     * Override in subclasses to perform database-specific initialization.
     */
    initialize() {
        // Override in subclasses
    }

    /**
     * Gets a registered model class by name.
     * @param {string} name - The model name
     * @returns {typeof Model} The model class
     */
    model(name) {
        return this.models[name];
    }

    /**
     * Gets a model class by its table name.
     * @param {string} tableName - The table name
     * @returns {typeof Model} The model class
     */
    modelByTable(tableName) {
        return this.tables[tableName]?.model;
    }

    /**
     * Registers a model class with the database.
     * @param {typeof Model} Model - The model class to register
     */
    addModel(Model) {
        if (!Model) return;

        this.models[Model.name] = Model;

        if (Model.tableName) {
            this.tables[Model.tableName] = {
                model: Model,
                name: Model.name
            };
        }

        Model.useDatabase?.(this);
    }

    /**
     * Emits a 'deleted' event for records in a table.
     * @param {string} table - The table name
     * @param {Array} records - The deleted records
     */
    deleted(table, records) {
        const Model = this.modelByTable(table);
        if (Model) Model.emit("deleted", records);
    }

    /**
     * Emits a 'created' event for records in a table.
     * @param {string} table - The table name
     * @param {Array} records - The created records
     */
    created(table, records) {
        const Model = this.modelByTable(table);
        if (Model) Model.emit("created", records);
    }

    /**
     * Emits an 'updated' event for records in a table.
     * @param {string} table - The table name
     * @param {Array} records - The updated records
     */
    updated(table, records) {
        const Model = this.modelByTable(table);
        if (Model) Model.emit("updated", records);
    }

    /**
     * Checks if a table exists in the database.
     * @param {string} table - The table name
     * @returns {boolean} True if table exists
     * @abstract
     */
    hasTable(table) {
        throw new Error("hasTable() must be implemented by subclass");
    }

    /**
     * Creates a new table in the database.
     * @param {string} tableName - The table name
     * @param {Object} fields - Field definitions
     * @returns {*} Result of table creation
     * @abstract
     */
    createTable(tableName, fields) {
        throw new Error("createTable() must be implemented by subclass");
    }

    /**
     * Inserts a single record into a table.
     * @param {string} table - The table name
     * @param {Object} data - The data to insert
     * @returns {*} Result of insertion
     * @abstract
     */
    insert(table, data) {
        throw new Error("insert() must be implemented by subclass");
    }

    /**
     * Inserts multiple records into a table.
     * @param {string} table - The table name
     * @param {Array<Object>} records - The records to insert
     * @returns {*} Result of insertion
     * @abstract
     */
    insertAll(table, records) {
        throw new Error("insertAll() must be implemented by subclass");
    }

    /**
     * Retrieves a single record matching conditions.
     * @param {string} statement - SQL statement or table name
     * @param {Array} [args] - Query parameters
     * @returns {Object|null} The record or null
     * @abstract
     */
    get(statement, args) {
        throw new Error("get() must be implemented by subclass");
    }

    /**
     * Retrieves multiple records matching conditions.
     * @param {string} statement - SQL statement or table name
     * @param {Array} [args] - Query parameters
     * @returns {Array<Object>} The records
     * @abstract
     */
    all(statement, args) {
        throw new Error("all() must be implemented by subclass");
    }

    /**
     * Updates records in a table.
     * @param {string} table - The table name
     * @param {Object} data - The data to update
     * @param {Object} conditions - The WHERE conditions
     * @returns {*} Result of update
     * @abstract
     */
    update(table, data, conditions) {
        throw new Error("update() must be implemented by subclass");
    }

    /**
     * Updates multiple records in a table.
     * @param {string} table - The table name
     * @param {Array<Object>} records - The records to update
     * @returns {*} Result of update
     * @abstract
     */
    updateAll(table, records) {
        throw new Error("updateAll() must be implemented by subclass");
    }

    /**
     * Deletes records from a table.
     * @param {string} table - The table name
     * @param {Object} conditions - The WHERE conditions
     * @returns {*} Result of deletion
     * @abstract
     */
    delete(table, conditions) {
        throw new Error("delete() must be implemented by subclass");
    }

    /**
     * Executes a raw SQL statement.
     * @param {string} statement - The SQL statement
     * @param {Array} [args] - Query parameters
     * @returns {*} Result of execution
     * @abstract
     */
    run(statement, args) {
        throw new Error("run() must be implemented by subclass");
    }

    /**
     * Executes a raw SQL command.
     * @param {string} statement - The SQL statement
     * @returns {*} Result of execution
     * @abstract
     */
    exec(statement) {
        throw new Error("exec() must be implemented by subclass");
    }

    /**
     * Dynamically loads and registers all model files from a directory.
     * Scans the directory for JavaScript/module files, imports them, and registers each model.
     * @param {string} dir - The directory path containing model files
     * @returns {Promise<boolean>} Promise resolving to true when all models are loaded
     * @example
     * await db.loadModelDirectory('./models');
     */
    async loadModelDirectory(dir) {
        const loadModel = (modelPath) => {
            return import(modelPath)
                .then((module) => module.default)
                .catch((error) => {
                    console.error(`Failed to load model from ${modelPath}:`, error);
                    return null;
                });
        };

        const isFile = (fileName) => {
            try {
                return fs.lstatSync(fileName).isFile();
            } catch (error) {
                return false;
            }
        };

        try {
            const files = fs
                .readdirSync(dir)
                .map((fileName) => path.join(dir, fileName))
                .filter(isFile)
                .filter((filePath) => {
                    const ext = path.extname(filePath);
                    return ext === ".js" || ext === ".mjs" || ext === ".cjs";
                })
                .map(loadModel);

            const models = await Promise.all(files);

            models.forEach((model) => {
                if (model) {
                    this.addModel(model);
                }
            });

            return true;
        } catch (error) {
            console.error(`Failed to load models from directory ${dir}:`, error);
            return false;
        }
    }
}

export default Database;
