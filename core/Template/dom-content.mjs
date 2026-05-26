/**
 * DOM content manager with template token extraction.
 * @module template/dom-content
 */

import Context from "./context.mjs";

/**
 * DOM-based template content manager.
 * @class DomContent
 */
class DomContent {
    static extract() {
        const tokens = { head: [] };
        const head = document.getElementsByTagName("head")[0];
        if (!head) return tokens;

        const headWalker = document.createTreeWalker(head, NodeFilter.SHOW_COMMENT, null, false);
        let currentComment;
        while ((currentComment = headWalker.nextNode())) {
            const string = currentComment.textContent.trim();
            if (string.startsWith("TOKEN:")) {
                tokens.head.push(currentComment.textContent);
            }
        }
        return tokens;
    }

    constructor() {
        this.bindings = new Map();
    }

    setContext(context) {
        if (!this.context) this.context = new Context(context);
        else this.context.update(context);
    }
}

export default DomContent;
