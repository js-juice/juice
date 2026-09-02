import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("./input-files.mjs", import.meta.url), "utf8");
const index = await readFile(new URL("../index.mjs", import.meta.url), "utf8");

test("input-files is registered by the forms entry point", () => {
    assert.match(component, /static tag = "input-files"/);
    assert.match(component, /static formAssociated = true/);
    assert.match(index, /import "\.\/components\/input-files\.mjs"/);
});

test("input-files supports picker and drop selection through one file pipeline", () => {
    assert.match(component, /this\._onNativeChange = \(\) => this\.addFiles\(this\._native\.files\)/);
    assert.match(component, /this\.addFiles\(event\.dataTransfer\?\.files \|\| \[\]\)/);
    assert.match(component, /mergeFiles\(this\._files, incoming, this\.accept\)/);
    assert.match(component, /this\._internals\.setFormValue\(formData\)/);
});

test("input-files renders image thumbnails, file icons, and removable cards", () => {
    assert.match(component, /URL\.createObjectURL\(file\)/);
    assert.match(component, /preview\.append\(this\._createFileIcon\(file\)\)/);
    assert.match(component, /remove\.setAttribute\("aria-label", `Remove \$\{file\.name\}`\)/);
    assert.match(component, /URL\.revokeObjectURL\(url\)/);
});
