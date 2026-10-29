import Component from "../../component.mjs";

export default class ChatBox extends Component.HTMLElement {
    static tag = "chat-box";

    static allowedStates = ["hidden", "collapsed", "expanded"];

    static networkStates = ["disconnected", "connecting", "connected", "error"];

    static get config() {
        return {
            tag: "chat-box",
            properties: {
                state: {
                    type: String,
                    default: "hidden",
                    allowed: ChatBox.allowedStates
                },
                networkState: {
                    type: String,
                    default: "disconnected",
                    allowed: ChatBox.networkStates
                }
            }
        };
    }

    static get observed() {
        return {
            all: []
        };
    }

    static html(data = {}) {
        return `<slot></slot>`;
    }

    static styles(data = {}) {
        return [{}];
    }

    constructor() {
        super();
    }
}
