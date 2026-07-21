import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("input side controls use the native height plus vertical padding", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );
    const inputSelect = await readFile(
        new URL("./input-select.mjs", import.meta.url),
        "utf8"
    );

    assert.match(
        inputComponent,
        /--input-control-size":\s*"calc\(var\(--input-height\) \+ var\(--input-padding\) \+ var\(--input-padding\)\)"/
    );
    assert.match(inputSelect, /width:\s*"var\(--input-control-size\)"/);
    assert.match(inputSelect, /height:\s*"var\(--input-control-size\)"/);
});

test("input height remains CSS-owned instead of being measured per component type", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );
    const inputTextarea = await readFile(
        new URL("./input-textarea.mjs", import.meta.url),
        "utf8"
    );

    assert.doesNotMatch(inputComponent, /measuredInputHeights/);
    assert.doesNotMatch(inputComponent, /_measureNativeInputHeight/);
    assert.match(inputTextarea, /height:\s*"var\(--input-control-size\)"/);
});

test("textareas always begin at one row and grow to their content", async () => {
    const inputTextarea = await readFile(
        new URL("./input-textarea.mjs", import.meta.url),
        "utf8"
    );

    assert.equal((inputTextarea.match(/textarea\.rows = 1;/g) || []).length, 2);
    assert.doesNotMatch(inputTextarea, /getAttribute\("rows"\)/);
    assert.match(inputTextarea, /addEventListener\("input", this\._boundAutoGrow\)/);
    assert.match(inputTextarea, /textarea\.style\.height = `\$\{textarea\.scrollHeight\}px`/);
});

test("browser-prefilled controls color the complete input wrapper", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /\.input-wrapper:has\(input:-webkit-autofill\)/);
    assert.match(inputComponent, /var\(--input-prefill-bgcolor, #e8f0fe\)/);
    assert.match(inputComponent, /WebkitBoxShadow:\s*"0 0 0 1000px var\(--input-state-bgcolor/);
});

test("all shared field states resolve through the complete input wrapper", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );

    for (const state of ["focus", "valid", "incomplete", "invalid", "readonly", "disabled"]) {
        assert.match(inputComponent, new RegExp(`var\\(--input-${state}-bgcolor`));
    }
    assert.match(inputComponent, /background:\s*"var\(--input-state-bgcolor\)"/);
    assert.match(inputComponent, /WebkitBoxShadow:[\s\S]*?var\(--input-state-bgcolor/);
});

test("input buttons and submit buttons use the shared control height", async () => {
    const inputButton = await readFile(
        new URL("./input-button.mjs", import.meta.url),
        "utf8"
    );

    assert.match(
        inputButton,
        /--input-control-size:\s*calc\(\s*var\(--input-height\)\s*\+\s*var\(--input-padding\)\s*\+\s*var\(--input-padding\)\s*\)/
    );
    assert.match(inputButton, /height:\s*var\(--input-control-size\)/);
    assert.doesNotMatch(inputButton, /height:\s*var\(--input-height,\s*auto\)/);
});

test("select options keep value as their single source of truth", async () => {
    const inputSelect = await readFile(
        new URL("./input-select.mjs", import.meta.url),
        "utf8"
    );

    assert.doesNotMatch(inputSelect, /dataset\.value/);
    assert.doesNotMatch(inputSelect, /data-value/);
    assert.match(inputSelect, /if \(this\.hasAttribute\("value"\)\) return this\.getAttribute\("value"\);/);
    assert.match(inputSelect, /const value = target\.value;/);
    assert.match(inputSelect, /const attrValue = this\.getAttribute\("value"\);/);
    assert.match(inputSelect, /if \(attrValue === null && optionData\.selected\)/);
});

test("select options render as full-width block rows", async () => {
    const inputSelect = await readFile(
        new URL("./input-select.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputSelect, /:host\s*\{\s*display:\s*block;\s*width:\s*100%;/);
    assert.match(inputSelect, /\.option\s*\{\s*display:\s*flex;/);
    assert.match(inputSelect, /select-option\.selected"/);
    assert.doesNotMatch(inputSelect, /selected:not\(\.placeholder\)/);
});

test("radio and checkbox child content acts as the checked visual view", async () => {
    const contentView = await readFile(
        new URL("./checkable-content-view.mjs", import.meta.url),
        "utf8"
    );
    const inputRadio = await readFile(
        new URL("./input-radio.mjs", import.meta.url),
        "utf8"
    );
    const inputCheckbox = await readFile(
        new URL("./input-checkbox.mjs", import.meta.url),
        "utf8"
    );

    assert.match(contentView, /this\.host\.children\.length > 0/);
    assert.match(contentView, /child\.classList\.toggle\("checked", checked\)/);
    assert.match(contentView, /slot\.className = "checkable-content-view"/);
    assert.match(inputRadio, /new CheckableContentView\(this\)/);
    assert.match(inputCheckbox, /new CheckableContentView\(this\)/);
    assert.match(inputRadio, /radio\.checked = false/);
});

test("native checked changes resync aria and custom checked views", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );
    const inputRadio = await readFile(
        new URL("./input-radio.mjs", import.meta.url),
        "utf8"
    );
    const inputCheckbox = await readFile(
        new URL("./input-checkbox.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /this\._isSyncing = false;\s*\}\s*this\._syncVisualState\(\);/);
    assert.match(inputRadio, /setAttribute\("aria-checked", this\.checked \? "true" : "false"\)/);
    assert.match(inputCheckbox, /setAttribute\("aria-checked", this\.checked \? "true" : "false"\)/);
});

test("select option list anchors to the field instead of the labeled root", async () => {
    const inputSelect = await readFile(
        new URL("./input-select.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputSelect, /rootRect\.bottom - inputRect\.top/);
    assert.match(inputSelect, /inputRect\.bottom - rootRect\.top/);
    assert.doesNotMatch(inputSelect, /style\.bottom = `100%`/);
    assert.doesNotMatch(inputSelect, /style\.top = `100%`/);
});

test("select feedback is positioned opposite the open option list", async () => {
    const inputSelect = await readFile(
        new URL("./input-select.mjs", import.meta.url),
        "utf8"
    );
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputSelect, /classList\.contains\("open-below"\)\) return "above"/);
    assert.match(inputSelect, /classList\.contains\("open-above"\)\) return "below"/);
    assert.match(inputSelect, /this\._queueFieldFeedbackPosition\(\)/);
    assert.match(inputComponent, /this\._getFieldFeedbackPlacementPreference\(\)/);
});

test("custom selects expose combobox semantics and complete keyboard navigation", async () => {
    const inputSelect = await readFile(
        new URL("./input-select.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputSelect, /setAttribute\("role", "combobox"\)/);
    assert.match(inputSelect, /setAttribute\("aria-controls", this\._optionList\.id\)/);
    assert.match(inputSelect, /setAttribute\("aria-activedescendant", active\.id\)/);
    assert.match(inputSelect, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
    assert.match(inputSelect, /event\.key === "Home" \|\| event\.key === "End"/);
    assert.match(inputSelect, /event\.key === "Enter" \|\| event\.key === " "/);
    assert.match(inputSelect, /event\.key === "Escape"/);
    assert.match(inputSelect, /event\.key === "Tab"/);
});

test("field status icon fills the top-right half of the triangular status wrapper", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );
    const inputStatus = await readFile(
        new URL("./input-status.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /status\.setAttribute\("fill", ""\)/);
    assert.doesNotMatch(inputComponent, /status\.setAttribute\("size", "14"\)/);
    assert.match(inputComponent, /"input-status":\s*\{[\s\S]*?width:\s*"50%"[\s\S]*?height:\s*"50%"/);
    assert.match(inputStatus, /this\.hasAttribute\("fill"\) \? "100%" : `\$\{size\}px`/);
});

test("field feedback owns descriptions and all validation messages", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );
    const validationController = await readFile(
        new URL("./validation/validation-controller.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /"description",/);
    assert.match(inputComponent, /"example",/);
    assert.match(
        inputComponent,
        /this\._wireframe\.validation\.append\([\s\S]*?this\._dom\.feedbackHeading,[\s\S]*?this\._dom\.description,[\s\S]*?this\._dom\.validationMessage,[\s\S]*?this\._dom\.guidance/
    );
    assert.match(inputComponent, /this\._dom\.feedbackHeading\.append\(this\._dom\.feedbackHeadingLabel, this\._dom\.example\)/);
    assert.match(inputComponent, /this\._dom\.guidance\.append\(this\._dom\.format\)/);
    assert.match(inputComponent, /this\._dom\.feedbackHeadingLabel\.textContent = fieldLabel/);
    assert.match(inputComponent, /this\._dom\.validationMessage\.replaceChildren\(/);
    assert.match(inputComponent, /native\.setAttribute\("aria-describedby", this\._dom\.descriptionAssist\.id\)/);
    assert.match(inputComponent, /native\.setAttribute\("aria-errormessage", this\._dom\.validationAssist\.id\)/);
    assert.match(inputComponent, /this\._dom\.descriptionAssist\.textContent = \[/);
    assert.match(inputComponent, /this\._dom\.validationAssist\.textContent = messages\.join\(" "\)/);
    assert.match(validationController, /this\.host\._syncFieldFeedback\(\)/);
    assert.match(inputComponent, /this\._syncFieldFeedback\(\)/);
});

test("shared inputs derive requirement labels and forward mobile keyboard hints", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /"inputmode"/);
    assert.match(inputComponent, /native\.inputMode = this\.getAttribute\("inputmode"\) \|\| ""/);
    assert.match(inputComponent, /this\._isRequiredField\(\) \? "Required" : "Optional"/);
    assert.match(inputComponent, /rule\.type === "required"/);
});

test("field feedback shows examples and format guidance only for invalid values", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );
    const validationController = await readFile(
        new URL("./validation/validation-controller.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /this\._dom\.example\.textContent = example \? `\(ex\. \$\{example\}\)` : ""/);
    assert.match(inputComponent, /getInputFormatGuidance\(settings\)/);
    assert.match(inputComponent, /this\._setFieldFeedbackLine\(this\._dom\.format, "Format", format\)/);
    assert.match(inputComponent, /const templateMatch = formatSpec\.trim\(\)\.match\(/);
    assert.match(inputComponent, /getValidationPresetMetadata\(rule\)/);
    assert.match(inputComponent, /getFormatterMetadata\(formatter\)/);
    assert.match(inputComponent, /describeValidationRule\(rule\.type, rule\.args\)/);
    assert.match(inputComponent, /if \(!guidance\.length\) add\(settings\.metadata\.format\)/);
    assert.match(validationController, /this\.host\._validationErrors = errors/);
});

test("validation preset formats drive registered formatter pipelines", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /getFormatterMetadata, getFormatters/);
    assert.match(inputComponent, /configuredFormat \|\| getFormatFromValidationPresets\(validationTokens\)/);
    assert.match(inputComponent, /getValidationPresetMetadata\(validationTokens\[i\]\.type\)\.formatter/);
    assert.match(inputComponent, /formatterNames\.every\(\(name\) => typeof formatters\[name\] === "function"\)/);
});

test("field feedback avoids native suggestion popups and otherwise uses available viewport space", async () => {
    const inputComponent = await readFile(
        new URL("./input-component.mjs", import.meta.url),
        "utf8"
    );

    assert.match(inputComponent, /const spaceBelow = window\.innerHeight - inputRect\.bottom/);
    assert.match(inputComponent, /const spaceAbove = inputRect\.top/);
    assert.match(inputComponent, /const avoidSuggestionPopup = this\._mayShowBrowserSuggestions\(\)/);
    assert.match(inputComponent, /avoidSuggestionPopup && fitsAbove/);
    assert.match(inputComponent, /feedbackHeight \+ gap > spaceBelow && spaceAbove > spaceBelow/);
    assert.match(inputComponent, /if \(autocomplete === "off"\) return false/);
    assert.match(inputComponent, /\["email", "password", "search", "tel", "url"\]\.includes\(type\)/);
    assert.match(inputComponent, /wrapper\.dataset\.placement = placeAbove \? "above" : "below"/);
    assert.match(inputComponent, /const viewportGap = 8/);
    assert.match(inputComponent, /Math\.min\(desiredWidth, maxWidth\)/);
    assert.match(inputComponent, /viewportLeft - rootRect\.left/);
});
