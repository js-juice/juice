import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./juice-form.mjs", import.meta.url), "utf8");

test("measures one native input height per Juice form", () => {
    assert.match(source, /const typographySignature = \[/);
    assert.match(
        source,
        /if \(this\._inputHeightMeasured && typographySignature === this\._typographySignature\) return;/
    );
    assert.match(source, /probe\.style\.font = "inherit"/);
    assert.match(source, /probe\.style\.padding = "0"/);
    assert.match(source, /probe\.style\.border = "0"/);
    assert.match(source, /this\.appendChild\(probe\)/);
    assert.match(source, /probe\.getBoundingClientRect\(\)\.height/);
    assert.match(source, /this\.style\.setProperty\("--input-height", `\$\{height\}px`\)/);
    assert.match(source, /this\._typographySignature = typographySignature/);
    assert.match(source, /this\._inputHeightMeasured = true/);
});

test("remeasures only when the form typography changes", () => {
    assert.match(source, /new ResizeObserver\(\(\) => this\._measureInputHeight\(\)\)/);
    assert.match(source, /this\._resizeObserver\.observe\(this\)/);
    assert.match(source, /disconnectedCallback\(\)/);
    assert.match(source, /this\._resizeObserver\?\.disconnect\(\)/);
});
