/**
 * Palette-only color input. The site style-guide variables are the source of
 * truth; HTML attributes only override presentation/configuration defaults.
 */
import InputComponent from "./input-component.mjs";

class InputPalette extends InputComponent {
    static tag = "input-palette";

    static config = {
        value: { type: "string", default: "" },
        native: {
            tag: "input",
            attrs: { type: "text", autocomplete: "off" }
        },
        palette: {
            prefix: "--color-",
            selector: ":root",
            swatchSize: "40px",
            valueFormat: "color"
        }
    };

    static get observed() {
        return ["palette-prefix", "palette-selector", "swatch-size", "value-format"];
    }

    static html(host) {
        return host._createPaletteView();
    }

    constructor() {
        super({ _layout: "label:input:>:default:native:status:<:validation", ignoreHeight: true });
        this.inputType = "palette";
        this._palette = [];
    }

    static get styles() {
        return {
            ".native-wrapper": { display: "none" },
            ".input-wrapper": { border: 0, padding: 0, background: "transparent" },
            ".palette": {
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                padding: "0.65rem",
                border: "1px solid var(--color-border, #ccc)",
                borderRadius: "var(--form-border-radius, 4px)",
                background: "var(--color-surface, #f2f2f2)"
            },
            ".swatch": {
                position: "relative",
                width: "var(--palette-swatch-size, 40px)",
                height: "var(--palette-swatch-size, 40px)",
                padding: 0,
                border: "2px solid rgba(0, 0, 0, 0.2)",
                borderRadius: "4px",
                background: "var(--swatch-color)",
                cursor: "pointer",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.45)"
            },
            ".swatch:hover": { transform: "translateY(-1px)" },
            ".swatch[aria-checked='true']": {
                outline: "3px solid var(--color-focus-ring, #ff6f00)",
                outlineOffset: "2px"
            },
            ".swatch:focus-visible": {
                outline: "3px solid var(--color-focus-ring, #ff6f00)",
                outlineOffset: "2px"
            }
        };
    }

    _setting(attribute, key) {
        return this.getAttribute(attribute) || this.constructor.config.palette[key];
    }

    _afterConnected() {
        this.style.setProperty("--palette-swatch-size", this._setting("swatch-size", "swatchSize"));
        this._refreshPalette();
        this._syncVisualState();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue === newValue || !this.isConnected) return;

        if (name === "swatch-size") {
            this.style.setProperty("--palette-swatch-size", this._setting("swatch-size", "swatchSize"));
        }
        if (name === "palette-prefix" || name === "palette-selector" || name === "value-format") {
            this._refreshPalette();
        }
    }

    _createPaletteView() {
        const palette = document.createElement("div");
        palette.className = "palette";
        palette.setAttribute("role", "radiogroup");
        palette.setAttribute("aria-label", this.label || "Site color palette");

        (this._palette || []).forEach(({ name, value }) => {
            const optionValue = this._optionValue(name, value);
            const swatch = document.createElement("button");
            swatch.type = "button";
            swatch.className = "swatch";
            swatch.dataset.value = optionValue;
            swatch.style.setProperty("--swatch-color", value);
            swatch.title = `${this._labelFor(name)} (${value})`;
            swatch.setAttribute("aria-label", swatch.title);
            swatch.setAttribute("role", "radio");
            swatch.addEventListener("click", () => this._select(optionValue));
            palette.appendChild(swatch);
        });

        return palette;
    }

    _select(value) {
        if (this.disabled) return;
        this.value = value;
        this._syncVisualState();
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    _syncVisualState() {
        if (!this._dom.default) return;
        const selected = String(this.value || "").toLowerCase();
        this._dom.default.querySelectorAll(".swatch").forEach((swatch) => {
            const isSelected = swatch.dataset.value === selected;
            swatch.setAttribute("aria-checked", String(isSelected));
            swatch.tabIndex = isSelected || (!selected && swatch === this._dom.default.firstElementChild) ? 0 : -1;
            swatch.disabled = this.disabled;
        });
    }

    _readPalette() {
        const prefix = this._setting("palette-prefix", "prefix");
        const selector = this._setting("palette-selector", "selector");
        const target = document.querySelector(selector) || document.documentElement;
        const names = new Set();

        const inspect = (rules) => {
            for (const rule of rules || []) {
                if (rule.style) {
                    for (let index = 0; index < rule.style.length; index += 1) {
                        const property = rule.style[index];
                        if (property.startsWith(prefix)) names.add(property);
                    }
                }
                try { if (rule.cssRules) inspect(rule.cssRules); } catch (_) { /* inaccessible stylesheet */ }
            }
        };

        for (const sheet of document.styleSheets) {
            try { inspect(sheet.cssRules); } catch (_) { /* cross-origin stylesheet */ }
        }

        const computed = getComputedStyle(target);
        const colors = new Map();
        const variables = [];
        names.forEach((name) => {
            const value = this._toHex(computed.getPropertyValue(name).trim());
            if (!value) return;
            if (this._setting("value-format", "valueFormat") === "variable") {
                variables.push({ name, value });
            } else if (!colors.has(value)) {
                colors.set(value, { name, value });
            }
        });
        return variables.length ? variables : [...colors.values()];
    }

    _refreshPalette() {
        this._palette = this._readPalette();
        this._dom.default?.remove();
        this._renderDefault();
        this._ensureDefaultMountedInInputContainer();
        this._syncVisualState();
    }

    _optionValue(name, color) {
        return this._setting("value-format", "valueFormat") === "variable" ? `var(${name})` : color;
    }

    _toHex(color) {
        if (/^#[\da-f]{6}$/i.test(color)) return color.toLowerCase();
        if (/^#[\da-f]{3}$/i.test(color)) {
            return `#${[...color.slice(1)].map((character) => character.repeat(2)).join("")}`.toLowerCase();
        }

        const probe = document.createElement("span");
        probe.style.color = color;
        if (!probe.style.color) return "";
        document.body.appendChild(probe);
        const match = getComputedStyle(probe).color.match(/[\d.]+/g);
        probe.remove();
        if (!match || match.length < 3) return "";
        return `#${match.slice(0, 3).map((channel) => Math.round(Number(channel)).toString(16).padStart(2, "0")).join("")}`;
    }

    _labelFor(name) {
        return name.replace(/^--color-/, "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
}

customElements.define(InputPalette.tag, InputPalette);

export default InputPalette;
