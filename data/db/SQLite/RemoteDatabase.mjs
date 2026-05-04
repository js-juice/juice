/**
 * Remote SQLite database with network capabilities.
 * Extends base database for remote database connections.
 * @module DB/SQLite/RemoteDatabase
 */

import { STORAGE_TYPES, TYPE_ALIASES } from "./Constants.mjs";

import Database from "../Database.mjs";
import SQLBuilder from "../SQLBuilder.mjs";

let BetterSQLite3Module = null;

async function loadBetterSQLite3() {
    if (BetterSQLite3Module) return BetterSQLite3Module;

    try {
        const module = await import("better-sqlite3");
        BetterSQLite3Module = module.default || module;
        return BetterSQLite3Module;
    } catch (error) {
        error.message =
            `SQLite support requires the optional dependency "better-sqlite3". ` +
            `Install it in the app that uses Juice before opening a SQLite database.\n` +
            `Original error: ${error.message}`;
        throw error;
    }
}

/**
 * SQLite database with remote connection support.
 * @class SQLiteDatabase
 * @extends Database
 */
class SQLiteDatabase extends Database {
    source = null;

    static async create(databasePath, options) {
        const BetterSQLite3 = await loadBetterSQLite3();
        const db = new BetterSQLite3(databasePath, options);
        return new this(db, databasePath, options);
    }

    constructor(db, path, options) {
        super(db);
        this.databasePath = path;
        this.dbOptions = options;
    }

    command(method, statement, args) {}

    hasTable(table) {
        this.command();
        const exists = this.command("run", `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [
            table
        ]).then();
        return exists.run();
    }

    createTable(table, fields) {
        return this.db.exec(
            `CREATE TABLE IF NOT EXISTS ${table} ( ${Object.keys(fields).map((f) => `${f} ${fields[f]}`)} )`
        );
    }

    insert(table, data) {
        const { statement, args } = new SQLBuilder(table).insert(data).build();
        return Promise.resolve(this.db.prepare(statement).run(...args));
    }

    insertAll(table, list) {
        const { statement } = new SQLBuilder(table).insert(list[0]).build();
        const newRecord = this.db.prepare(statement);
        this.db.transaction((item) => {
            newRecord.run(Object.values(item));
        })(list);
    }

    first(table, columns, conditions) {
        const { statement, args } = new SQLBuilder(table).select(columns).where(conditions).limit(1).build();
        // debug(cmd);
        return Promise.resolve(this.db.prepare(statement).get(...args));
    }

    all(table, columns, conditions, order, limit, offset) {
        const builder = new SQLBuilder(table).select(columns);
        if (conditions) builder.where(conditions);
        if (order) builder.orderBy(order);
        if (limit) builder.limit(limit);
        if (offset) builder.offset(offset);
        const { statement, args } = builder.build();
        // debug(cmd);
        return Promise.resolve(this.db.prepare(statement).all(...args));
    }

    update(table, data, conditions) {
        const { statement, args } = new SQLBuilder(table).update(data).where(conditions).build();
        return Promise.resolve(this.db.prepare(statement).run(...args));
    }

    updateAll(table, data, conditions) {
        const { statement, args } = new SQLBuilder(table).update(data).where(conditions).build();
        return Promise.resolve(this.db.prepare(statement).run(...args));
    }

    delete(table, conditions) {
        const { statement, args } = new SQLBuilder(table).delete(conditions).build();
        return Promise.resolve(this.db.prepare(statement).run(...args));
    }

    count(table, conditions) {
        const { statement, args } = new SQLBuilder(table).count(conditions).build();
        // console.log(cmd);
        return Promise.resolve(this.db.prepare(statement).get(...args).count);
    }

    max(table, column, conditions) {
        const { statement, args } = new SQLBuilder(table).max(column, conditions).build();
        return Promise.resolve(this.db.prepare(statement).get(...args).max);
    }

    addModel(Model) {
        if (!Model) return;
        Model.db = this;
        const tableName = Model.tableName;
        const schema = Model.schema;
        const tableSchema = this.schema[tableName];

        if (!tableSchema) {
            const fields = {};
            if (Model.timestamps) {
                schema.updated_at = { type: "datetime", null: true };
                schema.created_at = { type: "datetime" };
                schema.deleted_at = { type: "datetime", null: true };
            }
            for (const field in schema) {
                let type = schema[field].type.toUpperCase();
                if (type == "SET") type = "TEXT";
                if (STORAGE_TYPES.includes(type)) {
                }
                const definition = [type];
                if (schema[field].maxLength) definition[0] += `(${schema[field].maxLength})`;
                if (schema[field].primaryKey) definition.push("PRIMARY KEY");
                if (schema[field].autoIncrement) definition.push("AUTOINCREMENT");
                if (schema[field].unique) definition.push("UNIQUE");
                if (schema[field].null) definition.push("NULL");
                if (schema[field].required) definition.push("NOT NULL");
                if (schema[field].default) definition.push(`DEFAULT ${schema[field].default}`);
                fields[field] = definition.join(" ");
            }
            // debug('FIELDS', fields);
            const create = this.createTable(tableName, fields);
            // debug('CREATE', create);
        }

        this.models[Model.name] = Model;
        if (!this.tables[tableName]) this.tables[tableName] = {};
        this.tables[tableName].model = Model;
    }

    tableInfo(tableName) {
        return this.db.pragma(`table_info(${tableName})`);
    }

    getTables() {
        const internal = ["sqlite_sequence", "sqlite_schema", "sqlite_temp_schema"];
        const tbl_list = this.db.pragma(`table_list`);
        const tables = tbl_list.filter((tbl) => !internal.includes(tbl.name));
        const resp = {};
        for (let i = 0; i < tables.length; i++) {
            resp[tables[i].name] = tables[i];
        }
        return resp;
    }

    initialize() {
        const tables = this.getTables();
        for (let tableName in tables) {
            const table = tables[tableName];
            const tbl = this.tableInfo(table.name);
            const columns = {};
            for (let column of tbl) {
                columns[column.name] = column;
            }
            table.columns = columns;
            this.tables[tableName] = { ...table };
        }
        this.schema = tables;
        // debug('DB Schema', this.schema);
    }
}

export default SQLiteDatabase;
