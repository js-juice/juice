import test from "node:test";
import assert from "node:assert/strict";

import ScrollSectionTracker from "../ScrollSectionTracker.mjs";

test("measure caches section geometry used by scoped progress", () => {
    const originalWindow = globalThis.window;
    globalThis.window = { innerHeight: 100 };

    try {
        const element = { offsetHeight: 300 };
        const section = { id: "intro", element, top: 0, height: 0, start: 0, end: 0 };
        const tracker = Object.create(ScrollSectionTracker.prototype);

        tracker.container = { scrollHeight: 1100 };
        tracker.currentProgress = 0.35;
        tracker.elements = new Map([[element, section]]);
        tracker.sections = new Map([[section.id, section]]);
        tracker.getPositionInContainer = () => 200;
        tracker.setVariable = () => tracker;

        tracker.measure(element);

        assert.deepEqual(
            {
                top: section.top,
                height: section.height,
                start: section.start,
                end: section.end
            },
            {
                top: 200,
                height: 300,
                start: 0.2,
                end: 0.5
            }
        );
        assert.ok(Math.abs(tracker.getScopedVariable("intro").current - 0.5) < Number.EPSILON * 4);
    } finally {
        globalThis.window = originalWindow;
    }
});

test("master progress is cached and clamped from scroll events", () => {
    const tracker = Object.create(ScrollSectionTracker.prototype);
    tracker.progressVariable = "--scroll-y-progress";
    tracker.currentProgress = 0;

    const master = tracker.getMasterVariable();

    tracker.setProgress(0.4);
    assert.equal(master.current, 0.4);

    tracker.setProgress(2);
    assert.equal(master.current, 1);

    tracker.setProgress(-1);
    assert.equal(master.current, 0);
});
