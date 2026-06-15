import Component from "../../component.mjs";

export default class Key extends Component.HTMLElement {
    static tag = "ui-key";

    static config = {
        properties: {
            key: { type: "string", default: "", linked: true },
            code: { type: "string", default: "", linked: true },
            action: { type: "string", default: "", linked: true }
        }
    };

    static get observed() {
        return {
            all: ["key", "code", "action"]
        };
    }

    static html() {
        return `<div id="key" class="ui-key" data-key="${this.key}" data-code="${this.code}" data-action="${this.action}">
        <div id="key-depth"></div>
        <div id="key-top">${this.key}</div>
        <slot></slot>
        </div>`;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "inline-block",
                    position: "relative",
                    width: "45px",
                    height: "45px",
                    margin: "0.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    userSelect: "none"
                },
                "#html": {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    perspective: "50px"
                },
                "#key-depth": {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#c5cede",
                    border: "1px solid #90a0be",
                    padding: "0.5rem",
                    borderRadius: "5px",
                    transform: "rotateX(15deg)",
                    zIndex: "1",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden"
                },
                "#key-depth::after": {
                    width: "100%",
                    height: "20%",
                    content: "''",
                    position: "absolute",
                    bottom: "-1px",
                    left: "0",
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.2)",
                    clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0% 100%)"
                },
                "#key-top": {
                    position: "absolute",
                    top: "0px",
                    left: "10%",
                    width: "80%",
                    height: "auto",
                    aspectRatio: "1",
                    backgroundColor: " #FFFFFF",
                    borderRadius: "5px",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: "2"
                },
                "#key": {
                    position: "relative",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    perspective: "50px"
                },
                "#html.pressed #key-top": {
                    top: "6px",
                    color: "#FFF",
                    backgroundColor: "var(--color-primary)"
                }
            }
        ];
    }

    press() {
        this.ref("html").classList.add("pressed");
    }

    release() {
        this.ref("html").classList.remove("pressed");
    }

    onFirstConnect() {
        this.ref("html").addEventListener("pointerdown", () => {
            this.press();
        });
        this.ref("html").addEventListener("pointerup", () => {
            this.release();
        });
    }
}

customElements.define(Key.tag, Key);
