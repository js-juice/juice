import Component from "../../component.mjs";
import "./key.mjs";

const KEY_GROUPS = {
    qwerty: [
        [
            { key: "Q", code: "KeyQ" },
            { key: "W", code: "KeyW" },
            { key: "E", code: "KeyE" },
            { key: "R", code: "KeyR" },
            { key: "T", code: "KeyT" },
            { key: "Y", code: "KeyY" },
            { key: "U", code: "KeyU" },
            { key: "I", code: "KeyI" },
            { key: "O", code: "KeyO" },
            { key: "P", code: "KeyP" }
        ],
        [
            { key: "A", code: "KeyA" },
            { key: "S", code: "KeyS" },
            { key: "D", code: "KeyD" },
            { key: "F", code: "KeyF" },
            { key: "G", code: "KeyG" },
            { key: "H", code: "KeyH" },
            { key: "J", code: "KeyJ" },
            { key: "K", code: "KeyK" },
            { key: "L", code: "KeyL" }
        ],
        [
            { key: "Z", code: "KeyZ" },
            { key: "X", code: "KeyX" },
            { key: "C", code: "KeyC" },
            { key: "V", code: "KeyV" },
            { key: "B", code: "KeyB" },
            { key: "N", code: "KeyN" },
            { key: "M", code: "KeyM" }
        ]
    ],
    wasd: [
        [{ key: "W", code: "KeyW" }],
        [
            { key: "A", code: "KeyA" },
            { key: "S", code: "KeyS" },
            { key: "D", code: "KeyD" }
        ]
    ],
    arrows: [
        [{ key: "↑", code: "ArrowUp" }],
        [
            { key: "←", code: "ArrowLeft" },
            { key: "↓", code: "ArrowDown" },
            { key: "→", code: "ArrowRight" }
        ]
    ]
};

export default class KeyGroup extends Component.HTMLElement {
    static tag = "ui-key-group";
    static config = {
        properties: {
            layout: { type: "string", default: "qwerty", allowed: ["qwerty", "wasd", "arrows"], linked: true }
        }
    };

    constructor() {
        super();
        this.keys = {};
    }

    static get observed() {
        return {
            all: ["layout"]
        };
    }

    static html() {
        return `<div id="key-group" class="ui-key-group" data-layout="${this.layout}"><slot></slot></div>`;
    }

    static get style() {
        return [
            {
                ":host": {
                    display: "block",
                    position: "relative",
                    width: "100%",
                    height: "100%"
                },
                "#key-group": {
                    display: "block",
                    position: "relative",
                    width: "100%",
                    height: "100%"
                },
                ".row": {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }
            }
        ];
    }

    onFirstConnect() {
        const group = KEY_GROUPS[this.layout] || [];
        group.forEach((keyRow) => {
            const domRow = document.createElement("div");
            domRow.classList.add("row");
            this.shadowDom.appendChild(domRow);
            keyRow.forEach((keyData) => {
                const keyElement = document.createElement("ui-key");
                keyElement.setAttribute("key", keyData.key);
                keyElement.setAttribute("code", keyData.code);
                keyElement.setAttribute("grouped", "");
                this.keys[keyData.code.toUpperCase()] = keyElement;
                domRow.appendChild(keyElement);
            });
        });

        window.addEventListener("keydown", (e) => {
            console.log("Key down:", e.key, e.code, e.key.toUpperCase());
            console.log(this.keys);
            const keyElement = this.keys[e.code.toUpperCase()];
            console.log("Mapped key element:", keyElement);
            if (keyElement) {
                keyElement.press();
            }
        });

        window.addEventListener("keyup", (e) => {
            const keyElement = this.keys[e.key.toUpperCase()];
            if (keyElement) {
                keyElement.release();
            }
        });
    }
}

customElements.define(KeyGroup.tag, KeyGroup);
