class Modal extends Component.HTMLElement {
    static tag = "juice-modal";

    static config = {
        name: "juice-modal",
        tag: "juice-modal",
        properties: {
            open: { type: "boolean", default: false, linked: true },
            draggable: { type: "boolean", default: false, linked: true }
        }
    };

    static get observed() {
        return {
            all: ["open", "draggable"]
        };
    }

    static html() {
        return `
        <slot></slot>
        `;
    }

    constructor() {
        super();
    }

    open() {}

    load(href) {
        const iframe = document.createElement("iframe");
        return new Promise((resolve, reject) => {
            iframe.onload = () => {
                resolve();
            };
            iframe.src = href;
            this.appendChild(iframe);
        });
    }
}
