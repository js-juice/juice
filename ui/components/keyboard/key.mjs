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
        <div>${this.key}</div>
        <slot></slot>
        </div>`;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "inline-block",
                    position: "relative",
                    width: "40px",
                    height: "40px",
                    margin: "0.5rem",
                    padding: "0.5rem",
                    textAlign: "center",
                    border: "1px solid #90a0be",
                    borderRadius: "5px",
                    cursor: "pointer",
                    userSelect: "none",
                    backgroundColor: "#f0f0f0",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)"
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
                    background: "#c5cede",
                    borderRadius: "5px"
                },
                "#key": {
                    position: "absolute",
                    top: "5%",
                    left: "5%",
                    width: "90%",
                    height: "90%",
                    backgroundColor: " #FFFFFF",
                    borderRadius: "5px",
                    clipPath: "polygon(10% 5%, 90% 5%, 100% 100%, 0% 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                },
                "#html.pressed": {
                    backgroundColor: "#7f8899",
                    color: "#333"
                },
                "#html.pressed #key": {
                    clipPath: "polygon(5% 5%, 95% 5%, 100% 100%, 0% 100%)",
                    backgroundColor: "#c5cede",
                    color: "#333"
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
}
