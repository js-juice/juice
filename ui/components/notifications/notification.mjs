import Component from "../../component.mjs";
import "../graphics/ring.mjs";
import "../graphics/progress.mjs";

export class Notification extends Component.HTMLElement {
    static tag = "ui-notification";
    static config = { properties: {
        icon: { type: "url", linked: true },
        duration: { type: "int", default: 5000, linked: true },
        progress: { type: "number", default: null, linked: true },
        status: { type: "string", default: "info", linked: true },
    } };
    static get observed() { return { all: ["icon", "duration", "progress", "status"], attributes: ["title", "content"] }; }
    static get style() { return `
        :host { display: block; pointer-events: auto; width: min(26rem, calc(100vw - 2rem)); }
        [hidden] { display: none !important; }
        .card { position: relative; display: flex; gap: 1rem; padding: 1.25rem 2.75rem 1.25rem 1.25rem;
            border: 1px solid var(--notification-border, var(--color-border, #d2d2d2)); border-radius: .5rem;
            background: var(--notification-bgcolor, var(--color-surface, #fff));
            color: var(--notification-color, var(--color-text-primary, #212121));
            box-shadow: 0 4px 12px rgb(0 0 0 / 12%); overflow: hidden; overflow-wrap: anywhere; }
        :host([status="success"]) .card { border-color: var(--color-success, #28854a); }
        :host([status="error"]) .card { border-color: var(--color-error, #c43b3b); }
        .graphic { flex: 0 0 2.5rem; width: 2.5rem; height: 2.5rem; position: relative; color: var(--notification-progress-color, var(--color-link, #2563eb)); }
        #icon-image { width: 2.5rem; height: 2.5rem; object-fit: contain; }
        .graphic.has-icon #ring { position: absolute; top: -.5rem; left: -.5rem; }
        .text { min-width: 0; flex: 1; }
        #title { display: block; font-weight: 700; margin-bottom: .35rem; }
        #title:empty, #content:empty, #status:empty { display: none; }
        #content { color: var(--notification-message-color, var(--color-text-secondary, #555)); font-size: .9rem; }
        #status { display: block; font-size: .8rem; margin-top: .4rem; }
        :host([status="success"]) #status { color: var(--color-success, #28854a); }
        :host([status="error"]) #status { color: var(--color-error, #c43b3b); }
        #close { position: absolute; top: .5rem; right: .5rem; }
        button { border: 0; background: transparent; color: inherit; font: inherit; font-size: 1.25rem; cursor: pointer; width: 2rem; height: 2rem; border-radius: .25rem; }
        button:hover { background: var(--color-surface-elevated, #eee); }
        button:focus-visible { outline: 2px solid var(--color-focus-ring, #2563eb); }
        #progress { position: absolute; bottom: 0; left: 0; width: 100%; }
    `; }
    static html() { return `
        <div id="wrapper" class="card" part="wrapper">
            <div id="graphic" class="graphic"><img id="icon-image" alt="" hidden><slot name="icon"></slot><ui-progress-ring id="ring" aria-hidden="true"></ui-progress-ring></div>
            <div class="text"><strong id="title"></strong><slot name="title"></slot><span id="content"></span><slot name="content"></slot><span id="status"></span></div>
            <span id="close"><slot name="close"><button type="button" aria-label="Dismiss notification">&times;</button></slot></span>
            <ui-progress id="progress" compact height="4" aria-label="Job progress" hidden></ui-progress>
        </div>`; }
    onFirstConnect() {
        for (const property of this.constructor.observedProperties) {
            const value = this.getAttribute(property);
            if (value !== null) this[property] = this.parseAttributeValue(value, this.constructor.config.properties[property].type);
        }
        this.ref("close").addEventListener("click", () => this.close());
        this.sync();
        this.startTimer();
        if (!this.reducedMotion) this.entryAnimation = this.animate([{ opacity: 0, transform: "translateX(-30px)" }, { opacity: 1, transform: "translateX(0)" }], { duration: 300, easing: "ease-out" });
    }
    get reducedMotion() { return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }
    onConnect() { if (this.ref("wrapper")) { this.sync(); this.startTimer(); } }
    onDisconnect() {
        clearTimeout(this.timer); clearTimeout(this.closeTimer);
        this.entryAnimation?.cancel(); this.exitAnimation?.cancel();
    }
    attributeChangedCallback(name, oldValue, value) {
        if (name === "title" || name === "content") { if (this.ref(name)) this.ref(name).textContent = value ?? ""; }
        else super.attributeChangedCallback(name, oldValue, value);
    }
    onPropertyChanged(property) {
        if (!this.ref("wrapper")) return;
        this.sync();
        if (property === "duration") this.startTimer();
    }
    sync() {
        this.ref("title").textContent = this.getAttribute("title") || "";
        this.ref("content").textContent = this.getAttribute("content") || "";
        const icon = this.ref("icon-image");
        icon.hidden = !this.icon;
        if (this.icon) icon.src = this.icon; else icon.removeAttribute("src");
        this.ref("graphic").classList.toggle("has-icon", Boolean(this.icon));
        const ring = this.ref("ring");
        ring.setAttribute("size", this.icon ? "20" : "40");
        ring.hidden = !(this.duration > 0);
        this.ref("graphic").hidden = !this.icon && ring.hidden;
        const bar = this.ref("progress");
        const pending = this.status === "processing" && this.progress == null;
        bar.hidden = this.progress == null && !pending;
        bar.toggleAttribute("indeterminate", pending);
        bar.setAttribute("value", Math.min(1, Math.max(0, Number(this.progress) || 0)) * 100);
        this.ref("status").textContent = this.status === "success" ? "Success" : this.status === "error" ? "Failed" : "";
    }
    startTimer() {
        clearTimeout(this.timer);
        const ring = this.ref("ring");
        ring?.animation?.cancel();
        if (!this.isConnected || this.closing || !(this.duration > 0)) return;
        if (ring) { ring.complete = 0; if (!this.reducedMotion) ring.animateTo(1, this.duration); }
        this.timer = setTimeout(() => this.close(), this.duration);
    }
    success() { this.status = "success"; this.progress = 1; this.duration = 2000; }
    fail() { this.status = "error"; this.duration = 2000; }
    close(delay = 0) {
        if (this.closing) return;
        clearTimeout(this.closeTimer);
        if (delay > 0) { this.closeTimer = setTimeout(() => this.close(), delay); return; }
        this.closing = true;
        clearTimeout(this.timer); this.ref("ring")?.animation?.cancel();
        let removed = false;
        const remove = () => {
            if (removed) return;
            removed = true; clearTimeout(this.closeTimer);
            this.dispatchEvent(new Event("close")); this.remove();
        };
        if (this.reducedMotion) { remove(); return; }
        this.exitAnimation = this.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
        this.exitAnimation.finished.then(remove, () => {});
        // Timers also finish dismissal when animation frames are suspended.
        this.closeTimer = setTimeout(remove, 200);
    }
}
customElements.define(Notification.tag, Notification);
