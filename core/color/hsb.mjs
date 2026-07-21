import { parseColor, rgbToHex } from "./convert.mjs";

class HSB {
    static fromRGB(r, g, b) {
        const color = arguments.length === 1 ? parseColor(r) : parseColor({ r, g, b });
        const red = color.r / 255;
        const green = color.g / 255;
        const blue = color.b / 255;
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const delta = maximum - minimum;
        let hue = 0;

        if (delta !== 0) {
            if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
            else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
            else hue = 60 * ((red - green) / delta + 4);
        }

        if (hue < 0) hue += 360;

        return new HSB(hue, maximum === 0 ? 0 : (delta / maximum) * 100, maximum * 100);
    }

    static fromHex(value) {
        return HSB.fromRGB(parseColor(value));
    }

    constructor(h = 0, s = 0, b = 0) {
        this.h = h;
        this.s = s;
        this.b = b;
    }

    set h(value) {
        this.hue(value);
    }

    get h() {
        return this._h;
    }

    set s(value) {
        this.saturation(value);
    }

    get s() {
        return this._s;
    }

    set b(value) {
        this.brightness(value);
    }

    get b() {
        return this._b;
    }

    hue(value) {
        if (value === undefined) return this._h;
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 360) return this;
        this._h = number;
        return this;
    }

    saturation(value) {
        if (value === undefined) return this._s;
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 100) return this;
        this._s = number;
        return this;
    }

    brightness(value) {
        if (value === undefined) return this._b;
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 100) return this;
        this._b = number;
        return this;
    }

    toRGB() {
        const hue = this.h / 60;
        const brightness = this.b / 100;
        const chroma = brightness * (this.s / 100);
        const intermediate = chroma * (1 - Math.abs((hue % 2) - 1));
        const match = brightness - chroma;
        let red = 0;
        let green = 0;
        let blue = 0;

        if (hue < 1) [red, green, blue] = [chroma, intermediate, 0];
        else if (hue < 2) [red, green, blue] = [intermediate, chroma, 0];
        else if (hue < 3) [red, green, blue] = [0, chroma, intermediate];
        else if (hue < 4) [red, green, blue] = [0, intermediate, chroma];
        else if (hue < 5) [red, green, blue] = [intermediate, 0, chroma];
        else [red, green, blue] = [chroma, 0, intermediate];

        return {
            r: Math.round((red + match) * 255),
            g: Math.round((green + match) * 255),
            b: Math.round((blue + match) * 255)
        };
    }

    toHex() {
        return rgbToHex(this.toRGB());
    }

    toJSON() {
        return { h: this.h, s: this.s, b: this.b };
    }
}

export default HSB;
