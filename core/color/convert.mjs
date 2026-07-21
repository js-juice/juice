export const COLOR_FORMATS = ["hex", "rgb", "rgba", "hsl", "hsla"];

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function normalizePercent(value) {
    const number = Number(value) || 0;
    return Math.abs(number) <= 1 ? clamp(number * 100, 0, 100) : clamp(number, 0, 100);
}

export function componentToHex(value) {
    return clamp(Math.round(Number(value) || 0), 0, 255)
        .toString(16)
        .padStart(2, "0");
}

export function rgbToHex({ r, g, b }) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

export function rgbToHsl({ r, g, b, a = 1 }) {
    r = clamp(Number(r) || 0, 0, 255) / 255;
    g = clamp(Number(g) || 0, 0, 255) / 255;
    b = clamp(Number(b) || 0, 0, 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            default:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
        a: clamp(Number(a ?? 1) || 0, 0, 1)
    };
}

export function hslToRgb({ h, s, l, a = 1 }) {
    h = ((((Number(h) || 0) % 360) + 360) % 360) / 360;
    s = clamp(Number(s) || 0, 0, 100) / 100;
    l = clamp(Number(l) || 0, 0, 100) / 100;

    if (s === 0) {
        const value = l * 255;
        return { r: value, g: value, b: value, a };
    }

    const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
        r: hueToRgb(p, q, h + 1 / 3) * 255,
        g: hueToRgb(p, q, h) * 255,
        b: hueToRgb(p, q, h - 1 / 3) * 255,
        a: clamp(Number(a ?? 1) || 0, 0, 1)
    };
}

export function parseColor(value) {
    if (value && typeof value === "object") {
        if ("r" in value && "g" in value && "b" in value) {
            return {
                format: value.format || "rgb",
                r: clamp(Number(value.r) || 0, 0, 255),
                g: clamp(Number(value.g) || 0, 0, 255),
                b: clamp(Number(value.b) || 0, 0, 255),
                a: clamp(Number(value.a ?? 1) || 0, 0, 1)
            };
        }
        if ("h" in value && "s" in value && "l" in value) {
            return {
                format: value.a == null ? "hsl" : "hsla",
                ...hslToRgb(value)
            };
        }
    }

    const color = String(value || "#000000").trim();
    let match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (match) {
        let hex = match[1];
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .split("")
                .map((part) => part + part)
                .join("");
        }
        const hasAlpha = hex.length === 8;
        const number = parseInt(hex.slice(0, 6), 16);
        return {
            format: hasAlpha ? "rgba" : "hex",
            r: (number >> 16) & 255,
            g: (number >> 8) & 255,
            b: number & 255,
            a: hasAlpha ? clamp(parseInt(hex.slice(6, 8), 16) / 255, 0, 1) : 1
        };
    }

    match = color.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (match) {
        return {
            format: match[4] === undefined ? "rgb" : "rgba",
            r: clamp(Number(match[1]) || 0, 0, 255),
            g: clamp(Number(match[2]) || 0, 0, 255),
            b: clamp(Number(match[3]) || 0, 0, 255),
            a: clamp(Number(match[4] ?? 1) || 0, 0, 1)
        };
    }

    match = color.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (match) {
        return {
            format: match[4] === undefined ? "hsl" : "hsla",
            ...hslToRgb({
                h: Number(match[1]) || 0,
                s: Number(match[2]) || 0,
                l: Number(match[3]) || 0,
                a: clamp(Number(match[4] ?? 1) || 0, 0, 1)
            })
        };
    }

    return parseColor("#000000");
}

export function formatColor(value, format = "hex") {
    const color = parseColor(value);
    const rgb = {
        r: Math.round(color.r),
        g: Math.round(color.g),
        b: Math.round(color.b),
        a: clamp(Number(color.a ?? 1), 0, 1)
    };
    const hsl = rgbToHsl(rgb);

    switch (String(format || "hex").toLowerCase()) {
        case "rgb":
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        case "rgba":
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(rgb.a.toFixed(2))})`;
        case "hsl":
            return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        case "hsla":
            return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${Number(rgb.a.toFixed(2))})`;
        default:
            return rgbToHex(rgb);
    }
}

export function convertColor(value, format = "hex") {
    return formatColor(value, format);
}

export function lightenColor(value, amount = 10, format = null) {
    const color = parseColor(value);
    const hsl = rgbToHsl(color);
    hsl.l = clamp(hsl.l + normalizePercent(amount), 0, 100);
    return formatColor(hslToRgb(hsl), format || color.format || "hex");
}

export function darkenColor(value, amount = 10, format = null) {
    const color = parseColor(value);
    const hsl = rgbToHsl(color);
    hsl.l = clamp(hsl.l - normalizePercent(amount), 0, 100);
    return formatColor(hslToRgb(hsl), format || color.format || "hex");
}

export function complementColor(value, format = null) {
    const color = parseColor(value);
    const hsl = rgbToHsl(color);
    hsl.h = (hsl.h + 180) % 360;
    return formatColor(hslToRgb(hsl), format || color.format || "hex");
}

export function complementaryColors(value, format = null) {
    return [formatColor(value, format || parseColor(value).format || "hex"), complementColor(value, format)];
}

export function convertRGB(value, type) {
    return convertColor(value, type);
}

export function convertHex(value, type) {
    return convertColor(value, type);
}
