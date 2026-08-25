import test from "node:test";
import assert from "node:assert/strict";

import {
    advanceStateBoundary,
    normalizeStateBoundary,
    normalizeRandomRange,
    stateBoundaryUniform
} from "../../animation/graphics/particles/particle-state-system.mjs";

test("rand expressions declare stable per-particle ranges", () => {
    assert.deepEqual(normalizeRandomRange("rand(-2.5, 5e-1)", 0), [-2.5, 0.5]);
    assert.deepEqual(normalizeRandomRange(3, 0), [3, 3]);
    assert.deepEqual(normalizeRandomRange("rand(5, 2)", 7), [7, 7]);
});

test("state boundary supports horizontal, vertical, and full-frame diagonal wipes", () => {
    const horizontal = normalizeStateBoundary({ orientation: "horizontal", position: 0 }, null, false);
    const vertical = normalizeStateBoundary({ orientation: "vertical", position: 1 }, null, false);
    const diagonal = normalizeStateBoundary({ orientation: "diagonal", angle: 45, position: 1 }, null, false);

    assert.deepEqual(stateBoundaryUniform(horizontal), [0, 1, -1, 0]);
    assert.deepEqual(stateBoundaryUniform(vertical), [1, 0, 1, 0]);
    assert.ok(Math.abs(stateBoundaryUniform(diagonal)[2] - Math.SQRT2) < 1e-12);
});

test("state boundary moves toward its target at normalized distance per second", () => {
    const boundary = normalizeStateBoundary(
        { position: 1, transitionSpeed: 0.25 },
        { orientation: "horizontal", position: 0, targetPosition: 0, feather: 0, angle: 45, transitionSpeed: 0 },
        true
    );

    assert.equal(boundary.position, 0);
    assert.equal(boundary.targetPosition, 1);
    assert.equal(advanceStateBoundary(boundary, 2), true);
    assert.equal(boundary.position, 0.5);
    assert.equal(advanceStateBoundary(boundary, 2), true);
    assert.equal(boundary.position, 1);
    assert.equal(advanceStateBoundary(boundary, 1), false);
});

test("zero speed applies a boundary target immediately and feather is clamped", () => {
    const boundary = normalizeStateBoundary(
        { position: 0.8, speed: 0, feather: 2 },
        { orientation: "vertical", position: 0.2, targetPosition: 0.2, feather: 0, angle: 0, transitionSpeed: 1 },
        true
    );

    assert.equal(boundary.position, 0.8);
    assert.equal(boundary.targetPosition, 0.8);
    assert.equal(boundary.feather, 1);
});
