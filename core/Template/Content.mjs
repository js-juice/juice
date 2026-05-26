/**
 * Template content management with token extraction and rendering.
 * @module template/content
 */

import EventEmitter from "../Event/Emitter.mjs";
import Token from "./token.mjs";
import Context from "./context.mjs";

const nodeProcess = globalThis.process;
const nodeFs = nodeProcess?.getBuiltinModule?.("node:fs");
const nodePath = nodeProcess?.getBuiltinModule?.("node:path");

/**
 * Generates a short random ID.
 * @private
 */
function shortId(length = 8) {
    return Math.random()
        .toString(36)
        .slice(2, 2 + length);
}

function isUrl(value) {
    return /^[a-zA-Z]+:\/\//.test(value);
}

function dir(location) {
    const index = Math.max(location.lastIndexOf("/"), location.lastIndexOf("\\"));
    return index > -1 ? location.substring(0, index) : "";
}

function asBase(location) {
    return location && /[\\/]$/.test(location) ? location : `${location}/`;
}

export function resolveTemplateLocation(root, location) {
    if (!root) return location;
    if (isUrl(root)) return new URL(location, asBase(root)).href;
    if (nodePath) return nodePath.resolve(root, location);
    if (root.startsWith("/")) return new URL(location, `${globalThis.location?.origin || ""}${asBase(root)}`).pathname;
    return `${asBase(root)}${location.replace(/^\.?[\\/]/, "")}`;
}

function getValueFromPath(obj, path, _default = "") {
    return path.split(".").reduce((acc, part) => {
        if (acc === undefined || acc === null) return _default;
        return acc[part];
    }, obj);
}

export class TokenContent extends EventEmitter {
    ready;

    static renderToken(token, data) {
        return token.template.replace(/{(.*?){(.*?)}(.*?)}/g, (_, key, body, footer) => {
            const value = getValueFromPath(data, key.trim());
            return value !== undefined ? value : "";
        });
    }

    static async load(content, root) {
        if (typeof content !== "string") return content;

        if (isUrl(content) && !/^file:\/\//i.test(content)) {
            const response = await fetch(content);
            return { string: await response.text(), root: dir(content) };
        }

        if (/^([a-zA-Z]:[\\/]|[\\.]{0,2}[\\/]|[\\/])/.test(content)) {
            const filePath = resolveTemplateLocation(root, content);
            try {
                if (nodeFs && !isUrl(filePath)) {
                    const template = nodeFs.readFileSync(filePath, "utf-8").toString();
                    return { string: template, root: dir(filePath) };
                }
                const response = await fetch(filePath);
                if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
                const template = await response.text();
                return { string: template, root: dir(filePath) };
            } catch (err) {
                return { string: `<!-- Failed to load ${filePath}: ${err.message} -->`, root: dir(filePath) };
            }
        }

        return { string: content, root };
    }

    static extract(string, open = "{", close = "}", parent) {
        let count = 0;
        const tokens = [];
        const splitContent = [];
        let token = {};
        let chunk = "";
        let inHTMLTag = false;
        let maxDepth = 0;
        for (let i = 0; i < string.length; i++) {
            if (string[i] === "<") {
                /*
                if (string.substring(i, i + 5) === "<script") {
                    console.log("SCRIPT", i);
                    const scriptEnd = string.indexOf("</script>", i);
                    if (scriptEnd > -1) {
                        splitContent.push(string.slice(i, scriptEnd + 8));
                        console.log("SCRIPT END", scriptEnd);
                        i = scriptEnd + 8;
                        chunk = "";
                        continue;
                    }
                }
                    */
                inHTMLTag = true;
            } else if (string[i] === ">") {
                inHTMLTag = false;
            }
            if (string[i] === open) {
                if (chunk !== "") {
                    splitContent.push(chunk);
                    chunk = "";
                }
                count++;
                maxDepth = count;
                if (!token.id) {
                    token.start = i;
                    token.id = shortId();
                }
            } else if (string[i] === close) {
                count--;
                if (count === 0 && maxDepth > 1) {
                    maxDepth = 0;
                    token.end = i;
                    token.string = string.slice(token.start, token.end + 1);
                    const t = new Token(token, parent?.context, parent, inHTMLTag);
                    token = {};
                    tokens.push(t);
                    splitContent.push(t);
                } else if (count === 0) {
                    chunk = chunk + string.slice(token.start, i + 1);
                    token = {};
                }
            } else if (!token.id) {
                chunk += string[i];
            }
        }
        splitContent.push(chunk);
        return {
            content: splitContent,
            template: splitContent.map((c) => (c instanceof Token ? c.placeholder : c)).join(""),
            tokens
        };
    }

    constructor(string, context, options = {}) {
        super();
        this.tokens = [];
        this.string = string;

        if (context) this.setContext(context);
        if (options.root) this.root = options.root;
        if (options.parent) this.parent = options.parent;
        this.ready = this.prepare();
    }

    setRoot(root) {
        this.root = root;
    }

    setContext(context) {
        if (!this._context) this._context = new Context(context);
        else this._context.update(context);
        this.context = context;
    }

    split() {
        return this.template.split(/(\[TOKEN:[^\]]+\])/g);
    }

    async prepare() {
        const prepared = TokenContent.extract(this.string, "{", "}", this);
        this.tokens = prepared.tokens;
        this.content = prepared.content;
        this.template = prepared.template;
        return Promise.all(this.tokens.map(async (t) => await t.ready())).then(() => this.emit("ready"));
    }

    render(context = this.context) {
        let rendered = this.template.slice();
        const configs = {};
        for (const token of this.tokens) {
            if (!token.render) continue;
            const value = token.render(context);
            rendered = rendered.replace(token.placeholder, value);
            configs[token.id] = token.config;
        }
        const contentConfig = { root: this.root, context: context, configs };
        const tokenContent = `<!-- token:content ${JSON.stringify(contentConfig)} -->`;
        if (rendered.includes("</body>")) {
            rendered = rendered.replace("</body>", tokenContent + "</body>");
        } else {
            rendered += "\n\n" + tokenContent + "\n\n";
        }
        return rendered;
    }

    async renderToDataURL(context = this.context) {
        const rendered = this.render(context);
        return "data:text/html;charset=UTF-8," + encodeURIComponent(rendered);
    }
}

export default TokenContent;
