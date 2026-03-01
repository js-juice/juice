import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Component base uses new Juice configuration module", async () => {
    const source = await readFile(new URL("../component.mjs", import.meta.url), "utf8");

    assert.match(source, /import\s+\{\s*getJuiceConfig\s*\}\s+from\s+"..\/config\/juice-config\.mjs"/);
    assert.match(source, /getJuiceConfig\(`ui\.components\.\$\{this\.tag\}`\)/);
    assert.doesNotMatch(source, /window\.JUICE_CONFIG/);
});

test("Component base cleans up custom instance index on disconnect", async () => {
    const source = await readFile(new URL("../component.mjs", import.meta.url), "utf8");

    assert.match(source, /CUSTOM_INSTANCES\[this\._id\]\s*=\s*this;/);
    assert.match(source, /delete\s+CUSTOM_INSTANCES\[this\._id\];/);
});

test("Component base reflects exists properties by attribute presence", async () => {
    const source = await readFile(new URL("../component.mjs", import.meta.url), "utf8");

    assert.match(source, /if\s*\(config\.type === "exists"\)\s*\{/);
    assert.match(source, /if\s*\(newValue\)\s*\{\s*if\s*\(!this\.hasAttribute\(property\)\)\s*this\.setAttribute\(property,\s*""\);/);
    assert.match(source, /else if\s*\(this\.hasAttribute\(property\)\)\s*\{\s*this\.removeAttribute\(property\);/);
});
