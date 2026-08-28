import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./input-select.mjs", import.meta.url), "utf8");

test("option observer ignores host attribute changes to prevent value refresh loops", () => {
    assert.match(source, /mutation\.type !== "attributes" \|\| mutation\.target !== this/);
    assert.match(source, /if \(optionsChanged\) this\._refreshOptions\(\)/);
});

test("custom options accept clicks from nested SVG icons", () => {
    assert.match(source, /event\.target instanceof Element \? event\.target\.closest\("\.select-option"\)/);
});
