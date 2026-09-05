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

test("keyframes map a sliced timeline with CSS-only math", () => {
    const progress = new CSSProgressVariable("progress");
    const slice = progress.slice(0, 0.001);
    const timeline = slice.keyframes([
        { progress: 0, value: 100 },
        { progress: 0.5, value: 200 }
    ]);

    assert.equal(timeline.progress, slice.value);
    assert.deepEqual(timeline.frames, [
        { progress: 0, value: 100 },
        { progress: 0.5, value: 200 }
    ]);
    assert.equal(typeof timeline.value, "string");
    assert.match(compact(timeline.value), /^calc\(100\+\(200-100\)\*calc\(clamp\(/);
    assert.match(timeline.value, /var\(--progress\)/);
});

test("keyframes sort progress and support CSS values with easing", () => {
    const progress = new CSSProgressVariable("progress");
    const timeline = progress.keyframes(
        [
            { progress: 1, value: "100px" },
            { progress: 0, value: "0px" },
            { progress: 0.5, value: "25px" }
        ],
        { easing: "easeOutQuad" }
    );

    assert.deepEqual(
        timeline.frames.map((frame) => frame.progress),
        [0, 0.5, 1]
    );
    assert.equal(timeline.easing, "easeOutQuad");
    assert.match(compact(timeline.value), /^calc\(0px\+\(25px-0px\)\*calc\(1-pow\(/);
});

test("keyframe values remain chainable", () => {
    const progress = new CSSProgressVariable("progress");
    const first = progress.slice(0, 0.5).keyframes([
        { progress: 0, value: 0 },
        { progress: 1, value: 1 }
    ]);
    const second = first.keyframes([
        { progress: 0, value: 10 },
        { progress: 1, value: 20 }
    ]);

    assert.equal(second.progress, first.value);
});

test("keyframes reject invalid definitions", () => {
    const progress = new CSSProgressVariable("progress");

    assert.throws(() => progress.keyframes({}), /array/);
    assert.throws(() => progress.keyframes([]), /at least two/);
    assert.throws(
        () =>
            progress.keyframes([
                { progress: 0, value: 0 },
                { progress: 0, value: 1 }
            ]),
        /duplicate progress/
    );
    assert.throws(
        () =>
            progress.keyframes([
                { progress: 0, value: 0 },
                { progress: 1.1, value: 1 }
            ]),
        /between 0 and 1/
    );
    assert.throws(
        () =>
            progress.keyframes([
                { progress: 0, value: 0 },
                { progress: 1, value: "" }
            ]),
        /finite numbers or non-empty CSS values/
    );
    assert.throws(
        () =>
            progress.keyframes(
                [
                    { progress: 0, value: 0 },
                    { progress: 1, value: 1 }
                ],
                { easing: "missing" }
            ),
        /Unknown easing/
    );
});

test("current reads from a cached JavaScript value when provided", () => {
    let current = 0.25;
    const progress = new CSSProgressVariable("progress", 0, 1, {
        current: () => current
    });

    assert.equal(progress.current, 0.25);

    current = 0.75;

    assert.equal(progress.current, 0.75);
});

test("sliced current values use the cached source progress", () => {
    let current = 0.5;
    const progress = new CSSProgressVariable("progress", 0, 1, {
        current: () => current
    });
    const slice = progress.slice(0.2, 0.8);

    assert.ok(Math.abs(slice.current - 0.5) < Number.EPSILON * 4);

    current = 0;
    assert.equal(slice.current, 0);

    current = 1;
    assert.equal(slice.current, 1);
});

test("keyframed current values interpolate the cached sliced progress", () => {
    let current = 0.25;
    const progress = new CSSProgressVariable("progress", 0, 1, {
        current: () => current
    });
    const timeline = progress.slice(0, 1).keyframes([
        { progress: 0, value: 100 },
        { progress: 0.5, value: 200 }
    ]);

    assert.equal(timeline.current, 150);

    current = 0.75;
    assert.equal(timeline.current, 200);
});

test("keyframed current values interpolate matching CSS units", () => {
    let current = 0.5;
    const progress = new CSSProgressVariable("progress", 0, 1, {
        current: () => current
    });
    const compatible = progress.keyframes([
        { progress: 0, value: "0deg" },
        { progress: 1, value: "90deg" }
    ]);
    const incompatible = progress.keyframes([
        { progress: 0, value: "0px" },
        { progress: 1, value: "100%" }
    ]);

    assert.equal(compatible.current, "45deg");
    assert.equal(incompatible.current, null);
});
