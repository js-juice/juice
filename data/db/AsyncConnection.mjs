/**
 * Asynchronous database connection via message ports
 * Allows remote database operations through message passing
 * @module DB/AsyncConnection
 */

import EventEmitter from "../../juice/Event/Emitter.mjs";

/**
 * Async database connection using message ports for remote DB operations
 * @extends EventEmitter
 */
class AsyncConnection extends EventEmitter {
    /**
     * Initialize with a message port for communication
     * @param {MessagePort} port - The message port for communication
     */
    constructor(port) {
        super();
        this.port = port;
        this.port.on("message", (msg) => this.message(msg));
        this.port.start();
    }

    /**
     * Handle incoming messages from the database worker
     * @param {Object} data - The message data
     * @param {string} data.type - The message type (response, error, notification)
     * @param {string} data.command - The database command
     * @param {any} data.result - The query result
     * @param {Error} data.error - Error if any
     */
    message(data) {
        if (data.type === "response") {
            this.emit(`response:${data.command}`, data.result);
        } else if (data.type === "error") {
            this.emit(`error:${data.command}`, data.error);
        } else if (data.type === "notification") {
            this.emit(data.event, data.data);
        }
    }

    /**
     * Send a message to the database worker
     * @param {Object} data - The message data
     * @returns {Promise} Resolves when response is received
     */
    send(data) {
        return new Promise((resolve, reject) => {
            const command = data.command;
            const responseHandler = (result) => {
                this.off(`response:${command}`, responseHandler);
                this.off(`error:${command}`, errorHandler);
                resolve(result);
            };
            const errorHandler = (error) => {
                this.off(`response:${command}`, responseHandler);
                this.off(`error:${command}`, errorHandler);
                reject(error);
            };

            this.on(`response:${command}`, responseHandler);
            this.on(`error:${command}`, errorHandler);
            this.port.postMessage(data);
        });
    }

    /**
     * Insert a record
     * @param {string} table - The table name
     * @param {Object} data - The data to insert
     * @returns {Promise}
     */
    async insert(table, data) {
        return this.send({
            command: "insert",
            table,
            data
        });
    }

    /**
     * Update records
     * @param {string} table - The table name
     * @param {Object} data - The data to update
     * @param {Object} where - The WHERE conditions
     * @returns {Promise}
     */
    async update(table, data, where) {
        return this.send({
            command: "update",
            table,
            data,
            where
        });
    }

    /**
     * Delete records
     * @param {string} table - The table name
     * @param {Object} where - The WHERE conditions
     * @returns {Promise}
     */
    async delete(table, where) {
        return this.send({
            command: "delete",
            table,
            where
        });
    }

    /**
     * Get first matching record
     * @param {string} table - The table name
     * @param {Object} where - The WHERE conditions
     * @returns {Promise}
     */
    async first(table, where) {
        return this.send({
            command: "first",
            table,
            where
        });
    }

    /**
     * Get all matching records
     * @param {string} table - The table name
     * @param {Object} where - The WHERE conditions
     * @returns {Promise}
     */
    async all(table, where) {
        return this.send({
            command: "all",
            table,
            where
        });
    }

    /**
     * Run a raw SQL query
     * @param {string} statement - The SQL statement
     * @param {Array} args - The query parameters
     * @returns {Promise}
     */
    async run(statement, args) {
        return this.send({
            command: "run",
            statement,
            args
        });
    }

    /**
     * Execute a SQL query
     * @param {string} statement - The SQL statement
     * @param {Array} args - The query parameters
     * @returns {Promise}
     */
    async exec(statement, args) {
        return this.send({
            command: "exec",
            statement,
            args
        });
    }
}

export default AsyncConnection;
