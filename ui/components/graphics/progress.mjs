import Component from "../../component.mjs";

export class UIProgress extends Component.HTMLElement {
    static tag = "ui-progress";

    static config = {
        name: "ui-progress",
        properties: {
            value: { type: "number", default: 0, linked: true },
            min: { type: "number", default: 0, linked: true },
            max: { type: "number", default: 100, linked: true },
            height: { type: "int", default: 14, linked: true },
            barcolor: { type: "string", default: "#2d6cff", linked: true },
            bgcolor: { type: "string", default: "#d9e2f2", linked: true },
            label: { type: "string", default: "", linked: true }
        }
    };

    static get observed() {
        return {
            all: ["value", "min", "max", "height", "barcolor", "bgcolor", "label"]
        };
    }

    static html() {
        return `
            <div id="label" part="label"></div>
            <div id="bar" part="bar">
                <div id="progress" part="progress"></div>
            </div>
            <div id="value" part="value"></div>
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
                    width: "0%",
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

    onFirstConnect() {
        this.renderProgress();
    }

    onPropertyChanged() {
        this.renderProgress();
    }

    renderProgress() {
        const min = Number.isFinite(this.min) ? this.min : 0;
        const max = Number.isFinite(this.max) ? this.max : 100;
        const raw = Number.isFinite(this.value) ? this.value : 0;
        const span = Math.max(1, max - min);
        const clamped = Math.min(max, Math.max(min, raw));
        const percent = ((clamped - min) / span) * 100;

        this.ref("bar")?.style.setProperty("--height", `${this.height || 14}px`);
        this.ref("bar")?.style.setProperty("--bg-color", this.bgcolor || "#d9e2f2");
        this.ref("bar")?.style.setProperty("--bar-color", this.barcolor || "#2d6cff");

        if (this.ref("progress")) this.ref("progress").style.width = `${percent}%`;
        if (this.ref("value")) this.ref("value").textContent = `${Math.round(percent)}% (${clamped}/${max})`;
        if (this.ref("label")) this.ref("label").textContent = this.label || "";
    }
}

if (typeof customElements !== "undefined") {
    if (!customElements.get(UIProgress.tag)) customElements.define(UIProgress.tag, UIProgress);
}

export default UIProgress;
