import Component from "../../component.mjs";

// SVG ring adapted from Maldelo's m-ring; progress is normalized to 0..1.
export class ProgressRing extends Component.HTMLElement {
    static tag = "ui-progress-ring";
    static config = { properties: {
        complete: { type: "number", default: 0, linked: true },
        size: { type: "number", default: 40, linked: true },
        stroke: { type: "number", default: 5, linked: true },
    } };
    static get observed() { return { all: ["complete", "size", "stroke"] }; }
    static get style() { return `
        :host { display: inline-block; width: 40px; height: 40px; color: var(--ring-color, currentColor); }
        svg { display: block; width: 100%; height: 100%; transform: rotate(-90deg); }
        circle { fill: none; stroke: currentColor; }
        #track { opacity: .2; }
        #circle { stroke-linecap: round; }
    `; }
    static html() { return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle id="track" cx="50" cy="50"/><circle id="circle" cx="50" cy="50" pathLength="1" stroke-dasharray="1"/></svg>`; }
    onFirstConnect() { this.update(); }
    onPropertyChanged() { this.update(); }
    update() {
        if (!this.ref("circle")) return;
        const stroke = Math.min(24, Math.max(1, Number(this.stroke) || 5));
        this.style.width = this.style.height = `${Math.max(1, Number(this.size) || 40)}px`;
        for (const name of ["track", "circle"]) {
            this.ref(name).setAttribute("r", 50 - stroke);
            this.ref(name).setAttribute("stroke-width", stroke * 2);
        }
        this.ref("circle").style.strokeDashoffset = 1 - Math.min(1, Math.max(0, Number(this.complete) || 0));
    }
    animateTo(value, duration = 1000) {
        this.animation?.cancel();
        const circle = this.ref("circle");
        if (!circle) return;
        const target = Math.min(1, Math.max(0, Number(value) || 0));
        const from = getComputedStyle(circle).strokeDashoffset;
        this.complete = target;
        this.animation = circle.animate([{ strokeDashoffset: from }, { strokeDashoffset: 1 - target }], { duration: Math.max(0, duration), easing: "linear" });
        this.animation.onfinish = () => this.dispatchEvent(new Event("animation-complete"));
        return this.animation;
    }
    onDisconnect() { this.animation?.cancel(); }
}
customElements.define(ProgressRing.tag, ProgressRing);
