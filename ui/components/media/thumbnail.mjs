import Component from "../../component.mjs";

class MediaThumbnail extends Component.HTMLElement {
    static get config() {
        return {
            tag: "media-thumbnail",
            properties: {
                src: { type: "url", default: "" },
                thumbnail: { type: "url", default: "" },
                width: { type: "int", null: true },
                height: { type: "int", null: true },
                aspect: { type: "number", null: true }
            }
        };
    }
    constructor() {
        super();
    }
}
