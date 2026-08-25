import test from "node:test";
import assert from "node:assert/strict";

import CSSProgressVariable from "../CSSProgressVariable.mjs";

const compact = (value) => value.replace(/\s+/g, "");

test("built-in easings produce standalone CSS math expressions", () => {
    const t = "0.25";
    const expected = {
        linear: "calc(0.25)",
        easeInQuad: "calc(pow(0.25,2))",
        easeOutQuad: "calc(1-pow(1-0.25,2))",
        easeInOutQuad: "calc(2*pow(0.25,2)-pow(max(0,2*0.25-1),2))",
        easeInCubic: "calc(pow(0.25,3))",
        easeOutCubic: "calc(1-pow(1-0.25,3))",
        easeInSine: "calc(1-cos(0.25*90deg))",
        easeOutSine: "calc(sin(0.25*90deg))",
        smoothstep: "calc(0.25*0.25*(3-2*0.25))"
    };

    for (const [name, easing] of Object.entries(CSSProgressVariable.easings)) {
        const expression = compact(easing(t));

        assert.equal(expression, expected[name]);
        assert.equal(expression.includes("<"), false);
        assert.match(expression, /^calc\(.+\)$/);
    }
});

test("slice normalizes progress before applying its easing", () => {
    const progress = new CSSProgressVariable("section-progress");
    const slice = progress.slice(0.2, 0.8, "easeOutQuad");

    assert.equal(slice.inPoint, 0.2);
    assert.equal(slice.outPoint, 0.8);
    assert.equal(slice.easing, "easeOutQuad");
    assert.match(compact(slice.progress), /^clamp\(0,\(var\(--section-progress\)-0\.2\)\/\(0\.8-0\.2\),1\)$/);
    assert.equal(compact(slice.value), "calc(1-pow(1-" + compact(slice.progress) + ",2))");
});

test("slice rejects a zero-length range", () => {
    const progress = new CSSProgressVariable("progress");

    assert.throws(() => progress.slice(0.5, 0.5), RangeError);
});

test("unknown easing names fail explicitly", () => {
    const progress = new CSSProgressVariable("progress");

    assert.throws(() => progress.slice(0, 1, "missing"), /Unknown easing/);
});
