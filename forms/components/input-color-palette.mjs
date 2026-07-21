import InputComponent from "./input-component.mjs";
import HSB from "../../core/color/hsb.mjs";
class InputColorPaletteComponent extends InputComponent {
    static tag = "input-color-palette";

    static get observed() {
        return ["hex", "rgb", "hsb", "options"];
    }

    static get config() {
        return {
            value: { type: "string", default: "" },
            native: { tag: "input", attrs: { type: "hidden" } },
            format: undefined,
            validation: false
        };
    }

    static get styles() {
        return {
            ":host": {
                display: "block",
                minWidth: "250px"
            },
            ".tile": {
                position: "relative",
                background: "#FFF"
            },
            ".preview": {
                position: "relative",
                aspectRatio: "1",
                height: "100%",
                backgroundColor: "var(--value, #d2d2d2)",
                clipPath: "polygon(0% 0%, 100% 0%, 100% 80%, 80% 100%, 0% 100%)"
            },
            ".tab": {
                position: "absolute",
                width: "15%",
                height: "15%",
                background: "#000",
                bottom: 0,
                right: 0,
                clipPath: "polygon(0% 100%, 100% 0%, 100% 100%)"
            },
            ".palette": {
                position: "absolute",
                maxWidth: "340px",
                top: "100%",
                background: "#FFF",
                padding: "10px",
                zIndex: 100,
                border: "1px solid #d2d2d2",
                boxSizing: "border-box",
                display: "none"
            },
            ".palette::before": {
                content: "''",
                position: "absolute",
                top: "-10px",
                left: "0",
                width: "0",
                height: "0",
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderBottom: "10px solid #FFF"
            },
            ".swatches": {
                position: "relative",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                background: "#f3f3f3",
                border: "1px solid #d2d2d2",
                boxSizing: "border-box",
                minHeight: "20px"
            },
            ".input-wrapper": {
                overflow: "visible !Important",
                borderBottomLeftRadius: "0px !Important",
                borderBottomRightRadius: "0px !Important"
            },
            ".swatch": {
                width: "20px",
                minWidth: "20px",
                aspectRatio: "1",
                borderBottom: "1px solid #d2d2d2",
                borderRight: "1px solid #d2d2d2",
                boxSizing: "border-box",
                cursor: "pointer"
            },
            ":host(:hover) .palette": {
                display: "block"
            },
            ".html-view": {
                width: "100%",
                display: "flex",
                flexDirection: "row"
            },
            "#data": {
                position: "relative",
                height: "100%",
                width: "100%",
                fontSize: "0.6rem",
                paddingTop: "0.25rem",
                paddingLeft: "0.5rem"
            },
            "#data .rgb::before": {
                content: '"RGB: "',
                fontWeight: "bold"
            },
            "#data .hex:before": {
                content: '"HEX: "',
                fontWeight: "bold"
            },
            "#data .hsb:before": {
                content: '"HSB: "',
                fontWeight: "bold"
            }
        };
    }

    static html(instance) {
        return `
            <div class="tile">
            <div id="preview" class="preview" part="preview"></div>
            <div class="tab"></div>
            </div>
            <div id="data" class="data">
                <div class="rgb"></div>
                <div class="hex"></div>
                <div class="hsb"></div>
            </div>
            <div class="palette">
            <div class="swatches"></div>
            </div>
            
            <native></native>
        `;
    }

    _onCreate() {
        this._wireframe.root.style.setProperty("--value", this.value || "#d2d2d2");
    }

    bindSwatch(swatch, color) {
        let colorTmp;

        swatch.addEventListener("pointerenter", () => {
            if (this.color === color) return;
            colorTmp = this.preview.style.backgroundColor;
            this.preview.style.backgroundColor = color.toHex();
        });
        swatch.addEventListener("pointerleave", () => {
            if (this.color === color) return;
            this.preview.style.backgroundColor = colorTmp;
        });
        swatch.addEventListener("pointerdown", () => {
            this.selectColor(color, true);
        });
    }

    renderSwatches() {
        const container = this._shadow.querySelector(".swatches");
        if (!container) return;
        container.replaceChildren();

        const colors = (Array.isArray(this.options) ? this.options : [])
            .map((c) => HSB.fromHex(c))
            .sort((a, b) => a.h - b.h)
            .sort((a, b) => a.b - b.b);
        this.colors = colors;
        for (let i = 0; i < colors.length; i++) {
            const color = colors[i];
            const swatch = document.createElement("div");
            swatch.className = "swatch";
            swatch.style.backgroundColor = color.toHex();
            swatch.setAttribute("data-index", i);
            this.bindSwatch(swatch, color);
            swatch.setAttribute("role", "button");
            swatch.setAttribute("tabindex", "0");
            swatch.setAttribute("aria-label", `Select ${color.toHex()}`);
            swatch.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                this.selectColor(color, true);
            });
            container.appendChild(swatch);
        }
    }

    _afterRender() {
        this.preview = this._shadow.querySelector("#preview");
        this.data = this._shadow.querySelector("#data");

        this._wireframe.root.style.setProperty("--value", this.value || "#d2d2d2");
        const style = window.getComputedStyle(this._shadow.querySelector("#preview"));
        this.hsb = HSB.fromRGB(style.backgroundColor);
        this.selectColor(this.hsb);
        this.renderSwatches();
    }

    selectColor(color, notify = false) {
        this.color = color;
        this.value = color.toHex();
        this.preview.style.backgroundColor = this.value;
        this._wireframe.root.style.setProperty("--value", this.value);
        this.data.querySelector(".rgb").innerText = Object.values(color.toRGB()).join(", "); //this.hsb.toRGB();
        this.data.querySelector(".hex").innerText = color.toHex();
        this.data.querySelector(".hsb").innerText = Object.values(color.toJSON())
            .map((v) => v.toFixed(2))
            .join(", "); //this.hsb;
        if (notify) {
            this.dispatchEvent(new Event("input", { bubbles: true }));
            this.dispatchEvent(new Event("change", { bubbles: true }));
            this.dispatchEvent(
                new CustomEvent("style-guide:change", {
                    bubbles: true,
                    composed: true,
                    detail: { value: this.value }
                })
            );
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue === newValue) return;

        switch (name) {
            case "rgb":
                this.color = HSB.fromRGB(newValue);
                break;
            case "hsb":
                this.color = new HSB(...String(newValue || "").split(","));
                break;
            case "hex":
                this.color = HSB.fromHex(newValue);
                break;
            case "value":
                this.color = HSB.fromHex(newValue);
                break;
            case "options":
                try {
                    this.options = JSON.parse(newValue);
                } catch (_error) {
                    this.options = Array.isArray(window[newValue]) ? [...new Set(window[newValue])] : [];
                }
                if (this._shadow) this.renderSwatches();
                break;
        }

        if (name !== "options" && this.color && this.preview && this.data) {
            this.selectColor(this.color);
        }
    }
}

export default InputColorPaletteComponent;

customElements.define(InputColorPaletteComponent.tag, InputColorPaletteComponent);
