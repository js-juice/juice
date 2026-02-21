/**
 * Boot model for tracking application startup and shutdown events.
 * Stores boot information, errors, and timestamps in SQLite database.
 * @module DB/SQLite/Boot
 */

import Model from "../../models/Model.js";
import { STORAGE_TYPES, TYPE_ALIASES } from "./Constants.mjs";
import * as Condition from "../../../juice/Util/Condition.mjs";

/**
 * Boot model for tracking application lifecycle events.
 * @class Boot
 * @extends Model
 */
class Boot extends Model {
    static get schema() {
        return {
            id: { type: "integer", primaryKey: true, autoIncrement: true },
            errors: { type: "json", default: {} },
            shutdown: { type: "datetime" },
            updated_at: { type: "datetime" },
            created_at: { type: "datetime" }
        };
    }
}

export default Boot;
