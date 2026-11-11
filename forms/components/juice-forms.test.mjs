import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./juice-forms.mjs", import.meta.url), "utf8");

test("invalid form submission focuses the first invalid Juice field", () => {
    assert.match(source, /addEventListener\("invalid", \(\) => \{/);
    assert.match(source, /this\._queueInvalidFieldFocus\(\)/);
    assert.match(source, /field\.getAttribute\("validation-state"\) === "invalid"/);
    assert.match(source, /field\.validity && field\.validity\.valid === false/);
    assert.match(source, /invalid\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
    assert.match(source, /invalid\._dom && invalid\._dom\.native/);
});

test("responsive measurements do not retrigger the observed form", () => {
    assert.doesNotMatch(source, /this\._form\.appendChild\(probe\)/);
    assert.match(source, /document\.body\.appendChild\(probe\)/);
});
