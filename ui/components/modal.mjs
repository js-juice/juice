/**
 * <juice-modal>: accessible modal with title, content, and footer slots.
 * Open with open()/showModal() or the open attribute; close with close().
 * Native dialog provides the top layer, focus containment, and Escape handling.
 */
export default class Modal extends HTMLElement {
    static tag = "juice-modal";
    static observedAttributes = ["open"];

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `
            <style>
                :host { display: contents; }
                dialog { box-sizing: border-box; width: var(--modal-width, 44rem); max-width: calc(100vw - 2rem); max-height: calc(100dvh - 2rem); padding: 0; border: 1px solid var(--modal-border-color, #dbe3ea); border-radius: 1rem; background: var(--modal-background, white); color: var(--modal-color, #16324b); box-shadow: 0 24px 80px #102c4652; font: inherit; }
                dialog::backdrop { background: #102c467a; backdrop-filter: blur(3px); }
                header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.3rem 1.5rem; border-bottom: 1px solid #dbe3ea; }
                h2 { margin: 0; font-size: 1.3rem; }
                button { display: grid; place-items: center; width: 2rem; height: 2rem; border: 0; border-radius: .4rem; background: #edf3f5; color: inherit; font: inherit; font-size: 1.5rem; cursor: pointer; }
                button:focus-visible { outline: 3px solid #34888c; outline-offset: 3px; }
                main { padding: 1.5rem; }
                footer { padding: 0 1.5rem 1.5rem; }
                footer[hidden] { display: none; }
                @media (max-width: 600px) { main { padding: 1rem; } header { padding: 1rem; } }
            </style>
            <dialog aria-labelledby="modal-title">
                <header><h2 id="modal-title"><slot name="title">Dialog</slot></h2><button type="button" aria-label="Close dialog">&times;</button></header>
                <main><slot></slot></main>
                <footer hidden><slot name="footer"></slot></footer>
            </dialog>`;
        this._dialog = shadow.querySelector("dialog");
        shadow.querySelector("button").addEventListener("click", () => this.close());
        shadow.querySelector('slot[name="footer"]').addEventListener("slotchange", (event) => {
            shadow.querySelector("footer").hidden = event.target.assignedNodes().length === 0;
        });
        this._dialog.addEventListener("click", (event) => {
            if (event.target !== this._dialog) return;
            const bounds = this._dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.close();
        });
        this._dialog.addEventListener("cancel", (event) => {
            event.preventDefault();
            this.close();
        });
        this._dialog.addEventListener("close", () => {
            if (this._dialog.open) return;
            this.removeAttribute("open");
            this.dispatchEvent(new Event("close"));
        });
    }

    connectedCallback() {
        this._syncOpen();
    }

    disconnectedCallback() {
        if (this._dialog.open) this._dialog.close();
    }

    attributeChangedCallback() {
        this._syncOpen();
    }

    _syncOpen() {
        if (!this.isConnected) return;
        if (this.hasAttribute("open") && !this._dialog.open) this._dialog.showModal();
        else if (!this.hasAttribute("open") && this._dialog.open) this._dialog.close();
    }

    open() {
        this.setAttribute("open", "");
    }

    showModal() {
        this.open();
    }

    close() {
        this.removeAttribute("open");
    }
}

if (!customElements.get(Modal.tag)) customElements.define(Modal.tag, Modal);
