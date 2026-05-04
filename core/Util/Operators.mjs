/**
 * Operators utility module providing comparison and type validation functions.
 * Defines operator functions for use in conditional expressions and data validation.
 * @module Operators
 */

import Util from "./Core.mjs";

/**
 * Object containing comparison and type validation operators.
 * Each operator is a function that takes a value and optionally a target for comparison.
 * @type {Object<string, Function>}
 */
const operators = {
    ">": (value, target) => value > target,
    gt: (value, target) => value > target,
    "<": (value, target) => value < target,
    lt: (value, target) => value < target,
    ">=": (value, target) => value >= target,
    gte: (value, target) => value >= target,
    "<=": (value, target) => value <= target,
    lte: (value, target) => value <= target,
    "=": (value, target) => value == target,
    eq: (value, target) => value == target,
    "==": (value, target) => value == target,
    is: (value, target) => value == target,
    "===": (value, target) => value === target,
    same: (value, target) => value === target,
    "!==": (value, target) => value !== target,
    nsame: (value, target) => value !== target,
    "!=": (value, target) => value != target,
    ne: (value, target) => value != target,
    "%": (value, target) => value % target,
    mod: (value, target) => value % target,
    "%floor": (value, target) => Math.floor(value) % target === 0,
    NULL: (value) => value === null,
    EMPTY: (value) => Util.empty(value),
    string: (value) => Util.type(value, "string"),
    number: (value) => !isNaN(value),
    object: (value) => Util.type(value, "object"),
    array: (value) => Util.type(value, "array"),
    int: (value) => {
        if (Util.type(value, "string")) value = Number(value);
        if (!Util.type(value, "number")) return false;
        return Math.floor(value) == value;
    },
    json: (value) => {
        if (Util.type(value, "string")) {
            try {
                JSON.parse(value);
            } catch (e) {
                return false;
            }
        } else {
            return Util.type(value, "object") || Util.type(value, "array");
        }
        return true;
    }
};

export default operators;
