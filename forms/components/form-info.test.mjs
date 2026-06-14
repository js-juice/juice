import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./form-info.mjs", import.meta.url), "utf8");

test("form info renders a full-width completion summary and checklist toggle", () => {
    assert.match(source, /Completed \$\{completed\} of \$\{total\} fields/);
    assert.match(source, /No errors/);
    assert.match(source, /aria-label="Open form checklist"/);
    assert.match(source, /class="toggle"/);
});

test("form info tracks every logical field and groups same-name controls", () => {
    assert.match(source, /const groups = new Map\(\)/);
    assert.match(source, /if \(!groups\.has\(property\)\) groups\.set\(property, \[\]\)/);
    assert.match(source, /status = "untouched"/);
    assert.match(source, /status = "invalid"/);
    assert.match(source, /status = "incomplete"/);
    assert.match(source, /status = "complete"/);
});

test("form info popover contains a proportional form map and detailed field list", () => {
    assert.match(source, /class="form-map"/);
    assert.match(source, /class="field-list"/);
    assert.match(source, /left - formRect\.left/);
    assert.match(source, /top - formRect\.top/);
    assert.match(source, /right - left/);
    assert.match(source, /bottom - top/);
    assert.doesNotMatch(source, /map-number|field-number/);
    assert.match(source, /icon\.className = "field-status-icon"/);
    assert.match(source, /icon\.setAttribute\("state", this\._statusIconState\(field\.status\)\)/);
    assert.match(source, /\.map-field \{[\s\S]*?padding: 0/);
    assert.match(source, /\.form-map\.has-highlight \.map-field:not\(\.is-highlighted\)/);
    assert.match(source, /item\.addEventListener\("pointerenter", \(\) => this\._highlightField\(field\.index\)\)/);
    assert.match(source, /block\.addEventListener\("pointerenter", \(\) => this\._highlightField\(field\.index\)\)/);
    assert.match(source, /STATUS_LABELS\[field\.status\]/);
});

test("form info refreshes from validation, input, change, focus, and form mutations", () => {
    assert.match(source, /addEventListener\("validation:change"/);
    assert.match(source, /addEventListener\("input"/);
    assert.match(source, /addEventListener\("change"/);
    assert.match(source, /addEventListener\("focusout"/);
    assert.match(source, /new MutationObserver/);
});

test("form info checklist exposes dialog relationships and receives keyboard focus", () => {
    assert.match(source, /role="dialog"/);
    assert.match(source, /setAttribute\("aria-labelledby", title\.id\)/);
    assert.match(source, /setAttribute\("aria-controls", checklistId\)/);
    assert.match(source, /\(firstField \|\| this\._refs\.popover\)\.focus\(\)/);
    assert.match(source, /event\.key === "Escape"/);
});
