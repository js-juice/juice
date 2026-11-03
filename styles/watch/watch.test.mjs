import test from "node:test";
import assert from "node:assert/strict";

import stylesConfig from "../config.mjs";
import { getResolvedClass, parseClassContext } from "./watch.js";

test("size aliases resolve to media queries", () => {
    const ctx = parseClassContext("md:padding:1o5rem");

    assert.ok(ctx, "class should parse");
    assert.equal(ctx.mediaQuery, "@media (min-width: 768px)");
    assert.deepEqual(ctx.declarations, {
        padding: "1.5rem"
    });
});

test("hover pseudo selectors are preserved and scoped to hover state", () => {
    const ctx = parseClassContext("hover:padding:10px");

    assert.ok(ctx);
    assert.equal(ctx.selectorSuffix, ":hover");
    assert.deepEqual(ctx.declarations, {
        padding: "10px"
    });
});

test("styles config supports custom screen abbreviations", () => {
    const original = stylesConfig.screens;
    stylesConfig.screens = { mobile: "420px" };

    try {
        const ctx = parseClassContext("mobile:text:center");

        assert.ok(ctx);
        assert.equal(ctx.mediaQuery, "@media (min-width: 420px)");
        assert.deepEqual(ctx.declarations, {
            textAlign: "center"
        });
    } finally {
        stylesConfig.screens = original;
    }
});

test("aspect ratio and outline values resolve to css declarations", () => {
    const aspectCtx = parseClassContext("aspect-ratio:16/9");
    const outlineCtx = parseClassContext("outline:none");

    assert.ok(aspectCtx);
    assert.deepEqual(aspectCtx.declarations, {
        aspectRatio: "16/9"
    });

    assert.ok(outlineCtx);
    assert.deepEqual(outlineCtx.declarations, {
        outline: "none"
    });
});

test("unknown nested background utilities are rejected", () => {
    assert.equal(parseClassContext("bg:opacity:0o5"), null);
});

test("single-segment property values that match utility names are accepted", () => {
    const ctx = parseClassContext("display:flex");

    assert.ok(ctx);
    assert.deepEqual(ctx.declarations, {
        display: "flex"
    });
});

test("border width utilities make borders visible and support side-specific widths", () => {
    const borderCtx = parseClassContext("border:width:1px");
    const leftBorderCtx = parseClassContext("border:left:width:2px");

    assert.ok(borderCtx);
    assert.deepEqual(borderCtx.declarations, {
        borderWidth: "1px",
        borderStyle: "solid"
    });

    assert.ok(leftBorderCtx);
    assert.deepEqual(leftBorderCtx.declarations, {
        borderLeftWidth: "2px",
        borderLeftStyle: "solid"
    });

    assert.deepEqual(parseClassContext("border:color:#1e293b")?.declarations, {
        borderColor: "#1e293b"
    });
});

test("responsive grid utilities resolve during stylesheet generation", () => {
    assert.deepEqual(getResolvedClass("md:grid:columns:repeat(2|minmax(0|1fr))"), {
        gridTemplateColumns: "repeat(2,minmax(0,1fr))"
    });
});
