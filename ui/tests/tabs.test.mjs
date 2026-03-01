import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("ui-tabs internal disabled tracking does not collide with host disabled property", async () => {
    const source = await readFile(new URL("../components/controls/tabs.mjs", import.meta.url), "utf8");

    assert.match(source, /this\.disabledTabs\s*=\s*\[\];/);
    assert.doesNotMatch(source, /this\.disabled\s*=\s*\[\];/);
    assert.doesNotMatch(source, /this\.disabled\.includes\(/);
    assert.doesNotMatch(source, /this\.disabled\s*=\s*this\.disabled/);
});

test("ui-tabs removes stale disabled host attribute on connect", async () => {
    const source = await readFile(new URL("../components/controls/tabs.mjs", import.meta.url), "utf8");

    assert.match(source, /if\s*\(this\.hasAttribute\("disabled"\)\)\s*this\.removeAttribute\("disabled"\);/);
});
