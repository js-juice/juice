/**
 * Template token for variable substitution, blocks, and includes.
 * @module template/token
 */

import path from "path";
import EventEmitter from "events";
import { safeEval, findTokensInString } from "../Util/Eval.mjs";
import TokenContent from "./content.mjs";

/**
 * Generates a short random ID.
 * @private
 */
function shortId(length = 8) {
    return Math.random()
        .toString(36)
        .slice(2, 2 + length);
}

function getValueFromPath(obj, path, _default = "") {
    return path.split(".").reduce((acc, part) => {
        if (acc === undefined || acc === null) return _default;
        return acc[part];
    }, obj);
}

class Token extends EventEmitter {
    constructor(source, context = false, parent = null, inHTMLTag = false) {
        super();
        this.data = {};
        this.source = {};
        this.firstRender = true;
        this.inTag = inHTMLTag;
        this.value = undefined;
        this.bindings = new Map();
        this.readyCallbacks = [];

        if (typeof source === "object") {
            if (source.id !== undefined) this.id = source.id;
            if (source.start !== undefined) this.start = source.start;
            if (source.end !== undefined) this.end = source.end;
            if (source.placement !== undefined) this.placement = source.placement;
            this.string = source.string;
        } else if (typeof source === "string") {
            this.id = shortId();
            this.string = source;
        }

        if (context) this.setContext(context);
        if (parent) this.setParent(parent);
    }

    get placeholder() {
        return `[TOKEN:${this.id}]`;
    }

    toString() {
        return this.render();
    }

    setContext(context) {
        if (!context || context === this.context) return;
        this.context = context;
    }

    async setParent(parent) {
        this.parent = parent;
        await this.parse();
        return true;
    }

    async ready() {
        return new Promise(async (resolve) => {
            if (!this.isReady) this.readyCallbacks.push(resolve);
            else resolve();
            if (!this.isReady && !this.parsing) this.parse();
        });
    }

    _callReady() {
        if (this.readyCallbacks.length) this.readyCallbacks.forEach((cb) => cb());
        this.readyCallbacks = [];
    }

    async parse() {
        this.parsing = true;
        const raw = this.string.trim();
        const parsed = /^\{(.*?)\{([\s\S]*)\}(.*?)\}$/m.exec(raw);
        if (!parsed) {
            this.parsing = false;
            this.isReady = true;
            this.render = () => raw;
            this.config = { type: "text" };
            this._callReady();
            return true;
        }

        const command = parsed[1].trim();
        let body = parsed[2].trim();
        const footer = parsed[3].trim();

        this.source = { command, body, footer };

        const container = {
            type: "VARIABLE",
            attributes: {},
            rendered: []
        };

        if (raw.startsWith("{{") && raw.endsWith("}}")) {
            if (body.includes("||")) {
                this.default = body.split("||")[1].trim();
                body = body.split("||")[0].trim();
            }
            this.contextId = body;
            this.type = "variable";
            this.render = function RenderVariable(context) {
                return this.computeValue(context);
            };
            this.config = {
                type: "variable",
                target: "inner",
                contextId: this.contextId,
                inTag: this.inTag
            };
            this.parsing = false;
            this.isReady = true;
            this._callReady();
        } else {
            const [type, ...args] = command.split(/\s+/);

            this.type = type;

            if (type === "if") {
                this.config = {
                    type: this.type,
                    statement: `return ${args.join(" ")}`,
                    value: body,
                    inTag: this.inTag
                };

                this.render = this.renderIf;
            } else if (type === "each") {
                this.render = this.renderEach;
                const item = args[2] || "item";
                const contextId = (this.contextId = args[0]);

                this.config = {
                    type: this.type,
                    target: "inner",
                    contextId: this.contextId,
                    list: args[0],
                    item,
                    template: body,
                    inTag: this.inTag
                };

                const content = new TokenContent(body, null, { root: this.parent.root, parent: this });

                this.templateVars = { contextId, content, item };

                content.on("ready", () => {
                    this.parsing = false;
                    this.isReady = true;
                    this._callReady();
                });
            } else if (type === "include") {
                this.render = this.renderInclude;
                this.type = "include";
                const contextId = (this.contextId = body);

                this.bindings = body.split(",").map((b) => b.trim());
                const incPath = path.resolve(this.parent.root, args[0]).replace(/\\/g, "/");
                if (incPath.includes("{{")) {
                }

                const { string, root } = await TokenContent.load(incPath);

                this.config = { path: incPath, root };

                this.template = string;
                this.root = root;

                const content = new TokenContent(string, this.context, { root, parent: this });
                content.on("ready", () => {
                    this.parsing = false;
                    this.isReady = true;
                    this._callReady();
                });

                this.templateVars = {
                    contextId: this.contextId,
                    content,
                    root,
                    path: incPath
                };
            }
        }

        if (container && !this.inTag) {
            let beforeToken = `<!-- token:${this.id}:${command} -->`;

            let afterToken = `<!-- /token:${this.type} ${this.contextId} -->`;

            container.rendered = beforeToken;
            container.close = afterToken;

            this.container = container;
        }

        if (!this.isReady && !["each", "include"].includes(this.type)) {
            this.parsing = false;
            this.isReady = true;
            this._callReady();
        }

        return true;
    }

    computeValue(context = this.context) {
        const { templateVars, config } = this;

        if (this.contextId) {
            const CONTEXT = getValueFromPath(context, this.contextId, this.type === "each" ? [] : "");

            switch (this.type) {
                case "variable":
                    return CONTEXT === "" ? this.default || "" : CONTEXT;
                case "each":
                    const values = CONTEXT.map((data) => {
                        const ctx = { [this.config.item]: data };
                        return templateVars.content.render(ctx);
                    });

                    return values.join("\n");
                case "include":
                    return templateVars.content.render(CONTEXT);
                case "if":
                    return;
                default:
            }
        }
    }

    renderIf(context) {
        if (context) this.setContext(context);
        let rendered = "";
        const { config } = this;
        if (safeEval(config.statement, context)) {
            const stringTokens = findTokensInString(config.value, this.context);
            if (stringTokens.length) {
                rendered = safeEval(config.value, context);
            } else {
                rendered = config.value;
            }
        }
        return rendered;
    }

    renderEach(context) {
        if (context) this.setContext(context);

        const value = this.computeValue(context);
        const rendered = [this.container.rendered, value, this.container.close];
        return rendered.join("\n");
    }

    renderInclude(context) {
        if (context) this.setContext(context);
        const { templateVars } = this;
        return this.container.rendered + "\n" + this.computeValue(context) + "\n" + this.container.close;
    }

    _registerBinding(key, el, attr) {
        if (!this.bindings.has(key)) this.bindings.set(key, []);
        this.bindings.get(key).push({ el, attr });
    }

    update(context) {
        // Update all bound nodes with new context values
        for (const [key, bindings] of this.bindings.entries()) {
            const newValue = this._resolve(context, key) ?? "";
            for (const bind of bindings) {
                if (bind.attr) {
                    // Update attribute value by replacing the old value with newValue
                    // (We assume attribute contains only the bound variable for simplicity)
                    bind.el.setAttribute(bind.attr, newValue);
                } else {
                    // It's a text node wrapper span
                    bind.el.textContent = newValue;
                }
            }
        }
    }
}

export default Token;
