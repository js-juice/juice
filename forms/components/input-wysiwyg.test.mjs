import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseToolSpec } from "./wysiwyg-tool-spec.mjs";
import { resolveLengthLimits, normalizeLengthBasis, getEditorValidationContent, getEditorMeasuredLength } from "./wysiwyg-length.mjs";

const source = await readFile(new URL("./input-wysiwyg.mjs", import.meta.url), "utf8");

test("parseToolSpec supports tag-only and tag.class specs", () => {
    assert.deepEqual(parseToolSpec("strong"), {
        type: "wrap",
        tag: "strong",
        className: "",
        key: "strong"
    });
    assert.deepEqual(parseToolSpec("source"), {
        type: "source",
        tag: "source",
        className: "",
        key: "source"
    });
    assert.deepEqual(parseToolSpec("code"), {
        type: "source",
        tag: "source",
        className: "",
        key: "source"
    });
    assert.deepEqual(parseToolSpec("b.extra-bold"), {
        type: "wrap",
        tag: "b",
        className: "extra-bold",
        key: "b.extra-bold"
    });
    assert.deepEqual(parseToolSpec("strong.highlight.note"), {
        type: "wrap",
        tag: "strong",
        className: "highlight note",
        key: "strong.highlight.note"
    });
    assert.equal(parseToolSpec("span.bold"), null);
});

test("resolveLengthLimits merges attributes and validation rules", () => {
    assert.deepEqual(
        resolveLengthLimits({
            minlength: "10",
            maxlength: "200",
            validation: "required|min:5|max:180"
        }),
        { min: 10, max: 180 }
    );
});

test("length basis controls whether markup is included", () => {
    assert.equal(normalizeLengthBasis("text"), "text");
    assert.equal(normalizeLengthBasis("html"), "html");
    assert.equal(normalizeLengthBasis(""), "text");

    const editor = {
        textContent: "Hello",
        innerHTML: "<strong>Hello</strong>"
    };

    assert.equal(getEditorMeasuredLength(editor, "text"), 5);
    assert.equal(getEditorMeasuredLength(editor, "html"), 22);
    assert.equal(getEditorValidationContent(editor, "text"), "Hello");
    assert.equal(getEditorValidationContent(editor, "html"), "<strong>Hello</strong>");
});

test("wysiwyg component registers custom element and toolbar tag toggles", () => {
    assert.match(source, /customElements\.define\("input-wysiwyg", InputWysiwyg\)/);
    assert.match(source, /aria-pressed/);
    assert.match(source, /wrapRangeContents/);
    assert.match(source, /_toggleTypingTool/);
    assert.match(source, /selectionchange/);
    assert.match(source, /createToolElement/);
});

test("wysiwyg syncs editor html into hidden textarea value", () => {
    assert.match(source, /_syncEditorToNative/);
    assert.match(source, /textarea/);
    assert.match(source, /getEditorValidationValue/);
    assert.match(source, /beforeinput/);
    assert.match(source, /_toggleSourceMode/);
    assert.match(source, /wysiwyg-source/);
    assert.doesNotMatch(source, /\n\s+connectedCallback\(\)/);
});
