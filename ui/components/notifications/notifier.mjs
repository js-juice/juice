import Component from "../../component.mjs";
import { getJuiceConfig } from "../../../config/juice-config.mjs";
import { Notification } from "./notification.mjs";

export class Notifier extends Component.HTMLElement {
    static tag = "ui-notifier";
    static config = { properties: {
        position: { type: "string", default: "bottom-left", linked: true },
        "audio-src": { type: "url", default: "" },
    } };
    static get style() { return `
        :host { position: fixed; z-index: var(--notification-z-index, 10000); pointer-events: none; max-width: calc(100vw - 2rem); }
        :host([position="top-left"]) { top: 1rem; left: 1rem; }
        :host([position="top-right"]) { top: 1rem; right: 1rem; }
        :host(:not([position])), :host([position="bottom-left"]) { bottom: calc(1rem + var(--keystone-staging-height, 0px)); left: 1rem; }
        :host([position="bottom-right"]) { bottom: calc(1rem + var(--keystone-staging-height, 0px)); right: 1rem; }
        .notifications-wrapper { display: grid; gap: .75rem; max-height: calc(100dvh - 4rem); overflow-y: auto; pointer-events: auto; }
        slot { display: contents; }
    `; }
    static html() { return `<div class="notifications-wrapper" aria-live="polite" aria-relevant="additions text"><slot></slot></div>`; }
    onFirstConnect() {
        this.sizeObserver = new ResizeObserver(() => {
            this.dispatchEvent(new CustomEvent("notifications-resize", { bubbles: true, detail: { height: this.getBoundingClientRect().height } }));
        });
        this.sizeObserver.observe(this);
    }
    onConnect() { this.sizeObserver?.observe(this); }
    onDisconnect() { this.sizeObserver?.disconnect(); }
    onSlotChange() { this.dispatchEvent(new CustomEvent("itemchange", { detail: this.children.length })); }
    notify(options) {
        if (!options || typeof options !== "object") return;
        const element = options instanceof Notification ? options : this.ownerDocument.createElement(Notification.tag);
        if (element !== options) {
            for (const key of ["title", "content", "icon", "duration", "progress", "status"]) {
                if (options[key] != null) element.setAttribute(key, options[key]);
            }
        }
        this.append(element);
        const audio = options.audio;
        const src = audio === false ? null : audio && audio !== "chime" && audio !== "error" ? audio
            : getJuiceConfig(`notifications.sounds.${audio || "chime"}`) || this.getAttribute("audio-src") || getJuiceConfig("notifications.audioSrc");
        if (src) new Audio(src).play().catch(() => {});
        return element;
    }
    add(element) { return this.notify(element); }
}
customElements.define(Notifier.tag, Notifier);
