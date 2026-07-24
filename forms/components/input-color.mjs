import InputComponent from "./input-component.mjs";
import "./input-text.mjs";

const FORMATS = ["hex", "rgb", "rgba", "hsl", "hsla", "hsb"];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function componentToHex(value) {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function normalizeHexPair(value) {
    return String(value || "00")
        .replace(/[^0-9a-f]/gi, "")
        .slice(0, 2)
        .padStart(2, "0");
}

function rgbToHex({ r, g, b }) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function rgbToHsl({ r, g, b, a = 1 }) {
    r /= 255;
    g /= 255;
    b /= 255;

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
        a
    };
}

function rgbToHsv({ r, g, b, a = 1 }) {
    r = clamp(Number(r) || 0, 0, 255) / 255;
    g = clamp(Number(g) || 0, 0, 255) / 255;
    b = clamp(Number(b) || 0, 0, 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;

    if (d !== 0) {
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
                break;
            case g:
                h = ((b - r) / d + 2) * 60;
                break;
            default:
                h = ((r - g) / d + 4) * 60;
                break;
        }
    }

    return {
        h: Math.round(h),
        s: max === 0 ? 0 : d / max,
        v: max,
        a
    };
}

function hsvToRgb({ h, s, v, a = 1 }) {
    h = (((Number(h) || 0) % 360) + 360) % 360;
    s = clamp(Number(s) || 0, 0, 1);
    v = clamp(Number(v) || 0, 0, 1);

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
        r: (r + m) * 255,
        g: (g + m) * 255,
        b: (b + m) * 255,
        a
    };
}

function hslToRgb({ h, s, l, a = 1 }) {
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
        a
    };
}

function parseColor(value) {
    const color = String(value || "#000000").trim();
    let match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (match) {
        const hex =
            match[1].length === 3
                ? match[1]
                      .split("")
                      .map((part) => part + part)
                      .join("")
                : match[1];
        const number = parseInt(hex, 16);
        return {
            format: "hex",
            r: (number >> 16) & 255,
            g: (number >> 8) & 255,
            b: number & 255,
            a: 1
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

    match = color.match(/^hsb\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i);
    if (match) {
        return {
            format: "hsb",
            ...hsvToRgb({
                h: Number(match[1]) || 0,
                s: (Number(match[2]) || 0) / 100,
                v: (Number(match[3]) || 0) / 100
            })
        };
    }

    return parseColor("#000000");
}

function formatColor(color, format) {
    const rgb = {
        r: Math.round(color.r),
        g: Math.round(color.g),
        b: Math.round(color.b),
        a: clamp(Number(color.a ?? 1), 0, 1)
    };
    const hsl = rgbToHsl(rgb);
    const hsb = rgbToHsv(rgb);

    switch (format) {
        case "rgb":
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        case "rgba":
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(rgb.a.toFixed(2))})`;
        case "hsl":
            return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        case "hsla":
            return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${Number(rgb.a.toFixed(2))})`;
        case "hsb":
            return `hsb(${hsb.h}, ${Math.round(hsb.s * 100)}%, ${Math.round(hsb.v * 100)}%)`;
        default:
            return rgbToHex(rgb);
    }
}

class InputColorComponent extends InputComponent {
    ignoreHeight = true;

    static tag = "input-color";

    static get observed() {
        return ["format", "formats"];
    }

    constructor() {
        super({ _layout: "label:input:>:default:native:status:<:validation", ignoreHeight: true });
        this.colorFormat = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue === newValue) return;

        if (name === "format") {
            this.colorFormat = this._firstAllowedFormat(newValue, this.colorFormat);
            this._syncVisualState();
            return;
        }

        if (name === "formats") {
            this._renderFormatOptions();
            this.colorFormat = this._firstAllowedFormat(this.colorFormat, this.getAttribute("format"));
            this._syncVisualState();
        }
    }

    static get styles() {
        return {
            ".native-wrapper": {
                display: "none"
            },
            ".input-root": {
                "--input-padding": 0,
                "--input-height": "30px",
                "--label-inside-bgcolor": "#333333",
                "--input-text-indent": "5px"
            },
            ":host, .input-root, .input-container, .input-wrapper, .color-input, .channels, .channel": {
                overflow: "visible"
            },
            label: {
                textIndent: "0.5rem"
            },
            ".channels input-text, .full-value input-text": {
                "--form-label-color": "#ffffff"
            },
            ".color-input": {
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                position: "relative",
                width: "100%",
                boxSizing: "border-box"
            },
            ':host([layout="horizontal"]) .color-input': {
                display: "grid",
                gridTemplateColumns: "minmax(132px, 0.75fr) minmax(240px, 1.25fr)",
                gridTemplateRows: "auto 1fr",
                gap: "0.75rem",
                alignItems: "stretch"
            },
            ".preview": {
                position: "relative",
                gridColumn: "1",
                gridRow: "1",
                minHeight: "132px",
                border: "1px solid #cbd5e1",

                background: "var(--color-value, #000000)",
                overflow: "visible"
            },
            ':host([layout="horizontal"]) .preview': {
                gridColumn: "1",
                gridRow: "1 / span 2",
                minHeight: "100%"
            },
            ".format": {
                position: "absolute",
                left: "8px",
                top: "8px",
                width: "86px",
                height: "30px",
                border: "1px solid rgba(15, 23, 42, 0.22)",
                borderRadius: "5px",
                background: "rgba(255,255,255,0.92)",
                color: "#0f172a",
                fontSize: "12px",
                lineHeight: "1",
                zIndex: 40,
                cursor: "pointer"
            },
            ".eyedropper": {
                position: "absolute",
                right: "8px",
                top: "8px",
                display: "grid",
                placeItems: "center",
                width: "30px",
                height: "30px",
                padding: 0,
                border: "1px solid rgba(15, 23, 42, 0.22)",
                borderRadius: "5px",
                background: "rgba(255,255,255,0.92)",
                color: "#0f172a",
                cursor: "pointer"
            },
            ".eyedropper svg": {
                width: "16px",
                height: "16px"
            },
            ".eyedropper:disabled": {
                opacity: 0.45,
                cursor: "not-allowed"
            },
            ".channels": {
                display: "flex",
                margin: "0 1rem",
                marginBottom: "1rem",
                flexDirection: "column",
                gap: "6px",
                alignContent: "start"
            },
            ':host([layout="horizontal"]) .channels': {
                gridColumn: "2",
                gridRow: "2",
                margin: 0,
                marginBottom: 0,
                padding: "0 0.75rem 0.75rem 0",
                boxSizing: "border-box"
            },
            ".channel": {
                position: "relative",
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: "0.5rem"
            },
            ".channel-slider-panel": {
                position: "relative",
                boxSizing: "border-box",
                borderRadius: "6px",
                background: "#ffffff"
            },
            ".channel-slider-panel[hidden]": {},
            ".channel-slider": {
                display: "block",
                width: "100%",
                height: "28px",
                margin: 0,
                padding: 0,
                appearance: "auto",
                accentColor: "var(--color-value, #2563eb)",
                cursor: "pointer"
            },
            ".channel label": {
                fontSize: "10px",
                lineHeight: "1",
                textTransform: "uppercase",
                color: "#475569"
            },
            "select, input-text": {
                borderRadius: "5px",
                boxSizing: "border-box",
                font: "inherit",
                minWidth: 0
            },
            "input-text": {
                marginBottom: 0
            },
            ".channel input": {
                width: "100%"
            },
            ".text": {
                width: "100%"
            },
            ".full-value": {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                margin: "0 1rem",
                gridTemplateColumns: "1fr 34px",
                gap: "8px",
                alignItems: "center"
            },
            ':host([layout="horizontal"]) .full-value': {
                gridColumn: "2",
                gridRow: "1",
                margin: 0,
                padding: "0.75rem 0.75rem 0 0",
                boxSizing: "border-box"
            },
            ".color-input[picker-open] .full-value": {
                gridTemplateColumns: "1fr 34px 34px"
            },
            ".picker, .picker-close": {
                width: "34px",
                height: "34px",
                border: "1px solid #cbd5e1",
                borderRadius: "5px",
                boxSizing: "border-box",
                cursor: "pointer"
            },
            ".picker": {
                background: "var(--color-value, #000000)"
            },
            ".picker-close": {
                display: "none",
                placeItems: "center",
                padding: 0,
                color: "#0f172a",
                background: "#ffffff",
                font: "inherit",
                lineHeight: 1
            },
            ".color-input[picker-open] .picker-close": {
                display: "grid"
            },
            ".picker-panel": {
                position: "absolute",
                left: "-5px",
                top: "-5px",
                right: "-78px",
                bottom: 0,
                zIndex: 100,
                display: "none",
                padding: 0,
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                boxShadow: "0 14px 32px rgba(15, 23, 42, 0.22)",
                boxSizing: "border-box"
            },
            ".picker-panel[open]": {
                display: "grid",
                gridTemplateRows: "1fr 16px",
                gap: "8px"
            },
            ':host([layout="horizontal"]) .picker-panel': {
                right: "-5px"
            },
            ".picker-sv": {
                position: "relative",
                minHeight: 0,
                borderRadius: "5px 5px 0 0",
                background:
                    "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsla(var(--picker-hue, 0), 100%, 50%, 1))",
                cursor: "crosshair",
                overflow: "hidden"
            },
            ".picker-hue": {
                width: "100%",
                height: "16px",
                appearance: "none",
                border: 0,
                borderRadius: "999px",
                background: "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)",
                cursor: "pointer"
            },
            ".picker-handle": {
                position: "absolute",
                left: "calc(var(--picker-saturation, 1) * 100%)",
                top: "calc((1 - var(--picker-value, 1)) * 100%)",
                width: "12px",
                height: "12px",
                border: "2px solid #ffffff",
                borderRadius: "50%",
                boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.55)",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none"
            }
        };
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "hidden";
        input.classList.add("native");
        return input;
    }

    _renderDefault() {
        if (this._dom.default) return;

        this._dom.default = document.createElement("div");
        this._dom.default.className = "color-input";
        this._dom.default.innerHTML = `
            <div class="preview">
                <button class="eyedropper" type="button" aria-label="Sample color">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M18.7 3.3a2.4 2.4 0 0 0-3.4 0l-2 2-.9-.9a1 1 0 1 0-1.4 1.4l.9.9-7.6 7.6a1 1 0 0 0-.3.7v3h-1a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-1v-1.6l7.6-7.6.9.9a1 1 0 0 0 1.4-1.4l-.9-.9 2-2a2.4 2.4 0 0 0 0-3.4Zm-11 11.1 5.6-5.6 1.9 1.9-5.6 5.6H7.7v-1.9Zm9.6-8.4-.8.8-1.9-1.9.8-.8a.4.4 0 0 1 .6 0l1.3 1.3a.4.4 0 0 1 0 .6Z"/>
                    </svg>
                </button>
                <div class="picker-panel">
                    <div class="picker-sv"><span class="picker-handle"></span></div>
                    <input class="picker-hue" type="range" min="0" max="360" value="0" aria-label="Hue">
                </div>
            </div>
            
            <div class="full-value">
                <input-text class="text" label-placement="inside" show-requirement="false"></input-text>
                <button class="picker" type="button" aria-label="Pick color"></button>
                <button class="picker-close" type="button" aria-label="Close color picker" disabled>X</button>
            </div>

            <div class="channels"></div>
        `;

        const preview = this._dom.default.querySelector(".preview");
        this._dom.formatSelect = this._createFormatSelect();
        preview.prepend(this._dom.formatSelect);
        this._dom.eyedropper = this._dom.default.querySelector(".eyedropper");
        this._dom.text = this._dom.default.querySelector(".text");
        this._dom.picker = this._dom.default.querySelector(".picker");
        this._dom.pickerClose = this._dom.default.querySelector(".picker-close");
        this._dom.pickerPanel = this._dom.default.querySelector(".picker-panel");
        this._dom.pickerSv = this._dom.default.querySelector(".picker-sv");
        this._dom.pickerHue = this._dom.default.querySelector(".picker-hue");
        this._dom.channels = this._dom.default.querySelector(".channels");
        this._renderFormatOptions();

        this._dom.formatSelect.addEventListener("change", () => {
            this.colorFormat = this._dom.formatSelect.value;
            this.commit(formatColor(parseColor(this.value), this.colorFormat));
        });
        this._dom.eyedropper.title = "Sample color";
        this._dom.eyedropper.addEventListener("click", () => {
            this.dispatchEvent(
                new CustomEvent("eyedropper-request", {
                    bubbles: true,
                    composed: true,
                    detail: {
                        input: this,
                        value: this.value
                    }
                })
            );
        });
        this._dom.text.addEventListener("change", () => this.commit(this._dom.text.value));
        this._dom.text.addEventListener("input", () => this.preview(this._dom.text.value));
        this._dom.picker.addEventListener("click", () => {
            this.togglePickerPanel();
        });
        this._dom.pickerClose.addEventListener("click", () => this.closePickerPanel());
        this._dom.pickerHue.addEventListener("input", () => {
            this.pickerState.h = Number(this._dom.pickerHue.value) || 0;
            this.commitPickerColor();
        });
        this._dom.pickerSv.addEventListener("pointerdown", (event) => this.startPickerDrag(event));
        this._dom.pickerSv.addEventListener("pointermove", (event) => this.dragPicker(event));
        this._dom.pickerSv.addEventListener("pointerup", (event) => {
            this.dragPicker(event);
            this.endPickerDrag();
            this.closePickerPanel();
        });
        this._dom.pickerSv.addEventListener("pointercancel", () => this.endPickerDrag());
        this._dom.pickerSv.addEventListener("lostpointercapture", () => this.endPickerDrag());

        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
    }

    _createFormatSelect() {
        const select = document.createElement("select");
        select.className = "format";
        select.setAttribute("aria-label", "Color format");
        return select;
    }

    get allowedFormats() {
        const raw = this.getAttribute("formats");
        if (!raw) return FORMATS;

        const formats = raw
            .split(/[,\s|]+/)
            .map((format) => format.trim().toLowerCase())
            .filter((format) => FORMATS.includes(format));

        const unique = [...new Set(formats)];
        return unique.length ? unique : FORMATS;
    }

    _firstAllowedFormat(...formats) {
        const allowed = this.allowedFormats;
        for (const format of formats) {
            const normalized = String(format || "").toLowerCase();
            if (allowed.includes(normalized)) return normalized;
        }
        return allowed[0] || "hex";
    }

    _createFormatOption(format) {
        const option = document.createElement("option");
        option.value = format;
        option.textContent = format.toUpperCase();
        return option;
    }

    _renderFormatOptions() {
        if (!this._dom.formatSelect) return;
        this._dom.formatSelect.replaceChildren(
            ...this.allowedFormats.map((format) => this._createFormatOption(format))
        );
    }

    _setTextValue(value) {
        if (!this._dom.text) return;
        this._dom.text.setAttribute("value", value);
        this._dom.text.value = value;
    }

    _afterConnected() {
        this._syncVisualState();
    }

    _syncFormatSelect() {
        if (!this._dom.formatSelect) return;
        this._dom.formatSelect.value = this.colorFormat;
    }

    openPickerPanel() {
        if (!this._dom.pickerPanel) return;
        this._dom.pickerPanel.setAttribute("open", "");
        if (this._dom.default) this._dom.default.setAttribute("picker-open", "");
        if (this._dom.pickerClose) this._dom.pickerClose.disabled = false;
    }

    closePickerPanel() {
        if (!this._dom.pickerPanel) return;
        this._dom.pickerPanel.removeAttribute("open");
        if (this._dom.default) this._dom.default.removeAttribute("picker-open");
        if (this._dom.pickerClose) this._dom.pickerClose.disabled = true;
    }

    togglePickerPanel() {
        if (this._dom.pickerPanel?.hasAttribute("open")) this.closePickerPanel();
        else this.openPickerPanel();
    }

    startPickerDrag(event) {
        event.preventDefault();
        this.pickerPointerId = event.pointerId;
        this._dom.pickerSv.setPointerCapture?.(event.pointerId);
        this.dragPicker(event);
    }

    dragPicker(event) {
        if (this.pickerPointerId !== event.pointerId) return;
        const rect = this._dom.pickerSv.getBoundingClientRect();
        this.pickerState.s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        this.pickerState.v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
        this.commitPickerColor();
    }

    endPickerDrag() {
        this.pickerPointerId = null;
    }

    commitPickerColor() {
        const current = parseColor(this.value);
        const picked = hsvToRgb({ ...this.pickerState, a: current.a });
        const next = formatColor(picked, this.colorFormat);
        this._setTextValue(next);
        this.renderChannels(picked);
        this.preview(next);
        this.commit(next);
    }

    channelConfig(format = this.colorFormat) {
        if (format === "hex") {
            return [
                { key: "rr", label: "RR", min: null, max: null },
                { key: "gg", label: "GG", min: null, max: null },
                { key: "bb", label: "BB", min: null, max: null }
            ];
        }

        if (format.startsWith("hsl")) {
            const fields = [
                { key: "h", label: "H", min: 0, max: 360 },
                { key: "s", label: "S", min: 0, max: 100 },
                { key: "l", label: "L", min: 0, max: 100 }
            ];
            if (format === "hsla") fields.push({ key: "a", label: "A", min: 0, max: 1, step: 0.01 });
            return fields;
        }

        if (format === "hsb") {
            return [
                { key: "h", label: "H", min: 0, max: 360 },
                { key: "s", label: "S", min: 0, max: 100 },
                { key: "b", label: "B", min: 0, max: 100 }
            ];
        }

        const fields = [
            { key: "r", label: "R", min: 0, max: 255 },
            { key: "g", label: "G", min: 0, max: 255 },
            { key: "b", label: "B", min: 0, max: 255 }
        ];
        if (format === "rgba") fields.push({ key: "a", label: "A", min: 0, max: 1, step: 0.01 });
        return fields;
    }

    colorToChannels(color, format = this.colorFormat) {
        if (format === "hex") {
            return {
                rr: componentToHex(color.r),
                gg: componentToHex(color.g),
                bb: componentToHex(color.b)
            };
        }

        if (format.startsWith("hsl")) return rgbToHsl(color);
        if (format === "hsb") {
            const hsb = rgbToHsv(color);
            return { h: hsb.h, s: Math.round(hsb.s * 100), b: Math.round(hsb.v * 100) };
        }
        return {
            r: Math.round(color.r),
            g: Math.round(color.g),
            b: Math.round(color.b),
            a: clamp(Number(color.a ?? 1), 0, 1)
        };
    }

    formatValue(format = this.colorFormat) {
        const normalizedFormat = String(format || "hex").toLowerCase();
        const targetFormat = FORMATS.includes(normalizedFormat) ? normalizedFormat : "hex";
        return formatColor(parseColor(this.value), targetFormat);
    }

    channelsToColor() {
        const format = this.colorFormat;
        const values = {};
        this._dom.channels.querySelectorAll("[data-channel]").forEach((input) => {
            values[input.dataset.channel] = input.value;
        });

        if (format === "hex") {
            return `#${normalizeHexPair(values.rr)}${normalizeHexPair(values.gg)}${normalizeHexPair(values.bb)}`;
        }

        if (format.startsWith("hsl")) {
            return formatColor(
                hslToRgb({
                    h: Number(values.h) || 0,
                    s: Number(values.s) || 0,
                    l: Number(values.l) || 0,
                    a: clamp(Number(values.a ?? 1) || 0, 0, 1)
                }),
                format
            );
        }

        if (format === "hsb") {
            return formatColor(
                hsvToRgb({
                    h: Number(values.h) || 0,
                    s: (Number(values.s) || 0) / 100,
                    v: (Number(values.b) || 0) / 100
                }),
                format
            );
        }

        return formatColor(
            {
                r: clamp(Number(values.r) || 0, 0, 255),
                g: clamp(Number(values.g) || 0, 0, 255),
                b: clamp(Number(values.b) || 0, 0, 255),
                a: clamp(Number(values.a ?? 1) || 0, 0, 1)
            },
            format
        );
    }

    renderChannels(color) {
        if (!this._dom.channels) return;
        const values = this.colorToChannels(color);
        this._dom.channels.replaceChildren();

        this.channelConfig().forEach((field) => {
            const wrap = document.createElement("div");
            wrap.className = "channel";

            const input = document.createElement("input-text");
            input.setAttribute("label-placement", "inside");
            input.setAttribute("show-requirement", "false");
            input.setAttribute("label", field.label);
            input.dataset.channel = field.key;
            input.type = field.min === null ? "text" : "number";
            if (field.min !== null) input.min = field.min;
            if (field.max !== null) input.max = field.max;
            if (field.step !== undefined) input.step = field.step;
            const value = values[field.key] ?? "";
            input.setAttribute("value", value);
            input.value = value;
            input.addEventListener("input", () => {
                const next = this.channelsToColor();
                this._setTextValue(next);
                this.preview(next);
            });
            input.addEventListener("change", () => this.commit(this.channelsToColor()));

            const slider = document.createElement("input");
            slider.className = "channel-slider";
            slider.type = "range";
            slider.min = field.min === null ? 0 : field.min;
            slider.max = field.max === null ? 255 : field.max;
            slider.step = field.step ?? 1;
            slider.value = field.min === null ? parseInt(value || "00", 16) : value;
            slider.setAttribute("aria-label", `${field.label} value`);
            const sliderPanel = document.createElement("div");
            sliderPanel.className = "channel-slider-panel";
            sliderPanel.append(slider);

            const showSlider = () => {
                this._dom.channels.querySelectorAll(".channel-slider-panel").forEach((candidate) => {
                    candidate.hidden = candidate !== sliderPanel;
                });
                slider.value = field.min === null ? parseInt(input.value || "00", 16) : input.value;
                sliderPanel.hidden = false;
            };

            input.addEventListener("click", showSlider);
            input.addEventListener("focusin", showSlider);
            slider.addEventListener("input", () => {
                const channelValue = field.min === null ? componentToHex(Number(slider.value)) : slider.value;
                input.value = channelValue;
                input.setAttribute("value", channelValue);

                const next = this.channelsToColor();
                this._setTextValue(next);
                this.preview(next);
                this._dom.native.value = next;
                this._isSyncing = true;
                try {
                    this.setAttribute("value", next);
                } finally {
                    this._isSyncing = false;
                }
                this._updateFormValue();
                this.dispatchEvent(new Event("input", { bubbles: true }));
            });
            slider.addEventListener("change", () => {
                this.dispatchEvent(new Event("change", { bubbles: true }));
            });
            slider.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    sliderPanel.hidden = true;
                    input.focus();
                }
            });

            wrap.append(input, sliderPanel);
            this._dom.channels.appendChild(wrap);
        });
    }

    commit(value) {
        const parsed = parseColor(value);
        const nextFormat = this._firstAllowedFormat(this.colorFormat, parsed.format);
        this.colorFormat = nextFormat;
        this._dom.native.value = formatColor(parsed, nextFormat);
        this._syncHostFromNative();
        this._updateFormValue();
        this._syncVisualState();
        this.dispatchEvent(new Event("input", { bubbles: true }));
        this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    preview(value) {
        if (!this._dom.default) return;
        const parsed = parseColor(value);
        this._dom.default.style.setProperty("--color-value", formatColor(parsed, "rgba"));
    }

    _syncVisualState() {
        if (!this._dom.default || !this._dom.native) return;
        const parsed = parseColor(this.value);
        this._renderFormatOptions();
        this.colorFormat = this._firstAllowedFormat(this.colorFormat, this.getAttribute("format"), parsed.format);
        this._syncFormatSelect();
        this._dom.text.setAttribute("label", this.colorFormat.toUpperCase());
        this._setTextValue(formatColor(parsed, this.colorFormat));
        this.pickerState = rgbToHsv(parsed);
        this._dom.pickerHue.value = this.pickerState.h;
        this._dom.default.style.setProperty("--picker-hue", this.pickerState.h);
        this._dom.default.style.setProperty("--picker-saturation", this.pickerState.s);
        this._dom.default.style.setProperty("--picker-value", this.pickerState.v);
        this.renderChannels(parsed);
        this.preview(formatColor(parsed, "rgba"));
    }
}

customElements.define(InputColorComponent.tag, InputColorComponent);

export default InputColorComponent;
