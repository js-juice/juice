/**
 * Runnable examples for data/format utilities.
 * @module data/format/examples/cli
 */

import { applyFormatPipeline } from "../FormatPipeline.mjs";
import { registerFormatter } from "../Presets.mjs";

/**
 * Print a titled result line.
 * @param {string} title - Example label.
 * @param {*} value - Result value.
 */
function print(title, value) {
    console.log(`${title}:`, value);
}

print("title", applyFormatPipeline("hello world from juice", "ucwords"));
print("slug", applyFormatPipeline("Hello World!", "computize"));
print("zip", applyFormatPipeline("123456789", "tpl(ddddd-dddd)"));
print("phone", applyFormatPipeline("18005551212", "tpl(+d (ddd) ddd-dddd)"));
print("chained", applyFormatPipeline("  mixed Case Value  ", "trim:lower:ucword"));

registerFormatter("wrap", (value, left = "[", right = "]") => `${left}${value}${right}`);
print("custom", applyFormatPipeline("juice", "wrap(<,>)"));
