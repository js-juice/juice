import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./input-style.mjs", import.meta.url), "utf8");
const propertyListSource = await readFile(new URL("../../styles/property-list.mjs", import.meta.url), "utf8");

test("input-style renders the canonical style property sections", () => {
    assert.match(source, /CSS_PROPERTY_SECTIONS as SECTIONS/);
    for (const section of ["Background", "Border & Radius", "Effects", "Text", "Margin", "Padding"]) {
        assert.match(propertyListSource, new RegExp(`label: "${section.replace("&", "&")}"`));
    }
    for (const property of ["background-color", "border-radius", "box-shadow", "font-size", "margin-top", "padding-left"]) {
        if (property === "border-radius") {
            assert.match(propertyListSource, /border-top-left-radius/);
        } else {
            assert.match(propertyListSource, new RegExp(property));
        }
    }
});

test("the shared property list serves the compiler and the input-style editor", () => {
    assert.match(propertyListSource, /CHECK_CSS_PROPERTIES/);
    assert.match(propertyListSource, /UNITLESS_PROPERTIES/);
    assert.match(propertyListSource, /CSS_PROPERTY_SECTIONS/);
    assert.match(propertyListSource, /\.\/watch\/property-list\.mjs/);
});

test("input-style exposes object, css text, target read, and target apply APIs", () => {
    assert.match(source, /get styleObject\(\)/);
    assert.match(source, /set styleObject\(value\)/);
    assert.match(source, /get cssText\(\)/);
    assert.match(source, /applyTo\(target = this\.targetElement\)/);
    assert.match(source, /readFrom\(target = this\.targetElement, computed = false\)/);
    assert.match(source, /CSS\.supports\(name, styleValue\)/);
});
