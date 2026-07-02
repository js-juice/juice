import { parseColor } from "./convert.mjs";

function normalize(color) {
    if (Array.isArray(color)) {
        return {
            r: Number(color[0]) || 0,
            g: Number(color[1]) || 0,
            b: Number(color[2]) || 0,
            a: color[3] == null ? 1 : Number(color[3]) || 0
        };
    }

    return parseColor(color);
}

export function same(color1, color2, tolerance = 0) {
    const left = normalize(color1);
    const right = normalize(color2);
    return (
        Math.abs(left.r - right.r) <= tolerance &&
        Math.abs(left.g - right.g) <= tolerance &&
        Math.abs(left.b - right.b) <= tolerance &&
        Math.abs(left.a - right.a) <= tolerance
    );
}

export function distance(color1, color2) {
    const left = normalize(color1);
    const right = normalize(color2);
    return Math.sqrt(
        Math.pow(left.r - right.r, 2) + Math.pow(left.g - right.g, 2) + Math.pow(left.b - right.b, 2)
    );
}

export function contrast(color1, color2) {
    const left = normalize(color1);
    const right = normalize(color2);
    const l1 = (0.2126 * left.r + 0.7152 * left.g + 0.0722 * left.b) / 255;
    const l2 = (0.2126 * right.r + 0.7152 * right.g + 0.0722 * right.b) / 255;
    return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
}

export function diff(color1, color2) {
    const left = normalize(color1);
    const right = normalize(color2);
    return Math.abs(left.r - right.r) + Math.abs(left.g - right.g) + Math.abs(left.b - right.b);
}
