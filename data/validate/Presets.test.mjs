import test from "node:test";
import assert from "node:assert/strict";

import Presets, { describeValidationRule, getPresetMetadata, registerPreset } from "./Presets.mjs";
import Validator from "./Validator.mjs";

test("url accepts HTTP(S) URLs with valid DNS domains", () => {
    const validUrls = [
        "https://example.com",
        "http://www.example.co.uk/path?query=value#section",
        "https://sub-domain.example.com:8443",
        "https://bücher.de"
    ];

    for (const value of validUrls) {
        assert.equal(Presets.url(value), true, value);
    }
});

test("url rejects values without a valid DNS domain", () => {
    const invalidUrls = [
        "example.com",
        "ftp://example.com",
        "https://example",
        "https://localhost",
        "https://127.0.0.1",
        "https://[::1]",
        "https://.com",
        "https://example..com",
        "https://-example.com",
        "https://example-.com",
        "https://example.c",
        " https://example.com "
    ];

    for (const value of invalidUrls) {
        assert.equal(Presets.url(value), false, value);
    }
});

test("url leaves empty optional values to the required rule", () => {
    assert.equal(Presets.url(""), true);
    assert.equal(Presets.url(null), true);
    assert.equal(Presets.url(undefined), true);
});

test("name requires at least two words and leaves empty values to required", () => {
    assert.equal(Presets.name("John Doe"), true);
    assert.equal(Presets.name("John S. Doe"), true);
    assert.equal(Presets.name("john doe"), false);
    assert.equal(Presets.name("John doe"), false);
    assert.equal(Presets.name("John"), false);
    assert.equal(Presets.name("  John  "), false);
    assert.equal(Presets.name(""), true);
});

test("name preset provides the field example", () => {
    const metadata = getPresetMetadata("name");
    assert.deepEqual(metadata, {
        description: "Enter a name.",
        example: "John Doe",
        formatter: "ucwords"
    });
    assert.equal("format" in metadata, false);
});

test("name failures return the two-word validation message", async () => {
    const validator = Validator.make({ name: "required|name" });

    assert.equal(await validator.test("name", "John"), false);
    assert.deepEqual(validator.messages("name"), [
        "name must include at least two words"
    ]);
});

test("url failures return a URL-specific validation error", async () => {
    const validator = Validator.make({ website: "url" });

    assert.equal(await validator.test("website", "https://localhost"), false);
    assert.equal(validator.errorsOf("website")[0].name, "UrlValidationError");
    assert.deepEqual(validator.messages("website"), [
        'Property "website" must be a valid URL with a domain.'
    ]);
});

test("validation presets expose built-in and registered field feedback metadata", () => {
    assert.deepEqual(getPresetMetadata("url"), {
        description: "Enter a complete HTTP or HTTPS URL with a valid domain.",
        example: "https://example.com"
    });

    registerPreset("accountCode", () => true, null, {
        description: "Enter the assigned account code.",
        example: "AC-123",
        format: "AC-###"
    });

    assert.deepEqual(getPresetMetadata("accountCode"), {
        description: "Enter the assigned account code.",
        example: "AC-123",
        format: "AC-###"
    });
});

test("validation format guidance is generated from rule types and arguments", () => {
    assert.equal(
        describeValidationRule("name"),
        "At least two words."
    );
    assert.equal(describeValidationRule("min", ["8"]), "Minimum value or length: 8.");
    assert.equal(describeValidationRule("length", ["3", "20"]), "Length between 3 and 20 characters.");
    assert.equal(describeValidationRule("chars", ["a-z0-9"]), "Allowed characters: a-z0-9.");
    assert.equal(describeValidationRule("contains", ["uppercase"]), "Must contain at least one uppercase character.");
});

test("contains validates composable character requirements", async () => {
    assert.equal(Presets.contains("Password1!", "uppercase"), true);
    assert.equal(Presets.contains("password1!", "uppercase"), false);
    assert.equal(Presets.contains("Password1!", "lowercase"), true);
    assert.equal(Presets.contains("PASSWORD1!", "lowercase"), false);
    assert.equal(Presets.contains("Password1!", "number"), true);
    assert.equal(Presets.contains("Password!", "number"), false);
    assert.equal(Presets.contains("Password1!", "symbol"), true);
    assert.equal(Presets.contains("Password1", "symbol"), false);
    assert.equal(Presets.contains("", "uppercase"), true);
    assert.equal(Presets.contains("Password1!", "unknown"), false);

    const validator = Validator.make({
        password: "required|contains:uppercase|contains:lowercase|contains:number|contains:symbol"
    });

    assert.equal(await validator.test("password", "Password1!"), true);
    assert.equal(await validator.test("password", "password"), false);
    assert.deepEqual(validator.messages("password"), [
        "password must contain at least one uppercase character",
        "password must contain at least one number character",
        "password must contain at least one symbol character"
    ]);
});

test("every built-in validation preset has a description", () => {
    const presetNames = [
        "name",
        "email",
        "phone",
        "address",
        "postal",
        "string",
        "text",
        "number",
        "array",
        "boolean",
        "object",
        "int",
        "integer",
        "timestamp",
        "sha256",
        "equals",
        "max",
        "min",
        "length",
        "required",
        "empty",
        "notEmpty",
        "chars",
        "contains",
        "null",
        "in",
        "url"
    ];

    presetNames.forEach((name) => {
        assert.ok(getPresetMetadata(name).description, `${name} is missing a description`);
    });
});
