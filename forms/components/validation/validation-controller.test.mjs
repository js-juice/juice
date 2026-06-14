import test from "node:test";
import assert from "node:assert/strict";

import FieldValidationController from "./validation-controller.mjs";

function createHost(type, attributes = {}) {
    const native = {
        type,
        required: false,
        minLength: -1,
        maxLength: -1,
        min: "",
        max: "",
        pattern: ""
    };

    return {
        _dom: { native },
        hasAttribute(name) {
            return Object.prototype.hasOwnProperty.call(attributes, name);
        },
        getAttribute(name) {
            if (name === "type") return type;
            return attributes[name] ?? null;
        }
    };
}

test('type="url" derives the url validation rule', () => {
    const controller = new FieldValidationController(createHost("url"));

    assert.equal(controller.getNativeValidationRules(), "url");
});

test("url validation failures map to native typeMismatch validity", () => {
    const controller = new FieldValidationController(createHost("url"));

    assert.deepEqual(controller.buildValidityState([{ type: "url" }]), {
        typeMismatch: true,
        customError: true
    });
});

test("explicit validation rules keep precedence over native constraints", () => {
    const controller = new FieldValidationController(
        createHost("email", {
            validation: "required|max:60",
            maxlength: "255"
        })
    );

    assert.equal(controller.getValidationRules(), "required|max:60|email");
});
