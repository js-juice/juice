console.log(juice);
console.log(juice.currentFile(import.meta));

import Component from "../../component.mjs";
//import defaultIcon from "./assets/default.svg";

class MediaThumbnail extends Component.HTMLElement {
    static tag = "media-thumbnail";
    static get config() {
        return {
            tag: "media-thumbnail",
            properties: {
                mediaSrc: { type: "url", default: "", null: true, linked: "media-src" },
                src: { type: "url", default: "", null: true, linked: true, render: true },
                width: { type: "int", null: true, variable: "--width", linked: true },
                height: { type: "int", null: true, variable: "--height", linked: true },
                aspect: { type: "number", null: true, variable: "--aspect", linked: true }
            }
        };
    }

    static style() {
        return [
            {
                ":host": {
                    display: "block",
                    position: "relative",
                    border: "1px solid #d2d2d2"
                },
                "#thumbnail": {
                    display: "block",
                    position: "relative",
                    width: "var(--width, auto)",
                    height: "var(--height, auto)",
                    aspect: "var(--aspect, auto)"
                },
                "#thumbnail.default": {
                    display: "block",
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    maskImage: "url(${defaultIcon})",
                    maskSize: "contain",
                    maskPosition: "center",
                    maskRepeat: "no-repeat",
                    background: "#d2d2d2"
                }
            }
        ];
    }

    static html() {
        return `
        <div id="thumbnail" class="${this.src ? "" : "default"}" part="thumbnail">
            <div class="active" part="active">
                <slot name="active"></slot>
            </div>
            <img id="image" src="${this.src}" part="image">
        </div>
        <div class="metadata" part="metadata">
            <slot></slot>
        </div>
        `;
    }
    constructor() {
        super();
    }
}
