import InputComponent from "./input-component.mjs";

const FORMATS = ["hex", "rgb", "rgba", "hsl", "hsla"];

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

    switch (format) {
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

class InputColorComponent extends InputComponent {
    static tag = "input-color";

    static get observedAttributes() {
        return [...super.observedAttributes.filter((name) => name !== "type"), "format"];
    }

    constructor() {
        super({ _layout: "label:input:>:default:native:status:<:validation" });
        this.colorFormat = "hex";
    }

    get _styles() {
        return {
            ".native-wrapper": {
                display: "none"
            },
            ".color-input": {
                display: "grid",
                gridTemplateColumns: "1fr 64px",
                gridTemplateRows: "132px 32px",
                gap: "8px",
                padding: "10px",
                width: "300px",
                boxSizing: "border-box"
            },
            ".preview": {
                position: "relative",
                gridColumn: "1",
                gridRow: "1",
                minHeight: "132px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "var(--color-value, #000000)",
                overflow: "hidden"
            },
            ".format": {
                position: "absolute",
                left: "8px",
                top: "8px",
                width: "78px",
                background: "rgba(255,255,255,0.92)"
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
                cursor: "crosshair"
            },
            ".eyedropper svg": {
                width: "16px",
                height: "16px"
            },
            ".eyedropper:disabled": {
                opacity: 0.45,
                cursor: "not-allowed"
            },
            ".eyedropper[data-unavailable='true']": {
                opacity: 0.7,
                cursor: "pointer"
            },
            ".channels": {
                display: "grid",
                gridColumn: "2",
                gridRow: "1",
                gap: "6px",
                alignContent: "start"
            },
            ".channel": {
                display: "grid",
                gap: "2px"
            },
            ".channel label": {
                fontSize: "10px",
                lineHeight: "1",
                textTransform: "uppercase",
                color: "#475569"
            },
            "select, input-text": {
                height: "30px",
                borderRadius: "5px",
                boxSizing: "border-box",
                font: "inherit",
                minWidth: 0
            },
            "input-text": {
                marginBottom: 0,
                "--input-height": "30px"
            },
            ".channel input": {
                width: "100%"
            },
            ".text": {
                width: "100%"
            },
            ".full-value": {
                display: "grid",
                gridColumn: "1 / -1",
                gridRow: "2",
                gridTemplateColumns: "1fr 34px",
                gap: "8px",
                alignItems: "center"
            },
            ".picker": {
                width: "34px",
                height: "30px",
                border: "1px solid #cbd5e1",
                borderRadius: "5px",
                background: "var(--color-value, #000000)",
                boxSizing: "border-box",
                cursor: "pointer"
            },
            ".picker-panel": {
                position: "absolute",
                right: "10px",
                bottom: "50px",
                zIndex: 30,
                display: "none",
                width: "180px",
                padding: "8px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                boxShadow: "0 14px 32px rgba(15, 23, 42, 0.22)",
                boxSizing: "border-box"
            },
            ".picker-panel[open]": {
                display: "grid",
                gap: "8px"
            },
            ".picker-sv": {
                position: "relative",
                height: "120px",
                borderRadius: "6px",
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
                background:
                    "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)",
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
                <select class="format" aria-label="Color format">
                    ${FORMATS.map((format) => `<option value="${format}">${format.toUpperCase()}</option>`).join("")}
                </select>
                <button class="eyedropper" type="button" aria-label="Sample color">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M18.7 3.3a2.4 2.4 0 0 0-3.4 0l-2 2-.9-.9a1 1 0 1 0-1.4 1.4l.9.9-7.6 7.6a1 1 0 0 0-.3.7v3h-1a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-1v-1.6l7.6-7.6.9.9a1 1 0 0 0 1.4-1.4l-.9-.9 2-2a2.4 2.4 0 0 0 0-3.4Zm-11 11.1 5.6-5.6 1.9 1.9-5.6 5.6H7.7v-1.9Zm9.6-8.4-.8.8-1.9-1.9.8-.8a.4.4 0 0 1 .6 0l1.3 1.3a.4.4 0 0 1 0 .6Z"/>
                    </svg>
                </button>
            </div>
            <div class="channels"></div>
            <div class="full-value">
                <input-text class="text" label-placement="inside"></input-text>
                <button class="picker" type="button" aria-label="Pick color"></button>
            </div>
            <div class="picker-panel">
                <div class="picker-sv"><span class="picker-handle"></span></div>
                <input class="picker-hue" type="range" min="0" max="360" value="0" aria-label="Hue">
            </div>
        `;

        this._dom.format = this._dom.default.querySelector(".format");
        this._dom.eyedropper = this._dom.default.querySelector(".eyedropper");
        this._dom.text = this._dom.default.querySelector(".text");
        this._dom.picker = this._dom.default.querySelector(".picker");
        this._dom.pickerPanel = this._dom.default.querySelector(".picker-panel");
        this._dom.pickerSv = this._dom.default.querySelector(".picker-sv");
        this._dom.pickerHue = this._dom.default.querySelector(".picker-hue");
        this._dom.channels = this._dom.default.querySelector(".channels");

        this._dom.format.addEventListener("change", () => {
            this.colorFormat = this._dom.format.value;
            this.commit(formatColor(parseColor(this.value), this.colorFormat));
        });
        const hasEyeDropper = "EyeDropper" in window;
        this._dom.eyedropper.dataset.unavailable = hasEyeDropper ? "false" : "true";
        this._dom.eyedropper.title = hasEyeDropper
            ? "Sample color"
            : "Eyedropper needs browser support and a secure page.";
        this._dom.eyedropper.addEventListener("click", async () => {
            if (!("EyeDropper" in window)) {
                return;
            }

            try {
                const result = await new EyeDropper().open();
                if (!result?.sRGBHex) return;
                this.commit(formatColor(parseColor(result.sRGBHex), this.colorFormat));
            } catch (_error) {
                // The browser throws when the user cancels the sampler.
            }
        });
        this._dom.text.addEventListener("change", () => this.commit(this._dom.text.value));
        this._dom.text.addEventListener("input", () => this.preview(this._dom.text.value));
        this._dom.picker.addEventListener("click", () => {
            this._dom.pickerPanel.toggleAttribute("open");
        });
        this._dom.pickerHue.addEventListener("input", () => {
            this.pickerState.h = Number(this._dom.pickerHue.value) || 0;
            this.commitPickerColor();
        });
        this._dom.pickerSv.addEventListener("pointerdown", (event) => this.startPickerDrag(event));
        this._dom.pickerSv.addEventListener("pointermove", (event) => this.dragPicker(event));
        this._dom.pickerSv.addEventListener("pointerup", () => this.endPickerDrag());
        this._dom.pickerSv.addEventListener("pointercancel", () => this.endPickerDrag());
        this._dom.pickerSv.addEventListener("lostpointercapture", () => this.endPickerDrag());

        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
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
        this._dom.text.value = next;
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
        return {
            r: Math.round(color.r),
            g: Math.round(color.g),
            b: Math.round(color.b),
            a: clamp(Number(color.a ?? 1), 0, 1)
        };
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
            input.setAttribute("label", field.label);
            input.dataset.channel = field.key;
            input.type = field.min === null ? "text" : "number";
            if (field.min !== null) input.min = field.min;
            if (field.max !== null) input.max = field.max;
            if (field.step !== undefined) input.step = field.step;
            input.setAttribute("value", values[field.key] ?? "");
            input.addEventListener("input", () => {
                const next = this.channelsToColor();
                this._dom.text.value = next;
                this.preview(next);
            });
            input.addEventListener("change", () => this.commit(this.channelsToColor()));

            wrap.append(input);
            this._dom.channels.appendChild(wrap);
        });
    }

    commit(value) {
        const parsed = parseColor(value);
        const nextFormat = this._dom.format?.value || parsed.format || this.colorFormat;
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
        this.colorFormat = this.getAttribute("format") || parsed.format || this.colorFormat;
        this._dom.format.value = this.colorFormat;
        this._dom.text.setAttribute("label", this.colorFormat.toUpperCase());
        this._dom.text.value = formatColor(parsed, this.colorFormat);
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
