import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Run the real Juice initializer without requiring a browser DOM.
async function loadMediaComponents() {
    const base = await readFile(new URL("../component.mjs", import.meta.url), "utf8");
    const initialize = base.slice(base.indexOf("static initialize() {"), base.indexOf("static renderProxy ="));
    const source = await readFile(new URL("../components/media/browser.mjs", import.meta.url), "utf8");
    const registry = new Map();
    class Element {
        constructor(tag = "div") {
            this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = {};
            this.attributes = {}; this.listeners = {}; this.classList = { contains: (name) => (this.className || "").split(" ").includes(name) };
        }
        append(...items) { for (const item of items) { item.parentElement = this; this.children.push(item); } }
        setAttribute(name, value) { this.attributes[name] = value; }
        hasAttribute(name) { return name in this.attributes; }
        getAttribute(name) { return this.attributes[name]; }
        addEventListener(name, callback) { this.listeners[name] = callback; }
        dispatchEvent(event) { this.listeners[event.type]?.(event); return !event.defaultPrevented; }
        querySelector() { return { style: {} }; }
        ref() { return null; }
        remove() { this.parentElement.children = this.parentElement.children.filter((item) => item !== this); }
        replaceWith(item) { const parent = this.parentElement; parent.children[parent.children.indexOf(this)] = item; item.parentElement = parent; }
    }
    const context = vm.createContext({
        Element,
        document: { createElement: (tag) => registry.has(tag) ? new (registry.get(tag))() : new Element(tag) },
        customElements: { get: (tag) => registry.get(tag), define: (tag, component) => registry.set(tag, component) },
        CustomEvent: class {
            constructor(type, options) { this.type = type; Object.assign(this, options); }
            preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
        },
        URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
        DEFAULT_CONFIG: { shadow: true, properties: {} },
        getJuiceConfig: () => undefined,
        ObjUtil: { merge: (...values) => Object.assign({}, ...values.filter((value) => value && typeof value === "object")) },
        Util: { isArray: Array.isArray },
        type: (value, expected) => typeof value === expected,
        ComponentTemplate: class { addStyle() {} }
    });
    vm.runInContext(`
        class BaseElement extends Element {
            ${initialize}
            static get observedProperties() { return this.observed?.all || []; }
            constructor() {
                super();
                if (this.constructor.initialize) this.constructor.initialize();
                this.config = this.constructor.config;
            }
        }
        const Component = { HTMLElement: BaseElement };
        ${source.replace(/^import Component.*;$/m, "").replaceAll("export class ", "class ").replace("export default MediaBrowser;", "")}
        globalThis.components = { MediaBrowser, MediaThumbnail, MediaAsset, Element };
    `, context);
    return context.components;
}

test("media browser and thumbnail support the real Juice configuration initializer", async () => {
    const { MediaBrowser, MediaThumbnail } = await loadMediaComponents();
    const browser = new MediaBrowser();
    const thumbnail = new MediaThumbnail();
    assert.equal(browser.config.shadow, true);
    assert.equal(thumbnail.config.properties.width.default, 120);
    assert.equal(thumbnail.constructor.observableDefinitions.length, 3);
    assert.doesNotThrow(() => new MediaBrowser());
    assert.doesNotThrow(() => new MediaThumbnail());
});

test("CDN descriptors retain their URL and identity when loaded by the browser", async () => {
    const { MediaBrowser } = await loadMediaComponents();
    const browser = new MediaBrowser();
    browser.ref = () => null;
    const asset = { id: 42, name: "Hero", mime_type: "image/png", url: "https://cdn.example/hero.png" };
    browser.replaceMediaList([asset]);
    assert.equal(browser.media.length, 1);
    assert.equal(browser.media[0].type, "image");
    assert.equal(browser.media[0].src, asset.url);
    assert.equal(browser.media[0].url, asset.url);
    assert.equal(browser.media[0].id, asset.id);
});


test("assets are direct children and directory navigation preserves their elements", async () => {
    const { MediaBrowser } = await loadMediaComponents();
    const browser = new MediaBrowser();
    browser.insertAsset({ type: "dir", name: "Photos", path: "/Photos" });
    const image = browser.insertAsset({ type: "image", src: "/hero.png" }, "/Photos");
    assert.equal(browser.children.length, 2);
    const element = browser.children[1];
    assert.equal(element.mediaAsset, image);
    assert.equal(element.hidden, true);
    browser.loadDir("/Photos");
    assert.equal(element.hidden, false);
    assert.equal(browser.children[0].hidden, true);
    assert.equal(browser.media[0], image);
    browser.loadDir("/");
    assert.equal(browser.children[1], element);
});

test("prebuilt asset elements hydrate without duplicating the asset", async () => {
    const { MediaBrowser, Element } = await loadMediaComponents();
    const browser = new MediaBrowser();
    const child = new Element("button");
    child.setAttribute("data-media-asset", JSON.stringify({ type: "image", src: "/prebuilt.png", name: "Prebuilt" }));
    browser.append(child);
    browser.hydrateChildren();
    browser.hydrateChildren();
    assert.equal(browser.children.length, 1);
    assert.equal(browser.children[0].mediaAsset.src, "/prebuilt.png");
    assert.equal(JSON.parse(browser.children[0].getAttribute("data-media-asset")).src, "/prebuilt.png");
});

test("Add Directory validates names and creates a child in the active directory", async () => {
    const { MediaBrowser } = await loadMediaComponents();
    const browser = new MediaBrowser();
    const input = { value: "Photos", setCustomValidity(message) { this.error = message; }, reportValidity() { return !this.error; } };
    browser.ref = (name) => name === "dirname" ? input : null;
    browser.addDirectory();
    assert.equal(browser.children.length, 1);
    assert.equal(browser.media[0].path, "/Photos");
    assert.equal(input.value, "");
    input.value = "Photos";
    assert.equal(browser.addDirectory(), null);
    input.value = "../bad";
    assert.equal(browser.addDirectory(), null);
    browser.loadDir("/Photos");
    input.value = "Nested";
    browser.addDirectory();
    assert.equal(browser.media[0].path, "/Photos/Nested");
});

test("Add File creates a local child or delegates to an upload handler", async () => {
    const { MediaBrowser } = await loadMediaComponents();
    const browser = new MediaBrowser();
    browser.addFiles([{ name: "local.png", type: "image/png" }]);
    assert.equal(browser.children.length, 1);
    assert.equal(browser.media[0].src, "blob:test");
    browser.addEventListener("media-file-add", (event) => event.preventDefault());
    browser.addFiles([{ name: "uploaded.png", type: "image/png" }]);
    assert.equal(browser.children.length, 1);
});
