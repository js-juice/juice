/**
 * SQL condition builder for constructing WHERE clauses and query conditions.
 * Provides fluent interface for building complex SQL conditions with operators like LIKE, comparison, etc.
 * @module DB/Conditions
 */

/**
 * Builder class for SQL query conditions.
 * Provides methods to construct WHERE clause conditions from objects and key-value pairs.
 * @class Conditions
 */
class Conditions {
    commands = [];
    from(object) {
        for (let key in object) {
            const value = object[key];
            const stringValue = typeof value === "string" ? `'${value}'` : value;

            if (typeof value === "string" && value.startsWith("LIKE ")) {
                this.commands.push(`${key} LIKE ${stringValue}`);
            } else {
                this.commands.push(`${key} = ${stringValue}`);
            }
        }
    }
}

export default Conditions;
