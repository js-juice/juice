import test from "node:test";
import assert from "node:assert/strict";

import config, { resetJuiceConfig } from "../../config/juice-config.mjs";

test("nested config values inspect and serialize as populated objects", () => {
    resetJuiceConfig();
    config.paths = { root: "ROOT", data: "DATA" };

    assert.equal(config.paths.root, "ROOT");
    assert.deepEqual(Object.keys(config.paths), ["root", "data"]);
    assert.deepEqual(config.paths.toJSON(), { root: "ROOT", data: "DATA" });
    assert.deepEqual(config.paths.toJson(), { root: "ROOT", data: "DATA" });
    assert.equal(JSON.stringify(config.paths), '{"root":"ROOT","data":"DATA"}');
});

test("config exposes typed set and delete listeners", () => {
    resetJuiceConfig();
    const events = [];
    const stopSet = config.on("set", (event) => events.push(event));
    const stopDelete = config.on("delete", (event) => events.push(event));

    config.paths = { data: "DATA" };
    delete config.paths.data;

    stopSet();
    stopDelete();

    assert.deepEqual(
        events.map(({ type, path, value, previousValue }) => ({ type, path, value, previousValue })),
        [
            { type: "set", path: "paths", value: { data: "DATA" }, previousValue: {} },
            { type: "delete", path: "paths.data", value: undefined, previousValue: "DATA" }
        ]
    );
});
