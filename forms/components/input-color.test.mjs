import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./input-color.mjs", import.meta.url), "utf8");

test("color channel sliders keep the selected color on their thumbs", () => {
    assert.match(source, /\.channel-slider::-webkit-slider-thumb/);
    assert.match(source, /\.channel-slider::-moz-range-thumb/);
    assert.match(source, /background: "var\(--color-value, #2563eb\)"/);
});

test("RGB and hexadecimal tracks identify their red green and blue contributions", () => {
    assert.match(source, /r: "linear-gradient\(to right, #000, #f00\)"/);
    assert.match(source, /g: "linear-gradient\(to right, #000, #0f0\)"/);
    assert.match(source, /b: "linear-gradient\(to right, #000, #00f\)"/);
});

test("HSL HSB and alpha tracks visualize the active channel scale", () => {
    assert.match(source, /const hueTrack = "linear-gradient/);
    assert.match(source, /hsl\.h}, 0%, \$\{hsl\.l}%/);
    assert.match(source, /hsvToRgb\(\{ h: hsb\.h, s: 0, v: hsb\.v \}\)/);
    assert.match(source, /repeating-conic-gradient/);
    assert.match(source, /_syncChannelTracks\(parseColor\(next\)\)/);
});
