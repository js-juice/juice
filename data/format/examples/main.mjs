/**
 * Interactive browser demo for data/format.
 * @module data/format/examples/main
 */

import { applyFormatPipeline } from "../FormatPipeline.mjs";
import { getFormatters, registerFormatter } from "../Presets.mjs";

/**
 * Example rows rendered in the sample table.
 * @type {Array<{label: string, input: string, spec: string}>}
 */
const SAMPLE_CASES = [
    { label: "Title Case", input: "hello world from juice", spec: "ucwords" },
    { label: "Slug", input: "Hello World!", spec: "computize" },
    { label: "ZIP", input: "123456789", spec: "tpl(ddddd-dddd)" },
    { label: "Phone", input: "18005551212", spec: "tpl(+d (ddd) ddd-dddd)" },
    { label: "Trim + Lower + Ucword", input: "  mixed Case Value  ", spec: "trim:lower:ucword" }
];

const inputEl = /** @type {HTMLInputElement} */ (document.getElementById("input-value"));
const specEl = /** @type {HTMLInputElement} */ (document.getElementById("format-spec"));
const outputEl = /** @type {HTMLElement} */ (document.getElementById("output-value"));
const statusEl = /** @type {HTMLElement} */ (document.getElementById("output-status"));
const stepsEl = /** @type {HTMLElement} */ (document.getElementById("step-list"));
const sampleBodyEl = /** @type {HTMLElement} */ (document.getElementById("sample-body"));
const registryEl = /** @type {HTMLElement} */ (document.getElementById("registry-list"));

/**
 * Split a string on delimiter while ignoring delimiters inside parenthesis.
 * @param {string} text - Input text.
 * @param {string} delimiter - Split delimiter.
 * @returns {string[]} Split parts.
 */
function splitTopLevel(text, delimiter) {
    const input = String(text || "");
    const parts = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        if (char === "(") {
            depth += 1;
            current += char;
            continue;
        }
        if (char === ")") {
            depth = Math.max(0, depth - 1);
            current += char;
            continue;
        }
        if (char === delimiter && depth === 0) {
            parts.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

/**
 * Render pipeline step chips from format specification.
 * @param {string} spec - Format specification string.
 */
function renderSteps(spec) {
    const steps = splitTopLevel(spec, ":").filter(Boolean);
    stepsEl.replaceChildren();

    if (!steps.length) {
        const empty = document.createElement("div");
        empty.className = "step empty";
        empty.textContent = "No steps";
        stepsEl.appendChild(empty);
        return;
    }

    for (let i = 0; i < steps.length; i += 1) {
        const step = document.createElement("div");
        step.className = "step";
        step.textContent = steps[i];
        stepsEl.appendChild(step);
    }
}

/**
 * Render formatter registry preview list.
 */
function renderRegistry() {
    const formatters = Object.keys(getFormatters()).sort();
    registryEl.textContent = formatters.join(", ");
}

/**
 * Safely run the format pipeline and paint output UI.
 */
function runInteractive() {
    const value = inputEl.value;
    const spec = specEl.value;
    renderSteps(spec);

    try {
        const output = applyFormatPipeline(value, spec);
        outputEl.textContent = output;
        statusEl.textContent = "OK";
        statusEl.className = "pill ok";
    } catch (error) {
        outputEl.textContent = String(error && error.message ? error.message : error);
        statusEl.textContent = "Error";
        statusEl.className = "pill error";
    }
}

/**
 * Render static example results table.
 */
function renderSamples() {
    sampleBodyEl.replaceChildren();

    for (let i = 0; i < SAMPLE_CASES.length; i += 1) {
        const row = SAMPLE_CASES[i];
        const tr = document.createElement("tr");

        const label = document.createElement("td");
        label.textContent = row.label;

        const input = document.createElement("td");
        input.textContent = row.input;

        const spec = document.createElement("td");
        spec.textContent = row.spec;

        const result = document.createElement("td");
        result.textContent = applyFormatPipeline(row.input, row.spec);

        tr.append(label, input, spec, result);
        sampleBodyEl.appendChild(tr);
    }
}

registerFormatter("wrap", (value, left = "[", right = "]") => `${left}${value}${right}`);
SAMPLE_CASES.push({ label: "Custom Formatter", input: "juice", spec: "wrap(<,>)" });

renderRegistry();
renderSamples();
runInteractive();

inputEl.addEventListener("input", runInteractive);
specEl.addEventListener("input", runInteractive);
