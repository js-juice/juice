import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();

function checkSyntax(file) {
    execFileSync("node", ["--check", file], { stdio: "pipe" });
}

test("UI modules pass syntax checks", () => {
    const files = [
        "ui/component.mjs",
        "ui/index.mjs",
        "ui/components/scroll.mjs",
        "ui/components/gauge.mjs",
        "ui/components/lists.mjs",
        "ui/components/controls/checklist.mjs",
        "ui/components/controls/tabs.mjs",
        "ui/components/graphics/progress.mjs",
        "ui/components/graphics/index.mjs",
        "animation/index.mjs",
        "ui/components/shapes/2d/shape2d.mjs",
        "ui/components/shapes/2d/circle.mjs",
        "ui/components/shapes/2d/square.mjs",
        "ui/components/keyboard/key.mjs",
        "ui/components/keyboard/key-group.mjs",
        "ui/examples/register.mjs"
    ];

    for (let i = 0; i < files.length; i += 1) {
        checkSyntax(path.resolve(ROOT, files[i]));
    }
});

test("examples folder contains starter component demos", async () => {
    const indexHtml = path.resolve(ROOT, "ui/examples/index.html");
    const keyboardHtml = path.resolve(ROOT, "ui/examples/keyboard.html");
    const scrollHtml = path.resolve(ROOT, "ui/examples/scroll.html");
    const gaugeHtml = path.resolve(ROOT, "ui/examples/gauge.html");
    const shapesHtml = path.resolve(ROOT, "ui/examples/shapes.html");
    const sortableHtml = path.resolve(ROOT, "ui/examples/sortable-list.html");
    const expandableHtml = path.resolve(ROOT, "ui/examples/expandable-list.html");
    const checklistHtml = path.resolve(ROOT, "ui/examples/checklist.html");
    const tabsHtml = path.resolve(ROOT, "ui/examples/tabs.html");
    const progressHtml = path.resolve(ROOT, "ui/examples/progress.html");
    const registerMjs = path.resolve(ROOT, "ui/examples/register.mjs");

    assert.equal(existsSync(indexHtml), true);
    assert.equal(existsSync(keyboardHtml), true);
    assert.equal(existsSync(scrollHtml), true);
    assert.equal(existsSync(gaugeHtml), true);
    assert.equal(existsSync(shapesHtml), true);
    assert.equal(existsSync(sortableHtml), true);
    assert.equal(existsSync(expandableHtml), true);
    assert.equal(existsSync(checklistHtml), true);
    assert.equal(existsSync(tabsHtml), true);
    assert.equal(existsSync(progressHtml), true);
    assert.equal(existsSync(registerMjs), true);

    const source = await readFile(indexHtml, "utf8");
    assert.match(source, /keyboard\.html/);
    assert.match(source, /scroll\.html/);
    assert.match(source, /gauge\.html/);
    assert.match(source, /shapes\.html/);
    assert.match(source, /sortable-list\.html/);
    assert.match(source, /expandable-list\.html/);
    assert.match(source, /checklist\.html/);
    assert.match(source, /tabs\.html/);
    assert.match(source, /progress\.html/);
});
