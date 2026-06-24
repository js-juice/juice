import test from "node:test";
import assert from "node:assert/strict";
import { parseImportArgs, selectImportedModules } from "../../core/Import/Args.mjs";

const sections = ["animation", "core", "data", "forms", "style", "ui"];
const importSections = { forms: { import: "index.mjs" } };

test("import parser accepts path parts and optional module selectors", () => {
    assert.deepEqual(parseImportArgs(["core", "Dev", "Log.mjs"], sections, importSections), {
        section: "core",
        path: "Dev/Log.mjs",
        modulePath: "core/Dev/Log.mjs",
        modules: [],
        isSectionImport: false,
        options: {}
    });

    assert.deepEqual(parseImportArgs(["core/Dev/Log.mjs", ["Log"]], sections, importSections), {
        section: "core",
        path: "Dev/Log.mjs",
        modulePath: "core/Dev/Log.mjs",
        modules: ["Log"],
        isSectionImport: false,
        options: { modules: ["Log"] }
    });

    assert.deepEqual(parseImportArgs(["forms", { modules: ["refresh"] }], sections, importSections), {
        section: "forms",
        path: "index.mjs",
        modulePath: "forms/index.mjs",
        modules: ["refresh"],
        isSectionImport: true,
        options: { modules: ["refresh"] }
    });
});

test("module selection does not mutate or replace the complete module", () => {
    const completeModule = { Alpha: "alpha", Beta: "beta" };

    assert.deepEqual(selectImportedModules(completeModule, ["Alpha"]), { Alpha: "alpha" });
    assert.deepEqual(selectImportedModules(completeModule, ["Beta"]), { Beta: "beta" });
    assert.deepEqual(completeModule, { Alpha: "alpha", Beta: "beta" });
});
