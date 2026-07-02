import {
    COLOR_FORMATS,
    complementColor,
    complementaryColors,
    convertColor,
    darkenColor,
    formatColor,
    lightenColor,
    parseColor,
    rgbToHsl
} from "./convert.mjs";
import { diff, same } from "./compare.mjs";

class Color {
    static formats = COLOR_FORMATS;

    static parse(value) {
        return parseColor(value);
    }

    static from(value) {
        const color = parseColor(value);
        return new Color(color.r, color.g, color.b, color.a, color.format);
    }

    static fromString(value) {
        return Color.from(value);
    }

    static fromHex(value) {
        return Color.from(value);
    }

    static convert(value, format = "hex") {
        return convertColor(value, format);
    }

    static lighten(value, amount = 10, format = null) {
        return lightenColor(value, amount, format);
    }

    static darken(value, amount = 10, format = null) {
        return darkenColor(value, amount, format);
    }

    static complement(value, format = null) {
        return complementColor(value, format);
    }

    static complementary(value, format = null) {
        return complementaryColors(value, format);
    }

    constructor(r = 0, g = 0, b = 0, a = 1, format = "rgba") {
        const color = parseColor({ r, g, b, a, format });
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
        this.format = format || color.format || "rgba";
    }

    get rgb() {
        return { r: this.r, g: this.g, b: this.b, a: this.a, format: this.format };
    }

    get hsl() {
        return rgbToHsl(this.rgb);
    }

    clone() {
        return new Color(this.r, this.g, this.b, this.a, this.format);
    }

    convert(format = "hex") {
        return formatColor(this.rgb, format);
    }

    to(format = "hex") {
        return this.convert(format);
    }

    lighten(amount = 10, format = null) {
        return lightenColor(this.rgb, amount, format || this.format);
    }

    darken(amount = 10, format = null) {
        return darkenColor(this.rgb, amount, format || this.format);
    }

    complement(format = null) {
        return complementColor(this.rgb, format || this.format);
    }

    complementary(format = null) {
        return complementaryColors(this.rgb, format || this.format);
    }

    matches(color, tolerance = 0) {
        return same(this, color, tolerance);
    }

    closest(colors = []) {
        const normalized = colors.map((color) => Color.from(color));
        if (!normalized.length) return { color: null, diff: Infinity };
        const color = normalized.reduce((closest, candidate) => {
            return diff(this, candidate) < diff(this, closest) ? candidate : closest;
        }, normalized[0]);
        return { color, diff: diff(this, color) };
    }

    diff(color) {
        return diff(this, color);
    }

    toString() {
        return this.convert(this.format || "rgba");
    }

    toJSON() {
        return this.rgb;
    }
}

export {
    complementColor,
    complementaryColors,
    convertColor,
    darkenColor,
    formatColor,
    lightenColor,
    parseColor
};
export default Color;
