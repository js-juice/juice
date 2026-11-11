import Component from "../../component.mjs";

class MediaList extends Component.HTMLElement {
    static tag = "media-list";

    media = [];

    static get config() {
        return {
            properties: {}
        };
    }

    static html() {
        return `
            <div class="media-list-wrapper">    
            <noscript class="img">
                <slot name="img"></slot>
            </noscript>
            </div>
        `;
    }
    constructor() {
        super();
    }

    onFirstConnect() {
        const children = Array.from(this.children);

        children.forEach((child) => {
            const tagname = child.tagName.toLowerCase();
            switch (tagname) {
                case "script":
                    if (child.getAttribute("type") === "application/json") {
                        const json = JSON.parse(child.textContent);
                        if (Array.isArray(json)) {
                            json.forEach((item) => {
                                if (item.type === "media-item") {
                                    this.media.push(item);
                                }
                            });
                        }
                    }
                    break;
                case "img":
                    this.ref("img-slot").appendChild(child);
                    break;
                case "media-item":
                    this.media.push(child);
                    break;
                default:
                    break;
            }
        });
    }
}
