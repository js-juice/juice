/**
 * MySQL database driver.
 *
 * The client never speaks MySQL directly — it persists juice models over the
 * toolkit model API (POST/GET/PUT/DELETE /api/model/{table}), which is backed by
 * the server's MySQL database. The same Model — save(), pull(), delete() —
 * round-trips to Laravel, and server-side validation reuses the model's own
 * rules, mirroring the client schema. This lives in its own engine folder
 * alongside SQLite/ so each backend is self-contained.
 *
 * @module DB/MySQL/Database
 */

import Database from "../../Database.mjs";

/**
 * @class MySQLDatabase
 * @extends Database
 */
class MySQLDatabase extends Database {
    /** Models on this driver save asynchronously (the Model branches on this). */
    async = true;

    /**
     * Driver entry point, mirroring SQLiteDatabase.create. `source` is the base
     * URL of the remote model API; `options.models` (when an array) are model
     * classes to register on the driver.
     */
    static async create(source, options = {}) {
        const db = new this(source || options.baseUrl, options);
        if (Array.isArray(options.models)) {
            options.models.forEach((model) => db.addModel(model));
        }
        return db;
    }

    constructor(baseUrl = "/api/model", options = {}) {
        super(null);
        this.baseUrl = String(baseUrl || "/api/model").replace(/\/+$/, "");
        this.credentials = options.credentials || "same-origin";
    }

    initialize() {
        // No schema/migration step for a remote driver.
    }

    csrfToken() {
        if (typeof document === "undefined") return null;
        const meta = document.querySelector('meta[name="csrf"]') || document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute("content") : null;
    }

    async request(url, method, body) {
        const headers = {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest"
        };

        const token = this.csrfToken();
        if (token) headers["X-CSRF-TOKEN"] = token;

        const init = { method, headers, credentials: this.credentials };

        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(body);
        }

        const response = await fetch(url, init);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(payload.message || `API error ${response.status}`);
            error.status = response.status;
            error.errors = payload.errors || {};
            throw error;
        }

        return payload;
    }

    resource(table) {
        return `${this.baseUrl}/${table}`;
    }

    idFrom(conditions = {}) {
        const values = Object.values(conditions);
        return values.length ? values[0] : null;
    }

    /** @returns {Promise<{lastInsertRowid: *}>} */
    async insert(table, data) {
        const record = await this.request(this.resource(table), "POST", data);
        return { ...record, lastInsertRowid: record.id ?? record.uuid ?? null };
    }

    async update(table, data, conditions) {
        const id = this.idFrom(conditions);
        return this.request(`${this.resource(table)}/${id}`, "PUT", data);
    }

    async delete(table, conditions) {
        const id = this.idFrom(conditions);
        return this.request(`${this.resource(table)}/${id}`, "DELETE");
    }

    /** Single record fetch — used by Model.pull() when an id is present. */
    async first(table, columns, conditions) {
        const id = this.idFrom(conditions);
        if (id == null) return null;
        return this.request(`${this.resource(table)}/${id}`, "GET");
    }

    async many(table, columns, conditions = {}) {
        const query = new URLSearchParams(conditions).toString();
        const url = query ? `${this.resource(table)}?${query}` : this.resource(table);
        return this.request(url, "GET");
    }

    /**
     * The Model's SQL-oriented static helpers (count/where) aren't meaningful
     * over REST. `get` is only hit by static initialize()'s count probe; return
     * an empty row so initialization completes without a query.
     */
    get() {
        return {};
    }

    count() {
        return 0;
    }
}

export default MySQLDatabase;
