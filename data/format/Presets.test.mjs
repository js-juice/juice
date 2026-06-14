import test from "node:test";
import assert from "node:assert/strict";

import { getFormatterMetadata, registerFormatter } from "./Presets.mjs";

test("format presets expose built-in and registered field feedback metadata", () => {
    assert.deepEqual(getFormatterMetadata("digits"), {
        description: "Removes all non-numeric characters.",
        example: "5551234567",
        format: "Digits only; non-numeric characters are removed."
    });

    registerFormatter("accountCode", (value) => String(value).toUpperCase(), {
        description: "Formats an account code.",
        example: "AC-123",
        format: "AC-###"
    });

    assert.deepEqual(getFormatterMetadata("accountCode"), {
        description: "Formats an account code.",
        example: "AC-123",
        format: "AC-###"
    });
});

test("every built-in formatter preset has a description and example", () => {
    const formatterNames = [
        "upper",
        "lower",
        "ucword",
        "ucwords",
        "dashed",
        "computize",
        "camel",
        "camelCase",
        "pascalCase",
        "studly",
        "unStudly",
        "unPascal",
        "trim",
        "digits",
        "tpl",
        "template"
    ];

    formatterNames.forEach((name) => {
        const metadata = getFormatterMetadata(name);
        assert.ok(metadata.description, `${name} is missing a description`);
        assert.ok(metadata.example, `${name} is missing an example`);
    });
});
