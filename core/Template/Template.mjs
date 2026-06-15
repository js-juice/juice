/**
 * Template engine with variables, conditionals, loops, and includes.
 * Supports `{{expression}}`, `{if ...{...}}`, `{each ...{...}}`, and `{include ...{...}}` syntax.
 * @module template/template
 */

import EventEmitter from "../event/emitter.mjs";
import TokenContent from "./content.mjs";

/**
 * Live template engine with reactive bindings and dynamic content.
 * @class TemplateEngine
 * @extends EventEmitter
 * @param {Object} [options={}] - Configuration options
 * @param {Function} [options.loader] - Custom template loader
 * @param {string} [options.root] - Root path for template resolution
 * @fires TemplateEngine#ready When template is parsed and ready
 * @example
 * const engine = new TemplateEngine({
 *   root: './templates'
 * });
 * const html = await engine.render('<h1>{{title}}</h1>', { title: 'Hello' });
 */
class TemplateEngine extends EventEmitter {
    constructor({ root } = {}) {
        super();
        this.root = root || new URL(".", import.meta.url).href;
    }

    /**
     * Parses template string with context.
     * @param {string} template - Template string
     * @param {Object} [context={}] - Template context variables
     * @returns {Promise<void>}
     * @fires TemplateEngine#ready
     */
    async parse(template, context = {}) {
        const tokenContent = new TokenContent(String(template || "").trim(), context, { root: this.root });
        tokenContent.on("ready", () => this.emit("ready"));
        this.content = tokenContent;
        await tokenContent.ready;
        return tokenContent;
    }

    load(location) {
        return TokenContent.load(location, this.root);
    }

    async render(template, context = {}) {
        const { string, root } = await this.load(template);
        this.root = root;
        await this.parse(string, context);
        return this.content.render(context);
    }

    async renderToDataURL(template, context = {}) {
        const { string, root } = await this.load(template);
        this.root = root;
        await this.parse(string, context);
        return this.content.renderToDataURL(context);
    }

    async mount(el, template, context = {}) {
        el.innerHTML = await this.render(template, context);
        return el;
    }
}

export default TemplateEngine;
