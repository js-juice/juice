import Component from "../../Component.mjs";

export default class ChatBox extends Component.HTMLElement {
    static tag = "chat-box";

    static allowedStates = ["hidden", "collapsed", "expanded"];

    static networkStates = ["disconnected", "connecting", "connected", "error"];

    static get config() {
        return {
            tag: "chat-box"
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
