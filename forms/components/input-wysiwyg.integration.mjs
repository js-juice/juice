import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const testHtml =
    process.env.WYSIWYG_TEST_URL ||
    pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "wysiwyg-smoke.html")).href;

async function runBrowserChecks() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const pageErrors = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(testHtml, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
        const host = document.querySelector("input-wysiwyg");
        return Boolean(host?.shadowRoot?.querySelector(".wysiwyg-editor"));
    });

    const result = await page.evaluate(() => {
        const host = document.querySelector("input-wysiwyg");
        const editor = host.shadowRoot.querySelector(".wysiwyg-editor");
        const sourceBtn = host.shadowRoot.querySelector('.wysiwyg-tool[data-tool="source"]');
        const sourceEditor = host.shadowRoot.querySelector(".wysiwyg-source");

        editor.innerHTML = "<strong>Hello</strong> world";

        sourceBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        const sourcePressedOn = sourceBtn.getAttribute("aria-pressed");
        const sourceVisible = !sourceEditor.hidden;
        const sourceValue = sourceEditor.value;

        sourceBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        const sourcePressedOff = sourceBtn.getAttribute("aria-pressed");
        const editorVisible = !editor.hidden;
        const editorHtml = editor.innerHTML;

        return {
            sourcePressedOn,
            sourceVisible,
            sourceValue,
            sourcePressedOff,
            editorVisible,
            editorHtml
        };
    });

    await browser.close();

    return {
        pageErrors,
        ...result
    };
}

const browserResult = await runBrowserChecks();
console.log("browser result:", JSON.stringify(browserResult, null, 2));

assert.equal(browserResult.pageErrors.length, 0, `page errors: ${browserResult.pageErrors.join("; ")}`);
assert.equal(browserResult.sourcePressedOn, "true");
assert.equal(browserResult.sourceVisible, true);
assert.match(browserResult.sourceValue, /<strong>Hello<\/strong>/);
assert.equal(browserResult.sourcePressedOff, "false");
assert.equal(browserResult.editorVisible, true);
assert.match(browserResult.editorHtml, /<strong>Hello<\/strong>/);

console.log("integration checks passed");
