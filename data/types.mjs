export const TYPE_NAMES = ["string", "number", "boolean", "date", "datetime", "json", "array"];

export class DataType {
    static juiceDataType = "string";

    static arguments = ["name", "type", "defaultValue", "required", "nullable", "array", "validationRules"];

    static validationRules = [];

    static list() {
        return TYPE_NAMES;
    }

    static isType(type) {
        return TYPE_NAMES.includes(type.toLowerCase()) || TYPE_ALIASES[type.toLowerCase()] !== undefined || false;
    }

    static identify(value) {
        if (value instanceof DataType) return value.constructor.name.toLowerCase();
        if (value?.dataType) return value?.dataType;
        if (typeof value === "string") return "string";
        if (typeof value === "number") return "number";
        if (typeof value === "boolean") return "boolean";
        if (value instanceof Date) return "date";
        if (Array.isArray(value)) return "array";
        if (typeof value === "object") return "json";
        return null;
    }

    static get(typeName) {
        const lowerTypeName = typeName.toLowerCase();
        if (TYPE_NAMES.includes(lowerTypeName)) {
            return VARIABLE_TYPES[lowerTypeName];
        }
        return null;
    }

    constructor(...args) {
        if (args.length === 1 && typeof args[0] === "object") {
            const { name, type, defaultValue, required, nullable, array, validationRules } = args[0];
            this.name = name;
            this.alias = alias;
            this.type = type;
            this.default = defaultValue;
            this.required = required;
            this.nullable = nullable;
            this.array = array;
            this.validationRules = validationRules;
            this.format = null;
        } else {
            [
                this.name,
                this.alias,
                this.type,
                this.default,
                this.required,
                this.nullable,
                this.array,
                this.validationRules
            ] = args;

            this.format = null;
        }
        this.validationRules = this.constructor.validationRules.concat(this.validationRules);
    }

    validate(value) {
        //Handel Empty Values
        if (value === null || value === undefined) {
            if (this.required) {
                throw new Error(`Property "${this.name}" is required.`);
            }
            return true;
        }

        if (this.validateionRules && this.validationRules.length > 0) {
            for (const rule of this.validationRules) {
                if (!rule(value)) {
                    return false;
                }
            }
        }

        return true;
    }

    toString() {
        return this.name;
    }
}

function DataTypeFactory(
    name,
    alias,
    type,
    defaultValue,
    required = false,
    nullable = false,
    array = false,
    validationRules = []
) {
    return class extends DataType {
        static name = name;
        static alias = alias;
        static type = type;
        static default = defaultValue || null;
        static required = required || false;
        static nullable = nullable || false;
        static array = array || false;
        static validationRules = validationRules;
        constructor(...args) {
            super(...args);
        }
    };
}

export const string = new DataType("string", ["str", "text"], String, null, false, true, false, [
    "alpha",
    "alphanumeric"
]);
export const number = new DataType("number", ["num", "int", "float"], Number, null, false, true, false, ["numeric"]);
export const boolean = new DataType("boolean", ["bool"], Boolean, null, false, true, false, ["boolean"]);
export const date = new DataType("date", ["dt"], Date, null, false, true, false, ["date"]);
export const datetime = new DataType("datetime", ["dttm"], Date, null, false, true, false, ["datetime"]);
export const json = new DataType("json", ["obj", "JSON"], Object, null, false, true, false, ["json"]);
export const array = new DataType("array", ["arr", "list"], Array, null, false, true, true, ["array"]);

export const VARIABLE_TYPES = {
    string,
    number,
    boolean,
    date,
    datetime,
    json,
    array
};

export const TYPE_ALIASES = {};
export const TYPE_ALIAS_OWNERS = {};
Object.values(VARIABLE_TYPES).forEach((type) => {
    type.alias.forEach((alias) => {
        TYPE_ALIASES[alias] = type;
        TYPE_ALIAS_OWNERS[alias] = type.name;
    });
});

export const parseType = (type) => {
    if (typeof type === "string") {
        const lowerType = type.toLowerCase();
        TYPE_NAMES.forEach((typeName) => {
            const type = VARIABLE_TYPES[typeName];
            if (lowerType === typeName || type.alias.includes(lowerType)) {
                return VARIABLE_TYPES[typeName];
            }
        });
    } else if (typeof type === "object") {
        return type;
    }
};

export function isValidType(value, type) {
    if (type === String) return typeof value === "string";
    if (type === Number) return typeof value === "number" && !isNaN(value);
    if (type === Date) return value instanceof Date && !isNaN(value.getTime());
    if (type === Object) return typeof value === "object" && value !== null && !Array.isArray(value);
    if (type === Array) return Array.isArray(value);
    return false;
}

export default { string, number, boolean, date, datetime, json, array };
