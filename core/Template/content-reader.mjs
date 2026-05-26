/**
 * Content reader for template parsing.
 * @module template/content-reader
 */

import ReaderBase from "../Reader/ReaderBase.mjs";

/**
 * Reader for template content with tag and token extraction.
 * @class ContentReader
 * @extends ReaderBase
 */
class ContentReader extends ReaderBase {
    getTags() {
        const regex = /(<[^>]+>)/g;
        const parts = this.content.split(regex).filter((part) => part !== "");
        return parts;
    }

    getTokens() {
        const str = this.content.slice(this.index);
        const tokens = [];
        let depth = 0;
        let start = -1;
        let end;

        for (let i = 0; i < str.length; i++) {
            if (str[i] === "{") {
                if (depth === 0) start = i;
                depth++;
            } else if (str[i] === "}") {
                depth--;
                if (depth === 0 && start !== -1) {
                    end = i;
                    tokens.push({ start, end, content: str.slice(start, end + 1) });
                    start = -1;
                }
            }
        }
        return tokens;
    }
}

export default ContentReader;
