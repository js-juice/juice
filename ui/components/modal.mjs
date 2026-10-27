import Component from "../component.mjs";

export default class Modal extends Component.HTMLElement {
    static tag = "juice-modal";

    static config = {
        name: "juice-modal",
        tag: "juice-modal",
        properties: {
            open: { type: "boolean", default: false, linked: true },
            draggable: { type: "boolean", default: false, linked: true },
            cover: { type: "exists", default: true, linked: true },
            width: { type: "number", default: 600, linked: true },
            height: { type: "number", default: 400, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["open", "draggable", "cover", "width", "height"]
        };
    }

    static html() {
        return `
        <div id="backdrop"></div>
        <div id="modal">
            <header>
                <h2><slot name="title"></slot></h2>
                <a href="#" id="close" @click.prevent="close()">&times;</a>
            </header>
            <main>
                <slot></slot>
            </main>
            <footer>
                <slot name="footer"></slot>
            </footer>
        </div>
        `;
    }

    static style() {
        return [
            {
                ":host": {},
                "#backdrop": {
                    display: "none"
                },
                ":host([cover]) #backdrop": {
                    display: "block",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                },
                "#modal": {
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--modal-background, #fff)",
                    border: "1px solid var(--modal-border-color, #ccc)",
                    position: "fixed",
                    top: "calc( 50% - var(--modal-height, 400px) / 2 )",
                    left: "calc( 50% - var(--modal-width, 600px) / 2 )",
                    width: "var(--modal-width, 600px)",
                    height: "var(--modal-height, 400px)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                },
                ":host([draggable]) #modal": {},
                header: {},
                main: {},
                footer: {}
            }
        ];
    }

    constructor() {
        super();
    }

    onFirstConnected() {
        this.ref("backdrop").addEventListener("click", () => {
            this.close();
        });
    }

    open() {
        const { height, width } = this.ref("modal").getBoundingClientRect();
        this.style.setProperty("--modal-height", `${height}px`);
        this.style.setProperty("--modal-width", `${width}px`);
        this.setAttribute("open", "");
    }

    close() {
        this.removeAttribute("open");
    }

    notifyLoading() {
        this.dispatchEvent(new CustomEvent("loading"));
        this.ref("modal").classList.add("loading");
    }

    load(href) {
        const iframe = document.createElement("iframe");

        function fitToContent() {
            const { height, width } = iframe.contentWindow.document.body.getBoundingClientRect();
            this.style.setProperty("--modal-height", `${height}px`);
            this.style.setProperty("--modal-width", `${width}px`);
        }

        return new Promise((resolve, reject) => {
            iframe.onload = () => {
                resolve();
            };
            iframe.src = href;
            this.notifyLoading();
            this.appendChild(iframe);
        });
    }

    html(content) {
        this;
        const contentContainer = document.createElement("div");
        contentContainer.innerHTML = content;
        contentContainer.classList.add("modal-content");
        this.appendChild(contentContainer);
        this.open();
    }
}

customElements.define(Modal.tag, Modal);

