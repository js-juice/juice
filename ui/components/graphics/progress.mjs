import Component from "../../component.mjs";

export class UIProgress extends Component.HTMLElement {
    static tag = "ui-progress";

    static config = {
        name: "ui-progress",
        properties: {
            value: { type: "number", default: 0, linked: true },
            min: { type: "number", default: 0, linked: true },
            max: { type: "number", default: 100, linked: true },
            progress: { type: "number", default: 0, linked: true },
            height: { type: "int", default: 14, linked: true },
            barcolor: { type: "string", default: "#2d6cff", linked: true },
            bgcolor: { type: "string", default: "#d9e2f2", linked: true },
            label: { type: "string", default: "", linked: true }
        }
    };

    static get observed() {
        return {
            all: ["progress", "value", "min", "max", "height", "barcolor", "bgcolor", "label"]
        };
    }

    static html() {
        return `
            <div id="label" part="label"></div>
            <div id="bar" part="bar">
                <div id="progress" part="progress"></div>
            </div>
            <div id="display" part="display"></div>
        `;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "grid",
                    gap: "0.35rem"
                },
                "#label": {
                    color: "#2a3a54",
                    fontWeight: "600"
                },
                "#bar": {
                    width: "100%",
                    height: "var(--height, 14px)",
                    borderRadius: "999px",
                    overflow: "hidden",
                    background: "var(--bg-color, #d9e2f2)"
                },
                "#progress": {
                    width: "calc( var(--progress, 0) * 1% )",
                    height: "100%",
                    background: "var(--bar-color, #2d6cff)",
                    transition: "width 0.2s ease"
                },
                "#value": {
                    color: "#4d5f7d",
                    fontFamily: "monospace",
                    fontSize: "12px"
                }
            }
        ];
    }

    onPropertyChanged(property, oldValue, newValue) {
        if (property == "value") {
            const clamped = Math.min(this.max, Math.max(this.min, newValue));
            if (clamped !== newValue) this.value = clamped;
            const percent = ((clamped - this.min) / this.span) * 100;
            this.complete = newValue >= this.max;
            this.progress = percent;
            if (this.ref("display")) this.ref("display").textContent = this.updateDisplay();
            if (this.ref("label")) this.ref("label").textContent = this.label || "";
        } else if (property == "progress") {
            this.setStyleVar("--progress", newValue);
        }
    }

    updateDisplay() {
        if (this.displayFormat) {
            return this.displayFormat.replace(this.displayPattern, (match, key) => {
                return this[key] !== undefined ? this[key] : match;
            });
        }
        return `${Math.round(this.progress)}% (${this.value}/${this.max})`;
    }

    onFirstConnect() {
        if (this.hasAttribute("display-format")) {
            this.displayPattern = new RegExp(
                `\\b(${Object.keys(this.constructor.config.properties).join("|")})\\b`,
                "gi"
            );
            this.displayFormat = this.getAttribute("display-format");
        }
        this.min = Number.isFinite(this.min) ? this.min : 0;
        this.max = Number.isFinite(this.max) ? this.max : 100;
        const raw = Number.isFinite(this.value) ? this.value : 0;
        this.span = Math.max(1, this.max - this.min);
        const clamped = Math.min(this.max, Math.max(this.min, raw));
        const percent = ((clamped - this.min) / this.span) * 100;

        this.ref("bar")?.style.setProperty("--height", `${this.height || 14}px`);
        this.ref("bar")?.style.setProperty("--bg-color", this.bgcolor || "#d9e2f2");
        this.ref("bar")?.style.setProperty("--bar-color", this.barcolor || "#2d6cff");

        this.progress = percent;

        if (this.ref("display")) this.ref("display").textContent = this.updateDisplay();
        if (this.ref("label")) this.ref("label").textContent = this.label || "";
        this.complete = clamped === this.max;
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get(UIProgress.tag)) customElements.define(UIProgress.tag, UIProgress);
}

export default UIProgress;
