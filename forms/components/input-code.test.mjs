import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./input-code.mjs", import.meta.url), "utf8");

test("input code is one configurable Juice form-associated component", () => {
    assert.match(source, /extends InputComponent/);
    assert.match(source, /customElements\.define\("input-code"/);
    assert.match(source, /get codeLength\(\)/);
    assert.match(source, /get complete\(\)/);
    assert.match(source, /this\._dom\.native\.dispatchEvent/);
});

test("input code supports global and per-position character contracts", () => {
    assert.match(source, /numeric: \/\\D\/g/);
    assert.match(source, /alpha: \/\[\^a-z\]\//);
    assert.match(source, /alphanumeric: \/\[\^a-z0-9\]\//);
    assert.match(source, /matchAll\(\/\\\\\(\[da\]\)\/gi\)/);
    assert.match(source, /this\.maskTokens\.length/);
    assert.match(source, /this\.characterPattern\[index\]/);
});

test("input code owns its layout and complete keyboard interaction", () => {
    assert.match(source, /static get styles\(\)/);
    assert.match(source, /gridTemplateColumns: "repeat\(var\(--input-code-length\)/);
    assert.match(source, /\["Backspace", "Delete"\]\.includes\(event\.key\)/);
    assert.match(source, /event\.key === "Enter"/);
    assert.match(source, /this\.form\?\.requestSubmit\(\)/);
    assert.match(source, /event\.clipboardData/);
});

test("input code uses the inherited formatter pipeline on its combined value", () => {
    assert.match(source, /format="digits"/);
    assert.match(source, /format="upper"/);
    assert.match(source, /this\._dom\.native\.value = this\._sanitize\(this\._rawValue\(\)\)/);
});
